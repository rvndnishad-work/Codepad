/**
 * AI ENGINEERING ULTRA — batch 02: choosing and configuring models (model
 * selection, open-weight vs proprietary, sampling parameters, reasoning models,
 * multimodal inputs). Every example was run by scripts/verify-variant-examples.ts
 * (node, python); quoted output is that run's output.
 */
import type { AiUltraAugment } from "./ai-augments.types";

const augments: AiUltraAugment[] = [
  {
    title: `How do you choose the right model for a task?`,
    difficulty: "easy",
    seoDescription: `Choose an LLM by filtering on hard constraints, scoring candidates on your own evals, and taking the cheapest model that passes; route the hard cases.`,
    description: `**Question presented to candidate:**
"We are adding an LLM feature to our product. There are dozens of models out there, from tiny cheap ones to frontier models. Walk me through how you would decide which model to use, and how you would know you picked right."

**What a strong answer should cover:**
- Start from the task and its constraints, not from a leaderboard: required quality, latency budget (time to first token and total), cost at the expected volume, context length, and must-have features (tool calling, structured output, vision, data residency)
- Hard constraints filter first (a model without tool calling or over the latency budget is out no matter how smart it is); the remaining candidates are compared on your own eval set, not on public benchmarks
- The rule: pick the cheapest, fastest model that clears the eval bar, with cost worked out per request and per month from real token counts
- Routing and cascades: send easy traffic to a small model and escalate hard or low-confidence cases to a bigger one; know that a cascade only works if the escalation signal is reliable
- Treat the choice as reversible: keep a provider-neutral interface, pin model versions, re-run the evals when a new model ships or an old one is deprecated

**Clarifying questions expected:**
- What does "good enough" mean here, and do we have labelled examples to measure it?
- What volume and latency do we expect, and is the call user-facing or background?
- Are there data constraints (PII, region, on-prem) that rule out some providers?

**Code / implementation expected:** Optional — a small selection harness (eval pass rate, cost per request, constraint filter) or a cost calculation is a strong signal; no model call is needed.`,
    answer: `**Target Audience:** Engineers adding their first LLM feature who see a long list of models and want a repeatable way to pick one.
**Difficulty:** Easy
**Verified with:** Node 22.22.0 and Python 3.12.3 (the selection harness below; the models in it are deterministic stubs and the prices are illustrative). Product and paper facts are cited inline with the date they were checked (October 2026).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Imagine you need a car to deliver pizzas in a city. You could buy a Formula 1 car: it wins every race on TV. It is also wildly expensive, burns fuel, needs a specialist crew, and has no room for a pizza box. A small scooter is cheap, fast through traffic and does the job perfectly for 95% of orders. For the one catering order of 40 pizzas you call a van.

Choosing a language model is the same decision. Public leaderboards are the TV race: they tell you which model is fastest on *their* track. Your task has its own track: your inputs, your format, your latency budget, your bill at your volume. Teams that skip this step usually pick the top of the leaderboard, ship it, and then discover a monthly bill ten times larger than needed, or a latency their users will not tolerate. Teams that pick the cheapest model without measuring discover the opposite problem in production.

The skill an interviewer is looking for is not knowing which model is "best" this month (that changes every few months). It is having a **process**: constraints, evals, cost arithmetic, and a way to change your mind cheaply.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What does a correct output look like, and do we have labelled examples? | Without a measurable bar you cannot compare models at all; this decides whether you first build an eval set |
| What volume do we expect per day or month? | Cost scales linearly with requests; a 10x price difference is noise at 1,000 requests and a budget line at 10 million |
| Is it user-facing or background? What is the latency budget? | User-facing chat needs a fast time to first token; a nightly batch job can use a slow, cheap or batch API |
| How long are the inputs? | Long documents need a large context window and make input tokens the main cost |
| Do we need tool calling, structured output, vision or audio? | Feature support is a hard filter that removes candidates before any quality test |
| Any data constraints: PII, region, on-prem, contracts? | Can rule out whole providers or force an open-weight model; see the sibling question on open vs proprietary |

## 3. The Process in One Picture

<svg class="iq-diagram" width="100%" viewBox="0 0 820 200" role="img" aria-label="Model selection funnel: all candidates, filter by hard constraints, run your own evals, compute cost, pick the cheapest model that passes">
  <defs>
    <marker id="ai02q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="55" width="150" height="90" rx="10"/>
  <text class="d-text" x="95" y="93" text-anchor="middle">candidates</text>
  <text class="d-sub" x="95" y="119" text-anchor="middle">shortlist</text>
  <rect class="d-box" x="225" y="55" width="150" height="90" rx="10"/>
  <text class="d-text" x="300" y="93" text-anchor="middle">hard filters</text>
  <text class="d-sub" x="300" y="119" text-anchor="middle">features, latency</text>
  <rect class="d-box" x="430" y="55" width="150" height="90" rx="10"/>
  <text class="d-text" x="505" y="93" text-anchor="middle">your evals</text>
  <text class="d-sub" x="505" y="119" text-anchor="middle">pass rate</text>
  <rect class="d-box-accent" x="635" y="55" width="165" height="90" rx="10"/>
  <text class="d-text" x="717" y="93" text-anchor="middle">cheapest pass</text>
  <text class="d-sub" x="717" y="119" text-anchor="middle">cost per month</text>
  <path class="d-edge" d="M 174 100 L 219 100" marker-end="url(#ai02q1-arrow)"/>
  <path class="d-edge" d="M 379 100 L 424 100" marker-end="url(#ai02q1-arrow)"/>
  <path class="d-edge" d="M 584 100 L 629 100" marker-end="url(#ai02q1-arrow)"/>
</svg>

Each stage removes candidates for a different reason, and the order matters: cheap checks (does it support tools? is it fast enough?) come before the expensive one (running a few hundred eval cases on every model).

### Step 1: write the requirements down

Split them into two kinds.

📌 **Interview term: hard constraint** — a requirement that is pass/fail regardless of quality: tool calling support, structured output, a context window that fits your inputs, a p95 latency ceiling, a region or data-handling rule. A model that misses one is removed, not down-scored.

📌 **Interview term: quality bar** — the minimum score on your evaluation set that the feature needs to ship, for example "at least 90% of support tickets routed to the right queue". It must be a number, decided before you look at the results.

📌 **Interview term: latency budget** — how long the user (or the calling system) can wait. For streaming chat the key number is **time to first token (TTFT)**; for a background job it is total time or throughput. See [What techniques reduce LLM latency at each stage of a request?](/interview-question/what-techniques-reduce-llm-latency-at-each-stage-of-a-request)

### Step 2: shortlist from public signals, but do not decide on them

Leaderboards and model cards are useful for picking three or four candidates per price tier. They are not the decision.

📌 **Interview term: benchmark contamination** — when examples from a public test set (or close paraphrases) ended up in a model training data, so its score overstates how it does on genuinely new inputs. It is one reason a public benchmark score does not transfer to your task.

Public benchmarks also measure tasks that are not yours: multiple-choice exams, competition maths, generic chat preference. Your task might be "extract 14 fields from a messy invoice into JSON", where a small model can beat a large one.

### Step 3: run every candidate on your own eval set

📌 **Interview term: golden set** — a fixed collection of real, representative inputs with known good outputs (or grading rules), used to score every candidate the same way. Building one is its own topic: [How do you build a golden dataset for evaluating an LLM feature?](/interview-question/how-do-you-build-a-golden-dataset-for-evaluating-an-llm-feature)

📌 **Interview term: eval** — an automated test that runs a model over the golden set and grades each output, with exact-match code checks where possible and a model-based grader where not. See [What are evals and why does every LLM feature need them?](/interview-question/what-are-evals-and-why-does-every-llm-feature-need-them) and [When do you use code-based graders versus model-based graders?](/interview-question/when-do-you-use-code-based-graders-versus-model-based-graders)

Mix difficulty on purpose: most real traffic is easy, but the hard tail is where models differ and where incidents come from.

### Step 4: do the cost arithmetic per request and per month

Cost is tokens in times input price plus tokens out times output price, times volume. Output tokens are usually priced several times higher than input tokens, so a model that writes long answers costs more than its input price suggests. Token basics are covered in [What are tokens and why do they matter for cost and limits?](/interview-question/what-are-tokens-and-why-do-they-matter-for-cost-and-limits)

~~~js
const perRequest = (m) => (work.inTok * m.pin + work.outTok * m.pout) / 1e6; // prices are per 1M tokens
// mid: (1200 * 1.00 + 300 * 4.00) / 1e6 = $0.0024 -> $2,400 for 1M requests
~~~

### Step 5: pick the cheapest model that passes

📌 **Interview term: cheapest-model-that-passes rule** — among candidates that meet every hard constraint and the quality bar, choose the lowest cost (and, at equal cost, the lowest latency). Extra quality beyond the bar is not free; it is paid for in every request.

Here is the harness from the example deciding, with four stub models on a 20-task golden set:

~~~text
model     acc   $/request  $/month      p95    verdict
tiny      55%   $0.00012   $120.00      400    FAIL (accuracy, no tools)
small     75%   $0.00060   $600.00      700    FAIL (accuracy)
mid       90%   $0.00240   $2,400.00    1400   pass
frontier  100%  $0.01350   $13,500.00   2600   pass
cheapest model that passes: mid at $2,400.00/month
~~~

The frontier model is "better" (100% vs 90%), but the requirement was 90%, and it costs 5.6 times as much. If the business actually needs 100%, that is a different requirement, and you change the bar, not the method.

## 4. Routing and Cascades: Using More Than One Model

Real traffic is rarely uniform. Most support questions are simple; a few are hard. Paying frontier prices for the simple ones is waste, and using a small model for the hard ones is risk.

📌 **Interview term: model router** — a component that looks at each request (with rules, a small classifier or embeddings) and sends it to the model tier that fits, before any model answers.

📌 **Interview term: model cascade** — try the cheap model first, check its answer, and only escalate to a stronger model when the check fails or confidence is low. FrugalGPT (Chen et al., 2023, arXiv 2305.05176) popularised the idea for LLM APIs.

<svg class="iq-diagram" width="100%" viewBox="0 0 800 290" role="img" aria-label="Cascade: request goes to the small model, a validator checks the answer, passing answers are returned, failing answers are escalated to the frontier model">
  <defs>
    <marker id="ai02q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="140" height="80" rx="10"/>
  <text class="d-text" x="90" y="86" text-anchor="middle">request</text>
  <rect class="d-box" x="220" y="40" width="160" height="80" rx="10"/>
  <text class="d-text" x="300" y="76" text-anchor="middle">small model</text>
  <text class="d-sub" x="300" y="100" text-anchor="middle">cheap, fast</text>
  <rect class="d-box" x="440" y="40" width="150" height="80" rx="10"/>
  <text class="d-text" x="515" y="76" text-anchor="middle">validator</text>
  <text class="d-sub" x="515" y="100" text-anchor="middle">schema, checks</text>
  <rect class="d-box-accent" x="650" y="40" width="130" height="80" rx="10"/>
  <text class="d-text" x="715" y="86" text-anchor="middle">answer</text>
  <rect class="d-box" x="430" y="190" width="170" height="80" rx="10"/>
  <text class="d-text" x="515" y="226" text-anchor="middle">frontier model</text>
  <text class="d-sub" x="515" y="250" text-anchor="middle">only if flagged</text>
  <path class="d-edge" d="M 164 80 L 214 80" marker-end="url(#ai02q1-arrow2)"/>
  <path class="d-edge" d="M 384 80 L 434 80" marker-end="url(#ai02q1-arrow2)"/>
  <path class="d-edge" d="M 594 80 L 644 80" marker-end="url(#ai02q1-arrow2)"/>
  <path class="d-edge-dashed" d="M 515 124 L 515 184" marker-end="url(#ai02q1-arrow2)"/>
  <path class="d-edge" d="M 604 230 L 715 230 L 715 126" marker-end="url(#ai02q1-arrow2)"/>
  <text class="d-accent" x="400" y="160" text-anchor="middle">fails check</text>
</svg>

A cascade is only as good as its escalation signal. Here is the example run, where a validator catches four of the small model five wrong answers and misses one:

~~~text
cascade small -> frontier: accuracy 95%, escalated 4/20, silent wrong 1, $3,300.00/month
vs frontier for everything: $13,500.00/month -> cascade saves 76%
vs mid alone: cascade costs 137.5% of it
~~~

Three honest lessons from that output:

1. Against "frontier for everything", the cascade saves 76% and still reaches 95% accuracy.
2. Against the plain mid model it is **more** expensive (137.5%), because every escalated request pays twice: once for the small model, once for the frontier model. A cascade is not automatically cheaper than the right single model.
3. The one **silent wrong** answer is the real risk. If the validator cannot detect a failure, the cascade returns it with full confidence. Cascades work best when correctness is checkable: a JSON schema, a unit test, a calculation, a citation that must exist in the source.

The best-known public data point for learned routers is RouteLLM (LMSYS blog, 1 July 2024): routers trained on Chatbot Arena preference data, routing between GPT-4 Turbo and Mixtral 8x7B, reported cost reductions of over 85% on MT Bench while keeping about 95% of GPT-4 quality, with smaller savings on MMLU (45%) and GSM8K (35%). The spread is the lesson: the saving depends on how much of your traffic is easy.

## 5. Dimensions That Change the Answer

| Dimension | What to check | Typical effect on the choice |
| :--- | :--- | :--- |
| Task type | Classification, extraction, summarisation, chat, code, multi-step agent | Extraction and classification often pass on small models; agents and hard reasoning push up |
| Context length | Longest realistic input plus the instructions and output | Removes models with small windows; long prompts make input price dominate ([context windows](/interview-question/what-is-a-context-window-and-what-happens-when-you-exceed-it)) |
| Output length | Average tokens out | Long outputs make output price and decode time dominate |
| Latency | TTFT and total time at p95, measured from your region | Can rule out large or reasoning models for interactive use |
| Volume | Requests per month, peak rate, provider rate limits | High volume makes small price differences large; may favour self-hosting ([open vs proprietary](/interview-question/how-do-you-choose-between-open-weight-models-and-proprietary-api-models)) |
| Features | Tool calling, JSON schema output, vision, audio, prompt caching, batch API | Hard filters; see [structured output](/interview-question/how-do-you-get-reliable-structured-json-output-from-an-llm) and [multimodal](/interview-question/how-do-multimodal-models-handle-images-audio-and-other-non-text-inputs) |
| Reasoning depth | Multi-step maths, planning, tricky code | May justify a reasoning model and its token cost ([reasoning models](/interview-question/what-are-reasoning-models-and-when-should-you-use-them)) |
| Data and compliance | PII, retention, region, contracts | May exclude providers or force a private deployment ([PII](/interview-question/how-do-you-handle-pii-and-sensitive-data-when-calling-llm-apis)) |

### Agents need more reliability per step

In a multi-step agent, small error rates multiply. If each step is right 95% of the time, five independent steps are all right about 0.95^5 = 77% of the time. That is why the model for an agent planner is often chosen a tier higher than the model for a single classification call. See [What is an AI agent and how does the agent loop work?](/interview-question/what-is-an-ai-agent-and-how-does-the-agent-loop-work)

## 6. Keep the Choice Reversible

Models improve, prices drop and old versions get deprecated, often several times a year. The choice you make today is a starting point.

📌 **Interview term: model pinning** — calling an exact, dated model version rather than a moving alias, so the behaviour your evals measured is the behaviour you get in production until you decide to move.

📌 **Interview term: provider abstraction** — a thin interface in your own code (one \`complete(messages, options)\` function) so that changing model or provider is a configuration change, not a refactor. It also makes fallbacks to a second provider possible: [How do you build resilient LLM calls with rate limits, retries and fallbacks?](/interview-question/how-do-you-build-resilient-llm-calls-with-rate-limits-retries-and-fallbacks)

When a new model appears, the decision is a re-run of the same harness. Upgrades still need a regression check, because a model that is better on average can be worse on your edge cases: [How do you catch regressions when changing a prompt or upgrading a model?](/interview-question/how-do-you-catch-regressions-when-changing-a-prompt-or-upgrading-a-model)

Before reaching for a bigger model, also check the cheaper levers: a better prompt, few-shot examples, retrieval of the right context, or fine-tuning a small model. See [Fine-tune vs RAG vs prompt engineering: how do you choose in 2025-26?](/interview-question/fine-tune-vs-rag-vs-prompt-engineering-how-do-you-choose-in-2025-26)

## 7. Verified: Running the Code

The example **"Pick the cheapest model that passes the evals, then test a small-to-frontier cascade"** stands in for the real harness. Each stub model has a capability level and answers a task correctly when the task difficulty is at most that level; a real harness would call each model and grade its output. The four price points are invented round numbers, not any vendor price list, and the latency numbers are inputs, not measurements. The cascade validator is a stub that catches failures on hard tasks except one, to show what a missed failure costs. The validator itself is free in the simulation; a real one (a second model call as a judge, for example) adds cost.

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
workload: 1000000 requests/month, 1200 in + 300 out tokens each
requirements: accuracy >= 90%, p95 <= 3000 ms, tool use
model     acc   $/request  $/month      p95    verdict
tiny      55%   $0.00012   $120.00      400    FAIL (accuracy, no tools)
small     75%   $0.00060   $600.00      700    FAIL (accuracy)
mid       90%   $0.00240   $2,400.00    1400   pass
frontier  100%  $0.01350   $13,500.00   2600   pass
cheapest model that passes: mid at $2,400.00/month
cascade small -> frontier: accuracy 95%, escalated 4/20, silent wrong 1, $3,300.00/month
vs frontier for everything: $13,500.00/month -> cascade saves 76%
vs mid alone: cascade costs 137.5% of it
~~~

What the run shows:

- Hard constraints remove \`tiny\` for two reasons before quality is even considered.
- Two models pass; the decision between them is pure cost: $2,400 vs $13,500 a month at 1 million requests.
- A cascade can approach frontier quality at a fraction of frontier cost, but it is not automatically cheaper than the right single model, and a validator miss becomes a confident wrong answer.

## Edge Cases Worth Knowing

- **Ties within noise.** On a 20-item set one task is 5 percentage points. A 2-point difference on 100 items is likely noise; use more examples or repeated runs before choosing the more expensive model.
- **Non-determinism.** With sampling enabled the same model can pass a case on one run and fail on the next. Run evals at the temperature you will use in production, or several times. See [How do temperature, top-p and other sampling parameters affect output?](/interview-question/how-do-temperature-top-p-and-other-sampling-parameters-affect-output)
- **Prompt portability.** A prompt tuned for one model family often underperforms on another. Give each candidate a fair, lightly adapted prompt, or you are comparing prompts, not models.
- **Cached and batch pricing.** Prompt caching and batch APIs can change the cost ranking: a model with good cache discounts may be cheaper for long shared prefixes. See [What is prompt caching?](/interview-question/what-is-prompt-caching-and-how-does-it-reduce-cost-and-latency) and [When should you use batch APIs?](/interview-question/when-should-you-use-batch-apis-instead-of-real-time-llm-calls)

## Common Pitfalls

- **Picking from the leaderboard.** The top general model is rarely the cheapest one that passes your task, and its score may be inflated by contamination. Shortlist from public data, decide on your own evals.
- **Comparing price per token instead of cost per request.** A model with a cheaper token price that writes three times longer answers, or needs a longer prompt, can cost more per request. Measure real token counts.
- **No quality bar set in advance.** Without a number decided first, teams rationalise whichever model they already liked. Write the bar down before running the evals.
- **Evaluating only easy examples.** If the golden set is all easy cases every model passes, and the expensive one looks wasteful until production hits the hard tail.
- **Hard-coding one provider.** Without an abstraction and pinned versions, every deprecation becomes an emergency migration with no regression suite to lean on.
- **Assuming a cascade saves money.** Escalated requests pay for two calls, and an unreliable escalation signal turns into silent errors. Measure the cascade end to end.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Start from the task:</strong> <span style="color:#f0e2c8;">I write down what the feature needs before I look at models: the quality bar, a latency budget, the expected volume, the context length, and must-have features such as tool calling, structured output or vision, plus any data constraints.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Filter on hard constraints:</strong> <span style="color:#f0e2c8;">Anything that misses a hard requirement is out, however clever it is. A model without tool calling, over the p95 latency budget, or in the wrong region does not get evaluated.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Measure on my own evals:</strong> <span style="color:#f0e2c8;">The survivors run on the same <strong style="color:#ffca28;">golden set</strong> of real examples with an automatic grader. Public leaderboards only shortlist; they do not measure my task.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cheapest model that passes:</strong> <span style="color:#f0e2c8;">I compute cost per request from real token counts and multiply by monthly volume, then pick the cheapest, fastest model that clears the bar. In my example a mid model at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$2,400</code>/month passed where the frontier model cost <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$13,500</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Route and revisit:</strong> <span style="color:#f0e2c8;">Where traffic is mixed I add a <strong style="color:#ffca28;">router</strong> or <strong style="color:#ffca28;">cascade</strong>, measured end to end, and I keep the choice reversible: a provider-neutral wrapper, pinned versions, and evals re-run whenever a new model ships.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use the best model on the leaderboard?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Leaderboards measure general tasks the model may have been tuned for, sometimes with test data leaked into training. My task has its own inputs and grading. The best model is also usually the slowest and most expensive, and if a smaller one already passes my evals, the extra spend buys nothing measurable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How big does the eval set need to be?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Big enough that the difference you care about is larger than the noise. With 20 examples one task is 5 points, which is too coarse to separate 90% from 95%. A few hundred labelled examples that cover the real input mix, including the hard and adversarial ones, is a common starting point; grow it from production failures.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does a cascade beat a single model?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When most traffic is easy, the small model is much cheaper, and the check that decides to escalate is cheap and reliable. In my run the cascade beat the frontier model by 76% on cost but cost 137.5% of the mid model, and one wrong answer slipped through because the validator missed it. You measure the cascade as one system.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What changes when the model is used inside an agent?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Errors compound across steps, so per-step reliability matters more: tool-call accuracy, following a schema, recovering from tool errors. A model that is 95% right per step is right about 77% of the time over five steps (0.95 to the fifth). Agents often justify a stronger model, or a strong planner with cheaper workers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a provider deprecating your model?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pin the exact version, watch the deprecation notices, and keep the eval suite runnable at any time so moving to the replacement is a measured change rather than a guess. Routing through your own wrapper means the switch is a configuration change plus an eval run.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Hard constraint | A pass/fail requirement (feature, latency ceiling, region) that removes a model outright |
| Quality bar | The minimum eval score needed to ship, decided in advance |
| Latency budget | How long the caller can wait; TTFT for streaming chat, total time for jobs |
| Benchmark contamination | Test-set data leaking into training, inflating public scores |
| Golden set | Fixed representative inputs with known good outputs, used to score every candidate |
| Eval | An automated run over the golden set with a grader |
| Cheapest-model-that-passes rule | Among models that meet every constraint and the bar, pick the lowest cost |
| Model router | Sends each request to a model tier before any model answers |
| Model cascade | Tries a cheap model first and escalates when a check fails |
| Model pinning | Calling an exact dated model version, not a moving alias |
| Provider abstraction | Your own thin interface so switching models is a configuration change |

**Conclusion:** Choosing a model is an engineering decision, not a popularity contest. Write down the task requirements, remove every model that misses a hard constraint, run the survivors on your own golden set, do the cost arithmetic per request and per month, and take the cheapest model that clears the bar. Where traffic is mixed, a router or cascade can cut cost further, but only if the escalation signal is reliable and the whole system is measured end to end. Keep the choice reversible with a provider-neutral wrapper, pinned versions and an eval suite you can re-run in minutes, because the right answer this quarter will not be the right answer next year.`,
    examples: [
      {
        label: `Pick the cheapest model that passes the evals, then test a small-to-frontier cascade`,
        variants: [
          { tech: "node", code: `// Choose a model the way production teams do: run every candidate on the same
// golden set, drop the ones that miss a hard requirement, keep the cheapest
// that passes, then see whether a cascade (cheap first, escalate) beats it.
// The models are stubs: a model answers a task correctly when its capability
// level is at least the task difficulty. Prices are illustrative, not a vendor list.
const models = [
  // name, capability, $ per 1M input, $ per 1M output, p95 latency ms, tools?
  { name: "tiny", cap: 2, pin: 0.05, pout: 0.2, p95: 400, tools: false },
  { name: "small", cap: 3, pin: 0.25, pout: 1.0, p95: 700, tools: true },
  { name: "mid", cap: 4, pin: 1.0, pout: 4.0, p95: 1400, tools: true },
  { name: "frontier", cap: 5, pin: 5.0, pout: 25.0, p95: 2600, tools: true },
];
// Golden set: 20 tasks with difficulty 1 (easy) to 5 (hard).
const golden = [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5];
const req = { minAccuracy: 0.9, maxP95: 3000, needTools: true };
const work = { perMonth: 1000000, inTok: 1200, outTok: 300 };

const perRequest = (m) => (work.inTok * m.pin + work.outTok * m.pout) / 1e6;
const money = (x) => "$" + x.toFixed(2).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");
const pad = (s, n) => String(s).padEnd(n);

console.log("workload: " + work.perMonth + " requests/month, " + work.inTok + " in + " + work.outTok + " out tokens each");
console.log("requirements: accuracy >= 90%, p95 <= 3000 ms, tool use");
console.log(pad("model", 10) + pad("acc", 6) + pad("$/request", 11) + pad("$/month", 13) + pad("p95", 7) + "verdict");
const passing = [];
for (const m of models) {
  const correct = golden.filter((d) => d <= m.cap).length;
  const acc = correct / golden.length;
  const why = [];
  if (acc < req.minAccuracy) why.push("accuracy");
  if (m.p95 > req.maxP95) why.push("latency");
  if (req.needTools && !m.tools) why.push("no tools");
  const verdict = why.length ? "FAIL (" + why.join(", ") + ")" : "pass";
  if (!why.length) passing.push(m);
  console.log(pad(m.name, 10) + pad(Math.round(acc * 100) + "%", 6) + pad("$" + perRequest(m).toFixed(5), 11) +
    pad(money(perRequest(m) * work.perMonth), 13) + pad(m.p95, 7) + verdict);
}
passing.sort((a, b) => perRequest(a) - perRequest(b));
const pick = passing[0];
console.log("cheapest model that passes: " + pick.name + " at " + money(perRequest(pick) * work.perMonth) + "/month");

// Cascade: try "small" first; a cheap validator (schema check + self-check)
// flags wrong answers on hard tasks; flagged tasks are re-run on "frontier".
// The validator misses one wrong answer (the last d=4 task) on purpose:
// real validators are not perfect.
const small = models[1], big = models[3];
let correct = 0, escalated = 0, silentWrong = 0;
golden.forEach((d, i) => {
  if (d <= small.cap) { correct++; return; }
  const caught = i !== 17;
  if (caught) { escalated++; if (d <= big.cap) correct++; }
  else silentWrong++;
});
const cascadeCost = perRequest(small) + (escalated / golden.length) * perRequest(big);
console.log("cascade small -> frontier: accuracy " + Math.round((correct / golden.length) * 100) + "%, escalated " +
  escalated + "/" + golden.length + ", silent wrong " + silentWrong + ", " + money(cascadeCost * work.perMonth) + "/month");
const frontier = perRequest(big) * work.perMonth;
console.log("vs frontier for everything: " + money(frontier) + "/month -> cascade saves " +
  Math.round((1 - (cascadeCost * work.perMonth) / frontier) * 100) + "%");
console.log("vs " + pick.name + " alone: cascade costs " + ((cascadeCost / perRequest(pick)) * 100).toFixed(1) + "% of it");` },
          { tech: "python", code: `# Choose a model the way production teams do: run every candidate on the same
# golden set, drop the ones that miss a hard requirement, keep the cheapest
# that passes, then see whether a cascade (cheap first, escalate) beats it.
# The models are stubs: a model answers a task correctly when its capability
# level is at least the task difficulty. Prices are illustrative, not a vendor list.
models = [
    # name, capability, $ per 1M input, $ per 1M output, p95 latency ms, tools?
    {"name": "tiny", "cap": 2, "pin": 0.05, "pout": 0.2, "p95": 400, "tools": False},
    {"name": "small", "cap": 3, "pin": 0.25, "pout": 1.0, "p95": 700, "tools": True},
    {"name": "mid", "cap": 4, "pin": 1.0, "pout": 4.0, "p95": 1400, "tools": True},
    {"name": "frontier", "cap": 5, "pin": 5.0, "pout": 25.0, "p95": 2600, "tools": True},
]
# Golden set: 20 tasks with difficulty 1 (easy) to 5 (hard).
golden = [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5]
req = {"min_accuracy": 0.9, "max_p95": 3000, "need_tools": True}
work = {"per_month": 1000000, "in_tok": 1200, "out_tok": 300}


def per_request(m):
    return (work["in_tok"] * m["pin"] + work["out_tok"] * m["pout"]) / 1e6


def money(x):
    return "$" + f"{x:,.2f}"


def pad(s, n):
    return str(s).ljust(n)


print(f"workload: {work['per_month']} requests/month, {work['in_tok']} in + {work['out_tok']} out tokens each")
print("requirements: accuracy >= 90%, p95 <= 3000 ms, tool use")
print(pad("model", 10) + pad("acc", 6) + pad("$/request", 11) + pad("$/month", 13) + pad("p95", 7) + "verdict")
passing = []
for m in models:
    correct = len([d for d in golden if d <= m["cap"]])
    acc = correct / len(golden)
    why = []
    if acc < req["min_accuracy"]:
        why.append("accuracy")
    if m["p95"] > req["max_p95"]:
        why.append("latency")
    if req["need_tools"] and not m["tools"]:
        why.append("no tools")
    verdict = "FAIL (" + ", ".join(why) + ")" if why else "pass"
    if not why:
        passing.append(m)
    print(pad(m["name"], 10) + pad(str(round(acc * 100)) + "%", 6) + pad(f"\${per_request(m):.5f}", 11)
          + pad(money(per_request(m) * work["per_month"]), 13) + pad(m["p95"], 7) + verdict)
passing.sort(key=per_request)
pick = passing[0]
print(f"cheapest model that passes: {pick['name']} at {money(per_request(pick) * work['per_month'])}/month")

# Cascade: try "small" first; a cheap validator (schema check + self-check)
# flags wrong answers on hard tasks; flagged tasks are re-run on "frontier".
# The validator misses one wrong answer (the last d=4 task) on purpose:
# real validators are not perfect.
small, big = models[1], models[3]
correct = escalated = silent_wrong = 0
for i, d in enumerate(golden):
    if d <= small["cap"]:
        correct += 1
        continue
    if i != 17:
        escalated += 1
        if d <= big["cap"]:
            correct += 1
    else:
        silent_wrong += 1
cascade_cost = per_request(small) + (escalated / len(golden)) * per_request(big)
print(f"cascade small -> frontier: accuracy {round(correct / len(golden) * 100)}%, escalated "
      f"{escalated}/{len(golden)}, silent wrong {silent_wrong}, {money(cascade_cost * work['per_month'])}/month")
frontier = per_request(big) * work["per_month"]
print(f"vs frontier for everything: {money(frontier)}/month -> cascade saves "
      f"{round((1 - (cascade_cost * work['per_month']) / frontier) * 100)}%")
print(f"vs {pick['name']} alone: cascade costs {cascade_cost / per_request(pick) * 100:.1f}% of it")` },
        ],
      },
    ],
  },
  {
    title: `How do you choose between open-weight models and proprietary API models?`,
    difficulty: "medium",
    seoDescription: `Open-weight vs proprietary API models: hard constraints first (data, customisation, quality), then a break-even on volume, GPU utilisation and ops cost.`,
    description: `**Question presented to candidate:**
"Our team is debating whether to keep paying for a proprietary model API or to run an open-weight model ourselves. How would you make that decision, and what would change your mind either way?"

**What a strong answer should cover:**
- The definitions: open-weight means the trained weights are downloadable and runnable under a licence (not necessarily open source); proprietary means you only reach the model through the vendor API
- Hard constraints decide first: data that may not leave your network or region, a need to fine-tune or pin exact weights, or a quality bar that only a frontier proprietary model meets on your evals
- The cost model: API cost grows linearly with tokens; self-hosting is mostly fixed (GPUs provisioned for peak, redundancy, engineering time), so there is a break-even volume, and utilisation drives it
- Hidden costs of self-hosting: serving stack (vLLM or similar), autoscaling, upgrades, evals for every new release, on-call; and the middle options (open-weight models on a managed host or cloud marketplace)
- Licence terms matter: some open-weight licences restrict use (for example the Llama community licence threshold for very large companies), while others are permissive (Apache 2.0, MIT)

**Clarifying questions expected:**
- What volume and traffic shape do we have, and how fast is it growing?
- Are there data-residency, privacy or air-gap requirements?
- Does the team already run GPU infrastructure, and who would be on call for it?

**Code / implementation expected:** Optional — a break-even calculation with stated assumptions is a strong signal; no model call is needed.`,
    answer: `**Target Audience:** Engineers and tech leads who have shipped on a model API and are asked "should we run our own model?"
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (the break-even model below; every input is a labelled assumption, not a quote). Licence and product facts are cited inline with the source and the date checked (October 2026).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A restaurant needs bread. It can buy from a bakery every morning: pay per loaf, no ovens, no bakers, and the bakery bakes better bread than the restaurant could. Or it can install ovens and hire a baker: a large fixed bill every month whether it sells 100 loaves or 10,000, but each extra loaf is almost free, the recipe is under its own control, and nobody outside sees what goes into it.

At 100 loaves a day the bakery wins easily. At 10,000 the ovens pay for themselves, if the kitchen is busy enough to keep them hot. And if the restaurant must use a secret family recipe, or is not allowed to let anyone else touch its ingredients, the price comparison never even starts.

Choosing between a proprietary model API and an open-weight model is exactly this decision. It has two halves, and the order matters: **constraints** (data, control, quality) first, **economics** (volume, utilisation, people) second.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How many requests and tokens per month, and how fast is it growing? | The break-even is a volume; below it the API almost always wins |
| What does traffic look like over a day? | GPUs are sized for the peak; a spiky load wastes most of the capacity |
| Can the data leave our network, region or cloud account? | A hard no forces self-hosting (or a private deployment) regardless of cost |
| Do we need to fine-tune, or freeze exact weights for audit? | Proprietary fine-tuning is limited to what the vendor offers; open weights give full control |
| What quality bar do we need, measured how? | Decides whether any open-weight model is even a candidate |
| Does the team already run GPU infrastructure and on-call? | The people cost is often larger than the GPU cost at moderate scale |

## 3. The Two Options, Defined Precisely

📌 **Interview term: proprietary (closed) model** — a model whose weights the vendor keeps; you can only use it through the vendor API (or a cloud partner that hosts it for them). You pay per token, the vendor runs the hardware, and the vendor decides when versions change or retire.

📌 **Interview term: open-weight model** — a model whose trained weights are published for download, so you can run, fine-tune and inspect it on hardware you choose, under the terms of its licence. Examples with permissive licences: DeepSeek-R1 was released in January 2025 under the MIT licence, and OpenAI gpt-oss-120b and gpt-oss-20b were released on 5 August 2025 under Apache 2.0 (both checked October 2026 via release coverage and model listings).

📌 **Interview term: open-weight vs open source** — not the same thing. The Open Source Initiative Open Source AI Definition 1.0 (OSI, released 28 October 2024 at All Things Open) requires the weights, the code, and enough detail about the training data that a skilled person could build a substantially equivalent system, all under terms without field-of-use restrictions. Many open-weight models publish weights only, and some licences add conditions. The Llama community licences, for example, require companies whose products exceed 700 million monthly active users to ask Meta for a separate licence (reported for Llama 2 by The Register, July 2023, and repeated for later Llama versions), which is one reason OSI says Llama is not open source.

📌 **Interview term: model licence** — the legal terms attached to open weights: whether commercial use is allowed, whether outputs may be used to train other models, attribution rules, and user-count thresholds. Read it before you build on a model; it is part of the decision, not a formality.

There is also a middle path that interviews often miss:

| Option | Who runs the GPUs | Data leaves your environment? | Pricing |
| :--- | :--- | :--- | :--- |
| Proprietary API | Vendor | Yes (vendor terms and retention options apply) | Per token |
| Proprietary model via your cloud provider | Cloud provider | To the cloud provider, often within your region and account boundary | Per token or provisioned |
| Open-weight on a managed inference host | Host | Yes, to the host | Per token, usually lower |
| Open-weight self-hosted | You | No | Per GPU-hour, plus people |

The privacy benefit of open weights comes from **where the model runs**, not from the licence.

## 4. Step One: Hard Constraints Decide Before Cost

<svg class="iq-diagram" width="100%" viewBox="0 0 820 320" role="img" aria-label="Decision flow: data must stay on premises leads to open weight; only a frontier API passes evals leads to API; must fine tune or pin weights leads to open weight; otherwise compare cost at your volume">
  <defs>
    <marker id="ai02q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="30" width="230" height="70" rx="10"/>
  <text class="d-text" x="135" y="62" text-anchor="middle">data must stay</text>
  <text class="d-sub" x="135" y="84" text-anchor="middle">in our network?</text>
  <rect class="d-box" x="20" y="130" width="230" height="70" rx="10"/>
  <text class="d-text" x="135" y="162" text-anchor="middle">only a closed model</text>
  <text class="d-sub" x="135" y="184" text-anchor="middle">passes our evals?</text>
  <rect class="d-box" x="20" y="230" width="230" height="70" rx="10"/>
  <text class="d-text" x="135" y="262" text-anchor="middle">must own weights</text>
  <text class="d-sub" x="135" y="284" text-anchor="middle">fine-tune or pin?</text>
  <rect class="d-box-accent" x="560" y="30" width="240" height="70" rx="10"/>
  <text class="d-text" x="680" y="70" text-anchor="middle">open weights, self-host</text>
  <rect class="d-box-accent" x="560" y="130" width="240" height="70" rx="10"/>
  <text class="d-text" x="680" y="170" text-anchor="middle">proprietary API</text>
  <rect class="d-box-muted" x="560" y="230" width="240" height="70" rx="10"/>
  <text class="d-text" x="680" y="262" text-anchor="middle">otherwise</text>
  <text class="d-sub" x="680" y="284" text-anchor="middle">break-even on cost</text>
  <path class="d-edge" d="M 254 65 L 554 65" marker-end="url(#ai02q2-arrow)"/>
  <path class="d-edge" d="M 254 165 L 554 165" marker-end="url(#ai02q2-arrow)"/>
  <path class="d-edge" d="M 254 255 L 400 255 L 400 80 L 554 80" marker-end="url(#ai02q2-arrow)"/>
  <path class="d-edge-dashed" d="M 254 280 L 554 280" marker-end="url(#ai02q2-arrow)"/>
  <text class="d-accent" x="330" y="56" text-anchor="middle">yes</text>
  <text class="d-accent" x="330" y="156" text-anchor="middle">yes</text>
  <text class="d-accent" x="480" y="272" text-anchor="middle">no to all</text>
</svg>

The checks run top to bottom; the first "yes" decides, and only when all three are "no" does the cost comparison below matter.

**Data control.** Regulated data (health records, defence, some financial data), air-gapped environments, or contracts that forbid third-party processing push to self-hosted open weights. Proprietary vendors and cloud platforms publish their own data-handling terms (whether API data is used for training, retention periods, regional processing); read the current terms for your account and check whether they already satisfy your compliance team before assuming you must self-host. See [How do you handle PII and sensitive data when calling LLM APIs?](/interview-question/how-do-you-handle-pii-and-sensitive-data-when-calling-llm-apis)

**Quality.** Run the same golden set on both kinds of candidate. If only a proprietary model clears the bar, the decision is made for now. The general method is in the sibling question [How do you choose the right model for a task?](/interview-question/how-do-you-choose-the-right-model-for-a-task)

**Control over the weights.** Owning the weights means a version never changes under you, you can fine-tune freely (full fine-tuning or LoRA, see [What is the difference between fine-tuning, LoRA and prompt engineering?](/interview-question/what-is-the-difference-between-fine-tuning-lora-and-prompt-engineering)), quantise for cheaper hardware ([What is quantization?](/interview-question/what-is-quantization-and-when-would-you-use-a-quantized-model)), and inspect logits or internals for research.

## 5. Step Two: The Cost Shape

The two options have different cost *shapes*, which is why the answer flips with volume.

📌 **Interview term: variable vs fixed cost** — an API bill is variable: zero requests cost zero, and cost grows in a straight line with tokens. Self-hosting is mostly fixed: you pay for provisioned GPUs every hour whether they are busy or idle, plus the people who run them.

📌 **Interview term: break-even volume** — the monthly volume at which the fixed self-hosting cost equals the variable API bill. Below it the API is cheaper; above it self-hosting is cheaper, as long as the assumptions hold.

📌 **Interview term: GPU utilisation** — the share of provisioned serving capacity actually used on average. Capacity must cover the peak, so a load with a 3x peak-to-average ratio leaves GPUs about two thirds idle on average. Utilisation is the single biggest lever in the comparison.

The example models it with these assumptions (all illustrative; replace with your own quotes and load tests):

| Assumption | Value |
| :--- | :--- |
| Tokens per request | 1,200 in, 300 out |
| API price | $1.00 per 1M input, $4.00 per 1M output tokens |
| GPU price | $2.50 per GPU-hour, 730 hours a month |
| Throughput | 4 requests/second per GPU at the latency budget (from a load test) |
| Peak-to-average traffic | 3x |
| Minimum replicas | 2 (one can fail or be upgraded) |
| Engineering time | $5,000 a month for serving, upgrades and on-call |

The core of the calculation:

~~~js
const peakRps = (reqPerMonth / SECONDS) * A.peakToAvg;
const gpus = Math.max(A.minGpus, Math.ceil(peakRps / A.rpsPerGpu));
const cost = gpus * A.gpuHour * HOURS + A.opsPerMonth;   // fixed-ish, steps up with peak
~~~

And the result:

~~~text
volume/month   API         self-host   GPUs  avg GPU util  cheaper
1M             $2,400      $8,650      2     5%            API
3M             $7,200      $8,650      2     14%           API
10M            $24,000     $10,475     3     32%           self-host
30M            $72,000     $21,425     9     32%           self-host
100M           $240,000    $57,925     29    33%           self-host
break-even: about 3.7M requests/month ($8,880 API spend)
if you forget the engineer: break-even looks like 1.6M requests/month
~~~

How to read it:

- At 1M requests the two minimum GPUs sit at 5% utilisation; you are paying for idle silicon and an engineer. The API is 3.6 times cheaper.
- Past the break-even, self-hosting gets cheaper fast, because each extra GPU is cheap relative to the API tokens it replaces.
- Utilisation plateaus near 33% because of the 3x peak. Smoothing the load (queues, batch jobs at night, see [When should you use batch APIs?](/interview-question/when-should-you-use-batch-apis-instead-of-real-time-llm-calls)) or autoscaling raises it and moves the break-even down.
- **The people cost matters most at small scale.** Leaving out $5,000 of engineering time makes self-hosting look cheaper from 1.6M requests instead of 3.7M.

Two limits of this model, said out loud: it assumes the self-hosted model meets the same quality bar as the API tier it is compared with (if it needs a bigger model, the throughput assumption collapses), and it ignores the API side discounts that also change with volume (prompt caching, batch pricing, committed-use contracts).

### Where the throughput number comes from

The \`rpsPerGpu\` input is the one most often guessed. It depends on the model size, quantisation, prompt and output lengths, and the serving engine.

📌 **Interview term: inference server** — the software that loads the weights and serves requests efficiently, batching many requests on one GPU. vLLM is a widely used open-source example; its PagedAttention paper (Kwon et al., SOSP 2023, arXiv 2309.06180) reported 2-4x higher throughput than earlier serving systems at the same latency by managing the KV cache memory like virtual memory pages. The engine you pick can change the GPU count more than the GPU price does.

Measure it with a load test on your real traffic shape, and read it at your latency budget, not at maximum throughput.

## 6. The Hidden Costs and Benefits

| Factor | Proprietary API | Open-weight, self-hosted |
| :--- | :--- | :--- |
| Upfront work | An API key | Serving stack, autoscaling, monitoring, GPU quota |
| Upgrades | Vendor ships new versions; old ones get deprecated on their schedule | You choose when; every upgrade is your eval and rollout work |
| Peak traffic | Provider rate limits and quotas | Your provisioned capacity; bursts queue or fail |
| Reliability | Vendor outages; mitigate with a second provider | Your on-call; GPU failures are your incident |
| Customisation | Prompting, vendor fine-tuning options | Full fine-tuning, LoRA adapters, quantisation, custom decoding |
| Features | Built-in tools, caching, structured output, often first to market | Whatever your serving stack supports; usually catches up later |
| Exit cost | Prompts tuned to one vendor, vendor-only features | GPU commitments, in-house tooling |

## 7. A Combined Decision Function

The example ends by applying the order from section 4 to four scenarios:

~~~text
startup chatbot, 2M req     -> API (cheaper at this volume)
hospital notes, air-gapped  -> open-weight (data may not leave your network)
agentic coding assistant    -> API (no open-weight model met the eval bar)
bulk classifier, 60M req    -> open-weight (cheaper at this volume)
~~~

The coding assistant has the highest volume after the classifier, but volume is irrelevant if no open-weight candidate passes its evals. The hospital is below the break-even, but the constraint decides before cost does.

## 8. Verified: Running the Code

The example **"Break-even between a per-token API and self-hosted GPUs, plus a constraint-first decision"** is pure arithmetic: no model runs and no prices are fetched. It stands in for a spreadsheet you would build with real quotes; it leaves out reserved-instance discounts, autoscaling, cached-token pricing, egress and the cost of the eval and upgrade cycle.

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
API cost per request: $0.0024
volume/month   API         self-host   GPUs  avg GPU util  cheaper
1M             $2,400      $8,650      2     5%            API
3M             $7,200      $8,650      2     14%           API
10M            $24,000     $10,475     3     32%           self-host
30M            $72,000     $21,425     9     32%           self-host
100M           $240,000    $57,925     29    33%           self-host
break-even: about 3.7M requests/month ($8,880 API spend)
if you forget the engineer: break-even looks like 1.6M requests/month
startup chatbot, 2M req     -> API (cheaper at this volume)
hospital notes, air-gapped  -> open-weight (data may not leave your network)
agentic coding assistant    -> API (no open-weight model met the eval bar)
bulk classifier, 60M req    -> open-weight (cheaper at this volume)
~~~

## Edge Cases Worth Knowing

- **"Open" models hosted by someone else.** Calling an open-weight model through a third-party inference API is economically and privacy-wise much closer to a proprietary API than to self-hosting.
- **Licences change per version.** Licence terms are attached to each release; a newer version of the same family can have different terms. Check the licence of the exact checkpoint you deploy.
- **Hardware fit decides the model size.** OpenAI described gpt-oss-120b as running within 80 GB of GPU memory and gpt-oss-20b within 16 GB (release coverage, checked October 2026). A model that does not fit one GPU needs multi-GPU serving, which changes the cost model.
- **Mixed portfolios are normal.** Many teams run a self-hosted small model for high-volume classification or embeddings and call a proprietary frontier model for the hard tail, behind one interface.

## Common Pitfalls

- **Comparing GPU-hour price to token price without utilisation.** A GPU bought for peak traffic is mostly idle; the effective cost per request is several times the naive number.
- **Leaving people out of the spreadsheet.** Serving, upgrades, evals for each new release and on-call are real costs that dominate at moderate scale.
- **Assuming open weights equals privacy.** Only self-hosting (or a private deployment) keeps data in your environment; the licence does not.
- **Calling open-weight models open source.** Interviewers notice. Say open-weight, and mention that the licence and missing training data are the difference.
- **Ignoring the quality check.** Cost comparisons assume the cheaper option passes the same evals. If it does not, the comparison is meaningless.
- **Locking in either way.** Without a provider-neutral interface and a re-runnable eval suite, you cannot move workloads when prices or models change.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define the terms:</strong> <span style="color:#f0e2c8;">An <strong style="color:#ffca28;">open-weight</strong> model ships its weights under a licence so I can run it anywhere; a proprietary model is only reachable through the vendor API. Open-weight is not the same as open source: the licence can restrict use and the training data is usually not released.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Hard constraints first:</strong> <span style="color:#f0e2c8;">If data may not leave our network, or we must fine-tune and pin exact weights, that points to open-weight. If only a proprietary frontier model clears our eval bar, that points to the API. Cost only decides when neither applies.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Then cost shape:</strong> <span style="color:#f0e2c8;">The API is pay per token, linear in volume, zero fixed cost. Self-hosting is mostly fixed: GPUs sized for <strong style="color:#ffca28;">peak</strong> traffic, at least two replicas, and engineering time. So there is a <strong style="color:#ffca28;">break-even volume</strong>, and with my assumptions it was about <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">3.7M</code> requests a month.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. The hidden costs:</strong> <span style="color:#f0e2c8;">Utilisation is the lever: in my model average GPU utilisation was 32% because capacity is sized for a 3x peak. Add the serving stack, upgrades, evals for every new release and on-call. Forgetting the engineer moved the break-even from 3.7M to 1.6M requests.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Keep both options:</strong> <span style="color:#f0e2c8;">Most teams start on an API, put a provider-neutral interface in front, keep the eval suite ready, and move specific high-volume or sensitive workloads to open weights, sometimes on a managed host, when the numbers or the constraints say so.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is an open-weight model the same as open source?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Open-weight means you can download and run the weights. The OSI Open Source AI Definition 1.0 also asks for the code and enough information about the training data for a skilled person to build a substantially equivalent system, and an OSI-approved licence without field-of-use limits. Many popular open-weight models do not meet that; their licences add conditions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does open-weight mean my data is automatically safe?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only if you host it in an environment you control. Running an open-weight model through a third-party inference provider sends data to that provider just like a proprietary API. The privacy benefit comes from where the model runs, not from the licence.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you measure GPU throughput for the break-even?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Load-test the exact model, quantisation, serving engine and your real prompt and output lengths, and find the request rate at which p95 latency still meets the budget. Vendor tokens-per-second numbers are measured on their workload; prefill-heavy or long-output workloads behave very differently.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about quality: are open-weight models good enough?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It depends on the task, and you answer it with your own evals, not with the general gap. For classification, extraction and many RAG answers a mid-size open model often passes; for the hardest agentic or reasoning tasks a frontier API model may be the only one that clears the bar.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What makes switching later hard?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Prompts tuned to one model family, provider-specific features such as built-in tools or prompt caching, and no regression suite. A thin wrapper, prompts kept in version control and an eval set you can run against any model keep the switch cheap.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Proprietary (closed) model | Weights kept by the vendor; usable only through its API |
| Open-weight model | Weights published for download and use under a licence |
| Open-weight vs open source | Open source (OSI OSAID 1.0) also needs code, training-data information and unrestricted terms |
| Model licence | Legal terms on open weights: commercial use, thresholds, output use |
| Variable vs fixed cost | API cost scales with tokens; self-hosting is paid per provisioned GPU-hour plus people |
| Break-even volume | Volume where self-hosting cost equals the API bill |
| GPU utilisation | Average share of provisioned capacity actually used |
| Inference server | Software that serves a model efficiently by batching requests, such as vLLM |

**Conclusion:** The open-weight versus proprietary decision is constraints first, economics second. Data that must stay in your network, or a need to own and fine-tune the weights, points to open weights; a quality bar only a proprietary model clears points to the API. When neither applies, compare a linear per-token bill with a mostly fixed self-hosting bill: GPUs sized for peak, replicas for reliability and the engineers who run them. That gives a break-even volume that moves a lot with utilisation and people cost. Say clearly that open-weight is not open source, that privacy comes from where the model runs, and that the best teams keep a provider-neutral interface and an eval suite so they can move each workload to whichever side wins.`,
    examples: [
      {
        label: `Break-even between a per-token API and self-hosted GPUs, plus a constraint-first decision`,
        variants: [
          { tech: "node", code: `// Open-weight (self-hosted) vs proprietary API: hard constraints first,
// then break-even arithmetic. Every number below is an ASSUMPTION you would
// replace with your own quotes and load-test results.
const A = {
  inTok: 1200, outTok: 300,          // tokens per request
  apiIn: 1.0, apiOut: 4.0,           // API $ per 1M tokens (illustrative)
  gpuHour: 2.5,                      // $ per GPU-hour (illustrative cloud price)
  rpsPerGpu: 4,                      // sustained requests/s one GPU serves (from a load test)
  peakToAvg: 3,                      // traffic peak divided by average
  minGpus: 2,                        // two replicas so one can fail or be upgraded
  opsPerMonth: 5000,                 // share of an engineer for serving, upgrades, on-call
};
const HOURS = 730, SECONDS = 30 * 86400;
const apiPerReq = (A.inTok * A.apiIn + A.outTok * A.apiOut) / 1e6;
const money = (x) => "$" + Math.round(x).toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");

function selfHost(reqPerMonth) {
  const peakRps = (reqPerMonth / SECONDS) * A.peakToAvg;
  const gpus = Math.max(A.minGpus, Math.ceil(peakRps / A.rpsPerGpu));
  return { gpus, cost: gpus * A.gpuHour * HOURS + A.opsPerMonth, util: reqPerMonth / SECONDS / (gpus * A.rpsPerGpu) };
}

console.log("API cost per request: $" + apiPerReq.toFixed(4));
console.log("volume/month   API         self-host   GPUs  avg GPU util  cheaper");
for (const v of [1e6, 3e6, 10e6, 30e6, 100e6]) {
  const s = selfHost(v), api = v * apiPerReq;
  console.log((v / 1e6 + "M").padEnd(15) + money(api).padEnd(12) + money(s.cost).padEnd(12) +
    String(s.gpus).padEnd(6) + (Math.round(s.util * 100) + "%").padEnd(14) + (api < s.cost ? "API" : "self-host"));
}
let v = 0;
while (v * apiPerReq <= selfHost(v).cost) v += 100000;
console.log("break-even: about " + (v / 1e6).toFixed(1) + "M requests/month (" + money(v * apiPerReq) + " API spend)");
const noOps = { ...A, opsPerMonth: 0 };
let w = 0;
const hostNoOps = (r) => Math.max(noOps.minGpus, Math.ceil(((r / SECONDS) * noOps.peakToAvg) / noOps.rpsPerGpu)) * noOps.gpuHour * HOURS;
while (w * apiPerReq <= hostNoOps(w)) w += 100000;
console.log("if you forget the engineer: break-even looks like " + (w / 1e6).toFixed(1) + "M requests/month");

// Hard constraints decide before cost does.
function decide(s) {
  if (s.weightsMustStayOnPrem) return "open-weight (data may not leave your network)";
  if (s.needsFrontierQuality) return "API (no open-weight model met the eval bar)";
  if (s.needsCustomWeights) return "open-weight (you must fine-tune or pin the exact weights)";
  return s.reqPerMonth * apiPerReq < selfHost(s.reqPerMonth).cost ? "API (cheaper at this volume)" : "open-weight (cheaper at this volume)";
}
const scenarios = [
  { name: "startup chatbot, 2M req", reqPerMonth: 2e6 },
  { name: "hospital notes, air-gapped", reqPerMonth: 2e6, weightsMustStayOnPrem: true },
  { name: "agentic coding assistant", reqPerMonth: 40e6, needsFrontierQuality: true },
  { name: "bulk classifier, 60M req", reqPerMonth: 60e6 },
];
for (const s of scenarios) console.log(s.name.padEnd(28) + "-> " + decide(s));` },
          { tech: "python", code: `# Open-weight (self-hosted) vs proprietary API: hard constraints first,
# then break-even arithmetic. Every number below is an ASSUMPTION you would
# replace with your own quotes and load-test results.
import math

A = {
    "in_tok": 1200, "out_tok": 300,      # tokens per request
    "api_in": 1.0, "api_out": 4.0,       # API $ per 1M tokens (illustrative)
    "gpu_hour": 2.5,                     # $ per GPU-hour (illustrative cloud price)
    "rps_per_gpu": 4,                    # sustained requests/s one GPU serves (from a load test)
    "peak_to_avg": 3,                    # traffic peak divided by average
    "min_gpus": 2,                       # two replicas so one can fail or be upgraded
    "ops_per_month": 5000,               # share of an engineer for serving, upgrades, on-call
}
HOURS, SECONDS = 730, 30 * 86400
api_per_req = (A["in_tok"] * A["api_in"] + A["out_tok"] * A["api_out"]) / 1e6


def money(x):
    return "$" + f"{math.floor(x + 0.5):,}"


def self_host(req_per_month, ops=A["ops_per_month"]):
    peak_rps = (req_per_month / SECONDS) * A["peak_to_avg"]
    gpus = max(A["min_gpus"], math.ceil(peak_rps / A["rps_per_gpu"]))
    util = req_per_month / SECONDS / (gpus * A["rps_per_gpu"])
    return {"gpus": gpus, "cost": gpus * A["gpu_hour"] * HOURS + ops, "util": util}


print(f"API cost per request: \${api_per_req:.4f}")
print("volume/month   API         self-host   GPUs  avg GPU util  cheaper")
for v in [1e6, 3e6, 10e6, 30e6, 100e6]:
    s, api = self_host(v), v * api_per_req
    print(f"{int(v // 1e6)}M".ljust(15) + money(api).ljust(12) + money(s["cost"]).ljust(12)
          + str(s["gpus"]).ljust(6) + (str(math.floor(s["util"] * 100 + 0.5)) + "%").ljust(14)
          + ("API" if api < s["cost"] else "self-host"))
v = 0
while v * api_per_req <= self_host(v)["cost"]:
    v += 100000
print(f"break-even: about {v / 1e6:.1f}M requests/month ({money(v * api_per_req)} API spend)")
w = 0
while w * api_per_req <= self_host(w, ops=0)["cost"]:
    w += 100000
print(f"if you forget the engineer: break-even looks like {w / 1e6:.1f}M requests/month")


# Hard constraints decide before cost does.
def decide(s):
    if s.get("weights_must_stay_on_prem"):
        return "open-weight (data may not leave your network)"
    if s.get("needs_frontier_quality"):
        return "API (no open-weight model met the eval bar)"
    if s.get("needs_custom_weights"):
        return "open-weight (you must fine-tune or pin the exact weights)"
    if s["req"] * api_per_req < self_host(s["req"])["cost"]:
        return "API (cheaper at this volume)"
    return "open-weight (cheaper at this volume)"


scenarios = [
    {"name": "startup chatbot, 2M req", "req": 2e6},
    {"name": "hospital notes, air-gapped", "req": 2e6, "weights_must_stay_on_prem": True},
    {"name": "agentic coding assistant", "req": 40e6, "needs_frontier_quality": True},
    {"name": "bulk classifier, 60M req", "req": 60e6},
]
for s in scenarios:
    print(s["name"].ljust(28) + "-> " + decide(s))` },
        ],
      },
    ],
  },
  {
    title: `How do temperature, top-p and other sampling parameters affect output?`,
    difficulty: "medium",
    seoDescription: `Temperature reshapes the next-token distribution, top-k, top-p and min-p cut its tail, and penalties edit logits: what each does and how to set them.`,
    description: `**Question presented to candidate:**
"When you call an LLM API you can set temperature, top-p and a few other sampling knobs. What does each one actually do to the output, and how would you set them for, say, data extraction versus brainstorming?"

**What a strong answer should cover:**
- The model outputs logits for every token; sampling parameters only change how the next token is chosen from that distribution, not what the model knows
- Temperature divides the logits before softmax: below 1 sharpens toward the top token, above 1 flattens and gives rare (often junk) tokens more mass; 0 means greedy
- Truncation methods: top-k keeps a fixed number of candidates, top-p (nucleus) keeps the smallest set whose probability adds up to p, min-p keeps tokens above a fraction of the top token probability; the order of truncation and temperature matters
- Frequency and presence penalties (and logit bias) edit logits based on what was already generated or on explicit token IDs, to reduce repetition or ban tokens
- Practical settings: low or zero temperature for extraction, classification and code; moderate for chat; higher plus truncation for creative work; change one knob at a time; temperature 0 is not fully deterministic; newer reasoning-style models may reject these parameters

**Code / implementation expected:** Optional — implementing temperature, top-p and penalties on a small logits vector and showing their effect is a strong signal.`,
    answer: `**Target Audience:** Developers who call LLM APIs and want to set sampling parameters on purpose rather than by copying defaults.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (the sampling pipeline in the example runs on a fixed logits vector; no real model is called). API parameter rules are cited inline with the source and the date checked (October 2026).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Picture a quiz show contestant who, for every question, privately ranks every possible answer by how likely it is to be right. The ranking is the contestant knowledge; nothing you say on the day can change it. What you *can* change is the rule for which answer they say out loud.

"Always say your top answer" gives a predictable, sometimes boring contestant. "Pick at random, weighted by your confidence" gives variety and occasional brilliance, and occasionally something absurd. "Pick at random, but only among your top three" keeps the variety and removes the absurd.

That is all sampling parameters are. The model produces the ranking (the probability of every next token); the parameters are the rule for picking one. If you understand that, you can predict what each knob does, why "temperature 0" for a data-extraction job is sensible, and why no setting will make a model know a fact it does not know. The basic generation loop is covered in [What is a Large Language Model and how does it generate text?](/interview-question/what-is-a-large-language-model-and-how-does-it-generate-text); this doc goes deep on the picking rule.

## 2. Where Sampling Sits in Each Step

📌 **Interview term: logits** — the raw score the model outputs for each token in its vocabulary at each step. Softmax turns them into probabilities that add up to 1.

📌 **Interview term: sampling (decoding) parameters** — the settings that turn those probabilities into one chosen token: temperature, top-k, top-p, min-p, penalties and logit bias. They run after the model, on every generated token.

<svg class="iq-diagram" width="100%" viewBox="0 0 860 190" role="img" aria-label="Sampling pipeline per token: logits, penalties, temperature, softmax, truncation by top k top p or min p, then draw one token">
  <defs>
    <marker id="ai02q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="15" y="50" width="120" height="80" rx="10"/>
  <text class="d-text" x="75" y="86" text-anchor="middle">logits</text>
  <text class="d-sub" x="75" y="110" text-anchor="middle">from model</text>
  <rect class="d-box" x="185" y="50" width="130" height="80" rx="10"/>
  <text class="d-text" x="250" y="86" text-anchor="middle">penalties</text>
  <text class="d-sub" x="250" y="110" text-anchor="middle">logit bias</text>
  <rect class="d-box" x="365" y="50" width="130" height="80" rx="10"/>
  <text class="d-text" x="430" y="86" text-anchor="middle">temperature</text>
  <text class="d-sub" x="430" y="110" text-anchor="middle">then softmax</text>
  <rect class="d-box" x="545" y="50" width="130" height="80" rx="10"/>
  <text class="d-text" x="610" y="86" text-anchor="middle">truncate</text>
  <text class="d-sub" x="610" y="110" text-anchor="middle">top-k, p, min-p</text>
  <rect class="d-box-accent" x="725" y="50" width="120" height="80" rx="10"/>
  <text class="d-text" x="785" y="86" text-anchor="middle">draw</text>
  <text class="d-sub" x="785" y="110" text-anchor="middle">one token</text>
  <path class="d-edge" d="M 139 90 L 179 90" marker-end="url(#ai02q3-arrow)"/>
  <path class="d-edge" d="M 319 90 L 359 90" marker-end="url(#ai02q3-arrow)"/>
  <path class="d-edge" d="M 499 90 L 539 90" marker-end="url(#ai02q3-arrow)"/>
  <path class="d-edge" d="M 679 90 L 719 90" marker-end="url(#ai02q3-arrow)"/>
</svg>

This is the order the example uses. Serving engines differ in the exact order (some let you apply temperature last), and the order changes results, as section 5 shows. The example uses one fixed set of logits for the prompt "The weather today is", over an 8-token vocabulary that includes two nonsense continuations, \`purple\` and \`banana\`:

~~~js
const vocab = ["sunny", "cloudy", "rainy", "warm", "nice", "cold", "purple", "banana"];
const logits = [3.0, 2.5, 2.0, 1.5, 1.2, 0.8, -1.0, -2.5];
~~~

A real vocabulary has tens of thousands to a few hundred thousand tokens, so the "junk tail" is far longer than two tokens, which makes the effects below larger in practice.

## 3. Temperature: Reshaping the Distribution

📌 **Interview term: temperature** — each logit is divided by T before softmax. T below 1 exaggerates differences (the top token takes more probability); T above 1 shrinks them (the distribution flattens and rare tokens gain). T = 0 is treated as **greedy decoding**: always take the top token.

~~~js
const e = ls.map(([w, x]) => [w, Math.exp((x - m) / T)]);   // divide by T, subtract max for stability
~~~

The example output:

~~~text
T=0.2  top3: sunny=0.918 cloudy=0.075 rainy=0.006 | P(purple or banana)=0.0000
T=0.7  top3: sunny=0.508 cloudy=0.249 rainy=0.122 | P(purple or banana)=0.0019
T=1.0  top3: sunny=0.401 cloudy=0.243 rainy=0.147 | P(purple or banana)=0.0090
T=1.5  top3: sunny=0.310 cloudy=0.222 rainy=0.159 | P(purple or banana)=0.0295
T=3.0  top3: sunny=0.216 cloudy=0.183 rainy=0.155 | P(purple or banana)=0.0916
T=0 (greedy) -> sunny
~~~

Two things to notice. The *ranking* never changes: \`sunny\` is always the favourite, because dividing by a positive number keeps the order. And the nonsense mass grows quickly with temperature: from 0.9% at T=1.0 to 9.2% at T=3.0. With 10,000 draws at T=3.0 the example picked a nonsense token 922 times.

Provider ranges differ: OpenAI chat completions document temperature between 0 and 2, while Anthropic documents 0 to 1 with a default of 1.0 (third-party API references, checked October 2026). The same number does not mean the same thing on every API.

## 4. Truncation: Cutting Off the Tail

Temperature reshapes; truncation removes. All three methods below throw away low-probability tokens and renormalise the rest.

📌 **Interview term: top-k** — keep only the k most likely tokens. Simple, but k is fixed: k=3 is too narrow when the model is unsure among ten good options, and too wide when only one option is sensible.

📌 **Interview term: top-p (nucleus sampling)** — sort tokens by probability and keep the smallest set whose probabilities add up to at least p. Introduced by Holtzman et al., "The Curious Case of Neural Text Degeneration" (arXiv 1904.09751, ICLR 2020). The kept set grows when the model is unsure and shrinks when it is confident.

📌 **Interview term: min-p** — keep every token whose probability is at least min_p times the probability of the top token. The threshold scales with the model confidence. Proposed in "Turning Up the Heat: Min-p Sampling for Creative and Coherent LLM Outputs" (Nguyen et al., ICLR 2025, arXiv 2407.01082), and supported by Hugging Face Transformers and vLLM per that paper coverage.

~~~text
candidates kept:
  T=1.0 top_k=3       3 tokens: sunny cloudy rainy
  T=1.0 top_p=0.9     5 tokens: sunny cloudy rainy warm nice
  T=3.0 top_p=0.9     6 tokens: sunny cloudy rainy warm nice cold
  T=1.0 min_p=0.2     4 tokens: sunny cloudy rainy warm
  T=3.0 min_p=0.2     7 tokens: sunny cloudy rainy warm nice cold purple
  min_p=0.2, T=3 last 4 tokens: sunny cloudy rainy warm
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 760 270" role="img" aria-label="Bar chart of the eight token probabilities at temperature one with the top p 0.9 cut line after the fifth token">
  <rect class="d-box-accent" x="40" y="50" width="60" height="160" rx="4"/>
  <rect class="d-box-accent" x="125" y="113" width="60" height="97" rx="4"/>
  <rect class="d-box-accent" x="210" y="151" width="60" height="59" rx="4"/>
  <rect class="d-box-accent" x="295" y="174" width="60" height="36" rx="4"/>
  <rect class="d-box-accent" x="380" y="184" width="60" height="26" rx="4"/>
  <rect class="d-box-muted" x="465" y="192" width="60" height="18" rx="4"/>
  <rect class="d-box-muted" x="550" y="206" width="60" height="4" rx="2"/>
  <rect class="d-box-muted" x="635" y="208" width="60" height="2" rx="1"/>
  <text class="d-sub" x="70" y="240" text-anchor="middle">sunny</text>
  <text class="d-sub" x="155" y="240" text-anchor="middle">cloudy</text>
  <text class="d-sub" x="240" y="240" text-anchor="middle">rainy</text>
  <text class="d-sub" x="325" y="240" text-anchor="middle">warm</text>
  <text class="d-sub" x="410" y="240" text-anchor="middle">nice</text>
  <text class="d-sub" x="495" y="240" text-anchor="middle">cold</text>
  <text class="d-sub" x="580" y="240" text-anchor="middle">purple</text>
  <text class="d-sub" x="665" y="240" text-anchor="middle">banana</text>
  <text class="d-sub" x="70" y="38" text-anchor="middle">0.40</text>
  <path class="d-edge-dashed" d="M 452 30 L 452 220"/>
  <text class="d-accent" x="560" y="80" text-anchor="middle">cut at top-p 0.9</text>
</svg>

At T=1.0 the five tokens left of the dashed line hold about 95% of the probability (the first four hold only 88%), so top-p 0.9 keeps exactly these five and drops \`cold\`, \`purple\` and \`banana\`.

The effect on 10,000 seeded draws:

~~~text
10000 seeded draws:
  T=1.0               sunny=4031 distinct=8 junk=90
  T=3.0               sunny=2194 distinct=8 junk=922
  T=3.0 top_p=0.9     sunny=2399 distinct=6 junk=0
  T=3.0 min_p=0.2     sunny=2260 distinct=7 junk=588
  min_p=0.2, T=3 last sunny=3178 distinct=4 junk=0
~~~

## 5. Order Matters: Truncate First or Flatten First?

The \`T=3.0 min_p=0.2\` row is the surprise: min-p computed on the flattened T=3.0 distribution still lets \`purple\` in (588 junk draws), because at T=3.0 \`purple\` is more than 20% as likely as \`sunny\`. Computing min-p on the T=1.0 distribution and only then applying temperature to the survivors keeps 4 sensible tokens and zero junk.

📌 **Interview term: sampler order** — the sequence in which an engine applies penalties, temperature and truncation. Some local inference engines let you configure it (for example a "temperature last" option). Hosted APIs fix it internally and usually do not document it in detail, so test settings on your own outputs rather than assuming.

## 6. Penalties and Logit Bias: Editing the Logits Directly

These change the scores before temperature, based on what was already generated or on explicit tokens.

📌 **Interview term: frequency penalty** — subtracts \`penalty x count\` from a token logit, where count is how many times the token already appeared in the output. Repeats are penalised more each time.

📌 **Interview term: presence penalty** — subtracts a flat \`penalty\` once if the token appeared at all. It nudges the model toward new tokens and topics.

OpenAI documents both parameters with a range of -2.0 to 2.0. vLLM implements them as subtracting the two terms from the logits and says it follows the OpenAI definition (vLLM \`apply_penalties\` source docs, checked October 2026). The example uses the same formula after the output so far was "sunny sunny sunny warm":

~~~text
penalty no penalty    top3: sunny=0.401 cloudy=0.243 rainy=0.147
penalty presence=0.5  top3: sunny=0.301 cloudy=0.301 rainy=0.183
penalty frequency=0.5 top3: cloudy=0.372 rainy=0.226 sunny=0.137
penalty both=0.5      top3: cloudy=0.407 rainy=0.247 nice=0.111
~~~

Presence 0.5 pulls \`sunny\` level with \`cloudy\`; frequency 0.5 subtracts 1.5 (three occurrences) and drops it to third. Penalties are blunt: in code or JSON, the "repeated tokens" are often brackets, quotes and keywords that *must* repeat, so penalties can break structured output.

📌 **Interview term: logit bias** — a map from token IDs to a value added to their logits before sampling. OpenAI documents values from -100 to 100; -100 effectively bans a token and +100 effectively forces it. It works on token IDs, so you need the model tokenizer to use it.

## 7. Practical Settings by Task

| Task | Temperature | Truncation | Notes |
| :--- | :--- | :--- | :--- |
| Extraction, classification, routing | 0 or low | none needed | Pair with structured output; see [reliable JSON](/interview-question/how-do-you-get-reliable-structured-json-output-from-an-llm) |
| Code generation | low | optional top-p | Run tests rather than trusting one sample |
| Factual Q&A over retrieved context | low | none needed | Grounding matters far more than sampling; see [hallucinations](/interview-question/what-are-hallucinations-and-what-causes-them) |
| General chat | provider default | default | Defaults are tuned by the provider |
| Brainstorming, creative writing | higher | top-p or min-p | Truncation keeps the extra variety plausible |
| Self-consistency voting, synthetic data | moderate to high | top-p | Diversity between samples is the point; see [chain-of-thought](/interview-question/what-is-chain-of-thought-prompting-and-when-does-it-actually-help) |

Other output controls that are not sampling but sit next to it: \`max_tokens\` (a hard cap; a cut-off answer usually means it was hit), stop sequences (end generation when a string appears) and the number of candidates per request (\`n\` on some APIs).

### Provider rules change: check before you tune

As of October 2026, several provider rules constrain these knobs:

- **Not both.** OpenAI parameter docs have long recommended altering temperature or top_p but not both. Developer reports (GitHub issues, 2025) show Claude models from Opus 4.1 and Sonnet 4.5 onward returning a 400 error when both \`temperature\` and \`top_p\` are sent.
- **Reasoning models.** Many OpenAI reasoning models reject \`temperature\` and \`top_p\` (developer forum reports for o3-mini and GPT-5-series models; some accept them when reasoning effort is set to none). Anthropic documents extended thinking as incompatible with temperature, top_p or top_k modifications (Amazon Bedrock Claude documentation). See [What are reasoning models?](/interview-question/what-are-reasoning-models-and-when-should-you-use-them)
- **Removed entirely on the newest models.** Migration guides for Claude Opus 4.7 and later report that non-default temperature, top_p and top_k are rejected and should be removed rather than retuned (third-party migration guides citing Anthropic docs; one gateway reports it silently ignores them instead). Verify against the current official reference for the model you use.

The trend is clear even where details vary: on the newest models, prompting and reasoning-effort controls replace hand-tuned sampling.

## 8. Verified: Running the Code

The example **"One logits vector through temperature, top-k, top-p, min-p and repetition penalties"** implements the pipeline from section 2 on a fixed 8-token logits vector that stands in for one forward pass of a model. It uses a seeded Park-Miller random generator so the 10,000-draw counts are reproducible in both languages. It leaves out everything a real model would add: a huge vocabulary, logits that change every step, and engine-specific sampler orders.

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
T=0.2  top3: sunny=0.918 cloudy=0.075 rainy=0.006 | P(purple or banana)=0.0000
T=0.7  top3: sunny=0.508 cloudy=0.249 rainy=0.122 | P(purple or banana)=0.0019
T=1.0  top3: sunny=0.401 cloudy=0.243 rainy=0.147 | P(purple or banana)=0.0090
T=1.5  top3: sunny=0.310 cloudy=0.222 rainy=0.159 | P(purple or banana)=0.0295
T=3.0  top3: sunny=0.216 cloudy=0.183 rainy=0.155 | P(purple or banana)=0.0916
T=0 (greedy) -> sunny
candidates kept:
  T=1.0 top_k=3       3 tokens: sunny cloudy rainy
  T=1.0 top_p=0.9     5 tokens: sunny cloudy rainy warm nice
  T=3.0 top_p=0.9     6 tokens: sunny cloudy rainy warm nice cold
  T=1.0 min_p=0.2     4 tokens: sunny cloudy rainy warm
  T=3.0 min_p=0.2     7 tokens: sunny cloudy rainy warm nice cold purple
  min_p=0.2, T=3 last 4 tokens: sunny cloudy rainy warm
10000 seeded draws:
  T=1.0               sunny=4031 distinct=8 junk=90
  T=3.0               sunny=2194 distinct=8 junk=922
  T=3.0 top_p=0.9     sunny=2399 distinct=6 junk=0
  T=3.0 min_p=0.2     sunny=2260 distinct=7 junk=588
  min_p=0.2, T=3 last sunny=3178 distinct=4 junk=0
penalty no penalty    top3: sunny=0.401 cloudy=0.243 rainy=0.147
penalty presence=0.5  top3: sunny=0.301 cloudy=0.301 rainy=0.183
penalty frequency=0.5 top3: cloudy=0.372 rainy=0.226 sunny=0.137
penalty both=0.5      top3: cloudy=0.407 rainy=0.247 nice=0.111
~~~

## Edge Cases Worth Knowing

- **Temperature 0 is not exact reproducibility.** The Thinking Machines post "Defeating Nondeterminism in LLM Inference" (Horace He, September 2025) found that varying batch sizes on the server, not random thread races, are the main reason the same prompt gives different logits, and showed batch-invariant kernels that fix it. OpenAI describes its \`seed\` parameter as best effort and suggests logging \`system_fingerprint\` (OpenAI cookbook).
- **Ties under greedy.** When two tokens have nearly equal logits, tiny numerical differences decide between them; that is exactly where "deterministic" settings diverge.
- **Low temperature can loop.** Greedy or near-greedy decoding is prone to repetition on long open-ended outputs; that was the original motivation for nucleus sampling.
- **Sampling does not change knowledge.** No setting makes the model know a fact it does not; low temperature just makes it consistently say its most likely answer.

## Common Pitfalls

- **Tuning temperature and top-p together.** Their effects interact and some APIs now reject the combination. Change one knob, measure, then decide.
- **Using high temperature for extraction.** Every extra point of temperature adds variance to fields that have exactly one right answer. Use 0 or low and validate with a schema.
- **Using repetition penalties on code or JSON.** Penalising repeated tokens penalises the brackets and keys the format needs.
- **Treating temperature 0 as a cache key guarantee.** Equal settings do not guarantee equal outputs; design tests and caches to tolerate small differences.
- **Assuming the same number means the same thing everywhere.** Ranges, defaults and supported parameters differ between providers and between models from one provider.
- **Copying settings to a reasoning model.** Many reasoning models reject sampling parameters; requests can fail outright after a model upgrade.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What they act on:</strong> <span style="color:#f0e2c8;">On every step the model outputs a <strong style="color:#ffca28;">logit</strong> per vocabulary token. Sampling parameters only decide how one token is picked from that distribution. They change style and variety, not what the model knows.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Temperature:</strong> <span style="color:#f0e2c8;">Temperature divides the logits before softmax. Below 1 sharpens the distribution, above 1 flattens it, 0 means greedy. In my run the top token went from 0.918 at T=0.2 to 0.216 at T=3.0, and two nonsense tokens rose from 0% to over 9%.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Truncation:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Top-k</strong> keeps the k best tokens, <strong style="color:#ffca28;">top-p</strong> keeps the smallest set whose mass reaches p, and <strong style="color:#ffca28;">min-p</strong> keeps tokens above a fraction of the top token probability. They cut the junk tail: at T=3.0, top-p 0.9 brought nonsense draws from 922 in 10,000 to 0.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Penalties:</strong> <span style="color:#f0e2c8;">Frequency and presence penalties subtract from the logits of tokens already generated, frequency once per occurrence and presence once overall, to reduce repetition. Logit bias adds a fixed value to chosen token IDs, for example to ban one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. How I set them:</strong> <span style="color:#f0e2c8;">Temperature 0 or low for extraction, classification and code; the default for chat; higher with truncation for brainstorming. I change one knob at a time, check the provider rules (some newer models reject these parameters entirely), and do not rely on temperature 0 for exact reproducibility.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do providers say to change temperature or top-p, but not both?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They interact: temperature changes the shape, and top-p cuts based on that shape, so tuning both at once makes the effect hard to reason about and to reproduce. OpenAI documentation has long given that advice, and some newer Claude models return an error if both are sent (developer reports, 2025-26).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is temperature 0 deterministic?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not guaranteed. It makes each step greedy, but the logits themselves can change slightly between runs because of batching on the server. Thinking Machines (Horace He, September 2025) showed that varying batch size is the main cause and that batch-invariant kernels fix it at some speed cost. OpenAI documents its <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">seed</code> parameter as best effort only.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between top-p and min-p?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Top-p cuts by cumulative mass, so when the distribution is flat it keeps many tokens. Min-p cuts relative to the top token, so it keeps few when the model is confident and more when it is not. In my run, applied after T=3.0 min-p still let a junk token in, but applied before temperature it kept only 4 sensible tokens; the order matters.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you raise the temperature?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you want diverse candidates: brainstorming, several drafts to choose from, sampling paths for self-consistency voting, or synthetic data generation. Pair it with top-p or min-p so the extra variety comes from plausible tokens, not from the junk tail.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do sampling parameters fix hallucinations?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. A low temperature makes the model more consistently pick its most likely token, which can be a consistently wrong fact. Hallucinations are addressed with grounding, retrieval, tool use and verification, not with decoding settings.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Logits | Raw per-token scores the model outputs at each step |
| Sampling (decoding) parameters | Settings that turn the distribution into one chosen token |
| Temperature | Divides logits before softmax; below 1 sharper, above 1 flatter, 0 greedy |
| Top-k | Keep only the k most likely tokens |
| Top-p (nucleus sampling) | Keep the smallest set of tokens whose probability reaches p |
| Min-p | Keep tokens with at least min_p times the top token probability |
| Sampler order | The sequence in which penalties, temperature and truncation are applied |
| Frequency penalty | Subtracts penalty times occurrence count from a token logit |
| Presence penalty | Subtracts a flat penalty from any token already generated |
| Logit bias | Adds a fixed value to chosen token IDs; -100 effectively bans one |

**Conclusion:** Sampling parameters do not touch what a model knows; they decide how one token is picked from the probabilities it produces on every step. Temperature reshapes that distribution, top-k, top-p and min-p cut off its unreliable tail, and penalties and logit bias edit individual scores. Set them by task: low for anything with one right answer, defaults for chat, higher with truncation for creative work. Change one knob at a time and remember that temperature 0 is not perfect reproducibility. Check the rules of the exact model you call, because newer and reasoning models increasingly reject these knobs and expect you to steer with prompts and effort settings instead.`,
    examples: [
      {
        label: `One logits vector through temperature, top-k, top-p, min-p and repetition penalties`,
        variants: [
          { tech: "node", code: `// One fixed set of next-token logits, pushed through the sampling pipeline a
// serving engine runs on every step: penalties -> temperature -> softmax ->
// top-k / top-p / min-p truncation -> renormalise -> draw. The logits stand
// in for one forward pass of a model after the prompt "The weather today is".
const vocab = ["sunny", "cloudy", "rainy", "warm", "nice", "cold", "purple", "banana"];
const logits = [3.0, 2.5, 2.0, 1.5, 1.2, 0.8, -1.0, -2.5];
const JUNK = new Set(["purple", "banana"]);

function softmax(ls, T) {
  const m = Math.max(...ls.map(([, x]) => x));
  const e = ls.map(([w, x]) => [w, Math.exp((x - m) / T)]);
  const s = e.reduce((a, [, x]) => a + x, 0);
  return e.map(([w, x]) => [w, x / s]).sort((a, b) => b[1] - a[1]);
}

function distribution(o) {
  let l = vocab.map((w, i) => {                          // OpenAI-style penalties
    const c = (o.counts && o.counts[w]) || 0;
    return [w, logits[i] - c * (o.freq || 0) - (c > 0 ? o.pres || 0 : 0)];
  });
  if (!o.T) {                                            // temperature 0 = greedy
    const best = l.reduce((a, b) => (b[1] > a[1] ? b : a));
    return [[best[0], 1]];
  }
  // Truncation looks at the distribution at temperature T, unless the engine
  // is configured to truncate first and apply temperature last.
  let d = softmax(l, o.temperatureLast ? 1 : o.T);
  if (o.k) d = d.slice(0, o.k);                          // top-k: keep the k best
  if (o.p) {                                             // top-p: smallest set with mass >= p
    let acc = 0, n = 0;
    while (n < d.length && acc < o.p) acc += d[n++][1];
    d = d.slice(0, n);
  }
  if (o.minP) d = d.filter(([, p]) => p >= o.minP * d[0][1]); // min-p: relative to the top token
  const keep = new Set(d.map(([w]) => w));
  return softmax(l.filter(([w]) => keep.has(w)), o.T);   // renormalise survivors at T
}
const show = (d) => d.map(([w, p]) => w + "=" + p.toFixed(3)).join(" ");

for (const T of [0.2, 0.7, 1.0, 1.5, 3.0]) {
  const d = distribution({ T });
  const junk = d.filter(([w]) => JUNK.has(w)).reduce((a, [, p]) => a + p, 0);
  console.log("T=" + T.toFixed(1) + "  top3: " + show(d.slice(0, 3)) + " | P(purple or banana)=" + junk.toFixed(4));
}
console.log("T=0 (greedy) -> " + distribution({ T: 0 })[0][0]);

const cfgs = [
  ["T=1.0 top_k=3", { T: 1.0, k: 3 }],
  ["T=1.0 top_p=0.9", { T: 1.0, p: 0.9 }],
  ["T=3.0 top_p=0.9", { T: 3.0, p: 0.9 }],
  ["T=1.0 min_p=0.2", { T: 1.0, minP: 0.2 }],
  ["T=3.0 min_p=0.2", { T: 3.0, minP: 0.2 }],
  ["min_p=0.2, T=3 last", { T: 3.0, minP: 0.2, temperatureLast: true }],
];
console.log("candidates kept:");
for (const [name, o] of cfgs) {
  const d = distribution(o);
  console.log("  " + name.padEnd(20) + d.length + " tokens: " + d.map(([w]) => w).join(" "));
}

let seed = 42;
const rand = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
function draw(d) {
  const r = rand();
  let acc = 0;
  for (const [w, p] of d) { acc += p; if (r < acc) return w; }
  return d[d.length - 1][0];
}
console.log("10000 seeded draws:");
for (const [name, o] of [["T=1.0", { T: 1.0 }], ["T=3.0", { T: 3.0 }], ...cfgs.slice(2, 3), ...cfgs.slice(4)]) {
  seed = 42;
  const d = distribution(o), tally = {};
  for (let i = 0; i < 10000; i++) { const w = draw(d); tally[w] = (tally[w] || 0) + 1; }
  const junk = (tally.purple || 0) + (tally.banana || 0);
  console.log("  " + name.padEnd(20) + "sunny=" + (tally.sunny || 0) + " distinct=" + Object.keys(tally).length + " junk=" + junk);
}

const counts = { sunny: 3, warm: 1 };      // already generated: "sunny sunny sunny warm"
for (const [name, o] of [["no penalty", {}], ["presence=0.5", { pres: 0.5 }], ["frequency=0.5", { freq: 0.5 }], ["both=0.5", { freq: 0.5, pres: 0.5 }]]) {
  const d = distribution({ T: 1.0, counts, ...o });
  console.log("penalty " + name.padEnd(14) + "top3: " + show(d.slice(0, 3)));
}` },
          { tech: "python", code: `# One fixed set of next-token logits, pushed through the sampling pipeline a
# serving engine runs on every step: penalties -> temperature -> softmax ->
# top-k / top-p / min-p truncation -> renormalise -> draw. The logits stand
# in for one forward pass of a model after the prompt "The weather today is".
import math

vocab = ["sunny", "cloudy", "rainy", "warm", "nice", "cold", "purple", "banana"]
logits = [3.0, 2.5, 2.0, 1.5, 1.2, 0.8, -1.0, -2.5]
JUNK = {"purple", "banana"}


def softmax(ls, T):
    m = max(x for _, x in ls)
    e = [(w, math.exp((x - m) / T)) for w, x in ls]
    s = 0.0
    for _, x in e:
        s += x
    return sorted([(w, x / s) for w, x in e], key=lambda t: t[1], reverse=True)


def distribution(o):
    counts = o.get("counts") or {}
    l = []
    for i, w in enumerate(vocab):                        # OpenAI-style penalties
        c = counts.get(w, 0)
        l.append((w, logits[i] - c * o.get("freq", 0) - (o.get("pres", 0) if c > 0 else 0)))
    if not o.get("T"):                                   # temperature 0 = greedy
        best = l[0]
        for t in l:
            if t[1] > best[1]:
                best = t
        return [(best[0], 1)]
    # Truncation looks at the distribution at temperature T, unless the engine
    # is configured to truncate first and apply temperature last.
    d = softmax(l, 1 if o.get("temperature_last") else o["T"])
    if o.get("k"):                                       # top-k: keep the k best
        d = d[: o["k"]]
    if o.get("p"):                                       # top-p: smallest set with mass >= p
        acc, n = 0.0, 0
        while n < len(d) and acc < o["p"]:
            acc += d[n][1]
            n += 1
        d = d[:n]
    if o.get("min_p"):                                   # min-p: relative to the top token
        d = [t for t in d if t[1] >= o["min_p"] * d[0][1]]
    keep = {w for w, _ in d}
    return softmax([t for t in l if t[0] in keep], o["T"])  # renormalise survivors at T


def show(d):
    return " ".join(f"{w}={p:.3f}" for w, p in d)


for T in [0.2, 0.7, 1.0, 1.5, 3.0]:
    d = distribution({"T": T})
    junk = 0.0
    for w, p in d:
        if w in JUNK:
            junk += p
    print(f"T={T:.1f}  top3: {show(d[:3])} | P(purple or banana)={junk:.4f}")
print("T=0 (greedy) -> " + distribution({"T": 0})[0][0])

cfgs = [
    ("T=1.0 top_k=3", {"T": 1.0, "k": 3}),
    ("T=1.0 top_p=0.9", {"T": 1.0, "p": 0.9}),
    ("T=3.0 top_p=0.9", {"T": 3.0, "p": 0.9}),
    ("T=1.0 min_p=0.2", {"T": 1.0, "min_p": 0.2}),
    ("T=3.0 min_p=0.2", {"T": 3.0, "min_p": 0.2}),
    ("min_p=0.2, T=3 last", {"T": 3.0, "min_p": 0.2, "temperature_last": True}),
]
print("candidates kept:")
for name, o in cfgs:
    d = distribution(o)
    print("  " + name.ljust(20) + f"{len(d)} tokens: " + " ".join(w for w, _ in d))

seed = 42


def rand():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647


def draw(d):
    r = rand()
    acc = 0.0
    for w, p in d:
        acc += p
        if r < acc:
            return w
    return d[-1][0]


print("10000 seeded draws:")
for name, o in [("T=1.0", {"T": 1.0}), ("T=3.0", {"T": 3.0})] + cfgs[2:3] + cfgs[4:]:
    seed = 42
    d, tally = distribution(o), {}
    for _ in range(10000):
        w = draw(d)
        tally[w] = tally.get(w, 0) + 1
    junk = tally.get("purple", 0) + tally.get("banana", 0)
    print("  " + name.ljust(20) + f"sunny={tally.get('sunny', 0)} distinct={len(tally)} junk={junk}")

counts = {"sunny": 3, "warm": 1}      # already generated: "sunny sunny sunny warm"
for name, o in [("no penalty", {}), ("presence=0.5", {"pres": 0.5}), ("frequency=0.5", {"freq": 0.5}), ("both=0.5", {"freq": 0.5, "pres": 0.5})]:
    d = distribution({"T": 1.0, "counts": counts, **o})
    print("penalty " + name.ljust(14) + "top3: " + show(d[:3]))` },
        ],
      },
    ],
  },
  {
    title: `What are reasoning models and when should you use them?`,
    difficulty: "medium",
    seoDescription: `Reasoning models spend hidden thinking tokens before answering; that buys accuracy on multi-step problems and costs output tokens, latency and control.`,
    description: `**Question presented to candidate:**
"Most providers now offer 'reasoning' or 'thinking' models next to their regular ones. What actually makes a model a reasoning model, and how do you decide when it is worth using one in a product?"

**What a strong answer should cover:**
- A reasoning model is trained (largely with reinforcement learning) to generate a long internal chain of thought before its final answer; it is still the same next-token loop, spending more tokens at inference time
- Test-time compute: accuracy on hard multi-step problems improves with more thinking tokens or more samples, which is why there are effort or budget controls; OpenAI o1 (September 2024) and DeepSeek-R1 (January 2025, open weights) are the reference points
- Costs: thinking tokens are billed as output tokens even when hidden or summarised, they count toward the output cap, and they add latency before the first visible token
- When it pays off: multi-step maths, planning, hard debugging, complex constraint-following and agent planning; when it does not: extraction, classification, short chat, latency-critical paths
- How usage changes: give goals and constraints rather than "think step by step" scaffolding, set a generous output cap, many sampling parameters are not supported, and route only the hard traffic to it

**Code / implementation expected:** Optional — a cost and latency calculation with reasoning tokens, or majority-vote arithmetic, shows the trade-off; no model call is needed.`,
    answer: `**Target Audience:** Engineers who know how a regular LLM API call works and need to decide where a "thinking" model belongs in a product.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (the example is deterministic arithmetic and stub answers; no real model is called). Product facts are cited inline with the source and the date checked (October 2026).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Try this one quickly: *a bat and a ball cost $1.10 together. The bat costs $1.00 more than the ball. How much is the ball?*

Most people instantly say 10 cents. It is wrong: then the bat would be $1.10 and the total $1.20. The right answer, 5 cents, needs a few seconds of writing it down: ball = b, bat = b + 1.00, so 2b + 1.00 = 1.10. Psychologists call the fast answer "System 1" and the slow, checked one "System 2".

A regular LLM answers like System 1: it starts writing the answer immediately, one token after another, and each token is a quick guess. A **reasoning model** has been trained to do the System 2 thing first: write out the problem, try an approach, check it, and only then answer. That checking costs time and tokens, which is the whole trade-off this doc is about. The example runs exactly this:

~~~text
fast model      answer=0.10 correct=false thinking words=0
reasoning model answer=0.05 correct=true thinking words=41
~~~

(Both "models" in the example are stubs with canned answers; the point is the shape of the trade, not a benchmark.)

## 2. What Makes a Model a Reasoning Model

📌 **Interview term: reasoning model** — an LLM trained to generate an extended internal chain of thought (often called thinking or reasoning tokens) before producing its final answer, and to use it to plan, check and correct itself. Underneath it is still a transformer generating one token at a time; see [What is a Large Language Model and how does it generate text?](/interview-question/what-is-a-large-language-model-and-how-does-it-generate-text)

📌 **Interview term: chain of thought (CoT)** — intermediate reasoning steps written out before the answer. With a regular model you ask for it in the prompt (see [What is chain-of-thought prompting and when does it actually help?](/interview-question/what-is-chain-of-thought-prompting-and-when-does-it-actually-help)); a reasoning model produces it on its own because it was trained to.

The difference is in training. OpenAI introduced o1 on 12 September 2024 ("Learning to reason with LLMs") and described a large-scale reinforcement learning method that teaches the model to use its chain of thought productively, reporting that performance improves both with more RL training and with more time spent thinking. DeepSeek released DeepSeek-R1 and R1-Zero in January 2025 under the MIT licence; R1-Zero was trained with reinforcement learning directly on the base model, and R1 added supervised stages to fix readability and language-mixing problems (DeepSeek release coverage, checked October 2026).

📌 **Interview term: reinforcement learning with verifiable rewards** — training where the model attempts problems whose answers can be checked automatically (a maths result, a passing unit test) and is rewarded for correct outcomes. The model is free to discover which reasoning steps lead to correct answers. It is why reasoning models are strongest on maths and code, where checking is easy.

<svg class="iq-diagram" width="100%" viewBox="0 0 800 260" role="img" aria-label="Regular model writes the answer immediately; reasoning model first writes hidden thinking tokens, then the visible answer">
  <text class="d-text" x="20" y="60">regular</text>
  <rect class="d-box" x="160" y="35" width="200" height="45" rx="8"/>
  <text class="d-text" x="260" y="63" text-anchor="middle">answer</text>
  <text class="d-text" x="20" y="170">reasoning</text>
  <rect class="d-box-muted" x="160" y="145" width="380" height="45" rx="8"/>
  <text class="d-text" x="350" y="173" text-anchor="middle">thinking tokens, hidden or summarised</text>
  <rect class="d-box-accent" x="580" y="145" width="200" height="45" rx="8"/>
  <text class="d-text" x="680" y="173" text-anchor="middle">answer</text>
  <path class="d-edge-dashed" d="M 160 225 L 780 225"/>
  <text class="d-sub" x="470" y="250" text-anchor="middle">time and billed output tokens</text>
</svg>

Both rows are billed for every token they generate; the reasoning row simply generates many more of them, all before the first visible word.

## 3. Test-Time Compute: Why Thinking More Helps

📌 **Interview term: test-time compute (inference-time scaling)** — spending more computation when answering, rather than when training, to get better answers. Two common forms: longer reasoning per answer (what reasoning models do) and several attempts with a vote or a verifier.

The second form is easy to compute exactly, which makes the principle visible. **Self-consistency** (Wang et al., arXiv 2203.11171, ICLR 2023) samples several reasoning paths and returns the most common final answer. If each sample is right with probability p, independently, the majority of N samples is right with:

~~~js
for (let k = (n + 1) / 2; k <= n; k++) s += choose(n, k) * p ** k * (1 - p) ** (n - k);
~~~

~~~text
majority vote accuracy (binary right/wrong answers):
  N      p=0.60   p=0.80   p=0.40
  1      0.600    0.800    0.400
  3      0.648    0.896    0.352
  5      0.683    0.942    0.317
  9      0.733    0.980    0.267
  15     0.787    0.996    0.213
~~~

Two lessons that apply to reasoning models too:

1. **More compute helps when the model is already more often right than wrong.** 60% per attempt becomes 78.7% with 15 votes; 80% becomes 99.6%.
2. **More compute hurts when it is usually wrong.** At 40% per attempt, voting converges on the wrong answer: 21.3% with 15 votes. Extra thinking cannot fix missing knowledge or a systematic misunderstanding.

Real samples are not independent (they share the same model and blind spots), so real gains are smaller than this idealised maths, and answers with many possible values behave differently from right/wrong. The direction of both lessons holds.

## 4. What It Costs: Tokens, Latency, Control

📌 **Interview term: reasoning tokens (thinking tokens)** — the tokens a reasoning model generates while thinking. They are billed as output tokens. OpenAI does not return them; Anthropic documentation says Claude 4 models return a *summary* of the thinking, bill the full thinking tokens, and that the billed output count will not match the visible tokens (Anthropic extended thinking docs, checked October 2026).

📌 **Interview term: reasoning effort / thinking budget** — the control for how much the model thinks. OpenAI exposes \`reasoning_effort\` with model-dependent values (low, medium and high on many models; some also accept none, minimal or higher settings). Anthropic extended thinking took a \`budget_tokens\` value with a minimum of 1,024 (Amazon Bedrock Claude docs), and newer Claude models move to adaptive thinking with an effort setting instead of a token budget (developer guides, 2026). Check the reference for the exact model you call.

The example puts illustrative numbers on it: 2,000 input tokens, a 400-token visible answer, $2 per 1M input and $10 per 1M output tokens, and an output speed of 80 tokens per second. Reasoning token counts per effort level are assumptions too; real counts vary per request.

~~~text
effort  reasoning  $/request  first visible token  total time  $/100k requests
none    0          $0.0080    0.0 s                5.0 s       $800
low     1000       $0.0180    12.5 s               17.5 s      $1800
medium  4000       $0.0480    50.0 s               55.0 s      $4800
high    16000      $0.1680    200.0 s              205.0 s     $16800
~~~

High effort makes the same request 21 times more expensive and turns a 5-second answer into a 205-second one, with nothing visible for the first 200 seconds (the times leave out prefill and network). That is why streaming a "thinking..." state matters for UX ([streaming](/interview-question/how-does-streaming-work-in-llm-apis-and-why-does-it-matter-for-ux)) and why reasoning calls often belong in background jobs.

### The output-cap trap

The output cap (\`max_tokens\`, \`max_output_tokens\` or \`max_completion_tokens\`, depending on the API) covers thinking and answer together:

~~~text
high effort, max_tokens=8000: billed output=8000 visible answer tokens=0 stop=hit max_tokens (answer missing)
high effort, max_tokens=20000: billed output=16400 visible answer tokens=400 stop=finished
~~~

You pay for 8,000 tokens and get nothing. Developers report exactly this on the OpenAI Responses API: an \`incomplete\` status with reason \`max_output_tokens\` and an empty output text when reasoning used the whole budget (OpenAI developer forum, 2025-26). Leave generous headroom, and handle the empty-answer case explicitly.

### Lost controls

Many reasoning models do not accept the usual sampling parameters: developer reports show OpenAI reasoning models rejecting \`temperature\` and \`top_p\` on several models, and Anthropic documents extended thinking as incompatible with temperature, top_p and top_k changes and with forced tool use (Amazon Bedrock Claude docs). See [How do temperature, top-p and other sampling parameters affect output?](/interview-question/how-do-temperature-top-p-and-other-sampling-parameters-affect-output)

## 5. When to Use One

| Use a reasoning model when | Use a regular model when |
| :--- | :--- |
| The task has many dependent steps: maths, planning, scheduling with constraints | The task is one step: classify, extract, translate, reformat |
| Mistakes are expensive and checkable: a hard bug, a migration plan, a proof | Latency matters: autocomplete, chat replies, voice |
| An agent needs a careful plan before many tool calls | Volume is high and the margin per request is small |
| Your evals show a clear accuracy gain that is worth the price | Your evals show the regular model already passes |

<svg class="iq-diagram" width="100%" viewBox="0 0 780 230" role="img" aria-label="Routing: a router sends simple requests to a fast model and hard multi step requests to a reasoning model">
  <defs>
    <marker id="ai02q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="80" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="120" text-anchor="middle">request</text>
  <rect class="d-box" x="250" y="80" width="160" height="70" rx="10"/>
  <text class="d-text" x="330" y="112" text-anchor="middle">router</text>
  <text class="d-sub" x="330" y="134" text-anchor="middle">how hard?</text>
  <rect class="d-box" x="530" y="20" width="230" height="70" rx="10"/>
  <text class="d-text" x="645" y="52" text-anchor="middle">fast model</text>
  <text class="d-sub" x="645" y="74" text-anchor="middle">most traffic</text>
  <rect class="d-box-accent" x="530" y="140" width="230" height="70" rx="10"/>
  <text class="d-text" x="645" y="172" text-anchor="middle">reasoning model</text>
  <text class="d-sub" x="645" y="194" text-anchor="middle">hard cases only</text>
  <path class="d-edge" d="M 174 115 L 244 115" marker-end="url(#ai02q4-arrow)"/>
  <path class="d-edge" d="M 414 100 L 524 60" marker-end="url(#ai02q4-arrow)"/>
  <path class="d-edge" d="M 414 130 L 524 170" marker-end="url(#ai02q4-arrow)"/>
</svg>

The usual production shape is a router: the fast model takes the bulk of the traffic and only hard requests pay for thinking. The general method for picking tiers is in [How do you choose the right model for a task?](/interview-question/how-do-you-choose-the-right-model-for-a-task)

## 6. How Prompting Changes

- **State the goal and constraints, not the steps.** Guides relaying OpenAI advice for reasoning models recommend brief, direct instructions and say explicit "think step by step" prompts are usually unnecessary and can even hurt (secondary sources summarising OpenAI reasoning best practices, checked October 2026). The model plans for itself.
- **Separate inputs clearly** with headings or XML-style tags, and say what a good answer looks like (format, length, what to check).
- **Ask for the effort you need.** Start at the lowest effort level and raise it only where your evals show a gain.
- **Do not depend on the reasoning text.** It may be hidden, summarised, or change format between versions. If you need an explanation for users, ask for it in the answer.
- **Keep the context focused.** Long thinking plus long inputs fills the context window quickly; see [context windows](/interview-question/what-is-a-context-window-and-what-happens-when-you-exceed-it).

## 7. Verified: Running the Code

The example **"Reasoning tokens: a trick question, majority-vote maths, and the cost and latency bill"** has three parts: two canned stub answers checked by real arithmetic, the exact binomial probability of a correct majority vote, and a cost/latency calculator in which the prices, output speed and reasoning-token counts are illustrative assumptions, not any provider list. It leaves out prefill time, network latency, prompt caching and the variation in reasoning length from request to request.

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
fast model      answer=0.10 correct=false thinking words=0
reasoning model answer=0.05 correct=true thinking words=41
majority vote accuracy (binary right/wrong answers):
  N      p=0.60   p=0.80   p=0.40
  1      0.600    0.800    0.400
  3      0.648    0.896    0.352
  5      0.683    0.942    0.317
  9      0.733    0.980    0.267
  15     0.787    0.996    0.213
effort  reasoning  $/request  first visible token  total time  $/100k requests
none    0          $0.0080    0.0 s                5.0 s       $800
low     1000       $0.0180    12.5 s               17.5 s      $1800
medium  4000       $0.0480    50.0 s               55.0 s      $4800
high    16000      $0.1680    200.0 s              205.0 s     $16800
high effort, max_tokens=8000: billed output=8000 visible answer tokens=0 stop=hit max_tokens (answer missing)
high effort, max_tokens=20000: billed output=16400 visible answer tokens=400 stop=finished
~~~

## Edge Cases Worth Knowing

- **Overthinking simple tasks.** On easy questions, reasoning models can spend many tokens for no gain, or talk themselves out of a right answer. Low effort settings exist for this.
- **Reasoning is not grounding.** Careful reasoning over a wrong fact gives a carefully argued wrong answer. Retrieval and tools still matter; see [How do you reduce hallucinations in a production LLM application?](/interview-question/how-do-you-reduce-hallucinations-in-a-production-llm-application)
- **Multi-turn and tool use.** Some APIs require you to pass previous reasoning items or thinking blocks back in later turns (especially around tool calls) for the model to continue coherently. Read the provider guide before building an agent loop on a reasoning model; see [How does function calling work under the hood?](/interview-question/how-does-function-calling-tool-use-work-under-the-hood)
- **Cost forecasting is harder.** Thinking length varies per request, so budget from measured distributions (p50 and p95 reasoning tokens) rather than averages; see [How do you estimate and control LLM costs in production?](/interview-question/how-do-you-estimate-and-control-llm-costs-in-production)

## Common Pitfalls

- **Using a reasoning model everywhere.** It multiplies cost and latency on tasks a regular model already passes. Route only the hard traffic.
- **Setting a small output cap.** Thinking and answer share it; a small cap produces empty, paid-for responses.
- **Copying old prompts and parameters.** Step-by-step scaffolding and temperature settings written for regular models are unnecessary or rejected.
- **Budgeting from visible output.** Hidden or summarised thinking is billed in full; read the usage fields, not the response length.
- **Assuming more thinking always helps.** If the model lacks the knowledge, extra test-time compute converges on the wrong answer, as the 40% column shows.
- **Showing nothing while it thinks.** Tens of seconds without feedback feels broken; stream status or run it as a background job.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">A reasoning model is an LLM trained, mostly with reinforcement learning, to write a long internal <strong style="color:#ffca28;">chain of thought</strong> before the answer: break the problem down, try, check, backtrack. It is the same next-token loop, just spending more tokens at inference time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it works:</strong> <span style="color:#f0e2c8;">On multi-step problems, accuracy goes up with <strong style="color:#ffca28;">test-time compute</strong>, more thinking tokens or more sampled attempts. OpenAI reported this for o1 in September 2024, and DeepSeek-R1 showed in January 2025 that open-weight models trained with RL can do it too.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What it costs:</strong> <span style="color:#f0e2c8;">Thinking tokens are billed as <strong style="color:#ffca28;">output tokens</strong> even when hidden or summarised, they count toward <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_tokens</code>, and they all come before the first visible token. In my model, high effort turned a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$0.008</code> request into <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">$0.168</code> and 5 seconds into 205.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. When I use it:</strong> <span style="color:#f0e2c8;">For multi-step maths, planning, hard debugging, tricky constraint satisfaction and agent planning, where the extra accuracy shows up on my evals. Not for extraction, classification or quick chat, where it adds cost and latency for nothing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. How I use it:</strong> <span style="color:#f0e2c8;">Route only the hard traffic to it, set the lowest effort that passes my evals, give clear goals and constraints instead of step-by-step scaffolding, leave enough output budget, and remember many sampling parameters are not supported.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is that different from chain-of-thought prompting?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Chain-of-thought prompting asks a regular model to show its steps, and how well it reasons depends on prompting. A reasoning model was trained with reinforcement learning to produce and use long reasoning on its own, including checking and backtracking, and the provider controls how much it thinks through an effort or budget setting.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I see the reasoning?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually not in full. OpenAI hides raw reasoning tokens; Anthropic returns a summary of the thinking for Claude 4 models and bills the full thinking tokens, so the billed count does not match the visible text. Open-weight reasoning models like DeepSeek-R1 do emit their reasoning text.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did my reasoning model return an empty answer?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The output cap covers reasoning and the answer together. If the model spends the whole budget thinking, the response stops with a length or incomplete status and no visible text, as in my run where <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_tokens=8000</code> met 16,000 thinking tokens. Raise the cap, lower the effort, or detect the case and retry.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is majority voting the same as a reasoning model?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is another way to spend test-time compute: sample several answers and take the most common one. It helps when each sample is more likely right than wrong; in my calculation 15 votes lifted 60% to 78.7%. If the model is usually wrong, voting makes it more confidently wrong: 40% fell to 21.3%.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you use a reasoning model inside an agent?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Often for the planning step or the hard decisions, where a mistake costs many later steps, and a fast regular model for routine tool calls and summaries. Measure the whole trajectory: a slower but more accurate planner can reduce total steps and total cost.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Reasoning model | An LLM trained to write extended internal reasoning before its answer |
| Chain of thought (CoT) | Intermediate reasoning steps written out before the answer |
| RL with verifiable rewards | Training on problems whose answers can be checked automatically, rewarding correct outcomes |
| Test-time compute | Spending more computation at answer time (longer thinking, more samples) for accuracy |
| Self-consistency | Sampling several reasoning paths and returning the most common answer |
| Reasoning (thinking) tokens | Tokens generated while thinking; billed as output, often hidden or summarised |
| Reasoning effort / thinking budget | The setting that controls how much the model thinks |

**Conclusion:** A reasoning model is a regular next-token model that has been trained, mostly with reinforcement learning, to think before it answers, and it turns extra inference-time tokens into accuracy on multi-step problems. That accuracy is paid for in output tokens you may never see, in long waits before the first visible word, in output caps that must leave room for thinking, and in lost control over sampling. Use one where your evals show the gain matters (maths, planning, hard code, agent plans), route everything else to a faster model, start at the lowest effort that passes, and remember that thinking harder cannot replace knowledge the model does not have.`,
    examples: [
      {
        label: `Reasoning tokens: a trick question, majority-vote maths, and the cost and latency bill`,
        variants: [
          { tech: "node", code: `// What a reasoning model buys and costs. Three parts, all deterministic:
// 1) a stub "fast" answer vs a stub "think first" answer on a trick question,
// 2) exact maths for majority voting over N samples (test-time compute),
// 3) the bill and the latency when hidden reasoning tokens are added.
const words = (s) => s.split(/\\s+/).filter(Boolean).length;

// 1) Bat and ball: together $1.10, the bat costs $1.00 more than the ball.
const fast = { thinking: "", answer: "0.10" };            // the intuitive answer
const steps = [
  "let ball = b, bat = b + 1.00",
  "b + (b + 1.00) = 1.10 so 2b = 0.10 so b = 0.05",
  "check: ball 0.05 + bat 1.05 = 1.10 and 1.05 - 0.05 = 1.00, consistent",
];
const slow = { thinking: steps.join(" ; "), answer: "0.05" };
const check = (b) => Math.abs(b + (b + 1.0) - 1.1) < 1e-9;
for (const [name, r] of [["fast model", fast], ["reasoning model", slow]]) {
  console.log(name.padEnd(16) + "answer=" + r.answer + " correct=" + check(Number(r.answer)) +
    " thinking words=" + words(r.thinking));
}

// 2) Self-consistency: sample N independent answers, return the majority.
// P(majority correct) when each sample is right with probability p (N odd).
function choose(n, k) { let c = 1; for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i; return c; }
function majority(p, n) {
  let s = 0;
  for (let k = (n + 1) / 2; k <= n; k++) s += choose(n, k) * p ** k * (1 - p) ** (n - k);
  return s;
}
console.log("majority vote accuracy (binary right/wrong answers):");
console.log("  N      p=0.60   p=0.80   p=0.40");
for (const n of [1, 3, 5, 9, 15]) {
  console.log("  " + String(n).padEnd(7) + [0.6, 0.8, 0.4].map((p) => majority(p, n).toFixed(3).padEnd(9)).join("").trimEnd());
}

// 3) Reasoning tokens are generated (and billed) as output tokens before the
// first visible token. Prices and speeds are illustrative assumptions.
const price = { in: 2.0, out: 10.0 };                     // $ per 1M tokens
const speed = 80;                                         // output tokens per second
const req = { inTok: 2000, visible: 400 };
const effort = [["none", 0], ["low", 1000], ["medium", 4000], ["high", 16000]];
console.log("effort  reasoning  $/request  first visible token  total time  $/100k requests");
for (const [name, think] of effort) {
  const cost = (req.inTok * price.in + (think + req.visible) * price.out) / 1e6;
  console.log(name.padEnd(8) + String(think).padEnd(11) + ("$" + cost.toFixed(4)).padEnd(11) +
    ((think / speed).toFixed(1) + " s").padEnd(21) + (((think + req.visible) / speed).toFixed(1) + " s").padEnd(12) +
    "$" + Math.round(cost * 100000));
}

// The max_tokens trap: the cap covers reasoning AND the visible answer.
for (const maxTokens of [8000, 20000]) {
  const think = 16000;
  const used = Math.min(maxTokens, think + req.visible);
  const visible = Math.max(0, used - think);
  console.log("high effort, max_tokens=" + maxTokens + ": billed output=" + used + " visible answer tokens=" + visible +
    " stop=" + (used < think + req.visible ? "hit max_tokens (answer missing)" : "finished"));
}` },
          { tech: "python", code: `# What a reasoning model buys and costs. Three parts, all deterministic:
# 1) a stub "fast" answer vs a stub "think first" answer on a trick question,
# 2) exact maths for majority voting over N samples (test-time compute),
# 3) the bill and the latency when hidden reasoning tokens are added.


def words(s):
    return len(s.split())


# 1) Bat and ball: together $1.10, the bat costs $1.00 more than the ball.
fast = {"thinking": "", "answer": "0.10"}                 # the intuitive answer
steps = [
    "let ball = b, bat = b + 1.00",
    "b + (b + 1.00) = 1.10 so 2b = 0.10 so b = 0.05",
    "check: ball 0.05 + bat 1.05 = 1.10 and 1.05 - 0.05 = 1.00, consistent",
]
slow = {"thinking": " ; ".join(steps), "answer": "0.05"}


def check(b):
    return abs(b + (b + 1.0) - 1.1) < 1e-9


for name, r in [("fast model", fast), ("reasoning model", slow)]:
    print(name.ljust(16) + f"answer={r['answer']} correct={str(check(float(r['answer']))).lower()}"
          f" thinking words={words(r['thinking'])}")


# 2) Self-consistency: sample N independent answers, return the majority.
# P(majority correct) when each sample is right with probability p (N odd).
def choose(n, k):
    c = 1
    for i in range(1, k + 1):
        c = (c * (n - k + i)) / i
    return c


def majority(p, n):
    s = 0
    for k in range((n + 1) // 2, n + 1):
        s += choose(n, k) * p ** k * (1 - p) ** (n - k)
    return s


print("majority vote accuracy (binary right/wrong answers):")
print("  N      p=0.60   p=0.80   p=0.40")
for n in [1, 3, 5, 9, 15]:
    print("  " + str(n).ljust(7) + "".join(f"{majority(p, n):.3f}".ljust(9) for p in [0.6, 0.8, 0.4]).rstrip())

# 3) Reasoning tokens are generated (and billed) as output tokens before the
# first visible token. Prices and speeds are illustrative assumptions.
price = {"in": 2.0, "out": 10.0}                          # $ per 1M tokens
speed = 80                                                # output tokens per second
req = {"in_tok": 2000, "visible": 400}
effort = [("none", 0), ("low", 1000), ("medium", 4000), ("high", 16000)]
print("effort  reasoning  $/request  first visible token  total time  $/100k requests")
for name, think in effort:
    cost = (req["in_tok"] * price["in"] + (think + req["visible"]) * price["out"]) / 1e6
    print(name.ljust(8) + str(think).ljust(11) + f"\${cost:.4f}".ljust(11)
          + f"{think / speed:.1f} s".ljust(21) + f"{(think + req['visible']) / speed:.1f} s".ljust(12)
          + f"\${round(cost * 100000)}")

# The max_tokens trap: the cap covers reasoning AND the visible answer.
for max_tokens in [8000, 20000]:
    think = 16000
    used = min(max_tokens, think + req["visible"])
    visible = max(0, used - think)
    stop = "hit max_tokens (answer missing)" if used < think + req["visible"] else "finished"
    print(f"high effort, max_tokens={max_tokens}: billed output={used} visible answer tokens={visible} stop={stop}")` },
        ],
      },
    ],
  },
  {
    title: `How do multimodal models handle images, audio and other non-text inputs?`,
    difficulty: "medium",
    seoDescription: `Multimodal LLMs turn images and audio into token-like vectors with an encoder and projector, so one transformer attends over all of them, at a token cost.`,
    description: `**Question presented to candidate:**
"Models like the current GPT, Claude and Gemini families accept screenshots, photos and audio, not just text. How does a model that was built around text tokens actually take in an image or a sound clip, and what does that mean for us when we build features on it?"

**What a strong answer should cover:**
- Non-text inputs are turned into sequences of vectors in the same embedding space as text tokens: an image is cut into patches and run through a vision encoder (ViT-style), then a projector maps those features to the LLM width; the LLM then attends over image and text positions together
- Audio follows the same pattern: resample, turn into a spectrogram (Whisper uses 80-channel log-Mel frames in 30-second windows), encode, project; or a pipeline of speech-to-text then a text model
- Architectural options: adapter on a pretrained LLM (LLaVA-style projector), cross-attention into a frozen LM, or natively multimodal training; trade-offs in cost and quality
- Practical consequences: images and audio cost tokens (each provider publishes a formula: tiles, patches or per-second rates), resolution settings trade detail for cost, large images are downscaled
- Limitations and risks: small text and counting errors, hallucinated visual details, and prompt injection hidden inside images or audio

**Code / implementation expected:** Optional — turning a small image into patch vectors, or estimating image and audio token counts from published rules, shows real understanding.`,
    answer: `**Target Audience:** Engineers who have used text-only LLM APIs and now need to send screenshots, scans, photos or audio.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (the patch-projection demo and the token estimators below; no real model is called). Provider token rules and paper details are cited inline with the source and the date checked (October 2026).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Imagine a brilliant analyst who only reads text, and who works in a sealed room. Someone wants their opinion on a photograph. You cannot pass the photo through the slot, only cards with writing. So you hire an assistant who looks at the photo square by square and writes a card for each square: "dark blue, smooth, a straight edge on the left", and so on. The analyst reads all the cards in order, next to your question, and answers.

That is almost exactly how most multimodal language models work. The "analyst" is the language model, which can only read sequences of vectors. The "assistant" is an **encoder** that turns pixels or sound into vectors of the same kind. Once you see it this way, the engineering consequences follow naturally: each square costs a card (tokens, money and context space), a tiny photo of a contract gives the assistant too few squares to read the fine print, and anything written *inside* the photo reaches the analyst as if you had written it yourself.

## 2. The Core Idea: Everything Becomes a Sequence of Vectors

📌 **Interview term: embedding** — a vector of numbers that represents one position in the model input. For text, each token ID is looked up in an embedding table. The transformer only ever sees these vectors, never raw text or pixels. See [What are embeddings and what are they used for?](/interview-question/what-are-embeddings-and-what-are-they-used-for)

📌 **Interview term: multimodal model** — a model that accepts (and sometimes produces) more than one kind of data, such as text, images, audio or video, by converting each into vectors the same transformer can attend over.

<svg class="iq-diagram" width="100%" viewBox="0 0 860 300" role="img" aria-label="Image goes through a vision encoder and a projector, text goes through the embedding table, and both sequences enter the same language model">
  <defs>
    <marker id="ai02q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="130" height="70" rx="10"/>
  <text class="d-text" x="85" y="70" text-anchor="middle">image</text>
  <rect class="d-box" x="200" y="30" width="160" height="70" rx="10"/>
  <text class="d-text" x="280" y="62" text-anchor="middle">vision encoder</text>
  <text class="d-sub" x="280" y="84" text-anchor="middle">patches to features</text>
  <rect class="d-box" x="410" y="30" width="140" height="70" rx="10"/>
  <text class="d-text" x="480" y="62" text-anchor="middle">projector</text>
  <text class="d-sub" x="480" y="84" text-anchor="middle">to LLM width</text>
  <rect class="d-box-muted" x="20" y="200" width="130" height="70" rx="10"/>
  <text class="d-text" x="85" y="240" text-anchor="middle">text</text>
  <rect class="d-box" x="200" y="200" width="350" height="70" rx="10"/>
  <text class="d-text" x="375" y="232" text-anchor="middle">tokenizer and embedding table</text>
  <text class="d-sub" x="375" y="254" text-anchor="middle">token IDs to vectors</text>
  <rect class="d-box-accent" x="640" y="100" width="200" height="100" rx="12"/>
  <text class="d-text" x="740" y="144" text-anchor="middle">language model</text>
  <text class="d-sub" x="740" y="168" text-anchor="middle">one sequence</text>
  <path class="d-edge" d="M 154 65 L 194 65" marker-end="url(#ai02q5-arrow)"/>
  <path class="d-edge" d="M 364 65 L 404 65" marker-end="url(#ai02q5-arrow)"/>
  <path class="d-edge" d="M 554 65 L 600 65 L 600 125 L 634 125" marker-end="url(#ai02q5-arrow)"/>
  <path class="d-edge" d="M 154 235 L 194 235" marker-end="url(#ai02q5-arrow)"/>
  <path class="d-edge" d="M 554 235 L 600 235 L 600 175 L 634 175" marker-end="url(#ai02q5-arrow)"/>
</svg>

After the encoder and projector, the image is just more positions in the sequence. Attention lets every text position look at every image position and the other way round, which is how the model can answer "what is written in the top-right corner?"

## 3. Images: Patches, Encoder, Projector

### Patches

📌 **Interview term: patch** — a small square of the image (for example 16 by 16 pixels) treated as one unit. The idea comes from the Vision Transformer, ViT (Dosovitskiy et al., "An Image is Worth 16x16 Words", arXiv 2010.11929, ICLR 2021): reshape the image into a sequence of flattened patches, map each with a trainable linear projection to a fixed-size vector, and add position embeddings so the model knows where each patch was.

The number of patches is simple arithmetic: (side / patch size) squared.

~~~text
ViT-style encoder 224x224 with 16px patches -> 196 patch tokens
ViT-style encoder 336x336 with 14px patches -> 576 patch tokens
ViT-style encoder 448x448 with 14px patches -> 1024 patch tokens
~~~

Doubling the side length quadruples the patches, which is why image cost grows with area.

### The mechanism, run on a tiny image

The example builds an 8 by 8 grayscale image (dark left half, bright right half, one bright dot), cuts it into four 4 by 4 patches, flattens each to 16 numbers, and multiplies by a 4 by 16 weight matrix: a stand-in for the learned projection. The result is one 4-number vector per patch, plus a small position offset:

~~~js
const flat = [];
for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) flat.push(img[py * P + y][px * P + x] / 255);
const vec = Wp.map((row) => row.reduce((a, w, j) => a + w * flat[j], 0) + 0.01 * tokens.length); // + position
~~~

~~~text
patch (0,0) mean=0.099 -> visual token [-0.200, 0.000, 0.200, -0.100]
patch (0,1) mean=0.784 -> visual token [-0.147, 0.010, 0.167, -0.068]
patch (1,0) mean=0.039 -> visual token [0.012, 0.020, 0.028, 0.016]
patch (1,1) mean=0.784 -> visual token [-0.127, 0.030, 0.187, -0.048]
sequence the LLM sees: 4 image tokens + 6 text tokens = 10 positions
~~~

The two dark patches give different vectors because one contains the bright dot; the two bright patches differ only by their position offset. In a real model the weights are learned, the vectors have thousands of dimensions, and there is a deep encoder between the patches and the projection, but the shape of the computation is this.

### Encoder and projector

📌 **Interview term: vision encoder** — a network (usually a ViT, often pretrained with image-text contrastive learning such as CLIP) that turns patches into feature vectors capturing what is in each region and its context.

📌 **Interview term: projector (adapter)** — a small layer that maps vision-encoder features into the language model embedding width, so they can sit in the same sequence as text embeddings. LLaVA (Liu et al., "Visual Instruction Tuning", arXiv 2304.08485) connected a CLIP ViT-L/14 encoder to a language model with a single trainable linear projection, training only the projection first and then the projection plus the LLM; LLaVA-1.5 replaced it with a small MLP (paper and survey coverage, checked October 2026).

### Three ways to wire it

| Approach | How it works | Trade-off |
| :--- | :--- | :--- |
| Adapter on a pretrained LLM | Pretrained vision encoder plus a projector feeding visual tokens into the LLM input | Cheap to train, reuses strong parts; the most common open-model recipe |
| Cross-attention into the LM | Visual features are not in the input sequence; extra cross-attention layers inside the LM read them | Keeps the text sequence short; more architecture changes |
| Natively multimodal | The model is trained on mixed text, image and audio data from early on | Usually strongest cross-modal understanding; the most expensive to train |

Closed frontier models do not publish full architectures, so in an interview say which pattern you are describing rather than claiming how a specific proprietary model works inside.

## 4. Audio: From Waveform to Frames

Audio is a long list of air-pressure samples, far too many to feed in directly (16,000 per second at 16 kHz). The standard first step turns it into a picture of sound.

📌 **Interview term: spectrogram (log-Mel)** — a grid of how much energy the audio has at each frequency band in each short time slice, with frequency bands spaced the way human hearing perceives pitch (the Mel scale) and the energy on a log scale. Whisper (Radford et al., OpenAI, 2022) resamples audio to 16 kHz and computes 80-channel log-Mel spectrograms on 25 ms windows with a 10 ms stride, in 30-second windows (zero-padded if shorter), giving 3,000 frames that two stride-2 convolutions reduce to 1,500 encoder positions (Whisper paper and code, as described by secondary sources checked October 2026; large-v3 uses 128 Mel channels).

From there it is the same pattern as images: an encoder turns frames into feature vectors, and a projector puts them in the LLM sequence. A 45-second clip in the example:

~~~text
audio 45 s: 4500 mel frames, 2 Whisper windows x 1500 encoder positions = 3000; Gemini at 32 tokens/s = 1440 tokens
~~~

There are two system designs for audio features:

| Design | Pipeline | Keeps | Loses |
| :--- | :--- | :--- | :--- |
| Cascade | Speech-to-text, then a text LLM, then optional text-to-speech | Cheap, any text model, a transcript for search and audit | Tone, emotion, overlapping speakers, timing; adds latency at each hop |
| Native audio | Audio frames go into a multimodal model directly (and may come out as audio) | Tone, prosody, speaker cues; lower latency for voice agents | Fewer model choices, higher cost per minute, harder to log and evaluate |

**Video** is handled as sampled frames (each like an image), often with the audio track. Gemini documents fixed rates of about 263 tokens per second of video and 32 per second of audio (Google Gemini API token docs, checked October 2026):

~~~text
video 60 s at Gemini 263 tokens/s = 15780 tokens
~~~

## 5. What It Costs: Image Tokens by Provider

Every provider converts media to input tokens with its own published rule. The example implements three of them as estimators:

📌 **Interview term: image token cost** — the number of input tokens an image is billed as. It depends on the provider rule and on the image size *after* the provider resizes it.

- **Claude:** about width x height / 750 tokens; images larger than the model native limit are first downscaled, preserving aspect ratio. Anthropic vision docs list 1,568 pixels on the long edge (and about 1,568 tokens) for older models and 2,576 pixels (4,784 tokens) for the newest ones (checked October 2026). The example column labels show which limit was used.
- **OpenAI tile rule (GPT-4o-class models, high detail):** fit in 2048 x 2048, scale so the short side is at most 768, count 512-pixel tiles, cost 85 + 170 per tile; low detail is a flat 85 (OpenAI vision guide as quoted on the OpenAI developer forum). Some newer OpenAI models instead count 32-pixel patches with a per-model cap and multiplier, so check the guide for your model.
- **Gemini:** an image with both sides at most 384 pixels is 258 tokens; larger images are tiled into 768 x 768 tiles of 258 tokens each; audio 32 tokens per second (Gemini token docs). The example uses only the Gemini audio and video rates, since the tile cropping rule for large images is not fully specified there.

~~~text
image          claude-1568~  claude-2576~  openai-tiles-high  openai-low
200x200        54            54            255                85
512x512        350           350           255                85
1920x1080      1567          2765          1105               85
4032x3024      1568          4783          765                85
~~~

The surprises in that table are the useful part:

- The 12-megapixel photo is **cheaper** than the 1080p screenshot under the OpenAI tile rule (765 vs 1,105), because it is shrunk to 1024 x 768 first. You did not get 12 megapixels of detail, you got 0.8.
- The same 1080p screenshot costs 1,567 tokens under the older Claude limit and 2,765 under the newer one: a model upgrade can raise image cost by 76% with no code change.
- A tiny icon costs 54 tokens on one rule and 255 on another: per-image overhead matters at high volume.

These are estimators, not billing. Every provider offers a way to count tokens for a real request, and the billed usage in the response is the ground truth. Token basics and context limits: [What are tokens?](/interview-question/what-are-tokens-and-why-do-they-matter-for-cost-and-limits) and [What is a context window?](/interview-question/what-is-a-context-window-and-what-happens-when-you-exceed-it)

## 6. Building With It

- **Choose resolution on purpose.** Crop to the region that matters and send enough pixels for the smallest text to be legible. Detail settings (low/high, media resolution) are a cost and quality dial.
- **Ask for structured output and validate it.** For invoices, forms and receipts, request a strict schema and check fields with code: totals add up, dates parse, IDs match a pattern. See [How do you validate and repair structured LLM output at runtime?](/interview-question/how-do-you-validate-and-repair-structured-llm-output-at-runtime)
- **Evaluate on real inputs.** Phone photos at an angle, low-light scans, handwriting, multi-page PDFs. A golden set of clean screenshots will overstate quality.
- **Count media in the budget.** Ten screenshots in a chat history can be over 10,000 tokens that are resent on every turn; prompt caching helps ([What is prompt caching?](/interview-question/what-is-prompt-caching-and-how-does-it-reduce-cost-and-latency)).
- **Treat media as untrusted input.** Text inside an image, or spoken in audio, reaches the model like any other input. An uploaded image that says "ignore your instructions" is a prompt injection; see [What is prompt injection and how do you defend against it?](/interview-question/what-is-prompt-injection-and-how-do-you-defend-against-it)
- **Mind the data.** Photos and recordings often contain faces, voices, addresses and documents; the PII rules apply. See [How do you handle PII and sensitive data when calling LLM APIs?](/interview-question/how-do-you-handle-pii-and-sensitive-data-when-calling-llm-apis)

Choosing a model that supports the modalities you need is a hard filter in the model-selection process; see [How do you choose the right model for a task?](/interview-question/how-do-you-choose-the-right-model-for-a-task)

## 7. Verified: Running the Code

The example **"From pixels to visual tokens: patchify and project an image, then estimate image and audio token counts"** has two parts. Part 1 runs the real patch-and-project computation on an 8 by 8 synthetic image with fixed, made-up weights (a real encoder is a deep trained network). Part 2 applies the published token rules as estimators; the provider rounding and resizing details may differ slightly, and the billed usage of a real request is authoritative.

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
patch (0,0) mean=0.099 -> visual token [-0.200, 0.000, 0.200, -0.100]
patch (0,1) mean=0.784 -> visual token [-0.147, 0.010, 0.167, -0.068]
patch (1,0) mean=0.039 -> visual token [0.012, 0.020, 0.028, 0.016]
patch (1,1) mean=0.784 -> visual token [-0.127, 0.030, 0.187, -0.048]
sequence the LLM sees: 4 image tokens + 6 text tokens = 10 positions
ViT-style encoder 224x224 with 16px patches -> 196 patch tokens
ViT-style encoder 336x336 with 14px patches -> 576 patch tokens
ViT-style encoder 448x448 with 14px patches -> 1024 patch tokens
image          claude-1568~  claude-2576~  openai-tiles-high  openai-low
200x200        54            54            255                85
512x512        350           350           255                85
1920x1080      1567          2765          1105               85
4032x3024      1568          4783          765                85
audio 45 s: 4500 mel frames, 2 Whisper windows x 1500 encoder positions = 3000; Gemini at 32 tokens/s = 1440 tokens
video 60 s at Gemini 263 tokens/s = 15780 tokens
~~~

## Edge Cases Worth Knowing

- **Small text and dense tables.** After downscaling, an 8-point font in a full-page scan can be a few pixels high. Split the page or crop.
- **Counting and spatial reasoning.** Multimodal models are still error-prone at counting many similar objects, reading exact positions and measuring. Use classical computer vision for those when precision matters.
- **Hallucinated details.** A model can confidently describe text or objects that are not in the image, especially in blurry regions. Ask it to say when something is unreadable, and verify critical values.
- **Image order and references.** With several images, refer to each explicitly ("image 1", "the second screenshot") so the model attends to the right one.
- **Format and size limits.** Providers limit file size, number of images per request and accepted formats; check them before building upload flows.

## Common Pitfalls

- **Sending full-resolution photos and expecting full detail.** The provider resizes first; you pay for what survives, not what you uploaded. Crop instead.
- **Forgetting media in the token budget.** Images and audio are input tokens, resent on every turn of a conversation.
- **Trusting extracted numbers without checks.** Validate with code and route low-confidence cases to review.
- **Ignoring injection through media.** Instructions written in an image or spoken in audio are input, not trusted configuration.
- **Transcribing when tone matters, or going native when only words matter.** Pick the audio design by what information the feature needs.
- **Assuming cost rules are stable.** Limits and formulas change between model versions; re-check the docs and the billed usage on every upgrade.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The core idea:</strong> <span style="color:#f0e2c8;">A language model only processes sequences of vectors. A multimodal model turns other inputs into such vectors, so after an encoder an image is just more positions in the sequence that the transformer attends over together with the text.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Images:</strong> <span style="color:#f0e2c8;">The image is resized and cut into <strong style="color:#ffca28;">patches</strong>, for example 16 by 16 pixels; a <strong style="color:#ffca28;">vision encoder</strong> such as a ViT turns each patch into a feature vector, and a <strong style="color:#ffca28;">projector</strong> maps those into the LLM embedding width. A 224 by 224 image with 16 pixel patches is 196 patch tokens.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Audio:</strong> <span style="color:#f0e2c8;">Audio is resampled and turned into a <strong style="color:#ffca28;">spectrogram</strong>: Whisper uses 80 log-Mel channels every 10 ms in 30-second windows, which its encoder reduces to 1,500 positions. Then the same project-and-attend step. Or you transcribe first and send text, losing tone and timing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What it costs:</strong> <span style="color:#f0e2c8;">Every image and second of audio becomes billed input tokens, by a published formula: about width times height over 750 for Claude, 85 plus 170 per 512 pixel tile for GPT-4o-style high detail, 32 tokens per second of audio for Gemini. Large images are downscaled, so resolution is a cost and quality knob.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What to watch:</strong> <span style="color:#f0e2c8;">Models still misread small text, miscount objects and invent details, so validate extracted values. Text inside an image is input like any other, so treat images and audio from users as possible <strong style="color:#ffca28;">prompt injection</strong>.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is an image token the same as a text token?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both are vectors of the same width at positions in one sequence, so attention treats them alike. But a text token comes from a lookup table of a fixed vocabulary, while an image token is computed from pixels by the encoder and projector, so there is no discrete vocabulary of image tokens in this design.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a high-resolution photo not cost more on some APIs?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the provider downscales it first. In my estimator a 4032 by 3024 photo costs 765 tokens under the GPT-4o tile rule, less than a 1920 by 1080 screenshot at 1,105, because it is shrunk to 1024 by 768 before tiling. Send the resolution you need and crop to the relevant region instead of hoping detail survives.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you transcribe audio instead of sending it to a native audio model?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When only the words matter, you need a searchable transcript anyway, or cost and model choice matter more: speech-to-text plus any text model is cheap and flexible. Native audio input keeps tone, emotion, speakers and timing and can cut latency in voice agents, at higher cost and with fewer model choices.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you get reliable data out of invoices or forms?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Send a resolution where the smallest text is readable, ask for a strict JSON schema, validate every field with code (totals add up, dates parse), and send low-confidence documents to a human or a dedicated OCR pass. Evaluate on a golden set of real scans, including bad photos.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does video work?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As a sequence of sampled frames, each treated like an image, often with the audio track alongside. Cost scales with duration: Gemini documents about 263 tokens per second of video, so one minute is about 15,780 tokens. Sampling rate and resolution are the levers.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Embedding | A vector representing one input position; the only thing the transformer sees |
| Multimodal model | A model that takes more than one data type by turning each into vectors in one sequence |
| Patch | A small square of an image treated as one input unit |
| Vision encoder | A network, usually a ViT, that turns patches into feature vectors |
| Projector (adapter) | A small layer that maps encoder features into the LLM embedding width |
| Spectrogram (log-Mel) | Energy per pitch band per short time slice; the usual audio input representation |
| Image token cost | How many input tokens an image is billed as after provider resizing |

**Conclusion:** A multimodal model does not "see" or "hear" in a special way: an encoder turns patches of pixels or frames of sound into vectors, a projector puts them in the same embedding space as text, and one transformer attends over the whole mixed sequence. Everything practical follows from that. Media costs input tokens by a provider-specific formula, large inputs are downscaled before you are billed, resolution is a cost and quality dial, audio can go through a transcription cascade or into a native audio model depending on whether tone matters, and text hidden inside media is just more input, including malicious input. Validate what you extract, budget for media tokens and re-check the rules on every model upgrade.`,
    examples: [
      {
        label: `From pixels to visual tokens: patchify and project an image, then estimate image and audio token counts`,
        variants: [
          { tech: "node", code: `// How an image becomes "tokens" for a language model, and what that costs.
// Part 1 runs the real mechanism on a tiny image: cut it into patches,
// flatten each patch, project it with a weight matrix into the model width.
// Part 2 applies the providers' published token-count rules (estimators only).

// 1) An 8x8 grayscale image: left half dark, right half bright, a bright dot.
const H = 8, W = 8, P = 4, D = 4;                 // patch size P, model width D
const img = [];
for (let y = 0; y < H; y++) { img.push([]); for (let x = 0; x < W; x++) img[y].push(x < 4 ? 10 : 200); }
img[1][1] = 255;
// Fixed "learned" projection: D x (P*P) weights, deterministic for the demo.
const Wp = [];
for (let i = 0; i < D; i++) { Wp.push([]); for (let j = 0; j < P * P; j++) Wp[i].push((((i * 7 + j * 3) % 5) - 2) / 10); }
const tokens = [];
for (let py = 0; py < H / P; py++) for (let px = 0; px < W / P; px++) {
  const flat = [];
  for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) flat.push(img[py * P + y][px * P + x] / 255);
  const vec = Wp.map((row) => row.reduce((a, w, j) => a + w * flat[j], 0) + 0.01 * tokens.length); // + position
  tokens.push(vec);
  console.log("patch (" + py + "," + px + ") mean=" + (flat.reduce((a, b) => a + b, 0) / flat.length).toFixed(3) +
    " -> visual token [" + vec.map((v) => v.toFixed(3)).join(", ") + "]");
}
const text = ["What", "is", "in", "the", "image", "?"];
console.log("sequence the LLM sees: " + tokens.length + " image tokens + " + text.length + " text tokens = " + (tokens.length + text.length) + " positions");
for (const [side, patch] of [[224, 16], [336, 14], [448, 14]]) {
  console.log("ViT-style encoder " + side + "x" + side + " with " + patch + "px patches -> " + (side / patch) ** 2 + " patch tokens");
}

// 2) Published estimators (rules as documented, checked October 2026).
function claude(w, h, maxEdge = 1568, maxTok = 1568) {
  let s = Math.min(1, maxEdge / Math.max(w, h));
  if ((w * s * h * s) / 750 > maxTok) s = Math.sqrt((maxTok * 750) / (w * h));
  const nw = Math.floor(w * s), nh = Math.floor(h * s);
  return Math.ceil((nw * nh) / 750);
}
function openaiTiles(w, h) {
  let s = Math.min(1, 2048 / Math.max(w, h));
  w = Math.floor(w * s); h = Math.floor(h * s);
  s = Math.min(1, 768 / Math.min(w, h));
  w = Math.floor(w * s); h = Math.floor(h * s);
  return 85 + 170 * Math.ceil(w / 512) * Math.ceil(h / 512);
}
console.log("image          claude-1568~  claude-2576~  openai-tiles-high  openai-low");
for (const [w, h] of [[200, 200], [512, 512], [1920, 1080], [4032, 3024]]) {
  console.log((w + "x" + h).padEnd(15) + String(claude(w, h)).padEnd(14) + String(claude(w, h, 2576, 4784)).padEnd(14) +
    String(openaiTiles(w, h)).padEnd(19) + "85");
}

// Audio: a Whisper-style encoder and a per-second API rate.
const secs = 45;
const frames = secs * 100;                        // 10 ms hop -> 100 frames per second
const windows = Math.ceil(secs / 30);             // fixed 30 s windows, zero-padded
console.log("audio " + secs + " s: " + frames + " mel frames, " + windows + " Whisper windows x 1500 encoder positions = " +
  windows * 1500 + "; Gemini at 32 tokens/s = " + secs * 32 + " tokens");
console.log("video 60 s at Gemini 263 tokens/s = " + 60 * 263 + " tokens");` },
          { tech: "python", code: `# How an image becomes "tokens" for a language model, and what that costs.
# Part 1 runs the real mechanism on a tiny image: cut it into patches,
# flatten each patch, project it with a weight matrix into the model width.
# Part 2 applies the providers' published token-count rules (estimators only).
import math

# 1) An 8x8 grayscale image: left half dark, right half bright, a bright dot.
H, W, P, D = 8, 8, 4, 4                           # patch size P, model width D
img = [[10 if x < 4 else 200 for x in range(W)] for y in range(H)]
img[1][1] = 255
# Fixed "learned" projection: D x (P*P) weights, deterministic for the demo.
Wp = [[(((i * 7 + j * 3) % 5) - 2) / 10 for j in range(P * P)] for i in range(D)]
tokens = []
for py in range(H // P):
    for px in range(W // P):
        flat = [img[py * P + y][px * P + x] / 255 for y in range(P) for x in range(P)]
        vec = []
        for row in Wp:
            a = 0
            for j, w in enumerate(row):
                a = a + w * flat[j]
            vec.append(a + 0.01 * len(tokens))     # + position
        tokens.append(vec)
        mean = 0
        for v in flat:
            mean = mean + v
        print(f"patch ({py},{px}) mean={mean / len(flat):.3f} -> visual token [" + ", ".join(f"{v:.3f}" for v in vec) + "]")
text = ["What", "is", "in", "the", "image", "?"]
print(f"sequence the LLM sees: {len(tokens)} image tokens + {len(text)} text tokens = {len(tokens) + len(text)} positions")
for side, patch in [(224, 16), (336, 14), (448, 14)]:
    print(f"ViT-style encoder {side}x{side} with {patch}px patches -> {(side // patch) ** 2} patch tokens")


# 2) Published estimators (rules as documented, checked October 2026).
def claude(w, h, max_edge=1568, max_tok=1568):
    s = min(1, max_edge / max(w, h))
    if (w * s * h * s) / 750 > max_tok:
        s = math.sqrt((max_tok * 750) / (w * h))
    nw, nh = math.floor(w * s), math.floor(h * s)
    return math.ceil((nw * nh) / 750)


def openai_tiles(w, h):
    s = min(1, 2048 / max(w, h))
    w, h = math.floor(w * s), math.floor(h * s)
    s = min(1, 768 / min(w, h))
    w, h = math.floor(w * s), math.floor(h * s)
    return 85 + 170 * math.ceil(w / 512) * math.ceil(h / 512)


print("image          claude-1568~  claude-2576~  openai-tiles-high  openai-low")
for w, h in [(200, 200), (512, 512), (1920, 1080), (4032, 3024)]:
    print(f"{w}x{h}".ljust(15) + str(claude(w, h)).ljust(14) + str(claude(w, h, 2576, 4784)).ljust(14)
          + str(openai_tiles(w, h)).ljust(19) + "85")

# Audio: a Whisper-style encoder and a per-second API rate.
secs = 45
frames = secs * 100                               # 10 ms hop -> 100 frames per second
windows = math.ceil(secs / 30)                    # fixed 30 s windows, zero-padded
print(f"audio {secs} s: {frames} mel frames, {windows} Whisper windows x 1500 encoder positions = "
      f"{windows * 1500}; Gemini at 32 tokens/s = {secs * 32} tokens")
print(f"video 60 s at Gemini 263 tokens/s = {60 * 263} tokens")` },
        ],
      },
    ],
  },
];

export default augments;
