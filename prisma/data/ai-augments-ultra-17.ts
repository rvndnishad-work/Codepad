/**
 * AI ENGINEERING ULTRA — batch 17: operating LLM features (versioning, testing and
 * rolling out prompt changes, monitoring quality drift, what to log and trace, and
 * tracing LLM calls with OpenTelemetry-style spans).
 * Every example was run by scripts/verify-variant-examples.ts (node, python);
 * quoted output is that run's output.
 */
import type { AiUltraAugment } from "./ai-augments.types";

const augments: AiUltraAugment[] = [
  {
    title: `How do you version, test and safely roll out prompt changes?`,
    difficulty: "hard",
    seoDescription: `Ship prompt changes like code: immutable hashed versions, labels, a per-case eval gate, sticky canary rollout with automatic stop, and instant rollback.`,
    description: `**Question presented to candidate:**
"Product wants to tweak the system prompt of our support assistant about twice a week, and last month one of those edits quietly broke ticket routing for a day. How would you version prompts, test a change before it ships, and roll it out so a bad edit reaches as few users as possible and can be undone in seconds?"

**What a strong answer should cover:**
- Prompts as versioned, immutable artifacts: the template together with the model snapshot and sampling parameters, identified by a version number and a content hash, with movable labels (\`production\`, \`staging\`) pointing at versions, and the version logged on every request
- An offline gate before any user sees the change: run the golden set, compare per case against the version in production (a change that fixes one case and breaks another must fail), plus cheap checks such as "every template variable is filled"
- Progressive delivery: shadow traffic or a canary on a small, sticky slice of users (hash-based bucketing so a user does not flip between versions), ramped in stages while live quality, cost and latency are compared with the control arm
- Automatic stop and instant rollback: guard metrics with a statistical threshold, and rollback as a label or flag move that needs no code deploy (and keeps prompt and model pinned together)
- Why this is needed at all: prompt edits have non-local effects, and a model snapshot change is a prompt change too; the offline gate cannot see everything, so the canary exists to catch what it misses

**Clarifying questions expected:**
- Do we have a golden dataset and a live quality signal (thumbs, resolution rate, judge scores) to compare arms on?
- Who edits prompts — engineers through code review, or product people through a UI — and does a change need approval?
- How much traffic per day, so we know how long each canary stage must run to detect a meaningful difference?

**Code / implementation expected:** Optional — a registry with versions and labels, a gate that compares per-case results, or hash-based canary bucketing.`,
    answer: `**Target Audience:** Engineers who own an LLM feature in production and need prompt edits to ship as safely as code changes; also anyone preparing for an AI engineering or ML platform interview.
**Difficulty:** Hard
**Verified with:** Node 22.22.0 and Python 3.12.3 (the registry, gate and canary simulation below, identical output in both). Tool behaviour (Langfuse labels, model aliases) was checked with web searches in October 2026 and is cited inline.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A restaurant changes one line in its recipe book: "add a pinch more salt to the soup base". Nobody thinks twice. But the soup base goes into eleven dishes, and two of them were already salty. On Friday night, table after table sends food back, and the head chef cannot even say which version of the recipe the kitchen used on Thursday, because the book was edited in pen.

A prompt is that recipe book. One sentence added to fix a complaint ("payment problems are billing issues") changes how the model treats every other input that happens to mention payment. There is no compiler error and no failed test by default: the feature keeps answering, just differently. And if the prompt lives in a database row someone edited through an admin page, nobody can say which wording produced yesterday's bad answers.

The fix is the same discipline software teams apply to code, adjusted for the fact that the "program" is probabilistic:

1. **Version** every prompt so it can never change silently.
2. **Test** each new version against the old one before users see it.
3. **Roll out** gradually, watch real users, and keep a one-click way back.

This doc goes through the three, with a small program that runs the whole loop.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is there a golden dataset with expected outputs? | Without one there is no offline gate, only a canary, so the canary must be smaller and slower |
| What live quality signal exists (thumbs, resolution, escalation, judge scores)? | The canary compares arms on this signal; no signal means you are only checking errors and latency |
| Who edits prompts, and through what? | Engineers in git need code review and CI; product people in a UI need a registry with approvals and protected labels |
| How much traffic per day? | Sets how long each canary stage must run to detect a real difference (worked numbers in section 6) |
| Is the model pinned to a dated snapshot? | If the provider can move an alias under you, "the prompt" is not the only thing that changes |
| Are outputs consumed by code (JSON, routing labels) or read by people? | Machine-read outputs can use strict code graders and fail fast; free text needs judges and human review |

## 3. Versioning: What Exactly Is "a Prompt Version"?

The plain idea: once a prompt version is published, it never changes. A new wording is a new version. What changes is which version is *live*.

📌 **Interview term: prompt registry** — a store of prompt versions (in git, in your database, or a tool such as Langfuse, LangSmith or Braintrust) where each version is immutable and has an identifier your code can fetch and log.

The versioned unit should be more than the template text. Model, sampling parameters and the template behave as one thing: the same words on a different model snapshot are a different behaviour. So the registry entry holds:

| Field | Example | Why it is part of the version |
| :--- | :--- | :--- |
| Template | \`Classify the support ticket... Ticket: {ticket}\` | The words |
| Variables | \`ticket\` | A render with a missing variable must fail loudly, not send \`{ticket}\` to the model |
| Model snapshot | \`model-2026-01-15\` (dated, not an alias) | A new snapshot changes behaviour even with identical words |
| Parameters | \`temperature: 0, max_tokens: 5\` | Temperature or a token limit change outputs as much as wording |
| Content hash | \`24b23131c653\` | Proves two environments run byte-identical prompts; detects drift between git and the registry |

📌 **Interview term: content hash** — a hash (here SHA-256, first 12 hex characters) of the canonical serialised version. Two versions with the same hash are the same prompt, wherever they live. In the example, registering identical content twice returns the existing \`v1\` instead of creating \`v2\`.

📌 **Interview term: label (alias, tag)** — a movable name such as \`production\` or \`staging\` that points at one immutable version. Deploying a prompt is moving the label; rolling back is moving it back. Langfuse documents exactly this model: fetching a prompt without a label returns the version labelled \`production\`, and its docs describe rollback as setting the production label on the previous version; its SDKs cache prompts client-side with a default 60-second TTL, so running apps pick up a label move within about a minute (Langfuse docs, "Prompt Version Control", checked October 2026).

<svg class="iq-diagram" width="100%" viewBox="0 0 860 250" role="img" aria-label="Three immutable prompt versions with a production label pointing at version three and a dashed arrow showing rollback to version one">
  <defs>
    <marker id="ai17q1-arr" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="40" y="140" width="200" height="70" rx="10"/>
  <text class="d-text" x="140" y="170" text-anchor="middle">triage v1</text>
  <text class="d-sub" x="140" y="194" text-anchor="middle">hash 91d8ab3ae2d7</text>
  <rect class="d-box-muted" x="330" y="140" width="200" height="70" rx="10"/>
  <text class="d-text" x="430" y="170" text-anchor="middle">triage v2</text>
  <text class="d-sub" x="430" y="194" text-anchor="middle">failed the gate</text>
  <rect class="d-box" x="620" y="140" width="200" height="70" rx="10"/>
  <text class="d-text" x="720" y="170" text-anchor="middle">triage v3</text>
  <text class="d-sub" x="720" y="194" text-anchor="middle">hash 24b23131c653</text>
  <rect class="d-box-accent" x="620" y="20" width="200" height="56" rx="10"/>
  <text class="d-text" x="720" y="54" text-anchor="middle">label: production</text>
  <path class="d-edge-accent" d="M 720 80 L 720 134" marker-end="url(#ai17q1-arr)"/>
  <path class="d-edge-dashed" d="M 612 48 L 140 48 L 140 134" marker-end="url(#ai17q1-arr)"/>
</svg>

The solid arrow is where \`production\` points now; the dashed arrow is a rollback. Versions are never edited or deleted; the label is the only thing that moves. A rollback is therefore a pointer change that takes effect on the next fetch, not a rebuild and redeploy.

Two practical rules follow:

- **Log the version on every request.** The last line of the example prints \`prompt=triage@v3 hash=24b23131c653 model=model-2026-01-15\`. Every trace and eval record carries this, so "which wording produced this answer?" always has an answer. What else to log is covered in [What should you log and trace in an LLM application?](/interview-question/what-should-you-log-and-trace-in-an-llm-application)
- **Pin the model snapshot.** Many providers expose both dated model names and undated aliases. Community answers on the OpenAI developer forum describe the undated name as a pointer that can be moved to a newer snapshot, and advise pinning the dated name for stability (OpenAI community forum threads, seen October 2026; this is secondary-source information, so check your provider's model docs). If the alias moves, your "unchanged" prompt changed. The example's \`v4\` is exactly that: the same words on a newer snapshot, which gets a new version and goes through the same rollout.

## 4. Testing: The Offline Gate

Before any user sees a new version, run it against a fixed set of inputs with known good outputs and compare the results with the version currently in production.

📌 **Interview term: golden dataset** — a curated, versioned set of inputs and expected outputs (or grading rubrics) that represents the cases you care about. How to build one is its own topic: [How do you build a golden dataset for evaluating an LLM feature?](/interview-question/how-do-you-build-a-golden-dataset-for-evaluating-an-llm-feature)

📌 **Interview term: eval gate** — a CI step that blocks promotion unless the candidate meets the bar on the golden set. The bar that matters is *per case against the baseline*, not just the average.

Why per case? Look at \`v2\` in the run below. Someone added "Payment problems are billing." to fix case 6 (a failed payment the model called \`other\`). The average did not move: v1 passed 5 of 6, v2 passes 5 of 6. But v2 fixed case 6 and **broke case 5** ("Error 500 when I tap pay" is a bug, and is now called billing). An average-only gate would ship it. A gate that lists \`broke [5]\` fails it, and \`v3\`, which says "billing unless the app shows an error", passes 6 of 6 with nothing broken.

📌 **Interview term: non-local effect** — a prompt edit aimed at one input changes outputs for other, unrelated-looking inputs. It is the main reason prompts need regression tests: you cannot reason about the blast radius of a sentence by reading it.

What a realistic gate contains (each item is cheap and catches a different failure):

| Check | Catches | Grader |
| :--- | :--- | :--- |
| Every template variable is filled; rendered prompt under a token budget | Broken templates, accidental size blow-ups | Code |
| Output parses (JSON schema, allowed label set) | Format regressions | Code |
| Per-case comparison with production on the golden set | Non-local effects, regressions hidden by a flat average | Code or LLM judge |
| Slice scores (per language, per customer tier, per topic) | A regression concentrated in one group | Same graders, grouped |
| Cost and latency on the golden set | A version that is "better" but three times longer | Code |

The example also runs the cheapest check of all: rendering \`v3\` without the \`ticket\` variable throws \`missing variable ticket in v3\` instead of sending a literal \`{ticket}\` to the model.

Model-graded checks, judge bias, statistical noise from sampling, and how to read a delta of a few points on a small set are covered in depth in the sibling question [How do you catch regressions when changing a prompt or upgrading a model?](/interview-question/how-do-you-catch-regressions-when-changing-a-prompt-or-upgrading-a-model) and in [What is LLM-as-judge and what are its known biases?](/interview-question/what-is-llm-as-judge-and-what-are-its-known-biases). This doc treats the gate as one stage of a release pipeline.

## 5. Rolling Out: Shadow, Canary, Ramp

The offline gate only knows the inputs you wrote down. Real users send other things. So the next stage exposes the new version to a small slice of real traffic and compares it with the current version on live signals.

<svg class="iq-diagram" width="100%" viewBox="0 0 900 190" role="img" aria-label="Release pipeline from a new version through the offline gate and a shadow run to canary stages and production with an abort path back">
  <defs>
    <marker id="ai17q1-arr2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="90" y="70" text-anchor="middle">new version</text>
  <text class="d-sub" x="90" y="94" text-anchor="middle">immutable</text>
  <rect class="d-box-accent" x="200" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="270" y="70" text-anchor="middle">offline gate</text>
  <text class="d-sub" x="270" y="94" text-anchor="middle">golden set</text>
  <rect class="d-box" x="380" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="450" y="70" text-anchor="middle">shadow</text>
  <text class="d-sub" x="450" y="94" text-anchor="middle">optional</text>
  <rect class="d-box-accent" x="560" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="630" y="70" text-anchor="middle">canary</text>
  <text class="d-sub" x="630" y="94" text-anchor="middle">5, 25, 50 pct</text>
  <rect class="d-box" x="740" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="810" y="70" text-anchor="middle">production</text>
  <text class="d-sub" x="810" y="94" text-anchor="middle">label moved</text>
  <path class="d-edge" d="M 164 75 L 194 75" marker-end="url(#ai17q1-arr2)"/>
  <path class="d-edge" d="M 344 75 L 374 75" marker-end="url(#ai17q1-arr2)"/>
  <path class="d-edge" d="M 524 75 L 554 75" marker-end="url(#ai17q1-arr2)"/>
  <path class="d-edge" d="M 704 75 L 734 75" marker-end="url(#ai17q1-arr2)"/>
  <path class="d-edge-dashed" d="M 630 114 L 630 160 L 90 160 L 90 116" marker-end="url(#ai17q1-arr2)"/>
</svg>

Each stage either passes the version on or, along the dashed path, stops the rollout and leaves the \`production\` label where it was.

📌 **Interview term: shadow deployment** — the new version runs on a copy of real requests, but its output is only logged, never shown. It costs a second model call per request, so it is usually sampled. It answers "does it crash, how long are outputs, what does it cost, how often does it disagree with production?" safely, but it cannot measure user reaction, because users never see it.

📌 **Interview term: canary release** — the new version serves a small percentage of real users while the rest stay on the current version (the control arm); you compare the two arms on live metrics and either ramp up or stop.

📌 **Interview term: sticky bucketing** — assigning a user to an arm with a deterministic hash of a stable ID (here \`sha256("triage-v3:" + userId)\`, first 8 hex digits, mod 100) instead of a random coin per request. The same user always sees the same version, which matters for chat (a conversation should not switch personalities halfway) and for clean measurement. Because the bucket number is fixed, a user in the 5% slice is still in the 25% and 50% slices as the ramp widens; the example checks this at every stage (\`sticky=true\`). Using the experiment name in the hash gives each rollout a fresh split, so the same users are not always the guinea pigs.

📌 **Interview term: guard metric** — a metric the new version must not make worse (thumbs-down rate, escalation to a human, JSON parse failures, p95 latency, cost per request). The rollout stops automatically when a guard metric is significantly worse in the canary arm.

The example uses a two-proportion z-test on thumbs-down rate and stops when \`z > 2\` (canary worse by about two standard errors). Two things in the output are worth reading slowly:

- **v3 is promoted although it never "proved" it is better.** At every stage \`z\` is negative but small (\`-0.41\`, \`-0.17\`, \`-0.82\`): no evidence of harm, no strong evidence of improvement. A canary is a *safety* check, the question is "is it not worse?", which is called a non-inferiority check. Proving an improvement is an A/B test question and needs more traffic.
- **v4 is stopped at 5%.** It passed the offline gate 6 of 6 (same words, and the golden set does not cover what changed), but on the new model snapshot users disliked it: \`8.0%\` thumbs-down against \`2.6%\`, \`z=2.98\`. The label never moved, so stopping means routing the canary slice back to v3; nobody had to redeploy anything. This is the case the canary exists for.

Where the switch lives: a feature-flag service, the prompt registry label, or a config value your gateway reads. What matters is that it is data, not code, so changing it takes seconds and does not depend on a build pipeline that may itself be broken during an incident.

## 6. How Long Must a Canary Stage Run? (Worked Arithmetic)

The v4 regression was large (simulated at 7.5% against 3.0%), so 87 users were enough. Real regressions are usually smaller. The standard sample-size formula for comparing two proportions at 95% confidence and 80% power gives (computed with Python):

| Baseline thumbs-down | Canary thumbs-down | Users needed per arm |
| :--- | :--- | :--- |
| 4% | 8% (doubles) | about 552 |
| 4% | 5% (one point worse) | about 6,738 |

Assumptions for a capacity estimate: 20,000 conversations a day, 25% canary. The canary arm receives 5,000 conversations a day, so detecting a one-point regression takes about 6,738 / 5,000 ≈ 1.35 days at that stage. At a 5% canary (1,000 a day) it would take almost 7 days. That is why rollouts ramp: a tiny first stage catches disasters within hours, and a larger, longer stage catches the subtle regressions. It is also why teams with little traffic lean harder on the offline gate and on human review of sampled canary outputs.

One more rule from the same arithmetic: decide the stopping threshold *before* you look. Checking a noisy metric every hour and stopping the first time it looks good inflates false "all clear" results.

## 7. Verified: Running the Code

The example **"Prompt registry, per-case gate and sticky canary with automatic stop"** runs the whole loop. The stub model follows only the rules written in the prompt (a keyword classifier), so the gate results are real consequences of the wording. User outcomes in the canary are fixed per user and version by a hash, with a configured thumbs-down rate per version (40, 30 and 75 per 1,000), so the numbers are deterministic. The core of the bucketing and the stop rule:

~~~js
const bucket = (user, exp) => parseInt(sha(\`\${exp}:\${user}\`).slice(0, 8), 16) % 100;
// ... per stage:
const arm = users.filter((u) => bucket(u, exp) < pct);   // 5, then 25, then 50
const z = (p1 - p0) / Math.sqrt(p * (1 - p) * (1 / arm.length + 1 / ctl.length));
if (z > 2) return \`ROLL BACK at \${pct}% (canary significantly worse)\`;
~~~

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
re-register identical content -> v1 (91d8ab3ae2d7)
render check: missing variable ticket in v3
gate v2 vs v1: 5/6 pass, fixed [6], broke [5] -> FAIL
gate v3 vs v1: 6/6 pass, fixed [6], broke [] -> PASS
canary v3:
    5%: canary 112 users 2.7% bad | control 1888 users 3.4% bad | z=-0.41 sticky=true
   25%: canary 518 users 3.1% bad | control 1482 users 3.2% bad | z=-0.17 sticky=true
   50%: canary 1001 users 2.5% bad | control 999 users 3.1% bad | z=-0.82 sticky=true
  -> PROMOTE
gate v4 vs v3: 6/6 pass, fixed [], broke [] -> PASS
canary v4 (same text, new model snapshot):
    5%: canary 87 users 8.0% bad | control 1913 users 2.6% bad | z=2.98 sticky=true
  -> ROLL BACK at 5% (canary significantly worse)
label history:
  production -> v1 (91d8ab3ae2d7)
  production -> v3 (24b23131c653)
request log line: prompt=triage@v3 hash=24b23131c653 model=model-2026-01-15
~~~

What the run shows:

- **Content hashing makes versions idempotent**: re-registering the same template, model and parameters returns \`v1\` with the same hash.
- **The gate catches the non-local effect**: v2 has the same score as v1 (5 of 6) and still fails, because it broke case 5 while fixing case 6.
- **The canary promotes v3** after three stages with no significant harm, and the label history shows exactly one move (\`v1\` to \`v3\`).
- **The canary stops v4 at the first stage**, a model-snapshot change the golden set could not see. The production label stays on v3, and the log line records which version served the request.

What the simulation leaves out: a real registry has access control and approvals, real outcomes are noisy and arrive late (a thumbs-down may come minutes after the answer), traffic is not uniform across users, and a real canary compares several guard metrics at once, which needs a correction for multiple comparisons or a single primary metric.

## 8. Prompts in Git or in a Registry?

| | Prompts in the code repository | Prompts in a registry service |
| :--- | :--- | :--- |
| Change process | Pull request, code review, CI eval gate | UI or API edit, approvals, eval run triggered by the change |
| Who can edit | Engineers | Engineers and product or domain experts |
| Deploy | Ships with the app build (or loaded from a config bundle) | Label move, picked up at runtime after the client cache TTL |
| Rollback | Revert and redeploy, unless a flag selects the version at runtime | Move the label back |
| Risk | Slow rollback if tied to deploys | Runtime dependency on the registry; mitigate with a cached or bundled fallback version |

Many teams combine them: templates are authored and reviewed in git, CI publishes each merged version to the registry with its hash, and production code fetches by label with a bundled fallback in case the registry is unreachable. Whichever you choose, a prompt change also changes the prompt prefix, so expect a cold prompt cache right after rollout ([What is prompt caching and how does it reduce cost and latency?](/interview-question/what-is-prompt-caching-and-how-does-it-reduce-cost-and-latency)).

## Edge Cases Worth Knowing

- **Conversation state across versions.** A user in the middle of a chat when the label moves will have earlier turns produced by the old version. Sticky bucketing by conversation or user ID, and switching only at conversation boundaries, avoids mixed transcripts.
- **Prompts that call tools.** A tool definition (name, description, JSON schema) is part of the prompt. Changing a tool description is a prompt change and goes through the same gate.
- **Chained prompts.** In a pipeline (classify, then retrieve, then answer), version the whole chain as a release set, or a new classifier version can feed an old answer prompt labels it was never tested with.
- **Rolling back the model, not just the words.** If a provider retires the pinned snapshot, the "old version" is no longer available. Keep a tested fallback version on a supported model before the retirement date.
- **Long-tail outputs.** Guard metrics on averages miss rare, severe failures (a harmful answer once in 10,000). Pair the canary with guardrail trigger counts and sampled human review.

## Common Pitfalls

- **Editing the production prompt in place.** If the text behind a name can change, no log line, eval result or bug report can be traced back to the wording that produced it. Versions must be immutable.
- **Gating on the average score only.** A version that fixes one case and breaks another has the same mean. Compare per case against the baseline and fail on any newly broken case unless a human signs off.
- **Versioning the words but not the model and parameters.** A snapshot change or a temperature change is a behaviour change; put them in the versioned unit and in the hash.
- **Random per-request canary assignment.** Users flip between versions mid-conversation and measurements get muddy. Bucket by a stable ID with a hash.
- **Promoting after an hour because "nothing looks wrong".** With realistic traffic a small regression needs thousands of users per arm to show up; size the stage from the arithmetic, not from impatience.
- **Rollback that needs a deploy.** If going back requires CI, a build and a rollout, a bad prompt stays live for as long as the pipeline takes. Rollback should be a label or flag change.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame the risk:</strong> <span style="color:#f0e2c8;">A prompt edit has <strong style="color:#ffca28;">non-local effects</strong>: a sentence added to fix one complaint changes outputs for unrelated inputs, and nothing throws an error. So prompts need the same release discipline as code, adapted to a probabilistic program.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Version:</strong> <span style="color:#f0e2c8;">Every version is immutable and bundles template, <strong style="color:#ffca28;">model snapshot</strong> and parameters, identified by a version number and a content hash. A movable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">production</code> label points at one version, and the version is logged on every request so any answer can be traced to its wording.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Gate offline:</strong> <span style="color:#f0e2c8;">Before users see it, run the golden set and compare <strong style="color:#ffca28;">per case</strong> against production, not just the average: in my demo a version that fixed case 6 and broke case 5 had the same 5-of-6 score and was rightly blocked. Add cheap checks like missing template variables and output schema.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Canary:</strong> <span style="color:#f0e2c8;">Then a <strong style="color:#ffca28;">sticky canary</strong>: hash a stable user ID into 100 buckets, serve 5%, then 25%, then 50%, and compare <strong style="color:#ffca28;">guard metrics</strong> such as thumbs-down, escalations, parse failures, latency and cost against the control arm with a pre-agreed threshold. Size each stage from the arithmetic; a one-point regression on a 4% rate needs about 6,700 users per arm.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Rollback:</strong> <span style="color:#f0e2c8;">Rollback is a label or flag move that takes seconds, never a redeploy. And a model snapshot change is a prompt change too: in my demo the same words on a new snapshot passed the gate and were stopped by the canary at 5%.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just A/B test every prompt change?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A canary asks <em style="color:#d8d8d8;">is it not worse?</em> and can stop early on a small slice; an A/B test asks <em style="color:#d8d8d8;">is it better?</em> and needs enough traffic for a real power calculation. Most prompt changes need the safety check; only changes you want to claim as improvements need the full experiment.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if we have almost no traffic?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Then the canary cannot detect subtle regressions, so lean on the offline gate: a larger golden set, slice scores, an LLM judge with human spot checks, and <strong style="color:#ffca28;">shadow</strong> runs on logged traffic, and keep the first canary stage long with manual review of its outputs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where should prompts live, git or a tool like Langfuse?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either works if versions are immutable and fetchable by label. Git gives code review and CI; a registry lets non-engineers edit and makes rollback a label move. A common hybrid authors in git, publishes each merged version with its hash to the registry, and bundles a fallback version in case the registry is down.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep a user from switching versions mid-conversation?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Assign by a deterministic hash of a stable user or conversation ID, never per request, and only move a conversation at its boundary. Because the bucket is fixed, users in the 5% slice stay in the 25% and 50% slices as the ramp grows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you do when the provider retires the pinned snapshot?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Treat the migration as a new version: same words, new model, new hash, through the same gate and canary, well before the retirement date, and keep a tested fallback on a supported model so rollback is still possible.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Prompt registry | Store of immutable prompt versions that code fetches by name and label |
| Content hash | Hash of the canonical template, model and parameters; same hash means same prompt |
| Label (alias, tag) | Movable pointer such as \`production\` to one version; deploy and rollback move it |
| Golden dataset | Curated inputs with expected outputs used to test every change |
| Eval gate | CI step that blocks a version that regresses on the golden set |
| Non-local effect | An edit aimed at one input changing outputs for other inputs |
| Shadow deployment | New version runs on copied traffic, output logged but never shown |
| Canary release | New version serves a small slice of real users, compared with a control arm |
| Sticky bucketing | Deterministic hash-based assignment so a user always gets the same arm |
| Guard metric | Live metric that must not get worse; a significant drop stops the rollout |

**Conclusion:** Treat a prompt like a release, not a text field. Each version is an immutable bundle of words, model snapshot and parameters with a content hash, and a movable \`production\` label decides which one is live and is logged on every request. Before a version reaches users, a gate compares it case by case with production, because the typical prompt bug is a fix in one place that breaks something else at the same average score. Then a sticky canary ramps it through small and larger slices, stopping automatically when a guard metric gets significantly worse, which catches what the golden set could not see, such as a model snapshot that users dislike. Size the canary stages with real arithmetic, and keep rollback a pointer move that takes seconds.`,
    examples: [
      {
        label: `Prompt registry, per-case gate and sticky canary with automatic stop`,
        variants: [
          { tech: "node", code: `// Prompt registry -> offline gate -> sticky canary -> promote or roll back.
// The "model" is a deterministic stub; integers only, so both languages agree.
const crypto = require("crypto");
const sha = (s) => crypto.createHash("sha256").update(s).digest("hex");

// 1. Registry: immutable versions, content-hashed, labels are movable pointers.
const versions = [];
const labels = {};
const labelLog = [];
function register(name, template, model, params) {
  const spec = { model, name, params, template };      // keys already sorted
  const hash = sha(JSON.stringify(spec)).slice(0, 12);
  const same = versions.find((v) => v.name === name && v.hash === hash);
  if (same) return same;                              // same content, same version
  const v = { ...spec, version: versions.filter((x) => x.name === name).length + 1, hash };
  versions.push(v);
  return v;
}
function setLabel(label, v) { labels[label] = v; labelLog.push(\`\${label} -> v\${v.version} (\${v.hash})\`); }
function render(v, vars) {
  return v.template.replace(/\\{(\\w+)\\}/g, (_, k) => {
    if (!(k in vars)) throw new Error(\`missing variable \${k} in v\${v.version}\`);
    return vars[k];
  });
}

// 2. Stub model: follows only the rules that are written in the prompt.
function fakeModel(prompt) {
  const t = prompt.split("Ticket: ")[1].toLowerCase();
  const err = /crash|error/.test(t);
  if (prompt.includes("Payment problems are billing unless") && /pay/.test(t) && !err) return "billing";
  if (prompt.includes("Payment problems are billing.") && /pay/.test(t)) return "billing";
  if (err) return "bug";
  if (/charge|refund|invoice/.test(t)) return "billing";
  return "other";
}

// 3. Offline gate: golden set, per-case comparison with the production version.
const golden = [
  ["I was charged twice this month", "billing"],
  ["The app crashes when I open settings", "bug"],
  ["How do I change my avatar?", "other"],
  ["Refund my last invoice please", "billing"],
  ["Error 500 when I tap pay", "bug"],
  ["My payment failed and I am not sure it went through", "billing"],
];
const runSuite = (v) => golden.map(([ticket, want]) => fakeModel(render(v, { ticket })) === want);
function gate(candidate, baseline) {
  const c = runSuite(candidate), b = runSuite(baseline);
  const broke = c.map((ok, i) => (b[i] && !ok ? i + 1 : 0)).filter(Boolean);
  const fixed = c.map((ok, i) => (!b[i] && ok ? i + 1 : 0)).filter(Boolean);
  const pass = c.filter(Boolean).length;
  const verdict = broke.length === 0 && pass >= b.filter(Boolean).length ? "PASS" : "FAIL";
  console.log(\`gate v\${candidate.version} vs v\${baseline.version}: \${pass}/6 pass, fixed [\${fixed}], broke [\${broke}] -> \${verdict}\`);
  return verdict === "PASS";
}

const base = "Classify the support ticket as billing, bug or other. Answer with one word.";
const v1 = register("triage", \`\${base}\\nTicket: {ticket}\`, "model-2026-01-15", { max_tokens: 5, temperature: 0 });
setLabel("production", v1);
const again = register("triage", \`\${base}\\nTicket: {ticket}\`, "model-2026-01-15", { max_tokens: 5, temperature: 0 });
console.log(\`re-register identical content -> v\${again.version} (\${again.hash})\`);
const v2 = register("triage", \`\${base}\\nPayment problems are billing.\\nTicket: {ticket}\`, "model-2026-01-15", { max_tokens: 5, temperature: 0 });
const v3 = register("triage", \`\${base}\\nPayment problems are billing unless the app shows an error.\\nTicket: {ticket}\`, "model-2026-01-15", { max_tokens: 5, temperature: 0 });
try { render(v3, {}); } catch (e) { console.log(\`render check: \${e.message}\`); }
gate(v2, v1);
const v3ok = gate(v3, v1);

// 4. Sticky bucketing: a user keeps the same arm as the percentage ramps up.
const bucket = (user, exp) => parseInt(sha(\`\${exp}:\${user}\`).slice(0, 8), 16) % 100;
const users = Array.from({ length: 2000 }, (_, i) => \`u\${String(i + 1).padStart(4, "0")}\`);
// Simulated outcome: 1 = user gave a thumbs-down. Fixed per (user, version) by a hash.
const bad = (user, v, perMille) => parseInt(sha(\`outcome:\${v.hash}:\${user}\`).slice(0, 8), 16) % 1000 < perMille;
const quality = { [v1.hash]: 40, [v3.hash]: 30 };   // thumbs-down per 1000 requests

function canary(cand, stages, exp) {
  const ctlV = labels.production;
  let prev = new Set();
  for (const pct of stages) {
    const arm = users.filter((u) => bucket(u, exp) < pct);
    const stayed = [...prev].every((u) => arm.includes(u));
    const ctl = users.filter((u) => bucket(u, exp) >= pct);
    const cBad = arm.filter((u) => bad(u, cand, quality[cand.hash])).length;
    const kBad = ctl.filter((u) => bad(u, ctlV, quality[ctlV.hash])).length;
    const p1 = cBad / arm.length, p0 = kBad / ctl.length;
    const p = (cBad + kBad) / (arm.length + ctl.length);
    const z = (p1 - p0) / Math.sqrt(p * (1 - p) * (1 / arm.length + 1 / ctl.length));
    console.log(\`  \${String(pct).padStart(3)}%: canary \${arm.length} users \${(100 * p1).toFixed(1)}% bad | control \${ctl.length} users \${(100 * p0).toFixed(1)}% bad | z=\${z.toFixed(2)} sticky=\${stayed}\`);
    if (z > 2) return \`ROLL BACK at \${pct}% (canary significantly worse)\`;
    prev = new Set(arm);
  }
  return "PROMOTE";
}
if (v3ok) {
  console.log(\`canary v\${v3.version}:\`);
  const r = canary(v3, [5, 25, 50], "triage-v3");
  console.log(\`  -> \${r}\`);
  if (r === "PROMOTE") setLabel("production", v3);
}
// 5. A later version that passes the offline gate but users dislike.
const v4 = register("triage", v3.template, "model-2026-09-30", { max_tokens: 5, temperature: 0 });
quality[v4.hash] = 75;
gate(v4, v3);
console.log(\`canary v\${v4.version} (same text, new model snapshot):\`);
console.log(\`  -> \${canary(v4, [5, 25, 50], "triage-v4")}\`);
console.log("label history:");
labelLog.forEach((l) => console.log(\`  \${l}\`));
const live = labels.production;
console.log(\`request log line: prompt=triage@v\${live.version} hash=\${live.hash} model=\${live.model}\`);` },
          { tech: "python", code: `# Prompt registry -> offline gate -> sticky canary -> promote or roll back.
# The "model" is a deterministic stub; integers only, so both languages agree.
import hashlib, json, math, re

def sha(s):
    return hashlib.sha256(s.encode()).hexdigest()

# 1. Registry: immutable versions, content-hashed, labels are movable pointers.
versions = []
labels = {}
label_log = []

def register(name, template, model, params):
    spec = {"model": model, "name": name, "params": params, "template": template}
    h = sha(json.dumps(spec, separators=(",", ":"), ensure_ascii=False))[:12]
    for v in versions:
        if v["name"] == name and v["hash"] == h:
            return v                                   # same content, same version
    v = {**spec, "version": len([x for x in versions if x["name"] == name]) + 1, "hash": h}
    versions.append(v)
    return v

def set_label(label, v):
    labels[label] = v
    label_log.append(f"{label} -> v{v['version']} ({v['hash']})")

def render(v, vars):
    def sub(m):
        k = m.group(1)
        if k not in vars:
            raise KeyError(f"missing variable {k} in v{v['version']}")
        return vars[k]
    return re.sub(r"\\{(\\w+)\\}", sub, v["template"])

# 2. Stub model: follows only the rules that are written in the prompt.
def fake_model(prompt):
    t = prompt.split("Ticket: ")[1].lower()
    err = re.search(r"crash|error", t) is not None
    if "Payment problems are billing unless" in prompt and "pay" in t and not err:
        return "billing"
    if "Payment problems are billing." in prompt and "pay" in t:
        return "billing"
    if err:
        return "bug"
    if re.search(r"charge|refund|invoice", t):
        return "billing"
    return "other"

# 3. Offline gate: golden set, per-case comparison with the production version.
golden = [
    ("I was charged twice this month", "billing"),
    ("The app crashes when I open settings", "bug"),
    ("How do I change my avatar?", "other"),
    ("Refund my last invoice please", "billing"),
    ("Error 500 when I tap pay", "bug"),
    ("My payment failed and I am not sure it went through", "billing"),
]

def run_suite(v):
    return [fake_model(render(v, {"ticket": t})) == want for t, want in golden]

def gate(cand, baseline):
    c, b = run_suite(cand), run_suite(baseline)
    broke = [i + 1 for i in range(6) if b[i] and not c[i]]
    fixed = [i + 1 for i in range(6) if not b[i] and c[i]]
    passed = sum(c)
    verdict = "PASS" if not broke and passed >= sum(b) else "FAIL"
    print(f"gate v{cand['version']} vs v{baseline['version']}: {passed}/6 pass, "
          f"fixed [{','.join(map(str, fixed))}], broke [{','.join(map(str, broke))}] -> {verdict}")
    return verdict == "PASS"

base = "Classify the support ticket as billing, bug or other. Answer with one word."
P = {"max_tokens": 5, "temperature": 0}
v1 = register("triage", f"{base}\\nTicket: {{ticket}}", "model-2026-01-15", P)
set_label("production", v1)
again = register("triage", f"{base}\\nTicket: {{ticket}}", "model-2026-01-15", P)
print(f"re-register identical content -> v{again['version']} ({again['hash']})")
v2 = register("triage", f"{base}\\nPayment problems are billing.\\nTicket: {{ticket}}", "model-2026-01-15", P)
v3 = register("triage", f"{base}\\nPayment problems are billing unless the app shows an error.\\nTicket: {{ticket}}", "model-2026-01-15", P)
try:
    render(v3, {})
except KeyError as e:
    print(f"render check: {e.args[0]}")
gate(v2, v1)
v3ok = gate(v3, v1)

# 4. Sticky bucketing: a user keeps the same arm as the percentage ramps up.
def bucket(user, exp):
    return int(sha(f"{exp}:{user}")[:8], 16) % 100

users = [f"u{i + 1:04d}" for i in range(2000)]

# Simulated outcome: True = user gave a thumbs-down. Fixed per (user, version) by a hash.
def bad(user, v, per_mille):
    return int(sha(f"outcome:{v['hash']}:{user}")[:8], 16) % 1000 < per_mille

quality = {v1["hash"]: 40, v3["hash"]: 30}   # thumbs-down per 1000 requests

def canary(cand, stages, exp):
    ctl_v = labels["production"]
    prev = set()
    for pct in stages:
        arm = [u for u in users if bucket(u, exp) < pct]
        stayed = "true" if prev <= set(arm) else "false"
        ctl = [u for u in users if bucket(u, exp) >= pct]
        c_bad = sum(bad(u, cand, quality[cand["hash"]]) for u in arm)
        k_bad = sum(bad(u, ctl_v, quality[ctl_v["hash"]]) for u in ctl)
        p1, p0 = c_bad / len(arm), k_bad / len(ctl)
        p = (c_bad + k_bad) / (len(arm) + len(ctl))
        z = (p1 - p0) / math.sqrt(p * (1 - p) * (1 / len(arm) + 1 / len(ctl)))
        print(f"  {pct:>3}%: canary {len(arm)} users {100 * p1:.1f}% bad | control {len(ctl)} users "
              f"{100 * p0:.1f}% bad | z={z:.2f} sticky={stayed}")
        if z > 2:
            return f"ROLL BACK at {pct}% (canary significantly worse)"
        prev = set(arm)
    return "PROMOTE"

if v3ok:
    print(f"canary v{v3['version']}:")
    r = canary(v3, [5, 25, 50], "triage-v3")
    print(f"  -> {r}")
    if r == "PROMOTE":
        set_label("production", v3)
# 5. A later version that passes the offline gate but users dislike.
v4 = register("triage", v3["template"], "model-2026-09-30", P)
quality[v4["hash"]] = 75
gate(v4, v3)
print(f"canary v{v4['version']} (same text, new model snapshot):")
print(f"  -> {canary(v4, [5, 25, 50], 'triage-v4')}")
print("label history:")
for l in label_log:
    print(f"  {l}")
live = labels["production"]
print(f"request log line: prompt=triage@v{live['version']} hash={live['hash']} model={live['model']}")` },
        ],
      },
    ],
  },
  {
    title: `How do you monitor LLM quality drift in production?`,
    difficulty: "hard",
    seoDescription: `Catch LLM quality drift with no deploy: proxy signals, daily judged samples, rolling baselines, CUSUM and PSI detectors, slices, and a response loop.`,
    description: `**Question presented to candidate:**
"Our RAG support assistant scored well at launch and nobody has touched the prompt since, but support leads say answers feel worse this month. How would you set up monitoring so that a slow decline in quality is detected by us, with evidence, before customers tell us — and how would you work out what caused it?"

**What a strong answer should cover:**
- Quality can change with zero deploys, and why: input drift (the question mix changes), upstream data drift (documents in the index go stale or change format), provider-side change (alias moves, serving or infrastructure bugs), and slow accumulation of small config changes
- Two kinds of signal: direct quality measured on a daily sample of live traffic (LLM judge or human labels, with a calibrated judge) and cheap proxies on all traffic (thumbs-down, rephrase and retry rate, escalations, refusals, guardrail triggers, output length, parse failures)
- Statistics that fit: a rolling baseline instead of fixed thresholds, the noise of a daily sample (about plus or minus 4 points at 200 samples and 91%), a change detector such as CUSUM or EWMA for small sustained drops, and a distribution distance such as PSI for the input mix
- Slicing by topic, customer, language and model version, because drift is usually concentrated in one slice and the slice points to the cause
- The response loop: confirm with a full eval run, separate input drift from a real regression, fix (data, prompt, routing, model pin) and add the new failure pattern to the golden set

**Clarifying questions expected:**
- How much traffic per day, and how much judging budget, so we know how many conversations we can score?
- Is the model pinned to a dated snapshot, and do we get notice of provider changes?
- Which outcome matters most — correct answers, resolved tickets, or safety — so the primary metric is clear?

**Code / implementation expected:** Optional — a monitor that compares daily metrics with a baseline (CUSUM, EWMA or PSI), or a sampling and judging pipeline sketch.`,
    answer: `**Target Audience:** Engineers and tech leads running an LLM feature in production who need to know when it is getting worse without anyone having changed it; also anyone preparing for an AI engineering interview.
**Difficulty:** Hard
**Verified with:** Node 22.22.0 and Python 3.12.3 (the 21-day drift monitor simulation below, identical output in both). The published incidents cited were checked with web searches in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A ship's navigator sets the course at the harbour, checks it once, and then steers by the compass for a week. Every hour the ship is pointed in exactly the right direction. And yet after a week it is 40 miles off, because a current nobody can see has been pushing it sideways half a knot at a time. No single hour looks wrong. Only the total does.

An LLM feature drifts the same way. On launch day you evaluated it, it scored well, you shipped it. Then:

- marketing launches a campaign and suddenly a fifth of the questions are about a promotion your test set never covered;
- someone updates the promotion terms page, and the old chunk in the search index now contradicts the website;
- the provider changes something on their side;
- and your code has not changed at all, so no test runs and no alert fires.

Quality drift monitoring is the navigator taking a position fix every day and comparing it with where the ship *should* be, with enough statistics to tell a real current from a wave.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How much traffic per day, and how much can we spend on judging? | Sets the sample size, and the sample size sets how small a drop you can see (section 5) |
| What is the primary outcome: correct answers, resolved tickets, safety? | One primary metric avoids alarm fatigue from twenty dashboards |
| Is the model pinned to a dated snapshot? Do we get change notices? | Tells you whether "provider change" is a possible cause you must watch for |
| Does the feature use retrieval over documents that change? | Upstream data drift is a top cause for RAG; you then also monitor the index |
| Do we have user feedback (thumbs, escalation to a human, ticket reopen)? | Free, high-volume proxy signals; without them, everything rests on sampling |

## 3. What Drifts: Four Causes With No Deploy

📌 **Interview term: quality drift** — a change in how good the outputs are over time, measured against a baseline, when nobody intentionally changed the feature.

| Cause | What changes | Typical first symptom |
| :--- | :--- | :--- |
| **Input drift** (📌 also called data drift or covariate shift) | The mix of questions: new topics, new user groups, a new language, longer inputs | Topic distribution moves; quality may hold or drop only on the new topics |
| **Upstream data drift** | Documents in the index go stale, get duplicated, change format, or a source feed breaks | Drop in one topic slice; groundedness or citation checks fail |
| **Provider-side change** | An alias moves to a new snapshot, or serving infrastructure changes behaviour | Output length or format shifts across all slices at once; refusal rate moves |
| **Slow configuration creep** | Retrieval settings, tool descriptions, context assembly edited in small steps, each one "harmless" | Gradual decline that lines up with no single change |

Provider-side change is not hypothetical, and it is hard to see. Two published cases:

- Chen, Zaharia and Zou, "How Is ChatGPT's Behavior Changing over Time?" (arXiv 2307.09009) compared March and June 2023 versions of GPT-4 and GPT-3.5 behind the same API names and reported, for example, GPT-4 accuracy on identifying prime numbers dropping from 84% to 51%, while other tasks improved. The interpretation was disputed at the time (press coverage quoted Arvind Narayanan of Princeton saying it was not conclusive evidence of a decline), but the narrower lesson stands: the behaviour behind an unpinned name changed.
- Anthropic's engineering postmortem of September 17, 2025, "A postmortem of three recent issues", described three infrastructure bugs that intermittently degraded Claude responses between August and early September 2025: requests routed to servers configured for a different context window (at its worst, according to coverage of the postmortem, 16% of Sonnet 4 requests on August 31), a TPU server misconfiguration that, as secondary coverage reports, produced stray characters such as Thai text in English answers, and a latent XLA:TPU compiler bug triggered by a change to token selection. Secondary coverage (InfoQ, Simon Willison) also reports Anthropic saying the reports were hard to distinguish from normal variation in user feedback. That sentence is the whole problem this doc is about.

Pinning a dated snapshot removes one source of change; it does not freeze the serving stack, your documents or your users.

## 4. Two Kinds of Signal

<svg class="iq-diagram" width="100%" viewBox="0 0 880 300" role="img" aria-label="All production traffic feeds cheap proxy metrics while a small daily sample is scored by a judge and both feed a baseline comparison that raises alarms">
  <defs>
    <marker id="ai17q2-arr" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="110" width="170" height="80" rx="10"/>
  <text class="d-text" x="105" y="145" text-anchor="middle">all traffic</text>
  <text class="d-sub" x="105" y="170" text-anchor="middle">every request</text>
  <rect class="d-box" x="300" y="20" width="230" height="80" rx="10"/>
  <text class="d-text" x="415" y="55" text-anchor="middle">proxy metrics</text>
  <text class="d-sub" x="415" y="80" text-anchor="middle">thumbs, retries, length</text>
  <rect class="d-box-accent" x="300" y="200" width="230" height="80" rx="10"/>
  <text class="d-text" x="415" y="235" text-anchor="middle">judged sample</text>
  <text class="d-sub" x="415" y="260" text-anchor="middle">200 per day</text>
  <rect class="d-box-muted" x="650" y="110" width="210" height="80" rx="10"/>
  <text class="d-text" x="755" y="145" text-anchor="middle">baseline compare</text>
  <text class="d-sub" x="755" y="170" text-anchor="middle">CUSUM, PSI, slices</text>
  <path class="d-edge" d="M 194 135 L 294 70" marker-end="url(#ai17q2-arr)"/>
  <path class="d-edge" d="M 194 165 L 294 230" marker-end="url(#ai17q2-arr)"/>
  <path class="d-edge" d="M 534 60 L 644 135" marker-end="url(#ai17q2-arr)"/>
  <path class="d-edge-accent" d="M 534 240 L 644 165" marker-end="url(#ai17q2-arr)"/>
</svg>

Proxies are cheap and cover every request but are indirect; the judged sample measures quality directly but only on a few hundred conversations a day. You need both.

📌 **Interview term: proxy metric** — a cheap signal that correlates with quality without measuring it: thumbs-down rate, the user rephrasing the same question (a strong sign the answer failed), escalation to a human, ticket reopened, refusal rate, guardrail triggers, JSON parse or repair failures, and the distribution of output length. A sudden shift in average output length across every slice is a classic fingerprint of a model or serving change.

📌 **Interview term: online evaluation** — scoring a random sample of live production traffic every day with the same graders you use offline (an LLM judge for faithfulness or helpfulness, code checks for format), so you get a direct quality time series. The judge must be checked against human labels before you trust its trend, and must itself be pinned, or you are measuring the judge's drift ([What is LLM-as-judge and what are its known biases?](/interview-question/what-is-llm-as-judge-and-what-are-its-known-biases)).

Both signals depend on logging the right fields per request (prompt version, model returned by the API, retrieved document IDs, topic): see [What should you log and trace in an LLM application?](/interview-question/what-should-you-log-and-trace-in-an-llm-application)

## 5. How Noisy Is a Daily Sample? (Worked Arithmetic)

Before choosing alarm rules, know your noise. With a judge pass rate around p = 0.909 and n = 200 judged conversations a day, the standard error is √(p(1−p)/n) ≈ 2.03 points, so one day's number moves by about **±4.0 points** (95%) for no reason at all. The example prints this on its first line.

| Judged per day | 95% interval for one day |
| :--- | :--- |
| 50 | about ±8.0 points |
| 200 | about ±4.0 points |
| 1,000 | about ±1.8 points |

To detect a 3-point drop *from a single day* with 80% power you would need about 719 judged conversations per day (the example computes it). At an assumed 3,000 tokens per judge call, 719 calls a day is about 2.2 million judge tokens a day; 200 a day is 0.6 million. That cost is why you do not try to catch small drops from one day's sample. You accumulate evidence over several days instead, which is what a change detector does.

## 6. Detecting the Change

Three rules, and why two of them fail in the example:

1. **Fixed threshold** ("alert if pass rate is below 80%"). Simple, and wrong in both directions: set too low it never fires on a real 3-point drop (the example: \`never\`), set too high it fires on noise. It also goes stale as the baseline moves.
2. **Daily z-score against a rolling baseline** ("alert if today is 3 standard errors below the last 7 days"). Better, but it only catches big jumps. A sustained drop of about 1.5 sigma never crosses 3 sigma on any single day (the example: \`never\`).
3. **A cumulative change detector.**

📌 **Interview term: CUSUM (cumulative sum control chart)** — a classic statistical process control method that adds up how far each day falls below the baseline, minus a small allowance \`k\`, and never goes below zero: \`S = max(0, S + (baseline − today)/sigma − k)\`. Noise around the baseline keeps \`S\` near zero; a small but *sustained* drop makes it climb steadily until it passes an alarm level \`h\`. The example uses \`k = 0.5\` and \`h = 4\` (both in units of sigma), common textbook starting points that you tune for your own false-alarm rate.

📌 **Interview term: EWMA (exponentially weighted moving average)** — a related detector that smooths the series (\`m = a·today + (1 − a)·m\`) and alarms when the smoothed value leaves a band. Same idea: trade a few days of delay for the ability to see small shifts.

For the *input* side, you compare distributions rather than averages.

📌 **Interview term: Population Stability Index (PSI)** — a distance between a baseline distribution and today's, over the same bins (here topic categories): \`PSI = Σ (a − e) · ln(a / e)\`, with a small floor for empty bins. A widely used rule of thumb from credit-risk model monitoring reads below 0.1 as no significant shift, 0.1 to 0.25 as moderate, and above 0.25 as a major shift; reviews of the method note that these cut-offs are conventions of unclear origin that ignore sample size (arXiv 2303.01227, a critical review of population stability testing). Topic labels come from a cheap classifier, or from clustering embeddings of the questions.

<svg class="iq-diagram" width="100%" viewBox="0 0 980 390" role="img" aria-label="Daily pass rate that steps down at day fifteen and a CUSUM line that stays at zero then climbs and crosses the alarm level at day eighteen">
  <line class="d-edge" x1="60" y1="345" x2="800" y2="345"/>
  <text class="d-sub" x="60" y="375" text-anchor="middle">day 1</text>
  <text class="d-sub" x="550" y="375" text-anchor="middle">day 15</text>
  <text class="d-sub" x="760" y="375" text-anchor="middle">day 21</text>
  <polyline class="d-edge" fill="none" points="60,60 95,64 130,72 165,60 200,64 235,72 270,60 305,64 340,72 375,60 410,64 445,72 480,60 515,64 550,96 585,84 620,88 655,96 690,84 725,88 760,96"/>
  <text class="d-text" x="830" y="100">pass rate</text>
  <line class="d-edge-dashed" x1="60" y1="260" x2="800" y2="260"/>
  <text class="d-sub" x="830" y="265">alarm level</text>
  <polyline class="d-edge-accent" fill="none" points="60,340 95,340 130,340 165,340 200,340 235,340 270,340 305,340 340,340 375,340 410,340 445,340 480,340 515,340 550,311 585,297 620,279 655,250 690,236 725,217 760,188"/>
  <text class="d-text" x="830" y="193">CUSUM</text>
  <circle class="d-accent" cx="655" cy="250" r="7"/>
  <text class="d-sub" x="560" y="225" text-anchor="middle">alarm on day 18</text>
</svg>

The pass rate (top line) steps down by about 3 points at day 15, well inside the daily noise band, so no single day looks alarming. CUSUM (bottom line) ignores the noise, then accumulates the sustained drop and crosses its alarm level three days later. The shapes are drawn from the run's numbers, not to an exact scale.

## 7. Verified: Running the Code

The example **"21-day drift monitor: fixed threshold vs daily z vs CUSUM, PSI and slices"** simulates a support assistant with 200 judged conversations a day and no deploys. Two things happen: from day 10 a promotion campaign adds a new topic (\`promo\`, 10% of traffic), and from day 15 the judge pass rate drops by about 3 points because, in the story, the promotion terms page in the index went stale. Daily values are fixed numbers with a small built-in wiggle so the output is deterministic. The detector core:

~~~js
const z = (p - p0) / sigma;                        // today vs baseline, in sigmas
S = Math.max(0, S + (p0 - p) / sigma - K);         // CUSUM: accumulate sustained drops
const drift = psi(BASE_MIX, topicCounts(day));     // input mix vs the golden-set mix
~~~

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
baseline pass rate 90.9%, daily sigma 2.03 pts, 95% interval for one day +/-4.0 pts
day  pass%     z  cusum   psi  alarms
  1   91.5  0.28   0.00 0.000
  2   91.0  0.04   0.00 0.001
  3   90.0 -0.46   0.00 0.001
  4   91.5  0.28   0.00 0.000
  5   91.0  0.04   0.00 0.002
  6   90.0 -0.46   0.00 0.001
  7   91.5  0.28   0.00 0.000
  8   91.0  0.04   0.00 0.001
  9   90.0 -0.46   0.00 0.000
 10   91.5  0.28   0.00 0.468  PSI>0.25
 11   91.0  0.04   0.00 0.467  PSI>0.25
 12   90.0 -0.46   0.00 0.467  PSI>0.25
 13   91.5  0.28   0.00 0.467  PSI>0.25
 14   91.0  0.04   0.00 0.466  PSI>0.25
 15   87.0 -1.93   1.43 0.467  PSI>0.25
 16   88.5 -1.20   2.13 0.467  PSI>0.25
 17   88.0 -1.44   3.07 0.466  PSI>0.25
 18   87.0 -1.93   4.51 0.468  CUSUM PSI>0.25
 19   88.5 -1.20   5.20 0.467  CUSUM PSI>0.25
 20   88.0 -1.44   6.14 0.467  CUSUM PSI>0.25
 21   87.0 -1.93   7.58 0.467  CUSUM PSI>0.25
first alarm day per detector:
  FIXED<80% never
  Z<-3      never
  CUSUM     day 18
  PSI>0.25  day 10
day 18 by topic (day 14 -> day 18):
  billing  91.7% -> 92.0%
  bug      92.6% -> 92.2%
  account  94.4% -> 94.4%
  other    83.3% -> 83.3%
  promo    85.0% -> 45.0%
samples per day to detect a 3-point drop in one day: 719
~~~

What the run shows:

- **Input drift and quality drift are different things.** PSI jumps to about 0.47 on day 10 (above the 0.25 "major shift" convention), but the pass rate does not move for five days. That alarm means "your golden set no longer represents traffic, go add promo questions to it", not "the model got worse".
- **The fixed 80% threshold never fires**, even though quality dropped about 3 points for a week.
- **The daily z-score never reaches −3**; its worst days are −1.93.
- **CUSUM fires on day 18**, three days after the change, and stays on. That delay is the price of not paging anyone on noise.
- **Slicing finds the cause.** Comparing day 14 with day 18 per topic, four topics are flat and \`promo\` fell from 85.0% to 45.0%. A drop in one slice points at that slice's data (the stale document), where a provider change would usually move every slice at once.

What the simulation leaves out: real days have uneven volumes (weekends), the judge has its own error rate, feedback arrives late, and a real baseline window must exclude the drift period it is trying to detect (freeze the baseline when an alarm fires, or the baseline follows the decline).

## 8. From Alarm to Fix: The Response Loop

| Step | Question it answers | How |
| :--- | :--- | :--- |
| 1. Confirm | Is it real or a judge artefact? | Hand-label 30 to 50 of the flagged conversations; run the full offline suite on the current production version |
| 2. Classify | Input drift, data drift, provider change, or config creep? | Did the offline suite move too (then something in your stack or the provider changed)? Did one slice move or all (data versus model)? Did output length or the API-reported model name change? |
| 3. Correlate | What changed around day 15? | Change log of prompts, index builds, document sources, config, and provider status pages |
| 4. Fix | | Re-index or fix the source document; adjust routing; roll back a prompt or pin a snapshot through the normal rollout ([How do you version, test and safely roll out prompt changes?](/interview-question/how-do-you-version-test-and-safely-roll-out-prompt-changes)) |
| 5. Learn | Will we catch it offline next time? | Add the failing pattern to the golden set ([How do you build a golden dataset for evaluating an LLM feature?](/interview-question/how-do-you-build-a-golden-dataset-for-evaluating-an-llm-feature)) and, for RAG, add a freshness check on sources |

Step 2 is the one interviewers probe. The key test: **if the offline suite on fixed inputs still passes, the inputs or the data changed; if the offline suite also dropped, the model, provider or your own stack changed.** Run the suite on a schedule (for example nightly) even when nothing is deployed, so a provider-side change shows up as a drop on fixed inputs. Release-time regression testing is the sibling topic [How do you catch regressions when changing a prompt or upgrading a model?](/interview-question/how-do-you-catch-regressions-when-changing-a-prompt-or-upgrading-a-model); drift monitoring is the same suite run when nothing was released.

## 9. A Minimal Monitoring Setup

| Signal | Coverage | Detector | Alert goes to |
| :--- | :--- | :--- | :--- |
| Judge pass rate on 200 random conversations a day, per slice | Sample | CUSUM against a frozen 4-week baseline | Feature owner, next business day |
| Topic mix of all questions | All traffic | PSI against the golden-set mix, weekly | Eval owner: refresh the golden set |
| Thumbs-down and rephrase rate | All traffic | EWMA per slice | Feature owner |
| Output length, refusal rate, parse failures | All traffic | Daily z-score (large jumps) | On-call: likely a model or serving change |
| Scheduled offline suite on fixed inputs | Golden set | Per-case diff with last run | Feature owner |
| Source freshness of indexed documents | Index | Age and checksum per source | Data owner |

## Edge Cases Worth Knowing

- **The judge drifts too.** If the judge model is an unpinned alias, a provider update can change scores with no change in your feature. Pin the judge, keep a small human-labelled calibration set and re-check agreement monthly.
- **Seasonality.** Monday questions differ from Saturday questions. Compare against the same weekday or use a baseline window long enough to include whole weeks.
- **Simpson's paradox in slices.** The overall rate can fall while every slice is flat, purely because traffic moved toward a harder slice. That is input drift, and per-slice charts show it immediately.
- **Feedback bias.** Thumbs come mostly from unhappy or very happy users and depend on the UI. Track the *rate* relative to a baseline, not its absolute level, and never use it as the only signal.
- **Privacy limits on sampling.** Judging live conversations means storing and processing them; the sample must go through the same PII handling as your logs ([How do you handle PII and sensitive data when calling LLM APIs?](/interview-question/how-do-you-handle-pii-and-sensitive-data-when-calling-llm-apis)).

## Common Pitfalls

- **Monitoring only latency, errors and cost.** All three can be perfect while answers get worse; quality needs its own signal.
- **Fixed absolute thresholds.** They either never fire or fire on noise, and they silently go stale. Compare against a baseline with a detector suited to small sustained shifts.
- **Treating every input-drift alarm as a regression.** A new topic mix means the golden set is out of date; it is a data task, not an incident, until slice quality actually drops.
- **A rolling baseline that follows the decline.** If the baseline is "the last 7 days", a slow decline becomes the new normal. Freeze or lag the baseline, and keep a long-term reference.
- **Looking only at the overall number.** Drift is usually concentrated in one topic, customer or language; without slices, a 30-point drop in a 10% slice looks like a 3-point blip.
- **Running the offline suite only on deploys.** A provider-side change happens without your deploy, so schedule the suite.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Open with the premise:</strong> <span style="color:#f0e2c8;">Quality can regress with <strong style="color:#ffca28;">zero deploys</strong>: the question mix changes, documents in the index go stale, and the provider can change things behind the API. Published examples exist, such as Chen, Zaharia and Zou measuring GPT-4 behaviour shifts between March and June 2023, and Anthropic's September 2025 postmortem of three infrastructure bugs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Two kinds of signal:</strong> <span style="color:#f0e2c8;">Cheap <strong style="color:#ffca28;">proxies</strong> on all traffic, such as thumbs-down, rephrase rate, escalations, refusals, parse failures and output length, plus <strong style="color:#ffca28;">online evaluation</strong>: a random daily sample scored by a pinned, human-calibrated judge with the same graders as the offline suite.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Respect the noise:</strong> <span style="color:#f0e2c8;">With 200 judged samples a day at about 91%, one day moves by about plus or minus 4 points for no reason, so fixed thresholds and daily alarms either miss small drops or page on noise. I use a frozen baseline and a <strong style="color:#ffca28;">CUSUM</strong> or EWMA detector; in my simulation a sustained 3-point drop was never caught by the daily rules and CUSUM caught it in three days.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Watch the inputs separately:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">PSI</strong> on the topic mix tells me when traffic no longer looks like the golden set. That is a data task, refresh the set, not an incident, unless slice quality drops too.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close the loop:</strong> <span style="color:#f0e2c8;">On an alarm: hand-label a sample to confirm, check slices, run the offline suite on fixed inputs (if it also dropped, the model side changed; if not, the inputs or data did), correlate with change logs, fix through the normal rollout, and add the failure pattern to the golden set.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just alert when the score drops below a threshold?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A fixed threshold ignores sample noise and goes stale. Set low, it missed a week-long 3-point drop in my run; set high, it pages on random bad days. Compare against a baseline with a detector designed for small sustained shifts.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you tell a provider change from input drift?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Run the offline suite on <strong style="color:#ffca28;">fixed inputs</strong> on a schedule. If fixed inputs score worse, the model, serving or your stack changed. If they still pass, the traffic or the data changed. A shift that hits every slice at once, often with an output-length change, also points at the model side.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can the LLM judge itself drift?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, if it is an unpinned alias or its prompt changes. Pin the judge model and prompt, keep a small human-labelled calibration set, and re-check agreement regularly, otherwise you are monitoring the judge.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many conversations should you judge each day?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Work it out from the drop you need to see. Detecting 3 points from a single day needs about 720 samples at a 91% pass rate; at 200 a day you accept a few days of delay and let a cumulative detector add up the evidence, which keeps judge cost down.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you do about the baseline window?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do not let it follow the decline. Freeze it when an alarm fires, lag it by a few weeks, or keep a long-term reference period, and include whole weeks so weekday patterns do not look like drift.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Quality drift | Output quality changing over time against a baseline without an intentional change |
| Input drift (data drift, covariate shift) | The distribution of incoming questions changing |
| Proxy metric | Cheap signal correlated with quality: thumbs, rephrases, escalations, length, refusals |
| Online evaluation | Scoring a daily random sample of live traffic with the offline graders |
| CUSUM | Cumulative sum detector that alarms on small sustained drops below a baseline |
| EWMA | Exponentially weighted moving average; smooths a metric to detect small shifts |
| Population Stability Index (PSI) | Distance between a baseline and current distribution over the same bins |

**Conclusion:** An LLM feature can get worse while nothing in your repository changes, because users, documents and the provider keep moving. Monitoring that catches it combines cheap proxies on all traffic with a judged random sample every day, compares both against a frozen baseline rather than a fixed threshold, and uses detectors sized to the noise: with 200 samples a day one day is worth about ±4 points, so a CUSUM that accumulates evidence finds a sustained 3-point drop in three days where daily alarms never fire. PSI on the input mix tells you when the golden set is out of date, slices tell you where the problem is, and a scheduled run of the offline suite on fixed inputs tells you whether the model side moved. Every confirmed drift ends with a fix and a new case in the golden set.`,
    examples: [
      {
        label: `21-day drift monitor: fixed threshold vs daily z vs CUSUM, PSI and slices`,
        variants: [
          { tech: "node", code: `// Daily drift monitor: PSI on the input topic mix, and a one-sided CUSUM on the
// sampled LLM-judge pass rate, compared with a fixed threshold and a daily z alarm.
// 21 simulated days, 200 judged conversations per day. No deploy happens.
const N = 200;
const TOPICS = ["billing", "bug", "account", "other", "promo"];
const BASE_MIX = [80, 60, 40, 20, 0];          // the mix the golden set was built from
const PROMO_MIX = [72, 54, 36, 18, 20];        // a marketing campaign from day 10
const WIGGLE = [0, 3, -2, 1, -4, 2, -1, 3, 0, -3, 1, 2, -2, 0, 2, -1, 0, 3, -2, 1, -1];

function topicCounts(day) {
  const mix = (day >= 10 ? PROMO_MIX : BASE_MIX).slice();
  mix[0] += WIGGLE[day - 1];                    // small day-to-day noise
  mix[1] -= WIGGLE[day - 1];
  return mix;
}
// Judge passes per day: about 90% until day 15, about 87% after (an upstream document went stale).
function passes(day) {
  return (day >= 15 ? 174 : 180) + WIGGLE[(day * 7) % 21];
}

function psi(expected, actual) {
  const eT = expected.reduce((a, b) => a + b, 0), aT = actual.reduce((a, b) => a + b, 0);
  let s = 0;
  for (let i = 0; i < expected.length; i++) {
    const e = Math.max(expected[i] / eT, 0.001), a = Math.max(actual[i] / aT, 0.001);
    s += (a - e) * Math.log(a / e);
  }
  return s;
}

// Baseline from the first 7 days (a rolling window in a real system).
let base = 0;
for (let d = 1; d <= 7; d++) base += passes(d);
const p0 = base / (7 * N);
const sigma = Math.sqrt((p0 * (1 - p0)) / N);
const K = 0.5, H = 4;                          // CUSUM slack and alarm level, in sigmas
console.log(\`baseline pass rate \${(100 * p0).toFixed(1)}%, daily sigma \${(100 * sigma).toFixed(2)} pts, \` +
  \`95% interval for one day +/-\${(196 * sigma).toFixed(1)} pts\`);
console.log("day  pass%     z  cusum   psi  alarms");
let S = 0;
const first = {};
for (let day = 1; day <= 21; day++) {
  const p = passes(day) / N;
  const z = (p - p0) / sigma;
  S = Math.max(0, S + (p0 - p) / sigma - K);
  const drift = psi(BASE_MIX, topicCounts(day));
  const alarms = [];
  if (p < 0.8) alarms.push("FIXED<80%");
  if (z < -3) alarms.push("Z<-3");
  if (S > H) alarms.push("CUSUM");
  if (drift > 0.25) alarms.push("PSI>0.25");
  else if (drift > 0.1) alarms.push("PSI>0.1");
  for (const a of alarms) if (!(a in first)) first[a] = day;
  console.log(\`\${String(day).padStart(3)}  \${(100 * p).toFixed(1).padStart(5)} \${z.toFixed(2).padStart(5)}\` +
    \` \${S.toFixed(2).padStart(6)} \${drift.toFixed(3)}\${alarms.length ? "  " + alarms.join(" ") : ""}\`);
}
console.log("first alarm day per detector:");
for (const a of ["FIXED<80%", "Z<-3", "CUSUM", "PSI>0.25"]) console.log(\`  \${a.padEnd(9)} \${a in first ? "day " + first[a] : "never"}\`);

// Slice view on day 18: the drop is concentrated, which points at the cause.
const slices = { billing: [69, 75], bug: [47, 51], account: [34, 36], other: [15, 18], promo: [9, 20] };
const slicesBefore = { billing: [66, 72], bug: [50, 54], account: [34, 36], other: [15, 18], promo: [17, 20] };
console.log("day 18 by topic (day 14 -> day 18):");
for (const t of TOPICS) {
  const [b, bn] = slicesBefore[t], [a, an] = slices[t];
  console.log(\`  \${t.padEnd(8)} \${(100 * b / bn).toFixed(1)}% -> \${(100 * a / an).toFixed(1)}%\`);
}
// How many judged samples a day to see a 3-point drop in one day (z=1.96, 80% power z=0.84)?
const n3 = Math.ceil(((1.96 + 0.84) ** 2 * p0 * (1 - p0)) / 0.03 ** 2);
console.log(\`samples per day to detect a 3-point drop in one day: \${n3}\`);` },
          { tech: "python", code: `# Daily drift monitor: PSI on the input topic mix, and a one-sided CUSUM on the
# sampled LLM-judge pass rate, compared with a fixed threshold and a daily z alarm.
# 21 simulated days, 200 judged conversations per day. No deploy happens.
import math

N = 200
TOPICS = ["billing", "bug", "account", "other", "promo"]
BASE_MIX = [80, 60, 40, 20, 0]           # the mix the golden set was built from
PROMO_MIX = [72, 54, 36, 18, 20]         # a marketing campaign from day 10
WIGGLE = [0, 3, -2, 1, -4, 2, -1, 3, 0, -3, 1, 2, -2, 0, 2, -1, 0, 3, -2, 1, -1]

def topic_counts(day):
    mix = list(PROMO_MIX if day >= 10 else BASE_MIX)
    mix[0] += WIGGLE[day - 1]             # small day-to-day noise
    mix[1] -= WIGGLE[day - 1]
    return mix

# Judge passes per day: about 90% until day 15, about 87% after (an upstream document went stale).
def passes(day):
    return (174 if day >= 15 else 180) + WIGGLE[(day * 7) % 21]

def psi(expected, actual):
    e_t, a_t = sum(expected), sum(actual)
    s = 0.0
    for e, a in zip(expected, actual):
        e, a = max(e / e_t, 0.001), max(a / a_t, 0.001)
        s += (a - e) * math.log(a / e)
    return s

# Baseline from the first 7 days (a rolling window in a real system).
p0 = sum(passes(d) for d in range(1, 8)) / (7 * N)
sigma = math.sqrt(p0 * (1 - p0) / N)
K, H = 0.5, 4                              # CUSUM slack and alarm level, in sigmas
print(f"baseline pass rate {100 * p0:.1f}%, daily sigma {100 * sigma:.2f} pts, "
      f"95% interval for one day +/-{196 * sigma:.1f} pts")
print("day  pass%     z  cusum   psi  alarms")
S = 0.0
first = {}
for day in range(1, 22):
    p = passes(day) / N
    z = (p - p0) / sigma
    S = max(0.0, S + (p0 - p) / sigma - K)
    drift = psi(BASE_MIX, topic_counts(day))
    alarms = []
    if p < 0.8:
        alarms.append("FIXED<80%")
    if z < -3:
        alarms.append("Z<-3")
    if S > H:
        alarms.append("CUSUM")
    if drift > 0.25:
        alarms.append("PSI>0.25")
    elif drift > 0.1:
        alarms.append("PSI>0.1")
    for a in alarms:
        first.setdefault(a, day)
    tail = "  " + " ".join(alarms) if alarms else ""
    print(f"{day:>3}  {100 * p:>5.1f} {z:>5.2f} {S:>6.2f} {drift:.3f}{tail}")
print("first alarm day per detector:")
for a in ["FIXED<80%", "Z<-3", "CUSUM", "PSI>0.25"]:
    print(f"  {a:<9} {'day ' + str(first[a]) if a in first else 'never'}")

# Slice view on day 18: the drop is concentrated, which points at the cause.
slices = {"billing": (69, 75), "bug": (47, 51), "account": (34, 36), "other": (15, 18), "promo": (9, 20)}
slices_before = {"billing": (66, 72), "bug": (50, 54), "account": (34, 36), "other": (15, 18), "promo": (17, 20)}
print("day 18 by topic (day 14 -> day 18):")
for t in TOPICS:
    (b, bn), (a, an) = slices_before[t], slices[t]
    print(f"  {t:<8} {100 * b / bn:.1f}% -> {100 * a / an:.1f}%")
# How many judged samples a day to see a 3-point drop in one day (z=1.96, 80% power z=0.84)?
n3 = math.ceil((1.96 + 0.84) ** 2 * p0 * (1 - p0) / 0.03 ** 2)
print(f"samples per day to detect a 3-point drop in one day: {n3}")` },
        ],
      },
    ],
  },
  {
    title: `What should you log and trace in an LLM application?`,
    difficulty: "medium",
    seoDescription: `What to log per LLM request (versions, served model, context, tokens, cost, finish reason), which metrics to keep, and how to redact PII before storage.`,
    description: `**Question presented to candidate:**
"You are about to launch a support chatbot with retrieval and a couple of tools. A week after launch a customer complains that the bot told them something wrong. What would you need to have logged to explain exactly what happened — and what should you deliberately *not* log?"

**What a strong answer should cover:**
- A per-request record that makes any answer reproducible: trace ID, feature, prompt name, version and hash, requested and served model, parameters, retrieved document IDs with scores, every tool call with arguments, status and latency, token usage including cached tokens, cost, time to first token and total latency, finish reason, guardrail results, errors, and the (redacted) input and output
- Why LLM apps need more than classic request logs: failures are silent (a wrong answer is a 200 OK), so the content and the context that produced it are the debugging evidence
- Aggregated metrics with low-cardinality labels (feature, prompt version, model): p95 latency, error and truncation rates, cache hit rate, cost per feature, refusal and guardrail rates
- Privacy by design: redact or tokenise PII before the record is written, hash user IDs with a keyed hash, limit retention and access, and keep raw content out of metrics
- Feedback joined by trace ID, so a thumbs-down becomes an eval candidate with the exact version and context attached

**Code / implementation expected:** Optional — a log record schema or a small function that builds one with redaction and cost.`,
    answer: `**Target Audience:** Engineers building their first production LLM feature who need to decide what goes into logs, metrics and traces; also interview candidates who will be asked "how would you debug a bad answer?".
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (the log-record builder below, identical output in both). Prices in the example are made-up round numbers, not any provider's price list.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A plane's flight recorder does not record "the flight went fine" or "the flight went badly". It records altitude, speed, every control input and the cockpit voices, second by second, so that when something goes wrong investigators can replay exactly what happened and why, instead of guessing.

A normal web service gets away with much less. If a payment fails, there is an exception, a status code 500 and a stack trace. An LLM feature fails differently: the customer receives a fluent, confident, **wrong** answer, with status 200, in 2.9 seconds. Nothing in a classic request log looks unusual. To explain it a week later, you need the flight recorder: which prompt version ran, which model actually served it, which documents were retrieved, what the tool returned, how many tokens were used, why generation stopped. Without those, "the bot said something wrong" can only be answered with "we cannot reproduce it".

There is a second half to the story. A flight recorder is locked in an orange box. Your logs, by contrast, get copied to log search, dashboards, a vendor's tracing tool and a data warehouse, and they now contain whatever your users typed: emails, card numbers, health questions. Deciding what *not* to keep is as much part of the answer as deciding what to keep.

## 2. Three Kinds of Telemetry

📌 **Interview term: telemetry** — the data a running system emits about itself so people can understand it from outside. It comes in three standard shapes, and an LLM app needs all three.

| Shape | What it is | LLM example | Answers |
| :--- | :--- | :--- | :--- |
| **Log record (event)** | One structured record per thing that happened | The record of one model call: versions, tokens, finish reason, redacted input and output | Why was *this* answer wrong? |
| **Metric** | A number aggregated over time, with a few labels | p95 latency of \`support-chat\`, cost per day per feature, cache hit rate | Is the system healthy, and is it getting more expensive? |
| **Trace** | The tree of timed steps (spans) one request went through | Retrieval 80 ms, model call 900 ms, tool call 125 ms, second model call 1,100 ms | Where did the time go, and which step failed? |

📌 **Interview term: structured logging** — writing each record as named fields (JSON) instead of a sentence, so you can filter (\`finish_reason = "length"\`), aggregate and join it later. Every field below assumes this.

The mechanics of traces (span IDs, context propagation, OpenTelemetry attribute names, sampling) are the subject of the sibling question [AI observability: how do you trace and log LLM calls in prod?](/interview-question/ai-observability-how-do-you-trace-and-log-llm-calls-in-prod). This doc is about the *content*: which fields, why, and what to leave out.

## 3. The Per-Request Record, Field by Field

Group the fields by the question they answer when you debug.

<svg class="iq-diagram" width="100%" viewBox="0 0 900 330" role="img" aria-label="One request record made of identity, versions, context, model call, output and outcome groups, with feedback joined later by trace id">
  <defs>
    <marker id="ai17q3-arr" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="600" height="290" rx="12"/>
  <text class="d-text" x="320" y="50" text-anchor="middle">record for trace t-002</text>
  <rect class="d-box" x="45" y="75" width="170" height="80" rx="8"/>
  <text class="d-text" x="130" y="108" text-anchor="middle">identity</text>
  <text class="d-sub" x="130" y="132" text-anchor="middle">trace, feature, user</text>
  <rect class="d-box-accent" x="235" y="75" width="170" height="80" rx="8"/>
  <text class="d-text" x="320" y="108" text-anchor="middle">versions</text>
  <text class="d-sub" x="320" y="132" text-anchor="middle">prompt, model</text>
  <rect class="d-box" x="425" y="75" width="170" height="80" rx="8"/>
  <text class="d-text" x="510" y="108" text-anchor="middle">context</text>
  <text class="d-sub" x="510" y="132" text-anchor="middle">doc ids, tools</text>
  <rect class="d-box" x="45" y="195" width="170" height="80" rx="8"/>
  <text class="d-text" x="130" y="228" text-anchor="middle">model call</text>
  <text class="d-sub" x="130" y="252" text-anchor="middle">tokens, cost, ms</text>
  <rect class="d-box" x="235" y="195" width="170" height="80" rx="8"/>
  <text class="d-text" x="320" y="228" text-anchor="middle">result</text>
  <text class="d-sub" x="320" y="252" text-anchor="middle">finish, guards, error</text>
  <rect class="d-box-accent" x="425" y="195" width="170" height="80" rx="8"/>
  <text class="d-text" x="510" y="228" text-anchor="middle">content</text>
  <text class="d-sub" x="510" y="252" text-anchor="middle">redacted, clipped</text>
  <rect class="d-box" x="700" y="125" width="180" height="80" rx="10"/>
  <text class="d-text" x="790" y="158" text-anchor="middle">feedback</text>
  <text class="d-sub" x="790" y="182" text-anchor="middle">arrives later</text>
  <path class="d-edge-dashed" d="M 696 165 L 626 165" marker-end="url(#ai17q3-arr)"/>
</svg>

Feedback is a separate event that arrives minutes or days later and is joined to the record by its trace ID; that join is what turns complaints into test cases.

| Group | Fields | Why you need it |
| :--- | :--- | :--- |
| **Identity** | \`trace_id\`, \`feature\`, keyed hash of the user ID, conversation ID, tenant | Find the complaint's record; group by feature; join feedback. The user ID is hashed so records can be grouped per user without storing who it is |
| **Versions** | Prompt name, version and content hash; requested model and the **served** model string the API returned; temperature and other parameters | Reproduce the exact call. Requested \`model-large\` and served \`model-large-2026-08-01\` can differ when you call an alias; the served value is what you compare when quality moves ([How do you version, test and safely roll out prompt changes?](/interview-question/how-do-you-version-test-and-safely-roll-out-prompt-changes)) |
| **Context** | Retrieved document IDs and scores, index version; each tool call's name, (redacted) arguments, status and latency | Most wrong answers in RAG apps are retrieval or tool problems. IDs, not full text: the documents are already stored elsewhere |
| **Model call** | Input, cached and output tokens; cost; time to first token and total latency; retries and fallbacks used | Cost per feature, latency budgets, and spotting a retry storm |
| **Result** | \`finish_reason\`, guardrail checks that fired, refusal flag, parse or repair outcome, error | \`finish_reason = "length"\` means the answer was cut off by the token limit; a guardrail flag explains a strange refusal |
| **Content** | Input and output, **redacted** and clipped (or stored separately with tighter access) | The actual words are the evidence for a wrong answer, and future eval cases |

📌 **Interview term: finish reason (stop reason)** — the field in every LLM API response that says why generation ended: a natural stop, the token limit, a tool call, or a content filter. Logging it is cheap and explains a whole class of "the answer is cut off" bugs; the example's thumbs-down case is exactly that.

📌 **Interview term: time to first token (TTFT)** — the delay before the first output token arrives. Log it separately from total latency: users of a streaming UI feel TTFT, while total latency is dominated by output length ([What techniques reduce LLM latency at each stage of a request?](/interview-question/what-techniques-reduce-llm-latency-at-each-stage-of-a-request)).

Cost deserves a word. Compute it **at write time** from the usage fields and a versioned price table, and store it in the record. Prices change; recomputing last month's bill with today's table gives the wrong answer. The example bills uncached input at the full rate, cached input at a tenth of it (a common shape for provider cache discounts; check your provider) and output at the output rate, in integer micro-dollars to avoid float rounding in sums. How to turn these records into budgets and alerts is covered in [How do you estimate and control LLM costs in production?](/interview-question/how-do-you-estimate-and-control-llm-costs-in-production)

## 4. What Not to Log, and How

📌 **Interview term: redaction** — replacing sensitive substrings (emails, phone numbers, card numbers, national IDs) with placeholders such as \`[EMAIL]\` **before** the record is written anywhere. Redacting later in the log pipeline is too late: the raw text has already been in memory buffers, a vendor's ingest queue and possibly a backup.

📌 **Interview term: pseudonymisation (keyed hashing)** — replacing an identifier with a value that is stable (the same user always maps to the same value, so you can count per-user problems) but not readable. The example uses an HMAC with a secret key; a plain unsalted hash of an email is easy to reverse by hashing a list of known emails.

Rules that hold up in a security review:

- **Redact at the source**, in the process that makes the call, with patterns tested like any other code. The example's last line checks that no raw email, card or phone fragment survived anywhere in the stored log: \`raw PII strings left in the stored log: 0\`.
- **Separate content from metadata.** Metadata (tokens, latency, versions, IDs) can go to the general log system with long retention. Prompt and response text goes to a store with stricter access and shorter retention, or is sampled.
- **Clip long content.** The example keeps 60 characters; real systems keep more, but capping size stops a 100,000-token document from being copied into every log line.
- **No secrets.** API keys, auth headers and tool credentials never enter a record; tool arguments are redacted like user text.
- **Know your obligations.** Data protection rules, customer contracts and your provider's retention terms decide how long content may be kept; [How do you handle PII and sensitive data when calling LLM APIs?](/interview-question/how-do-you-handle-pii-and-sensitive-data-when-calling-llm-apis) covers the API side.

Redaction by regular expressions is a floor, not a guarantee: it misses names, addresses and anything unusual. For high-risk data, use a dedicated PII detector or do not log content at all and rely on metadata plus user-consented samples.

## 5. Metrics: Few Labels, Many Records

Metrics are aggregated, cheap to query and drive alerts, so they must stay small.

📌 **Interview term: cardinality** — the number of distinct values a metric label can take. \`feature\` has a handful; \`prompt_version\` a few dozen; \`user_id\` or \`trace_id\` millions. Each distinct label combination is a separate time series in most metric systems, so a high-cardinality label multiplies storage and cost. Per-user and per-request detail belongs in records and traces, not in metric labels.

| Metric | Labels | Why |
| :--- | :--- | :--- |
| Requests, errors, timeouts | feature, model, prompt version | Health; error spikes after a rollout |
| p50 and p95 TTFT and total latency | feature, model | Latency budgets |
| Input, cached and output tokens; cost | feature, model, tenant tier | Budgets, and the cache hit rate as a ratio of cached to input tokens |
| Truncations (\`finish_reason = length\`), refusals, guardrail triggers, parse repairs | feature, prompt version | Early warnings for quality problems |
| Thumbs-down and rephrase rate | feature, prompt version | Live quality proxy, the input to drift monitoring ([How do you monitor LLM quality drift in production?](/interview-question/how-do-you-monitor-llm-quality-drift-in-production)) |

The example computes the first rows from four records: \`support-chat\` has one timeout (its p95 is the 30,000 ms timeout), one truncation, a 91.8% cache hit rate and $0.012030 of toy cost.

## 6. Verified: Running the Code

The example **"Structured LLM log record: redaction, cost from usage, roll-ups and feedback join"** builds records for four simulated requests (one with a tool call carrying an email, one with a card and phone number that ended on the token limit, one summarisation call, one timeout), prints the stored record for the second request, rolls metrics up by feature, joins a thumbs-down to its record, and scans the whole log for leaked PII. The key part:

~~~js
const micro = Math.round(billedIn * inP + req.usage.cached * inP * 0.1 + req.usage.output * outP);
return {
  trace_id: req.trace,
  user: crypto.createHmac("sha256", KEY).update(req.user).digest("hex").slice(0, 16),
  prompt: { name: req.prompt[0], version: req.prompt[1], hash: req.prompt[2] },
  model: { requested: req.model, served: req.served, temperature: req.temperature },
  // ... retrieval, tools, usage, cost_usd, latency_ms, finish_reason, guardrails, error
  input: clip(redact(req.input), 60),
  output: clip(redact(req.output), 60),
};
~~~

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
stored record for t-002:
{
  "trace_id": "t-002",
  "feature": "support-chat",
  "user": "7c68074784125099",
  "prompt": {
    "name": "support",
    "version": 7,
    "hash": "a1b2c3"
  },
  "model": {
    "requested": "model-large",
    "served": "model-large-2026-08-01",
    "temperature": 0.2
  },
  "retrieval": {
    "doc_ids": [
      "kb-03"
    ],
    "top_score": 0.41
  },
  "tools": [],
  "usage": {
    "input_tokens": 2900,
    "cached_tokens": 2800,
    "output_tokens": 410
  },
  "cost_usd": "0.007290",
  "latency_ms": {
    "ttft": 700,
    "total": 6100
  },
  "finish_reason": "length",
  "guardrails": [
    "low_retrieval_score"
  ],
  "error": null,
  "input": "Can I pay with card [CARD] or call [PHONE]?",
  "output": "You can pay by card. Our support line is open from 9 to 5 an..."
}
metrics by feature:
  support-chat: n=3 p95=30000ms errors=1 truncated=1 cache_hit=91.8% cost=$0.012030
  summarize: n=1 p95=1800ms errors=0 truncated=0 cache_hit=0.0% cost=$0.003200
eval candidates:
  t-002 prompt=support@v7 finish=length guards=low_retrieval_score note="it cut off mid sentence"
    input: Can I pay with card [CARD] or call [PHONE]?
raw PII strings left in the stored log: 0
~~~

What to notice:

- **The record answers the complaint on its own.** Trace \`t-002\` got a thumbs-down "it cut off mid sentence". The record says \`finish_reason: "length"\` (the answer hit the token limit), the top retrieval score was a weak \`0.41\` and a \`low_retrieval_score\` guardrail fired: two separate problems, both visible without reproducing anything.
- **Redaction happened before storage**: the card and phone number became \`[CARD]\` and \`[PHONE]\`, and the email inside \`t-001\`'s tool arguments was redacted too. The leak scan finds 0 matches.
- **Cost is stored, not recomputed**: \`0.007290\` dollars for \`t-002\` with 2,800 of its 2,900 input tokens cached.
- **The timeout still produces a record** with \`error\` set and zero tokens. Failed calls are often the most important records; never log only successes. (A real provider may still bill for a request that timed out on your side, so treat zero cost here as a simplification.)
- **The feedback join** produces an eval candidate carrying the prompt version and the redacted input, ready for the golden set ([How do you build a golden dataset for evaluating an LLM feature?](/interview-question/how-do-you-build-a-golden-dataset-for-evaluating-an-llm-feature)).

The simulation leaves out the storage side: a real system writes these records to a log pipeline or tracing backend, applies retention policies, and stores full content in a separate, access-controlled store.

## 7. Agents and Multi-Step Requests

For an agent, one user request becomes many model calls and tool calls. Log one record per step, all sharing the request's trace ID, plus a summary record for the whole request: number of steps, total tokens and cost, which tools were called, whether it hit a step limit. The step records are what you need to debug a loop that went wrong ([How do you evaluate and debug agent trajectories?](/interview-question/how-do-you-evaluate-and-debug-agent-trajectories)); the summary is what you chart.

## Edge Cases Worth Knowing

- **Streaming responses.** The final usage and finish reason arrive at the end of the stream (or not at all if the client disconnects). Write the record when the stream ends *or is aborted*, and record the abort, otherwise cancelled requests vanish from cost and quality data.
- **Retries and fallbacks.** If a call is retried or falls back to another model, log each attempt and mark which one produced the answer, or latency and cost per success will be understated.
- **Sampling content.** At high volume, keep metadata for 100% of requests and content for a sample (plus 100% of errors and negative feedback). Decide the sample before you need it.
- **Right to erasure.** If a user asks for their data to be deleted, you must be able to find their records; a keyed hash of the user ID lets you do that without storing the ID in clear.
- **Prompt text is big.** Do not log the full rendered system prompt on every call; log its version and hash, which reproduce it from the registry.

## Common Pitfalls

- **Logging only the template name, not the version and hash.** "support prompt" changed four times last month; without the version, the record cannot be reproduced.
- **Logging the requested model alias, not the served model.** When quality moves, the served model string is the first thing to check.
- **Storing raw prompts and responses with user PII in a general log tool.** Teams secure the API call and then keep customer data forever in log search. Redact at the source and separate content from metadata.
- **Putting user or trace IDs into metric labels.** High cardinality blows up metric storage and cost; keep them in records and traces.
- **Not linking feedback to traces.** A thumbs-down without a trace ID is a complaint; with one, it is a reproducible test case.
- **Recording only successful calls.** Timeouts, aborted streams and refused requests are where the user experience is worst, and they disappear from dashboards.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Why it is different:</strong> <span style="color:#f0e2c8;">LLM failures are <strong style="color:#ffca28;">silent</strong>: a wrong answer is a 200 OK in three seconds. So the record of what produced the answer is the only debugging evidence, and I design it so any answer can be explained and reproduced a week later.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The per-request record:</strong> <span style="color:#f0e2c8;">Trace ID and feature, a keyed hash of the user, <strong style="color:#ffca28;">prompt name, version and hash</strong>, requested and <strong style="color:#ffca28;">served</strong> model, parameters, retrieved document IDs and scores, every tool call with redacted arguments and status, tokens including cached, cost computed at write time, TTFT and total latency, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finish_reason</code>, guardrail results and errors.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Content, carefully:</strong> <span style="color:#f0e2c8;">Input and output are logged <strong style="color:#ffca28;">redacted at the source</strong> and clipped, in a store with tighter access and shorter retention than the metadata; no secrets, no full system prompt on every line, just its version and hash.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Metrics and traces:</strong> <span style="color:#f0e2c8;">Metrics with <strong style="color:#ffca28;">low-cardinality labels</strong> such as feature, model and prompt version: error and timeout rates, p95 latency, cache hit rate, cost, truncations, refusals, thumbs-down. Per-request detail lives in records and traces, never in metric labels.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close the loop:</strong> <span style="color:#f0e2c8;">Feedback is joined by trace ID, so a thumbs-down becomes an eval case with the exact version and context. In my demo the complaint record alone showed two causes: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">finish_reason</code> was <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">length</code> and retrieval was weak.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should you log full prompts and responses at all?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Log metadata for every request; log content redacted and clipped, in a separate store with limited access and retention, possibly only for a sample plus all errors and negative feedback. For very sensitive domains, skip content and rely on metadata and consented samples.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why log the served model if you already know which one you asked for?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If you call an alias, the provider may serve a different snapshot over time, and the response tells you which one ran. When quality moves without a deploy, the served model string is the first thing to compare.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not put user_id on your latency metric?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It is a <strong style="color:#ffca28;">high-cardinality</strong> label: each user becomes its own time series, which multiplies metric storage and cost. Per-user analysis belongs in the log records, queried when needed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle streaming responses?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usage and finish reason come at the end of the stream, so write the record on completion <em style="color:#d8d8d8;">or abort</em>, and mark aborts. Otherwise cancelled requests disappear from both cost and quality data.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do logs become evals?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every negative-feedback or flagged record already has the redacted input, the output, the prompt version and the retrieved context, so a reviewer can label the expected answer and add it to the golden set; the next prompt change is then tested against a real failure.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Telemetry | Data a system emits about itself: records, metrics and traces |
| Structured logging | Records as named fields (JSON) that can be filtered, aggregated and joined |
| Finish reason (stop reason) | Why generation ended: natural stop, token limit, tool call or filter |
| Time to first token (TTFT) | Delay before the first output token; log it apart from total latency |
| Redaction | Replacing sensitive substrings with placeholders before anything is stored |
| Pseudonymisation (keyed hashing) | Stable, unreadable stand-in for an identifier, such as an HMAC of the user ID |
| Cardinality | Number of distinct values of a metric label; keep it low |

**Conclusion:** Because an LLM feature fails silently, the log record is the only evidence of why a given answer was wrong, so each request needs a structured record with identity, exact versions (prompt hash and the served model), retrieved document IDs and tool calls, tokens, cost, latency, finish reason, guardrail results and errors, plus redacted, clipped content. Aggregate a small set of metrics with low-cardinality labels for dashboards, keep per-request detail in records and traces, and join user feedback by trace ID so complaints become eval cases. Just as deliberately, redact PII at the source, pseudonymise user IDs with a keyed hash, keep content in a tighter store than metadata, and never log secrets.`,
    examples: [
      {
        label: `Structured LLM log record: redaction, cost from usage, roll-ups and feedback join`,
        variants: [
          { tech: "node", code: `// One structured record per LLM request: redact before storing, derive cost from
// usage, keep versions and IDs, then roll up metrics and turn feedback into eval cases.
const crypto = require("crypto");
const KEY = "from-a-secret-store";   // HMAC key: user IDs stay joinable, not readable
const PRICE = { "model-small": [0.5, 2.0], "model-large": [3.0, 15.0] }; // toy $ per 1M input/output tokens

function redact(text) {
  return text
    .replace(/[\\w.+-]+@[\\w-]+\\.[\\w.]+/g, "[EMAIL]")
    .replace(/\\b\\d(?:[ -]?\\d){12,15}\\b/g, "[CARD]")
    .replace(/\\+?\\d[\\d -]{8,}\\d/g, "[PHONE]");
}
const clip = (s, n) => (s.length > n ? s.slice(0, n) + "..." : s);

function record(req) {
  const [inP, outP] = PRICE[req.model];
  const billedIn = req.usage.input - req.usage.cached;
  const micro = Math.round(billedIn * inP + req.usage.cached * inP * 0.1 + req.usage.output * outP);
  return {
    trace_id: req.trace,
    feature: req.feature,
    user: crypto.createHmac("sha256", KEY).update(req.user).digest("hex").slice(0, 16),
    prompt: { name: req.prompt[0], version: req.prompt[1], hash: req.prompt[2] },
    model: { requested: req.model, served: req.served, temperature: req.temperature },
    retrieval: { doc_ids: req.docs, top_score: req.topScore },
    tools: req.tools.map((t) => ({ name: t[0], args: redact(t[1]), status: t[2], ms: t[3] })),
    usage: { input_tokens: req.usage.input, cached_tokens: req.usage.cached, output_tokens: req.usage.output },
    cost_usd: (micro / 1e6).toFixed(6),
    latency_ms: { ttft: req.ttft, total: req.total },
    finish_reason: req.finish,
    guardrails: req.guards,
    error: req.error,
    input: clip(redact(req.input), 60),
    output: clip(redact(req.output), 60),
  };
}

const requests = [
  { trace: "t-001", feature: "support-chat", user: "alice@example.com", prompt: ["support", 7, "a1b2c3"], model: "model-large", served: "model-large-2026-08-01", temperature: 0.2, docs: ["kb-12", "kb-40"], topScore: 0.82, tools: [["lookup_order", '{"email":"alice@example.com","order":"A-991"}', "ok", 140]], usage: { input: 3200, cached: 2800, output: 180 }, ttft: 640, total: 2900, finish: "stop", guards: [], error: null, input: "My order A-991 has not arrived, email me at alice@example.com", output: "Order A-991 shipped on Monday and should arrive tomorrow." },
  { trace: "t-002", feature: "support-chat", user: "bob", prompt: ["support", 7, "a1b2c3"], model: "model-large", served: "model-large-2026-08-01", temperature: 0.2, docs: ["kb-03"], topScore: 0.41, tools: [], usage: { input: 2900, cached: 2800, output: 410 }, ttft: 700, total: 6100, finish: "length", guards: ["low_retrieval_score"], error: null, input: "Can I pay with card 4111 1111 1111 1111 or call +44 20 7946 0958?", output: "You can pay by card. Our support line is open from 9 to 5 and" },
  { trace: "t-003", feature: "summarize", user: "carol", prompt: ["summary", 3, "9f8e7d"], model: "model-small", served: "model-small-2026-05-20", temperature: 0, docs: [], topScore: null, tools: [], usage: { input: 5200, cached: 0, output: 300 }, ttft: 350, total: 1800, finish: "stop", guards: [], error: null, input: "Summarize this meeting transcript", output: "Three decisions were made: ship Friday, freeze the API, hire." },
  { trace: "t-004", feature: "support-chat", user: "dave", prompt: ["support", 7, "a1b2c3"], model: "model-large", served: null, temperature: 0.2, docs: [], topScore: null, tools: [], usage: { input: 0, cached: 0, output: 0 }, ttft: null, total: 30000, finish: null, guards: [], error: "timeout after 30000 ms", input: "Where is my refund?", output: "" },
];
const log = requests.map(record);
console.log("stored record for t-002:");
console.log(JSON.stringify(log[1], null, 2));

// Roll-ups for dashboards: low-cardinality labels only (feature, prompt version, model).
console.log("metrics by feature:");
for (const f of [...new Set(log.map((r) => r.feature))]) {
  const rs = log.filter((r) => r.feature === f);
  const lat = rs.map((r) => r.latency_ms.total).sort((a, b) => a - b);
  const p95 = lat[Math.ceil(0.95 * lat.length) - 1];
  const cost = rs.reduce((s, r) => s + Math.round(Number(r.cost_usd) * 1e6), 0) / 1e6;
  const inTok = rs.reduce((s, r) => s + r.usage.input_tokens, 0);
  const cached = rs.reduce((s, r) => s + r.usage.cached_tokens, 0);
  const errors = rs.filter((r) => r.error).length;
  const truncated = rs.filter((r) => r.finish_reason === "length").length;
  console.log(\`  \${f}: n=\${rs.length} p95=\${p95}ms errors=\${errors} truncated=\${truncated} \` +
    \`cache_hit=\${inTok ? ((100 * cached) / inTok).toFixed(1) : "0.0"}% cost=$\${cost.toFixed(6)}\`);
}

// Feedback arrives later, keyed by trace_id: the join turns it into eval candidates.
const feedback = [["t-001", "up"], ["t-002", "down", "it cut off mid sentence"]];
console.log("eval candidates:");
for (const [tid, vote, note] of feedback) {
  if (vote !== "down") continue;
  const r = log.find((x) => x.trace_id === tid);
  console.log(\`  \${tid} prompt=\${r.prompt.name}@v\${r.prompt.version} finish=\${r.finish_reason} \` +
    \`guards=\${r.guardrails.join(",")} note="\${note}"\`);
  console.log(\`    input: \${r.input}\`);
}
const leaked = JSON.stringify(log).match(/alice@example\\.com|4111|7946/g);
console.log(\`raw PII strings left in the stored log: \${leaked ? leaked.length : 0}\`);` },
          { tech: "python", code: `# One structured record per LLM request: redact before storing, derive cost from
# usage, keep versions and IDs, then roll up metrics and turn feedback into eval cases.
import hashlib, hmac, json, math, re

KEY = b"from-a-secret-store"   # HMAC key: user IDs stay joinable, not readable
PRICE = {"model-small": (0.5, 2.0), "model-large": (3.0, 15.0)}  # toy $ per 1M input/output tokens

def redact(text):
    text = re.sub(r"[\\w.+-]+@[\\w-]+\\.[\\w.]+", "[EMAIL]", text)
    text = re.sub(r"\\b\\d(?:[ -]?\\d){12,15}\\b", "[CARD]", text)
    return re.sub(r"\\+?\\d[\\d -]{8,}\\d", "[PHONE]", text)

def clip(s, n):
    return s[:n] + "..." if len(s) > n else s

def record(req):
    in_p, out_p = PRICE[req["model"]]
    u = req["usage"]
    billed_in = u["input"] - u["cached"]
    micro = round(billed_in * in_p + u["cached"] * in_p * 0.1 + u["output"] * out_p)
    return {
        "trace_id": req["trace"],
        "feature": req["feature"],
        "user": hmac.new(KEY, req["user"].encode(), hashlib.sha256).hexdigest()[:16],
        "prompt": {"name": req["prompt"][0], "version": req["prompt"][1], "hash": req["prompt"][2]},
        "model": {"requested": req["model"], "served": req["served"], "temperature": req["temperature"]},
        "retrieval": {"doc_ids": req["docs"], "top_score": req["top"]},
        "tools": [{"name": t[0], "args": redact(t[1]), "status": t[2], "ms": t[3]} for t in req["tools"]],
        "usage": {"input_tokens": u["input"], "cached_tokens": u["cached"], "output_tokens": u["output"]},
        "cost_usd": f"{micro / 1e6:.6f}",
        "latency_ms": {"ttft": req["ttft"], "total": req["total"]},
        "finish_reason": req["finish"],
        "guardrails": req["guards"],
        "error": req["error"],
        "input": clip(redact(req["input"]), 60),
        "output": clip(redact(req["output"]), 60),
    }

def R(trace, feature, user, prompt, model, served, temperature, docs, top, tools, usage, ttft, total, finish, guards, error, inp, out):
    return dict(trace=trace, feature=feature, user=user, prompt=prompt, model=model, served=served,
                temperature=temperature, docs=docs, top=top, tools=tools, usage=usage, ttft=ttft,
                total=total, finish=finish, guards=guards, error=error, input=inp, output=out)

requests = [
    R("t-001", "support-chat", "alice@example.com", ("support", 7, "a1b2c3"), "model-large", "model-large-2026-08-01", 0.2,
      ["kb-12", "kb-40"], 0.82, [("lookup_order", '{"email":"alice@example.com","order":"A-991"}', "ok", 140)],
      {"input": 3200, "cached": 2800, "output": 180}, 640, 2900, "stop", [], None,
      "My order A-991 has not arrived, email me at alice@example.com", "Order A-991 shipped on Monday and should arrive tomorrow."),
    R("t-002", "support-chat", "bob", ("support", 7, "a1b2c3"), "model-large", "model-large-2026-08-01", 0.2,
      ["kb-03"], 0.41, [], {"input": 2900, "cached": 2800, "output": 410}, 700, 6100, "length", ["low_retrieval_score"], None,
      "Can I pay with card 4111 1111 1111 1111 or call +44 20 7946 0958?", "You can pay by card. Our support line is open from 9 to 5 and"),
    R("t-003", "summarize", "carol", ("summary", 3, "9f8e7d"), "model-small", "model-small-2026-05-20", 0,
      [], None, [], {"input": 5200, "cached": 0, "output": 300}, 350, 1800, "stop", [], None,
      "Summarize this meeting transcript", "Three decisions were made: ship Friday, freeze the API, hire."),
    R("t-004", "support-chat", "dave", ("support", 7, "a1b2c3"), "model-large", None, 0.2,
      [], None, [], {"input": 0, "cached": 0, "output": 0}, None, 30000, None, [], "timeout after 30000 ms",
      "Where is my refund?", ""),
]
log = [record(r) for r in requests]
print("stored record for t-002:")
print(json.dumps(log[1], indent=2, ensure_ascii=False))

# Roll-ups for dashboards: low-cardinality labels only (feature, prompt version, model).
print("metrics by feature:")
for f in dict.fromkeys(r["feature"] for r in log):
    rs = [r for r in log if r["feature"] == f]
    lat = sorted(r["latency_ms"]["total"] for r in rs)
    p95 = lat[math.ceil(0.95 * len(lat)) - 1]
    cost = sum(round(float(r["cost_usd"]) * 1e6) for r in rs) / 1e6
    in_tok = sum(r["usage"]["input_tokens"] for r in rs)
    cached = sum(r["usage"]["cached_tokens"] for r in rs)
    errors = sum(1 for r in rs if r["error"])
    truncated = sum(1 for r in rs if r["finish_reason"] == "length")
    hit = f"{100 * cached / in_tok:.1f}" if in_tok else "0.0"
    print(f"  {f}: n={len(rs)} p95={p95}ms errors={errors} truncated={truncated} cache_hit={hit}% cost=\${cost:.6f}")

# Feedback arrives later, keyed by trace_id: the join turns it into eval candidates.
feedback = [("t-001", "up", None), ("t-002", "down", "it cut off mid sentence")]
print("eval candidates:")
for tid, vote, note in feedback:
    if vote != "down":
        continue
    r = next(x for x in log if x["trace_id"] == tid)
    print(f"  {tid} prompt={r['prompt']['name']}@v{r['prompt']['version']} finish={r['finish_reason']} "
          f"guards={','.join(r['guardrails'])} note=\\"{note}\\"")
    print(f"    input: {r['input']}")
leaked = re.findall(r"alice@example\\.com|4111|7946", json.dumps(log))
print(f"raw PII strings left in the stored log: {len(leaked)}")` },
        ],
      },
    ],
  },
  {
    title: `AI observability: how do you trace and log LLM calls in prod?`,
    difficulty: "easy",
    seoDescription: `How to trace LLM calls in production: spans and traces, OpenTelemetry GenAI attributes, traceparent propagation, opt-in content capture and tail sampling.`,
    description: `**Question presented to candidate:**
"Our agent makes two or three model calls and a tool call per user request, and when something is slow or wrong we cannot tell which step it was. How would you add tracing so we can see each LLM call in production, and what standard would you follow so we are not locked into one vendor?"

**What a strong answer should cover:**
- What a trace and a span are: one trace per user request, one span per step (retrieval, each model call, each tool call) with a parent, start time, duration, status and attributes, so the request shows up as a timed tree
- OpenTelemetry as the vendor-neutral standard, and its GenAI semantic conventions: span names like \`chat {model}\`, attributes such as \`gen_ai.operation.name\`, \`gen_ai.provider.name\`, \`gen_ai.request.model\`, \`gen_ai.usage.input_tokens\` and \`gen_ai.response.finish_reasons\`, CLIENT span kind for remote model calls; the conventions are still marked as in development, so names can change
- Context propagation across services with the W3C \`traceparent\` header, so a tool call to another service joins the same trace
- Prompt and response content is opt-in (off by default in the OpenTelemetry instrumentations) because of privacy and size; redact before export
- Sampling: keep all errors and slow traces with tail-based sampling in a collector, sample the rest; and send the data to any OTLP-compatible backend or LLM observability tool

**Code / implementation expected:** Optional — wrapping a model call in a span with GenAI attributes, or enabling an SDK's built-in telemetry.`,
    answer: `**Target Audience:** Developers who have an LLM feature or agent in production and want to see each model call, tool call and its timing; no prior observability experience assumed.
**Difficulty:** Easy
**Verified with:** Node 22.22.0 and Python 3.12.3 (the in-process tracer below, identical output in both). OpenTelemetry convention names, the W3C header format and SDK options were checked with web searches in October 2026; where only secondary sources were found, the text says so.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

You send a parcel across the country. It takes nine days instead of two. If all you know is "sent Monday, arrived next Wednesday", you cannot tell whether it sat in a depot, went to the wrong city, or waited at customs. A tracking number fixes that: every depot scans it, each scan records where, when and what happened, and the scans link up into one journey.

One request to an AI agent is that parcel. It goes through retrieval, a model call that decides to use a tool, the tool (which may be another service entirely), and a second model call that writes the answer. When the user says "it took eight seconds" or "it answered nonsense", you need the scans: which step, how long, how many tokens, what came back.

📌 **Interview term: observability** — being able to answer new questions about what a running system did from the data it emits, without shipping new code to find out. For LLM apps that data is records, metrics and traces; [What should you log and trace in an LLM application?](/interview-question/what-should-you-log-and-trace-in-an-llm-application) covers *which fields* to keep. This doc covers *how tracing works*.

## 2. Traces and Spans

📌 **Interview term: trace** — the record of one request end to end, identified by a **trace ID** (the tracking number). Every step of that request carries the same trace ID.

📌 **Interview term: span** — one timed step inside a trace: a name, a start time, a duration, a status (OK or error), a **span ID**, the span ID of its **parent**, and a set of key-value **attributes**. Parent links turn the spans into a tree, which tools draw as a waterfall.

📌 **Interview term: span kind** — what role the step plays: \`CLIENT\` for an outgoing call to another process (a model API, a database), \`SERVER\` for handling an incoming request, \`INTERNAL\` for work inside the process. The OpenTelemetry GenAI spec recommends \`CLIENT\` for calls to a model over the network.

<svg class="iq-diagram" width="100%" viewBox="0 0 880 330" role="img" aria-label="Waterfall of one agent trace with a root agent span, retrieval, a first model call, a tool call with a child span in another service, and a second model call">
  <rect class="d-box-muted" x="40" y="20" width="800" height="40" rx="6"/>
  <text class="d-text" x="440" y="46" text-anchor="middle">invoke_agent support-bot  2207 ms</text>
  <rect class="d-box" x="40" y="100" width="60" height="40" rx="6"/>
  <text class="d-sub" x="150" y="126" text-anchor="start">retrieve kb  80 ms</text>
  <rect class="d-box-accent" x="69" y="180" width="326" height="40" rx="6"/>
  <text class="d-text" x="232" y="206" text-anchor="middle">chat gpt-x  900 ms</text>
  <rect class="d-box-accent" x="441" y="180" width="399" height="40" rx="6"/>
  <text class="d-text" x="640" y="206" text-anchor="middle">chat gpt-x  1100 ms</text>
  <rect class="d-box" x="395" y="260" width="46" height="40" rx="6"/>
  <text class="d-sub" x="490" y="286" text-anchor="start">execute_tool and GET /orders  125 ms</text>
</svg>

Bar length is proportional to duration on a 0 to 2,207 ms axis, from the example run (the 80 ms retrieval bar is drawn a little wider so it stays visible). The two model calls (highlighted) take 2,000 of the 2,207 ms; retrieval and the tool are small. That is the first question tracing answers.

## 3. The Standard: OpenTelemetry and Its GenAI Conventions

📌 **Interview term: OpenTelemetry (OTel)** — the open, vendor-neutral standard and set of SDKs for producing traces, metrics and logs, plus the OTLP wire protocol for sending them. You instrument once and send the data to any backend that accepts OTLP, so you can change tools without re-instrumenting.

📌 **Interview term: semantic conventions** — agreed attribute names, so that every library calls the same thing by the same name. For LLM calls these are the **GenAI semantic conventions**. From the OpenTelemetry spec pages (checked October 2026):

| Attribute | Example | Meaning |
| :--- | :--- | :--- |
| \`gen_ai.operation.name\` | \`chat\`, \`embeddings\`, \`execute_tool\`, \`invoke_agent\` | What kind of operation the span is |
| \`gen_ai.provider.name\` | \`openai\`, \`aws.bedrock\`, \`gcp.vertex_ai\` | Which provider; replaced the older \`gen_ai.system\` (in v1.37, according to a GreptimeDB write-up) |
| \`gen_ai.request.model\` / \`gen_ai.response.model\` | \`gpt-x\` / \`gpt-x-2026-08-01\` | Model you asked for, and the one that answered |
| \`gen_ai.request.temperature\` | \`0\` | Sampling parameters (also \`max_tokens\`, \`top_p\` and others) |
| \`gen_ai.usage.input_tokens\` / \`gen_ai.usage.output_tokens\` | \`2400\` / \`40\` | Token usage from the response |
| \`gen_ai.response.finish_reasons\` | \`["tool_calls"]\` | Array of reasons generation stopped |
| \`gen_ai.response.id\` | \`chatcmpl-123\` | The provider response ID, useful in support tickets |

The span name is recommended to be \`{gen_ai.operation.name} {gen_ai.request.model}\`, such as \`chat gpt-x\` in the example (\`gpt-x\` is a placeholder model name). The conventions also define two histogram metrics, \`gen_ai.client.token.usage\` and \`gen_ai.client.operation.duration\`, so dashboards can be built without reading every span.

One caveat interviewers like: **the GenAI conventions are still in "Development" status** (a GreptimeDB article on the conventions, May 2026; check the status badge on the spec page for your version), and names have already changed once. The Python contrib instrumentation for OpenAI, for example, stays on older v1.30.0 conventions unless you set \`OTEL_SEMCONV_STABILITY_OPT_IN=gen_ai_latest_experimental\` (opentelemetry-python-contrib docs). Pin your instrumentation versions and expect renames.

## 4. Content Capture Is Opt-In

Prompts and responses are the most useful and the most dangerous data in a trace: they can contain personal data, and they are large. The OpenTelemetry Python GenAI utilities state that by default message content is not captured; you enable it with \`OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT\`, which with the latest experimental conventions takes \`span_only\`, \`event_only\` or \`span_and_event\`, and content then goes in attributes such as \`gen_ai.input.messages\` and \`gen_ai.output.messages\` (opentelemetry-python-contrib docs and NVIDIA NeMo Guardrails tracing docs, checked October 2026).

If you turn it on, redact first. The example records \`app.question.chars\` (the length of the question) on the root span instead of the question itself; a common middle ground is metadata on every span and redacted content only for a sample and for errors.

## 5. Crossing Service Boundaries: Context Propagation

The tool in the example, \`lookup_order\`, calls a separate order service. That service has its own tracer and its own process. To make its span part of the same trace, the caller sends the current trace ID and span ID along with the HTTP request.

📌 **Interview term: context propagation** — passing the trace context (trace ID, parent span ID, sampling flag) from one process to the next, normally in a request header, so all services add spans to the same trace.

📌 **Interview term: traceparent** — the W3C Trace Context header that carries it, four hyphen-separated lowercase hex fields: version (\`00\`), trace ID (32 hex characters), parent span ID (16 hex characters) and flags (\`01\` means sampled). From the example:

~~~text
00-eb66c623572f8a2a5167ce017dee0541-8c6da9d9438fcca3-01
~~~

The order service parses the header, checks the format, and creates its \`GET /orders/{id}\` span with the trace ID from the header and \`8c6da9...\` (the \`execute_tool\` span) as its parent. In the waterfall it appears nested under the tool span, although it was produced by a different program. OpenTelemetry SDKs and HTTP instrumentations inject and extract this header for you.

## 6. Sampling: You Cannot Keep Everything

LLM traces are bigger than typical ones (many attributes, sometimes content), and most of them are boring. Sampling decides which to keep.

📌 **Interview term: head-based sampling** — deciding at the start of the request (for example, keep 10%). Cheap, but it decides before anyone knows whether the request will fail or be slow, so it throws away many of the traces you want.

📌 **Interview term: tail-based sampling** — deciding after the whole trace has finished, so the rule can look at it: keep every trace with an error, every trace slower than a threshold, and a fraction of the rest. The OpenTelemetry Collector's \`tail_sampling\` processor does this: it buffers spans by trace ID for a \`decision_wait\` period and then applies policies such as status code, latency and probabilistic; a trace is kept if any policy says keep (Grafana Alloy reference docs and Uptrace sampling guide). One operational catch from the same sources: all spans of a trace must reach the same collector instance, so a multi-replica setup needs trace-ID-aware load balancing.

The example applies exactly these three rules to six traces: the one whose tool failed is kept (\`keep: error\`), the one with a 4.2-second model call is kept (\`keep: slow\`), and two of the remaining four are kept by a deterministic hash of the trace ID. The first trace, which we printed in full, is dropped: normal requests mostly are.

## 7. Verified: Running the Code

The example **"Minimal tracer: GenAI spans, traceparent across a service hop, tail sampling"** is a tiny tracer, not the OpenTelemetry SDK: spans are plain objects, a fake clock advances by fixed milliseconds, IDs come from hashing a counter, and the "order service" is a function that only receives the header string. Model calls are stubs that return canned token counts. That keeps the output deterministic while showing the real structure. The core:

~~~js
function chat(parent, model, inTok, outTok, ms, finish) {
  const s = startSpan(\`chat \${model}\`, "CLIENT", parent, { "gen_ai.operation.name": "chat",
    "gen_ai.provider.name": "openai", "gen_ai.request.model": model, "gen_ai.request.temperature": 0 });
  endSpan(s, ms, { "gen_ai.response.model": \`\${model}-2026-08-01\`, "gen_ai.usage.input_tokens": inTok,
    "gen_ai.usage.output_tokens": outTok, "gen_ai.response.finish_reasons": [finish] });
}
~~~

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
trace eb66c623572f8a2a5167ce017dee0541
traceparent sent to the order service: 00-eb66c623572f8a2a5167ce017dee0541-8c6da9d9438fcca3-01
    0ms  2207ms  invoke_agent support-bot [INTERNAL] span=d5d5b1 parent=-
    0ms    80ms    retrieve kb [CLIENT] span=c0dd04 parent=d5d5b1
   80ms   900ms    chat gpt-x [CLIENT] span=8a0f51 parent=d5d5b1  usage.input_tokens=2400 usage.output_tokens=40 response.finish_reasons=tool_calls
  980ms   125ms    execute_tool lookup_order [INTERNAL] span=8c6da9 parent=d5d5b1
  980ms   120ms      GET /orders/{id} [SERVER] span=c3c720 parent=8c6da9
 1105ms  1100ms    chat gpt-x [CLIENT] span=c712f3 parent=d5d5b1  usage.input_tokens=2600 usage.output_tokens=160 response.finish_reasons=stop
spans=6 model_calls=2 tokens=5200
tail sampling (keep errors, keep > 3000 ms, keep about 1 in 3 of the rest by trace id):
  eb66c623  6 spans  2207 ms  drop
  460e44dd  6 spans  4087 ms  keep: error
  82e5b7f9  6 spans  5507 ms  keep: slow
  f0ef18e2  6 spans  2207 ms  drop
  92554e36  6 spans  2207 ms  keep: sampled
  c01005af  6 spans  2207 ms  keep: sampled
~~~

Reading the output:

- **One trace ID, six spans, one tree.** Every span except the root has a parent; the order service span's parent is \`8c6da9\`, the \`execute_tool\` span, even though it was created from the header alone.
- **The waterfall tells the story**: the first model call finished with \`finish_reasons=tool_calls\` (it asked for a tool), the tool took 125 ms, and the second call finished with \`stop\`. Total tokens for the request: 5,200, the sum over both model calls, which is what you would bill to this request.
- **Tail sampling kept the interesting traces** (error, slow) and a fraction of the rest.

What the simulation leaves out: a real SDK exports spans in batches over OTLP to a collector or backend, records exceptions as span events, uses random IDs, and measures real time.

## 8. Doing It for Real (Not Run Here)

Two common paths. First, a manual span around a model call with the OpenTelemetry Python API (the attribute names follow the conventions above; check them against the semantic-conventions version you pin):

~~~python
# Not run here: needs opentelemetry-sdk, an exporter and the openai package.
from opentelemetry import trace
from opentelemetry.trace import SpanKind, StatusCode

tracer = trace.get_tracer("support-bot")

def answer(client, messages):
    with tracer.start_as_current_span("chat gpt-x", kind=SpanKind.CLIENT) as span:
        span.set_attribute("gen_ai.operation.name", "chat")
        span.set_attribute("gen_ai.provider.name", "openai")
        span.set_attribute("gen_ai.request.model", "gpt-x")
        span.set_attribute("app.prompt.version", "support@v7")
        try:
            resp = client.chat.completions.create(model="gpt-x", messages=messages)
        except Exception as exc:
            span.record_exception(exc)
            span.set_status(StatusCode.ERROR)
            raise
        span.set_attribute("gen_ai.response.model", resp.model)
        span.set_attribute("gen_ai.usage.input_tokens", resp.usage.prompt_tokens)
        span.set_attribute("gen_ai.usage.output_tokens", resp.usage.completion_tokens)
        span.set_attribute("gen_ai.response.finish_reasons", [resp.choices[0].finish_reason])
        return resp
~~~

Second, let a library do it. OpenTelemetry has contrib instrumentations for some provider SDKs, and the Vercel AI SDK emits spans when you pass a telemetry option per call:

~~~ts
// Not run here. AI SDK v5/v6 style; per the AI SDK docs telemetry is experimental.
const result = await generateText({
  model,
  prompt,
  experimental_telemetry: { isEnabled: true, functionId: "support-answer" },
});
~~~

The AI SDK docs (v4 and v5 pages) describe \`ai.generateText\` spans wrapping \`ai.generateText.doGenerate\` spans (one per provider call) and \`ai.toolCall\` spans; third-party docs (Arize, Pydantic Logfire, seen October 2026) report that AI SDK v7 renames the option to \`telemetry\` and moves to GenAI-convention span names. Sentry's integration docs say no spans are emitted unless \`isEnabled\` is set, and describe \`recordInputs\` and \`recordOutputs\` for controlling content capture. Check the docs of the version you install.

Where the spans go is a separate choice: a general tracing backend, or an LLM-focused tool (Langfuse, LangSmith, Arize Phoenix, Braintrust and others) that adds prompt views, cost roll-ups and links from traces to evals. Instrumenting with OpenTelemetry keeps that choice open. Some teams also route all model traffic through an AI gateway that emits one span per call for every app, which gives uniform coverage but cannot see your retrieval or tool steps.

## Edge Cases Worth Knowing

- **Streaming.** The model span should end when the stream ends, not when the first chunk arrives; record time to first token as an attribute or event. If the client disconnects, end the span with that outcome, or the trace shows a call that never finished.
- **Async and background work.** Context propagation inside one process relies on the language's context mechanism (async context in Node, \`contextvars\` in Python). Work started in a queue or thread pool loses the parent unless you pass the context explicitly.
- **Huge attributes.** Backends limit attribute size and span count. A full prompt or a 50-step agent loop can be truncated silently; store large content by reference and cap steps.
- **Retries.** Give each attempt its own span under one logical operation, so a retry storm is visible instead of looking like one slow call ([How do you build resilient LLM calls with rate limits, retries and fallbacks?](/interview-question/how-do-you-build-resilient-llm-calls-with-rate-limits-retries-and-fallbacks)).
- **Convention churn.** Dashboards built on \`gen_ai.system\` broke when it became \`gen_ai.provider.name\`. Map attribute names in one place.

## Common Pitfalls

- **Starting a new trace in every service.** Without propagating \`traceparent\`, the tool service's spans form separate traces and the waterfall has a hole where the slow part was.
- **Head sampling at a low rate.** Most errors and slow requests are thrown away before anyone knows they were interesting. Use tail sampling for errors and latency.
- **Capturing full prompts and responses by default.** Content capture is off by default for good reasons; turn it on deliberately, with redaction and a retention limit.
- **Only tracing the model call.** Retrieval and tools are where many wrong or slow answers come from; trace every step, not just the LLM.
- **Inventing your own attribute names.** \`tokens_in\`, \`prompt_tokens\` and \`inputTokens\` across three services make dashboards impossible. Follow the GenAI conventions and add app-specific attributes with your own prefix (\`app.\`).
- **Treating traces as the eval system.** Traces show what happened; judging whether answers were good needs evals on sampled traces ([What are evals and why does every LLM feature need them?](/interview-question/what-are-evals-and-why-does-every-llm-feature-need-them)).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Traces and spans:</strong> <span style="color:#f0e2c8;">Each user request gets a <strong style="color:#ffca28;">trace ID</strong>, and every step, retrieval, each model call, each tool call, is a <strong style="color:#ffca28;">span</strong> with a parent, start, duration, status and attributes. The tree shows where the time and the failure were; in my demo the two model calls were 2,000 of 2,207 ms.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Use the standard:</strong> <span style="color:#f0e2c8;">I instrument with <strong style="color:#ffca28;">OpenTelemetry</strong> and its GenAI semantic conventions: spans named like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">chat gpt-x</code>, kind CLIENT, with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gen_ai.operation.name</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gen_ai.provider.name</code>, requested and response model, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gen_ai.usage.input_tokens</code> and output tokens, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gen_ai.response.finish_reasons</code>, plus my own <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">app.</code> attributes such as prompt version.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Mind the churn:</strong> <span style="color:#f0e2c8;">The GenAI conventions are still in development status and have renamed fields, for example <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gen_ai.system</code> became <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">gen_ai.provider.name</code>, so I pin instrumentation versions and map names in one place.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Propagate and protect:</strong> <span style="color:#f0e2c8;">Other services join the same trace through the W3C <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">traceparent</code> header. Prompt and response content is <strong style="color:#ffca28;">opt-in</strong>, off by default in the OpenTelemetry instrumentations, so I enable it deliberately with redaction and short retention.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Sample at the tail:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Tail-based sampling</strong> in a collector keeps every error and slow trace and a fraction of the rest; head sampling would discard most interesting traces before they happen. Then export over OTLP to whichever backend or LLM observability tool we choose.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why OpenTelemetry instead of a vendor SDK?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Instrument once, send anywhere: OTLP data can go to a general tracing backend or an LLM-focused tool, and switching later does not mean re-instrumenting every service. Standard attribute names also make dashboards work across languages.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does a tool running in another service end up in the same trace?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The caller injects <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">traceparent</code>, version, 32-hex trace ID, 16-hex parent span ID and flags, into the request; the service extracts it and creates its span with that trace ID and parent. OTel HTTP instrumentations do this automatically.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should traces include the prompt and the response?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only deliberately. Content is the best debugging evidence but carries personal data and size; capture it redacted, for a sample plus errors and negative feedback, with tighter access and retention than metadata.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between head and tail sampling?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Head sampling decides at the start, cheaply, but blind; tail sampling waits until the trace is complete and can keep all errors and slow traces. The cost is buffering spans and routing each trace to one collector instance.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do traces connect to evals?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Traces tell you what happened, not whether it was good. Sampled traces, especially errors and thumbs-down, are scored by evals and promoted into the golden set, so production failures become regression tests.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Observability | Answering new questions about a running system from the data it emits |
| Trace | One request end to end, identified by a trace ID |
| Span | One timed step in a trace, with a parent, status and attributes |
| Span kind | \`CLIENT\`, \`SERVER\` or \`INTERNAL\`: the role of the step |
| OpenTelemetry (OTel) | Vendor-neutral standard and SDKs for traces, metrics and logs, sent over OTLP |
| Semantic conventions | Agreed attribute names; the GenAI ones cover model calls, tools and agents |
| Context propagation | Passing trace context between processes so spans join one trace |
| traceparent | W3C header with version, trace ID, parent span ID and flags |
| Head-based sampling | Keep or drop decided when the request starts |
| Tail-based sampling | Keep or drop decided after the trace finishes, using errors and latency |

**Conclusion:** Tracing an LLM app means giving each user request a trace ID and recording every step, retrieval, each model call, each tool call, as a span with a parent, a duration, a status and attributes. OpenTelemetry's GenAI conventions give those attributes standard names (operation, provider, requested and served model, token usage, finish reasons), which keeps you free to change backends, though the conventions are still in development and have already renamed fields. Propagate \`traceparent\` so other services join the trace, keep prompt content opt-in and redacted, and use tail-based sampling so every error and slow request is kept while ordinary traffic is sampled.`,
    examples: [
      {
        label: `Minimal tracer: GenAI spans, traceparent across a service hop, tail sampling`,
        variants: [
          { tech: "node", code: `// A tiny OpenTelemetry-shaped tracer: nested spans with GenAI attribute names,
// a W3C traceparent header across a service hop, and a tail-sampling decision.
// Fake clock and counter-based IDs keep the output deterministic.
const crypto = require("crypto");
let clock = 0, idSeq = 0;
const newId = (len) => crypto.createHash("sha256").update(\`id-\${++idSeq}\`).digest("hex").slice(0, len);
const finished = [];
const headers = [];

function startSpan(name, kind, parent, attrs = {}) {
  return { name, kind, traceId: parent ? parent.traceId : newId(32), spanId: newId(16),
           parentId: parent ? parent.spanId : null, start: clock, attrs: { ...attrs }, status: "OK" };
}
function endSpan(span, ms, attrs = {}) {
  clock += ms;
  span.end = clock;
  Object.assign(span.attrs, attrs);
  finished.push(span);
}
const traceparent = (s) => \`00-\${s.traceId}-\${s.spanId}-01\`;
function fromTraceparent(h) {
  const [ver, traceId, spanId, flags] = h.split("-");
  if (ver !== "00" || traceId.length !== 32 || spanId.length !== 16) throw new Error("bad traceparent");
  return { traceId, spanId, sampled: flags === "01" };
}

// Stub model call: returns canned usage the way a provider response would.
function chat(parent, model, inTok, outTok, ms, finish) {
  const s = startSpan(\`chat \${model}\`, "CLIENT", parent, { "gen_ai.operation.name": "chat",
    "gen_ai.provider.name": "openai", "gen_ai.request.model": model, "gen_ai.request.temperature": 0 });
  endSpan(s, ms, { "gen_ai.response.model": \`\${model}-2026-08-01\`, "gen_ai.usage.input_tokens": inTok,
    "gen_ai.usage.output_tokens": outTok, "gen_ai.response.finish_reasons": [finish] });
}
// The order service is another process: it only receives the HTTP header.
function orderService(header, fail) {
  headers.push(header);
  const ctx = fromTraceparent(header);
  const s = startSpan("GET /orders/{id}", "SERVER", ctx, { "http.response.status_code": fail ? 503 : 200 });
  if (fail) s.status = "ERROR";
  endSpan(s, fail ? 2000 : 120);
}

function handleRequest(question, opts) {
  const root = startSpan("invoke_agent support-bot", "INTERNAL", null, { "gen_ai.operation.name": "invoke_agent",
    "app.prompt.version": "support@v7", "app.feature": "support-chat" });
  const ret = startSpan("retrieve kb", "CLIENT", root, { "db.system.name": "pgvector" });
  endSpan(ret, 80, { "app.retrieval.doc_count": 4 });
  chat(root, "gpt-x", 2400, 40, opts.slowModel ? 4200 : 900, "tool_calls");
  const tool = startSpan("execute_tool lookup_order", "INTERNAL", root, { "gen_ai.operation.name": "execute_tool",
    "gen_ai.tool.name": "lookup_order" });
  orderService(traceparent(tool), opts.toolFails);         // header crosses the network
  if (opts.toolFails) tool.status = "ERROR";
  endSpan(tool, 5);
  chat(root, "gpt-x", 2600, 160, 1100, "stop");
  root.attrs["app.question.chars"] = question.length;      // a size, not the text
  endSpan(root, 2);
  return root.traceId;
}

const t1 = handleRequest("Where is order A-991?", {});
console.log(\`trace \${t1}\`);
console.log(\`traceparent sent to the order service: \${headers[0]}\`);
const spans = finished.filter((s) => s.traceId === t1).sort((a, b) => a.start - b.start || b.end - a.end);
const depth = (s) => (s.parentId ? 1 + depth(spans.find((p) => p.spanId === s.parentId)) : 0);
for (const s of spans) {
  const gen = Object.keys(s.attrs).filter((k) => k.startsWith("gen_ai.usage") || k === "gen_ai.response.finish_reasons")
    .map((k) => \`\${k.replace("gen_ai.", "")}=\${s.attrs[k]}\`).join(" ");
  console.log(\`\${String(s.start).padStart(5)}ms \${String(s.end - s.start).padStart(5)}ms  \${"  ".repeat(depth(s))}\` +
    \`\${s.name} [\${s.kind}] span=\${s.spanId.slice(0, 6)} parent=\${s.parentId ? s.parentId.slice(0, 6) : "-"}\${gen ? "  " + gen : ""}\`);
}
const tok = spans.reduce((a, s) => a + (s.attrs["gen_ai.usage.input_tokens"] || 0) + (s.attrs["gen_ai.usage.output_tokens"] || 0), 0);
console.log(\`spans=\${spans.length} model_calls=\${spans.filter((s) => s.kind === "CLIENT" && s.name.startsWith("chat")).length} tokens=\${tok}\`);

// Tail sampling: decide per whole trace, after it finished.
const all = [t1, handleRequest("Refund status?", { toolFails: true }), handleRequest("Change my address", { slowModel: true }),
  handleRequest("Hi", {}), handleRequest("Opening hours?", {}), handleRequest("Cancel order", {})];
console.log("tail sampling (keep errors, keep > 3000 ms, keep about 1 in 3 of the rest by trace id):");
for (const id of all) {
  const ss = finished.filter((s) => s.traceId === id);
  const dur = Math.max(...ss.map((s) => s.end)) - Math.min(...ss.map((s) => s.start));
  const err = ss.some((s) => s.status === "ERROR");
  const keep = err ? "keep: error" : dur > 3000 ? "keep: slow" : parseInt(id.slice(-8), 16) % 3 === 0 ? "keep: sampled" : "drop";
  console.log(\`  \${id.slice(0, 8)} \${String(ss.length).padStart(2)} spans \${String(dur).padStart(5)} ms  \${keep}\`);
}` },
          { tech: "python", code: `# A tiny OpenTelemetry-shaped tracer: nested spans with GenAI attribute names,
# a W3C traceparent header across a service hop, and a tail-sampling decision.
# Fake clock and counter-based IDs keep the output deterministic.
import hashlib

clock = 0
id_seq = 0
finished = []
headers = []

def new_id(n):
    global id_seq
    id_seq += 1
    return hashlib.sha256(f"id-{id_seq}".encode()).hexdigest()[:n]

def start_span(name, kind, parent, attrs=None):
    trace_id = parent["traceId"] if parent else new_id(32)
    return {"name": name, "kind": kind, "traceId": trace_id, "spanId": new_id(16),
            "parentId": parent["spanId"] if parent else None, "start": clock,
            "attrs": dict(attrs or {}), "status": "OK"}

def end_span(span, ms, attrs=None):
    global clock
    clock += ms
    span["end"] = clock
    span["attrs"].update(attrs or {})
    finished.append(span)

def traceparent(s):
    return f"00-{s['traceId']}-{s['spanId']}-01"

def from_traceparent(h):
    ver, trace_id, span_id, flags = h.split("-")
    if ver != "00" or len(trace_id) != 32 or len(span_id) != 16:
        raise ValueError("bad traceparent")
    return {"traceId": trace_id, "spanId": span_id, "sampled": flags == "01"}

# Stub model call: returns canned usage the way a provider response would.
def chat(parent, model, in_tok, out_tok, ms, finish):
    s = start_span(f"chat {model}", "CLIENT", parent, {"gen_ai.operation.name": "chat",
        "gen_ai.provider.name": "openai", "gen_ai.request.model": model, "gen_ai.request.temperature": 0})
    end_span(s, ms, {"gen_ai.response.model": f"{model}-2026-08-01", "gen_ai.usage.input_tokens": in_tok,
        "gen_ai.usage.output_tokens": out_tok, "gen_ai.response.finish_reasons": [finish]})

# The order service is another process: it only receives the HTTP header.
def order_service(header, fail):
    headers.append(header)
    ctx = from_traceparent(header)
    s = start_span("GET /orders/{id}", "SERVER", ctx, {"http.response.status_code": 503 if fail else 200})
    if fail:
        s["status"] = "ERROR"
    end_span(s, 2000 if fail else 120)

def handle_request(question, tool_fails=False, slow_model=False):
    root = start_span("invoke_agent support-bot", "INTERNAL", None, {"gen_ai.operation.name": "invoke_agent",
        "app.prompt.version": "support@v7", "app.feature": "support-chat"})
    ret = start_span("retrieve kb", "CLIENT", root, {"db.system.name": "pgvector"})
    end_span(ret, 80, {"app.retrieval.doc_count": 4})
    chat(root, "gpt-x", 2400, 40, 4200 if slow_model else 900, "tool_calls")
    tool = start_span("execute_tool lookup_order", "INTERNAL", root, {"gen_ai.operation.name": "execute_tool",
        "gen_ai.tool.name": "lookup_order"})
    order_service(traceparent(tool), tool_fails)        # header crosses the network
    if tool_fails:
        tool["status"] = "ERROR"
    end_span(tool, 5)
    chat(root, "gpt-x", 2600, 160, 1100, "stop")
    root["attrs"]["app.question.chars"] = len(question)  # a size, not the text
    end_span(root, 2)
    return root["traceId"]

t1 = handle_request("Where is order A-991?")
print(f"trace {t1}")
print(f"traceparent sent to the order service: {headers[0]}")
spans = sorted((s for s in finished if s["traceId"] == t1), key=lambda s: (s["start"], -s["end"]))
by_id = {s["spanId"]: s for s in spans}

def depth(s):
    return 1 + depth(by_id[s["parentId"]]) if s["parentId"] else 0

def fmt(v):
    return ",".join(v) if isinstance(v, list) else str(v)

for s in spans:
    gen = " ".join(f"{k.replace('gen_ai.', '')}={fmt(v)}" for k, v in s["attrs"].items()
                   if k.startswith("gen_ai.usage") or k == "gen_ai.response.finish_reasons")
    parent = s["parentId"][:6] if s["parentId"] else "-"
    print(f"{s['start']:>5}ms {s['end'] - s['start']:>5}ms  {'  ' * depth(s)}{s['name']} [{s['kind']}] "
          f"span={s['spanId'][:6]} parent={parent}{'  ' + gen if gen else ''}")
tok = sum(s["attrs"].get("gen_ai.usage.input_tokens", 0) + s["attrs"].get("gen_ai.usage.output_tokens", 0) for s in spans)
calls = sum(1 for s in spans if s["kind"] == "CLIENT" and s["name"].startswith("chat"))
print(f"spans={len(spans)} model_calls={calls} tokens={tok}")

# Tail sampling: decide per whole trace, after it finished.
all_ids = [t1, handle_request("Refund status?", tool_fails=True), handle_request("Change my address", slow_model=True),
           handle_request("Hi"), handle_request("Opening hours?"), handle_request("Cancel order")]
print("tail sampling (keep errors, keep > 3000 ms, keep about 1 in 3 of the rest by trace id):")
for tid in all_ids:
    ss = [s for s in finished if s["traceId"] == tid]
    dur = max(s["end"] for s in ss) - min(s["start"] for s in ss)
    err = any(s["status"] == "ERROR" for s in ss)
    if err:
        keep = "keep: error"
    elif dur > 3000:
        keep = "keep: slow"
    elif int(tid[-8:], 16) % 3 == 0:
        keep = "keep: sampled"
    else:
        keep = "drop"
    print(f"  {tid[:8]} {len(ss):>2} spans {dur:>5} ms  {keep}")` },
        ],
      },
    ],
  },
];

export default augments;
