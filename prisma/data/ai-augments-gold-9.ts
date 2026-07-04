/**
 * AI Engineering — Batch 9 (PII, batch APIs, model selection, output repair,
 * evals intro, LLM-as-judge). Same gold conventions as batch 1.
 */
import type { AiAugment } from "./ai-augments.types";

const augments: AiAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you handle PII and sensitive data when calling LLM APIs?",
    answer: `**TL;DR.** Verify the **provider contract** (no-training terms, zero/short retention, regional processing), then **minimize**: send only needed fields, **redact/pseudonymize** identifiers before the call, and **scrub logs and traces** — the surface teams forget. For the strictest data, keep inference **in-VPC**.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='PII is redacted to placeholders before the LLM call and restored after the response, with logs scrubbed'>
  <rect class='d-box' x='16' y='50' width='96' height='46' rx='9'/><text class='d-text' x='64' y='70' text-anchor='middle'>raw record</text><text class='d-sub' x='64' y='87' text-anchor='middle'>Rahul, +91-98...</text>
  <line class='d-edge' x1='112' y1='73' x2='140' y2='73'/><polygon class='d-arrow' points='140,68 148,73 140,78'/>
  <rect class='d-box-accent' x='150' y='50' width='96' height='46' rx='9'/><text class='d-text' x='198' y='70' text-anchor='middle'>redact</text><text class='d-sub' x='198' y='87' text-anchor='middle'>[NAME_1], [PHONE_1]</text>
  <line class='d-edge' x1='246' y1='73' x2='274' y2='73'/><polygon class='d-arrow' points='274,68 282,73 274,78'/>
  <rect class='d-box' x='284' y='50' width='70' height='46' rx='9'/><text class='d-text' x='319' y='77' text-anchor='middle'>LLM</text>
  <line class='d-edge' x1='354' y1='73' x2='382' y2='73'/><polygon class='d-arrow' points='382,68 390,73 382,78'/>
  <rect class='d-box-muted' x='392' y='50' width='52' height='46' rx='9'/><text class='d-sub' x='418' y='70' text-anchor='middle'>restore</text><text class='d-sub' x='418' y='87' text-anchor='middle'>map back</text>
  <text class='d-sub' x='230' y='130' text-anchor='middle'>logs + traces store the REDACTED prompt — logging is the real leak surface</text>
</svg>

**How it works.** **Contract first:** enterprise API terms typically commit to no training on inputs, bounded retention and regional endpoints — read them per provider and tier; consumer tiers differ. That said, contracts are a floor, not architecture. **Minimize:** the summarization task rarely needs the account number — strip fields at the boundary; design prompts to take the minimum slice of a record. **Redact/pseudonymize:** run PII detection (regex + NER, e.g. Presidio) before the call, replacing entities with stable placeholders; keep a per-request reversible mapping so responses referencing <code>[NAME_1]</code> can be restored — the provider never sees the identity, yet output quality survives because structure is preserved. **The forgotten surface:** teams secure the API path, then write raw prompts into logging/tracing SaaS with long retention — scrub before persistence and set retention windows; traces shipped to third-party observability are themselves a data transfer under GDPR-style rules. Also: gate what models may **echo back** (output-side PII checks), enforce tenant scoping at retrieval for RAG, and for regulated classes (PHI, card data) run in-VPC endpoints (Bedrock/Vertex private) or self-hosted models so data never leaves your boundary.

### Control layers
| Layer | Control |
| --- | --- |
| Contract | no-training terms, retention, region |
| Boundary | field minimization, redaction + mapping |
| Logs/traces | scrub before persist, retention limits |
| Output | PII-echo guard |
| Strictest data | in-VPC / self-hosted inference |

> **Interview tip:** The differentiator is naming **logs and traces as the real leak surface** — everyone secures the API call; audits fail on the observability stack. Reversible pseudonymization (placeholders + map-back) shows practical depth.`,
    examples: [
      {
        label: "Redact → call → restore",
        tech: "ts",
        runnable: false,
        code: `const { redacted, mapping } = piiRedact(ticketText);
// "Customer [NAME_1] ([EMAIL_1]) reports billing issue on [CARD_1]..."

const reply = await client.messages.create({
  model, max_tokens: 500,
  messages: [{ role: "user", content: draftReplyPrompt(redacted) }],
});

const restored = piiRestore(textOf(reply), mapping);   // [NAME_1] → actual name
await traces.write({ prompt: redacted, output: scrub(textOf(reply)) }); // never raw`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "When should you use batch APIs instead of real-time LLM calls?",
    answer: `**TL;DR.** Batch APIs take a **file of requests** and return results **asynchronously** (typically within hours) at **~50% off**, with separate, far higher rate limits. Use them whenever **no user is waiting** — enrichment, backfills, eval runs, offline generation. Architect pipelines queue-first so batch vs realtime is a flag, not a rewrite.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Realtime path serves a waiting user in seconds while batch path processes a file of requests within hours at half price'>
  <rect class='d-box-accent' x='16' y='24' width='428' height='44' rx='9'/>
  <text class='d-text' x='84' y='51'>realtime</text>
  <text class='d-sub' x='300' y='44' text-anchor='middle'>user waiting → seconds, full price, tight rate limits</text>
  <rect class='d-box-muted' x='16' y='84' width='428' height='44' rx='9'/>
  <text class='d-text' x='76' y='111'>batch</text>
  <text class='d-sub' x='300' y='104' text-anchor='middle'>file in → hours, ~50% price, huge separate quota</text>
  <text class='d-sub' x='300' y='120' text-anchor='middle'>enrichment · backfills · evals · report generation</text>
</svg>

**How it works.** You upload a JSONL of independent requests (each with a custom id), poll or get notified, then download results — order not guaranteed, failures itemized per line. The economics are structural: providers schedule batch work into idle capacity, so they can sell it cheaper with its **own quota**, which also means batch jobs do not eat the rate limits your interactive traffic depends on. Fit test: **is a human waiting?** Nightly ticket classification, catalog enrichment, embedding-adjacent content generation, weekly report drafting, **eval suite runs** (they are inherently batch), re-processing after a prompt upgrade — all batch. Design consequences: make LLM work **queueable and idempotent** (custom ids = dedupe keys), handle per-item failure with a retry sub-batch, and set expectations downstream (results land within a window, not instantly). Common hybrid: realtime serves the user a fast draft; batch reprocesses overnight with the expensive model for the durable record. Teams that hardcode synchronous calls everywhere pay double forever because the refactor never gets prioritized — hence queue-first from day one.

### Fit test
| Workload | Path |
| --- | --- |
| Chat, interactive agent | realtime |
| Nightly classification backfill | batch |
| Eval suite on 2k cases | batch |
| Urgent single document | realtime |
| Anything cron-shaped | batch |

> **Interview tip:** The crisp rule: **"no waiting human → batch"**. The two ops details that impress: batch has **separate rate limits** (protects interactive traffic) and per-item failure handling with idempotent ids.`,
    examples: [
      {
        label: "Batch job lifecycle",
        tech: "ts",
        runnable: false,
        code: `// 1. build JSONL: one request per line, custom_id = idempotency key
const lines = tickets.map((t) => JSON.stringify({
  custom_id: "ticket-" + t.id,
  params: { model, max_tokens: 50,
            messages: [{ role: "user", content: classifyPrompt(t.text) }] },
}));

// 2. submit and record the batch id
const batch = await client.batches.create({ requests: lines });
await jobs.save({ batchId: batch.id, kind: "ticket-classify" });

// 3. on completion webhook/poll: apply successes, re-batch the failures
for (const r of await client.batches.results(batch.id)) {
  if (r.result.type === "succeeded") await applyLabel(r.custom_id, r.result);
  else failures.push(r.custom_id);
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you choose the right model for a task?",
    answer: `**TL;DR.** Score the task on **capability needed, latency budget, cost at volume, context length, and features** (vision, tools, structured output) — then pick the **cheapest model that passes your evals**, and **route**: small models for classify/extract/simple chat, frontier for deep reasoning and agentic work.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Router sends easy tasks to a small fast model and hard tasks to a frontier model, with escalation on low confidence'>
  <rect class='d-box' x='16' y='54' width='90' height='44' rx='9'/><text class='d-text' x='61' y='80' text-anchor='middle'>task</text>
  <line class='d-edge' x1='106' y1='76' x2='136' y2='76'/><polygon class='d-arrow' points='136,71 144,76 136,81'/>
  <rect class='d-box-accent' x='146' y='54' width='96' height='44' rx='9'/><text class='d-text' x='194' y='74' text-anchor='middle'>router</text><text class='d-sub' x='194' y='90' text-anchor='middle'>rules / classifier</text>
  <line class='d-edge' x1='242' y1='64' x2='288' y2='42'/><polygon class='d-arrow' points='285,38 295,39 288,47'/>
  <line class='d-edge' x1='242' y1='88' x2='288' y2='110'/><polygon class='d-arrow' points='288,105 295,113 285,114'/>
  <rect class='d-box' x='298' y='20' width='146' height='40' rx='9'/><text class='d-sub' x='371' y='38' text-anchor='middle'>small + fast + cheap</text><text class='d-sub' x='371' y='52' text-anchor='middle'>classify · extract · route</text>
  <rect class='d-box-muted' x='298' y='92' width='146' height='40' rx='9'/><text class='d-sub' x='371' y='110' text-anchor='middle'>frontier</text><text class='d-sub' x='371' y='124' text-anchor='middle'>reasoning · agents · code</text>
  <path class='d-edge-dashed' d='M 371 60 L 371 92'/>
  <text class='d-sub' x='412' y='80' text-anchor='middle'>escalate</text>
</svg>

**How it works.** Work the checklist: **capability** — does the task need multi-step reasoning, reliable tool orchestration, subtle instruction-following? Or is it classification/extraction a small model saturates? **Latency** — user-facing autocomplete has a budget a frontier model may blow; **cost at volume** — a 10× price gap across millions of calls decides architectures; **context & features** — long documents, vision, structured output support. Then the empirical rule that replaces all opinions: **the cheapest model that passes your eval suite wins**. Not "the best model" — passing is passing, and overpaying for headroom you never use is the most common silent budget leak. **Routing** operationalizes it: static rules per endpoint, or a cheap classifier scoring difficulty, with **escalation** (low confidence / failed validation → retry on the bigger model) as the safety net that lets you route aggressively. Re-run the eval matrix on each model release — downgrades become possible as small models improve, and that is free margin. Keep the provider seam thin so a routing change is config, not a refactor.

### The checklist
| Factor | Question |
| --- | --- |
| Capability | reasoning depth? tool reliability? |
| Latency | p95 budget per endpoint? |
| Cost | price × your volume? |
| Context/features | window, vision, structured output? |
| Evals | cheapest model that passes? |

> **Interview tip:** The winning sentence: **"the cheapest model that passes our evals — which is why evals come first."** Then describe tiered routing with confidence-based escalation; it shows you think in systems, not model brands.`,
    examples: [
      {
        label: "Tiered routing with escalation",
        tech: "ts",
        runnable: false,
        code: `async function classify(ticket: string) {
  const fast = await small.complete({
    prompt: classifyPrompt(ticket), maxTokens: 10, temperature: 0,
  });
  const parsed = Label.safeParse(fast.text.trim());
  if (parsed.success && fast.confidenceHint !== "low") return parsed.data;

  // escalation path: the frontier model sees only the hard residue (~5-10%)
  const careful = await frontier.complete({
    prompt: classifyPromptDetailed(ticket), maxTokens: 10, temperature: 0,
  });
  return Label.parse(careful.text.trim());
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you validate and repair structured LLM output at runtime?",
    answer: `**TL;DR.** Never trust parsed output: validate against a **schema plus semantic rules** (enums, ranges, cross-field constraints). On failure run a **bounded repair loop** — re-prompt with the specific errors, once or twice — then **fall back deterministically** (constrained decoding, defaults, human queue). A rising repair rate is an early drift alarm.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Output flows through schema and semantic validation, a bounded repair retry, and a deterministic fallback'>
  <rect class='d-box-accent' x='16' y='46' width='86' height='48' rx='9'/><text class='d-text' x='59' y='66' text-anchor='middle'>LLM out</text><text class='d-sub' x='59' y='84' text-anchor='middle'>parsed JSON</text>
  <line class='d-edge' x1='102' y1='70' x2='126' y2='70'/><polygon class='d-arrow' points='126,65 134,70 126,75'/>
  <rect class='d-box' x='136' y='46' width='104' height='48' rx='9'/><text class='d-text' x='188' y='66' text-anchor='middle'>validate</text><text class='d-sub' x='188' y='84' text-anchor='middle'>schema + semantics</text>
  <line class='d-edge' x1='240' y1='70' x2='264' y2='70'/><polygon class='d-arrow' points='264,65 272,70 264,75'/>
  <rect class='d-box-muted' x='274' y='46' width='76' height='48' rx='9'/><text class='d-text' x='312' y='74' text-anchor='middle'>accept</text>
  <path class='d-edge-dashed' d='M 188 94 L 188 122 L 59 122 L 59 94'/><polygon class='d-arrow' points='54,96 59,88 64,96'/>
  <text class='d-sub' x='124' y='136' text-anchor='middle'>repair ≤2: re-prompt with errors</text>
  <line class='d-edge' x1='350' y1='70' x2='374' y2='70'/>
  <rect class='d-box' x='376' y='46' width='68' height='48' rx='9'/><text class='d-sub' x='410' y='66' text-anchor='middle'>fallback</text><text class='d-sub' x='410' y='84' text-anchor='middle'>default/human</text>
</svg>

**How it works.** **Validation depth:** JSON mode/constrained decoding guarantees *syntax*; your Zod/Pydantic layer must check *semantics* — enums actually valid for this tenant, dates in range, <code>totalCents</code> equal to the sum of line items, ids that **exist** (the model can emit a well-formed id that references nothing — the classic well-typed hallucination). **Repair loop:** feed back the original output plus precise validation errors ("category must be one of [...]; got 'misc'") — models fix concrete complaints reliably; bound it at 1-2 attempts because success rates collapse after the first retry while cost doubles. **Fallbacks, in order:** force constrained decoding if the first pass was free-form; degrade to defaults or a partial result flagged for review; route to a human queue for high-stakes records. Never loop unbounded, never accept-on-timeout. **Instrument everything:** per-field failure rates tell you which schema element confuses the model (fix its description); the aggregate repair rate is your drift canary — a jump after a model update or prompt change is the earliest observable regression, cheaper than waiting for user complaints.

### Failure ladder
| Attempt | Action |
| --- | --- |
| 1st failure | re-prompt with exact errors |
| 2nd failure | constrained decoding / simplify ask |
| Still failing | default + flag, or human queue |
| Always | log per-field failures + repair rate |

> **Interview tip:** Two details separate seniors: **semantic validation beyond schema** (referential checks — does the id exist?) and treating the **repair rate as a monitoring signal**, not just an error handler.`,
    examples: [
      {
        label: "Bounded repair with semantic checks",
        tech: "ts",
        runnable: false,
        code: `async function extractInvoice(text: string): Promise<Invoice> {
  let lastErrors = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const raw = await model.extract(text, lastErrors);       // errors appended on retry
    const parsed = InvoiceSchema.safeParse(raw);
    if (parsed.success) {
      const sem = await semanticChecks(parsed.data);          // vendor exists? totals add up?
      if (sem.ok) { metrics.repairAttempts(attempt); return parsed.data; }
      lastErrors = sem.errors.join("; ");
    } else {
      lastErrors = parsed.error.issues.map((i) => i.path + ": " + i.message).join("; ");
    }
  }
  await reviewQueue.push({ text, lastErrors });               // deterministic fallback
  throw new NeedsHumanReview();
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are evals and why does every LLM feature need them?",
    answer: `**TL;DR.** Evals are **automated tests for model behaviour**: realistic inputs + grading criteria + graders (code or LLM judges) producing scores. They exist because LLMs are **nondeterministic** and changes have **non-local effects** — without evals every prompt tweak and model upgrade is vibes-tested. They are the highest-leverage asset in an AI product.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Eval loop: dataset runs through the system, graders score outputs, scores gate changes and failures feed back into the dataset'>
  <rect class='d-box' x='16' y='50' width='96' height='48' rx='9'/><text class='d-text' x='64' y='70' text-anchor='middle'>dataset</text><text class='d-sub' x='64' y='87' text-anchor='middle'>real + edge cases</text>
  <line class='d-edge' x1='112' y1='74' x2='138' y2='74'/><polygon class='d-arrow' points='138,69 146,74 138,79'/>
  <rect class='d-box-accent' x='148' y='50' width='96' height='48' rx='9'/><text class='d-text' x='196' y='70' text-anchor='middle'>your system</text><text class='d-sub' x='196' y='87' text-anchor='middle'>prompt vN + model</text>
  <line class='d-edge' x1='244' y1='74' x2='270' y2='74'/><polygon class='d-arrow' points='270,69 278,74 270,79'/>
  <rect class='d-box' x='280' y='50' width='84' height='48' rx='9'/><text class='d-text' x='322' y='70' text-anchor='middle'>graders</text><text class='d-sub' x='322' y='87' text-anchor='middle'>code + judge</text>
  <line class='d-edge' x1='364' y1='74' x2='390' y2='74'/><polygon class='d-arrow' points='390,69 398,74 390,79'/>
  <rect class='d-box-muted' x='400' y='50' width='44' height='48' rx='9'/><text class='d-sub' x='422' y='79' text-anchor='middle'>scores</text>
  <path class='d-edge-dashed' d='M 422 98 L 422 126 L 64 126 L 64 98'/><polygon class='d-arrow' points='59,100 64,92 69,100'/>
  <text class='d-sub' x='240' y='140' text-anchor='middle'>production failures become new cases — the set tracks reality</text>
</svg>

**How it works.** The analogy that frames everything: **evals are to AI products what unit tests are to code** — except the system under test is stochastic, so you measure **rates**, not booleans. Minimal viable loop: (1) **collect** 50-200 realistic cases — sampled traffic, user-flagged failures, deliberate edge cases (including unanswerable inputs); (2) **define graders** — code checks for objective properties (schema, exact answers, forbidden content), rubric-anchored LLM-judge for qualities like faithfulness or tone; (3) **run on every change** — prompt edits, model upgrades, retrieval tweaks — and compare against baseline, per-slice; (4) **feed back** — every production failure becomes a case, so coverage tracks reality rather than launch-day guesses. Why non-negotiable: a wording tweak that fixes one complaint silently breaks five other behaviours (**non-local effects**); model upgrades shift distributions under you; and "it looked good on three examples" is how regressions ship. Teams without evals stop improving their product out of fear of breaking it — the eval suite is literally what makes iteration safe. Start embarrassingly small (20 cases, exact-match grading) — it already beats vibes.

### Grader types
| Grader | Checks | Cost |
| --- | --- | --- |
| Code | schema, exact match, contains, latency | free, deterministic |
| LLM judge | faithfulness, relevance, tone | per-call, needs validation |
| Human | ground truth, judge calibration | expensive, periodic |

> **Interview tip:** Use the line **"evals are unit tests for behaviour — and the reason you can change anything without fear"**. Concreteness wins: name your dataset size, one code grader and one judged dimension from a real project.`,
    examples: [
      {
        label: "Minimal eval harness",
        tech: "ts",
        runnable: false,
        code: `const cases: EvalCase[] = loadJsonl("golden/triage.jsonl"); // {input, expected, tags}

const results = await Promise.all(cases.map(async (c) => {
  const out = await system.run(c.input);
  return {
    id: c.id, tags: c.tags,
    exact: out.label === c.expected.label,                    // code grader
    faithful: await judge.score("faithfulness", c.input, out) // rubric judge, 1-5
  };
}));

console.table(sliceBy(results, "tags"));
// accuracy overall 0.91 | slice:refunds 0.95 | slice:multilingual 0.72  <- found it`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is LLM-as-judge and what are its known biases?",
    answer: `**TL;DR.** LLM-as-judge = a (usually strong) model grading outputs against a **rubric** where code cannot — helpfulness, faithfulness, tone. It scales judgment to thousands of cases, but carries known biases: **position** (pairwise order), **verbosity** (longer looks better), **self-preference**, leniency drift. Mitigate with anchored rubrics, randomized order, forced justification — and **validate the judge against human labels** before trusting its numbers.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Judge model scores an output against a rubric, with bias controls and human calibration around it'>
  <rect class='d-box' x='16' y='46' width='96' height='48' rx='9'/><text class='d-text' x='64' y='66' text-anchor='middle'>output</text><text class='d-sub' x='64' y='84' text-anchor='middle'>+ input + context</text>
  <line class='d-edge' x1='112' y1='70' x2='140' y2='70'/><polygon class='d-arrow' points='140,65 148,70 140,75'/>
  <rect class='d-box-accent' x='150' y='38' width='130' height='64' rx='10'/>
  <text class='d-text' x='215' y='60' text-anchor='middle'>judge model</text>
  <text class='d-sub' x='215' y='78' text-anchor='middle'>anchored rubric 1-5</text>
  <text class='d-sub' x='215' y='94' text-anchor='middle'>justify → then verdict</text>
  <line class='d-edge' x1='280' y1='70' x2='308' y2='70'/><polygon class='d-arrow' points='308,65 316,70 308,75'/>
  <rect class='d-box-muted' x='318' y='46' width='60' height='48' rx='9'/><text class='d-sub' x='348' y='75' text-anchor='middle'>score</text>
  <line class='d-edge-dashed' x1='378' y1='70' x2='404' y2='70'/>
  <rect class='d-box' x='406' y='46' width='38' height='48' rx='9'/><text class='d-sub' x='425' y='66' text-anchor='middle'>human</text><text class='d-sub' x='425' y='84' text-anchor='middle'>calib.</text>
</svg>

**How it works.** For open-ended qualities there is no exact match to check, and human review does not scale to every change — the judge fills that gap: given input, output (and context/reference), it scores dimensions like faithfulness or helpfulness against a rubric. The bias catalog you must know: **position bias** — in A/B comparisons judges favour one slot (mitigate: judge both orders, keep only consistent verdicts); **verbosity bias** — longer answers score higher independent of quality (mitigate: rubric says concision counts; spot-check long-vs-short pairs); **self-preference** — models rate their own family's style higher (mitigate: judge from a different family than the system under test, or triangulate); **leniency/drift** — scores cluster high and shift across judge-model versions (mitigate: **anchored rubrics** with concrete descriptions per score level, pin the judge model version, re-calibrate on upgrades). Craft rules: **binary or few-level anchored scales** beat 1-10 ("what is a 7?"); force **justification before verdict**; judge **one dimension per call** rather than an omnibus "rate this". And the non-negotiable: before trusting the judge, run it on 50-100 **human-labeled** cases and measure agreement — an unvalidated judge is just a second opinion with confidence.

### Bias → mitigation
| Bias | Mitigation |
| --- | --- |
| Position (pairwise) | swap order, require agreement |
| Verbosity | concision in rubric, length-controlled checks |
| Self-preference | different-family judge |
| Leniency/drift | anchored levels, pinned version, re-calibration |

> **Interview tip:** Rattle off the four biases with their mitigations, then close with the calibration rule: **"a judge is only as trustworthy as its agreement with human labels — measure it first."**`,
    examples: [
      {
        label: "Anchored, justified, single-dimension judge",
        tech: "ts",
        runnable: false,
        code: `const rubric = [
  "Score FAITHFULNESS of the answer to the provided context. Levels:",
  "3 = every claim is directly supported by the context",
  "2 = minor unsupported details that do not change the meaning",
  "1 = at least one material claim lacks support or contradicts context",
  "First write a 2-3 sentence justification citing specific claims.",
  'Then output exactly: {"score": 1|2|3}',
].join("\\n");

const verdict = await judge.complete({          // different family than the system
  model: JUDGE_MODEL_PINNED,
  temperature: 0,
  prompt: rubric + "\\n\\nContext:\\n" + ctx + "\\n\\nAnswer:\\n" + answer,
});
// weekly: judge vs human labels on the calibration set — alert if agreement < 0.85`,
      },
    ],
  },
];

export default augments;
