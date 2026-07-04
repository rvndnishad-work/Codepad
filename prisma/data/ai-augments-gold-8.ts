/**
 * AI Engineering — Batch 8 (production engineering: streaming, cost, latency,
 * resilience, observability, guardrails). Same gold conventions as batch 1.
 */
import type { AiAugment } from "./ai-augments.types";

const augments: AiAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does streaming work in LLM APIs and why does it matter for UX?",
    answer: `**TL;DR.** LLM APIs stream **server-sent events**: token deltas arrive as generated, so perceived latency collapses from full-completion time to **time-to-first-token**. Engineering care: render partial markdown/JSON safely, handle tool-call deltas and mid-stream errors, **propagate cancellation**, and keep proxies from buffering.

<svg class='iq-diagram' viewBox='0 0 460 140' role='img' aria-label='Blocking response shows a long spinner then all text; streaming shows tokens arriving progressively from first token onward'>
  <text class='d-text' x='30' y='36'>blocking</text>
  <rect class='d-box-muted' x='110' y='22' width='250' height='24' rx='6'/><text class='d-sub' x='235' y='38' text-anchor='middle'>spinner ......... 8s .........</text>
  <rect class='d-box' x='366' y='22' width='78' height='24' rx='6'/><text class='d-sub' x='405' y='38' text-anchor='middle'>full text</text>
  <text class='d-text' x='30' y='90'>streaming</text>
  <rect class='d-box-muted' x='110' y='76' width='52' height='24' rx='6'/><text class='d-sub' x='136' y='92' text-anchor='middle'>TTFT</text>
  <rect class='d-box-accent' x='166' y='76' width='58' height='24' rx='6'/><text class='d-sub' x='195' y='92' text-anchor='middle'>tok</text>
  <rect class='d-box-accent' x='228' y='76' width='58' height='24' rx='6'/><text class='d-sub' x='257' y='92' text-anchor='middle'>tok tok</text>
  <rect class='d-box-accent' x='290' y='76' width='154' height='24' rx='6'/><text class='d-sub' x='367' y='92' text-anchor='middle'>reading while it writes</text>
  <text class='d-sub' x='230' y='126' text-anchor='middle'>same total time — radically different perceived latency</text>
</svg>

**How it works.** With <code>stream: true</code> the response is a long-lived HTTP connection emitting **SSE events** — content deltas, tool-call argument fragments, usage, and a terminal event. Client-side concerns: **partial rendering** — naive markdown rendering flickers on unclosed fences (buffer until block boundaries or use a streaming-tolerant renderer), and partial JSON does not parse (accumulate, or use incremental parsers); **tool calls stream too** — argument JSON arrives in fragments you assemble before executing; **mid-stream failures** — a stream can die after half an answer, so decide retry vs resume semantics and make the UI communicate truncation; **cancellation** — when the user navigates away, abort the request so you stop paying for abandoned tokens; **infrastructure** — proxies and load balancers love to buffer (disable per-route, send heartbeats, watch idle timeouts), and serverless platforms may buffer the whole response unless configured for streaming. Server-relay architectures (browser → your API → provider) must re-stream, not accumulate. Measure **TTFT** and inter-token gaps as first-class latency metrics.

### Streaming checklist
| Concern | Handling |
| --- | --- |
| Partial markdown/JSON | buffer to boundaries / incremental parse |
| Mid-stream error | explicit truncation UX + retry policy |
| User cancels | AbortController → stop token spend |
| Proxies | disable buffering, heartbeats |

> **Interview tip:** Quote the psychology — **perceived latency is TTFT, not total time** — then one production scar: proxy buffering silently turning your stream into a blocking response is the classic first-deploy surprise.`,
    examples: [
      {
        label: "Streaming with cancellation propagated",
        tech: "ts",
        runnable: false,
        code: `export async function POST(req: Request) {
  const abort = new AbortController();
  req.signal.addEventListener("abort", () => abort.abort());   // user left → stop paying

  const stream = await client.messages.create(
    { model, max_tokens: 1024, stream: true, messages: await req.json() },
    { signal: abort.signal },
  );

  return new Response(new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === "content_block_delta")
          controller.enqueue(sse(event.delta.text));           // relay, never accumulate
      }
      controller.close();
    },
  }), { headers: { "Content-Type": "text/event-stream", "X-Accel-Buffering": "no" } });
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you estimate and control LLM costs in production?",
    answer: `**TL;DR.** Cost = **input tokens × input rate + output tokens × output rate**, summed over calls — and agent loops re-send growing context every turn. Levers in impact order: **route to smaller models**, **prompt caching**, **trim context**, **cap outputs**, **batch APIs**. Meter per feature/user; alert on budgets before the invoice does.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Cost levers ranked: model routing, prompt caching, context trimming, output caps, batch API'>
  <rect class='d-box-accent' x='16' y='24' width='196' height='30' rx='7'/><text class='d-sub' x='114' y='43' text-anchor='middle'>route easy tasks to small models</text>
  <rect class='d-box-accent' x='16' y='60' width='164' height='30' rx='7'/><text class='d-sub' x='98' y='79' text-anchor='middle'>prompt caching (~90% off prefix)</text>
  <rect class='d-box' x='16' y='96' width='136' height='30' rx='7'/><text class='d-sub' x='84' y='115' text-anchor='middle'>trim context (RAG &gt; stuffing)</text>
  <rect class='d-box' x='232' y='24' width='110' height='30' rx='7'/><text class='d-sub' x='287' y='43' text-anchor='middle'>cap max_tokens</text>
  <rect class='d-box' x='232' y='60' width='96' height='30' rx='7'/><text class='d-sub' x='280' y='79' text-anchor='middle'>batch API (~50%)</text>
  <rect class='d-box-muted' x='232' y='96' width='212' height='30' rx='7'/><text class='d-sub' x='338' y='115' text-anchor='middle'>meter per feature/user + budget alerts</text>
  <text class='d-sub' x='230' y='144' text-anchor='middle'>bar length ≈ typical savings impact</text>
</svg>

**How it works.** **Estimation:** model tokens-per-request (prompt template + typical context + expected output) × requests/day per feature; remember output tokens usually cost **3-5×** input, and a 10-step agent turn re-sends the transcript ten times — cumulative context cost grows roughly **quadratically** with steps, which is why agent features surprise teams. Prototype pricing with real traffic samples, not the demo prompt. **Control:** (1) **Model routing** — classification/extraction on a small model at a fraction of frontier price; route by task, escalate on low confidence; this is usually the biggest single lever. (2) **Prompt caching** — stable-prefix discipline makes system+tools+examples nearly free on repeat calls. (3) **Context diet** — retrieve 5 relevant chunks instead of stuffing 50; summarize history; compact agent transcripts. (4) **Output caps** — <code>max_tokens</code> sized per endpoint, "be concise" in prompts, structured output instead of prose. (5) **Batch API** for anything without a waiting user (~50% off). **Accounting:** log usage per request tagged by feature/tenant; dashboards of cost-per-feature and cost-per-outcome (per resolved ticket, per generated doc); hard budget alerts and per-tenant ceilings so one runaway integration cannot torch the month.

### Estimation gotchas
| Surprise | Cause |
| --- | --- |
| Agent features 10× estimate | context re-sent per step |
| Output-heavy endpoints | output rate multiple of input |
| JSON-heavy payloads | tokens ≫ visual length |
| Retry storms | failures billed too |

> **Interview tip:** Write the cost equation, call out the **agent quadratic-context trap** explicitly, and rank the levers with routing first. "Cost per resolved task" as the real KPI beats raw token talk.`,
    examples: [
      {
        label: "Per-request cost metering",
        tech: "ts",
        runnable: false,
        code: `const res = await client.messages.create(reqArgs);

const u = res.usage;   // input_tokens, output_tokens, cache_read_input_tokens...
await metrics.record({
  feature: "support-triage",
  tenant: ctx.tenantId,
  model: reqArgs.model,
  inputTokens: u.input_tokens,
  cachedTokens: u.cache_read_input_tokens ?? 0,
  outputTokens: u.output_tokens,
  usd: price(reqArgs.model, u),
});
// alerts: tenant > daily ceiling, feature > weekly budget, cache-hit-rate < 60%`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What techniques reduce LLM latency at each stage of a request?",
    answer: `**TL;DR.** Split latency into **TTFT** (queue + prompt processing) and **generation** (output tokens × per-token time). Cut TTFT with **prompt caching and shorter prompts**; cut generation with **smaller models and shorter outputs**; cut both at the app layer with **streaming, parallelism, precomputation and routing**.

<svg class='iq-diagram' viewBox='0 0 460 140' role='img' aria-label='Request timeline split into time to first token and generation time, each with its own optimization levers'>
  <rect class='d-box-muted' x='16' y='30' width='170' height='34' rx='7'/><text class='d-sub' x='101' y='51' text-anchor='middle'>TTFT: queue + prefill</text>
  <rect class='d-box-accent' x='190' y='30' width='254' height='34' rx='7'/><text class='d-sub' x='317' y='51' text-anchor='middle'>generation: N output tokens × ms/token</text>
  <text class='d-sub' x='101' y='90' text-anchor='middle'>↓ prompt caching</text>
  <text class='d-sub' x='101' y='106' text-anchor='middle'>↓ shorter prompts</text>
  <text class='d-sub' x='317' y='90' text-anchor='middle'>↓ smaller/faster model · concise output</text>
  <text class='d-sub' x='317' y='106' text-anchor='middle'>↓ max_tokens sized per endpoint</text>
  <text class='d-sub' x='230' y='130' text-anchor='middle'>app layer: stream immediately · parallelize · precompute · route by difficulty</text>
</svg>

**How it works.** **TTFT** is dominated by prompt processing (prefill) — proportional to input length — plus queueing. Levers: **prompt caching** (a cached prefix skips prefill for those tokens: the single biggest TTFT win for long stable prompts), context diet, provisioned/priority capacity for spiky traffic. **Generation** is linear in output tokens: smaller models emit tokens several times faster; asking for terse structured output instead of prose cuts token count directly; some providers offer speculative/predicted-output modes that accelerate mostly-known outputs (classic for code edits). **App layer:** stream so users read at TTFT rather than wait for completion; **parallelize** independent calls and tool executions instead of sequencing; precompute what you can (embed at index time, semantic-cache frequent queries, warm summaries offline); **route by difficulty** so the frontier model only sees requests that need it; and place inference regionally close to users. Measure **p95, not mean** — LLM latency has a fat tail — and set per-stage SLOs (TTFT vs total) so regressions localize.

### Lever map
| Stage | Lever | Typical win |
| --- | --- | --- |
| TTFT | prompt caching | large, for long prefixes |
| TTFT | shorter context | linear in tokens cut |
| Generation | smaller model | 2-5× tokens/sec |
| Generation | concise/structured output | linear in tokens cut |
| App | parallel calls, streaming, precompute | UX-defining |

> **Interview tip:** The decomposition **is** the answer — name TTFT vs generation before any technique, then attach levers per stage. Close with "we track p95 TTFT and tokens/sec separately" for operator credibility.`,
    examples: [
      {
        label: "Parallelize independent LLM work",
        tech: "ts",
        runnable: false,
        code: `// sequential: ~3× the latency of the slowest call
// parallel: bounded by the slowest call only
const [summary, sentiment, entities] = await Promise.all([
  small.complete({ prompt: summarize(doc), maxTokens: 200 }),
  small.complete({ prompt: classifySentiment(doc), maxTokens: 5 }),
  small.complete({ prompt: extractEntities(doc), maxTokens: 300 }),
]);

// and route: only escalate the hard path to the frontier model
const answer = needsDeepReasoning(query)
  ? await frontier.complete({ prompt })
  : await small.complete({ prompt });`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you build resilient LLM calls with rate limits, retries and fallbacks?",
    answer: `**TL;DR.** Wrap every model call in a resilience layer: **exponential backoff + jitter** on 429/5xx/timeouts honoring <code>Retry-After</code>, **queue or shed** sustained overload, a **fallback chain** (other region → smaller sibling → other provider) with the honesty that outputs differ, **circuit breakers** to fail fast, and **explicit degraded modes** in the product.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Request flows through retry with backoff, then a fallback chain, then degraded mode if everything fails'>
  <rect class='d-box' x='16' y='54' width='84' height='44' rx='9'/><text class='d-text' x='58' y='80' text-anchor='middle'>request</text>
  <line class='d-edge' x1='100' y1='76' x2='126' y2='76'/><polygon class='d-arrow' points='126,71 134,76 126,81'/>
  <rect class='d-box-accent' x='136' y='54' width='100' height='44' rx='9'/><text class='d-text' x='186' y='73' text-anchor='middle'>primary</text><text class='d-sub' x='186' y='90' text-anchor='middle'>retry ×3 backoff</text>
  <line class='d-edge' x1='236' y1='76' x2='262' y2='76'/><polygon class='d-arrow' points='262,71 270,76 262,81'/>
  <rect class='d-box' x='272' y='54' width='100' height='44' rx='9'/><text class='d-text' x='322' y='73' text-anchor='middle'>fallbacks</text><text class='d-sub' x='322' y='90' text-anchor='middle'>region → sibling</text>
  <line class='d-edge' x1='372' y1='76' x2='398' y2='76'/><polygon class='d-arrow' points='398,71 406,76 398,81'/>
  <rect class='d-box-muted' x='408' y='54' width='36' height='44' rx='9'/><text class='d-sub' x='426' y='80' text-anchor='middle'>degrade</text>
  <text class='d-sub' x='230' y='128' text-anchor='middle'>circuit breaker skips a failing tier fast; all hops logged + metered</text>
</svg>

**How it works.** **Retries:** transient classes only (429, 5xx, connect/idle timeouts) — never on 4xx validation errors; exponential backoff **with jitter** so a fleet does not retry in lockstep; honor <code>Retry-After</code>; put an **idempotency discipline** around anything with side effects. Streaming needs stall detection (no delta for N seconds → abort and retry). **Rate limits:** know your tier's RPM/TPM; smooth with client-side concurrency caps and queues; degrade gracefully (defer non-urgent work to batch) rather than hammering. **Fallback chain:** same model in another region first (identical behaviour), then a smaller same-family model (close behaviour), then cross-provider (different behaviour — keep prompts portable and include fallbacks in your eval matrix; an untested fallback is a second outage wearing a disguise). **Circuit breakers** trip after repeated failures so requests skip the dead tier instantly. **Degraded modes** are product decisions: serve a cached/semantic-cache answer with a freshness note, shorten functionality, or queue-and-notify — silence is the worst option. Chaos-test the path: inject 429s in staging and watch the chain actually work.

### Policy matrix
| Failure | Response |
| --- | --- |
| 429 | backoff + jitter, honor Retry-After |
| 5xx / timeout | retry ×N, then fallback tier |
| Sustained overload | queue, shed, batch-defer |
| Provider outage | circuit break → cross-provider or degrade |

> **Interview tip:** Two senior flags: **jitter** (thundering-herd awareness) and **"fallback models must pass evals too"** — resilience that changes the model silently changes the product.`,
    examples: [
      {
        label: "Resilience wrapper with fallback chain",
        tech: "ts",
        runnable: false,
        code: `const TIERS = [
  { name: "primary",  call: (r: Req) => anthropicUsEast(r) },
  { name: "region2",  call: (r: Req) => anthropicEuWest(r) },
  { name: "smaller",  call: (r: Req) => anthropicUsEast({ ...r, model: SMALL_MODEL }) },
];

async function completeResilient(req: Req) {
  for (const tier of TIERS) {
    if (breaker.isOpen(tier.name)) continue;              // fail fast past dead tiers
    try {
      return await retry(() => tier.call(req), {
        attempts: 3, backoff: expJitter(500), retryOn: [429, 500, 502, 503, "ETIMEDOUT"],
      });
    } catch (e) { breaker.record(tier.name, e); }
  }
  return degradedResponse(req);                            // cached answer + notice
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What should you log and trace in an LLM application?",
    answer: `**TL;DR.** Log each request as a **trace**: prompt version + rendered prompt, model/params, retrieved context, every tool call/result, response, **token counts, latency, cost** — PII-scrubbed. Add aggregate metrics (cost/feature, p95 TTFT, error+refusal rates) and **quality signals** (feedback, sampled judge scores, guardrail triggers). Traces are tomorrow's eval set.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='A trace containing spans for retrieval, model call and tool call feeds dashboards and the eval dataset'>
  <rect class='d-box-muted' x='16' y='20' width='268' height='110' rx='10'/>
  <text class='d-text' x='150' y='42' text-anchor='middle'>trace: request 8f2c</text>
  <rect class='d-box' x='30' y='52' width='240' height='20' rx='5'/><text class='d-sub' x='150' y='66' text-anchor='middle'>span: retrieval (8 chunks, 112ms)</text>
  <rect class='d-box-accent' x='30' y='76' width='240' height='20' rx='5'/><text class='d-sub' x='150' y='90' text-anchor='middle'>span: model call (prompt v42, 1.2k/380 tok)</text>
  <rect class='d-box' x='30' y='100' width='240' height='20' rx='5'/><text class='d-sub' x='150' y='114' text-anchor='middle'>span: tool search_orders (ok, 240ms)</text>
  <line class='d-edge' x1='284' y1='60' x2='324' y2='60'/><polygon class='d-arrow' points='324,55 332,60 324,65'/>
  <line class='d-edge' x1='284' y1='105' x2='324' y2='105'/><polygon class='d-arrow' points='324,100 332,105 324,110'/>
  <rect class='d-box' x='334' y='42' width='110' height='36' rx='8'/><text class='d-sub' x='389' y='64' text-anchor='middle'>dashboards + alerts</text>
  <rect class='d-box' x='334' y='90' width='110' height='36' rx='8'/><text class='d-sub' x='389' y='112' text-anchor='middle'>eval dataset feed</text>
</svg>

**How it works.** LLM apps fail **silently** — no exception, just a worse answer — so classic APM misses the failures that matter. **Per-request truth:** without the exact rendered prompt (not just the template), retrieved chunks, and every tool exchange, "user got a weird answer" is undebuggable; log the **prompt/model version** so any output is attributable and reproducible. **Aggregates:** token+cost per feature/tenant, p95 TTFT and total latency, error/retry/fallback counts, cache hit rates, refusal rate (spikes = prompt or model change side-effect), guardrail and repair-loop trigger rates (leading indicators of drift). **Quality:** thumbs up/down and edit-rate tied back to traces; LLM-judge scores on a sampled slice of live traffic for continuous quality reads. Two disciplines: **PII-scrub the logs** (teams secure the API call, then store raw prompts with customer data forever in a logging SaaS — logs are the actual privacy surface), and **close the loop**: every thumbs-down trace is a candidate eval case, which is how golden datasets track reality. Tooling: Langfuse/LangSmith/Braintrust or OpenTelemetry GenAI conventions on your existing stack.

### Signal tiers
| Tier | Examples | Answers |
| --- | --- | --- |
| Trace | rendered prompt, context, tools, versions | why was THIS answer wrong? |
| Metrics | cost, p95 TTFT, refusals, cache hits | is the system healthy? |
| Quality | feedback, judge samples, guardrail hits | is it getting worse? |

> **Interview tip:** Open with **"LLM failures are silent — observability is the only failure detector"**, and land the loop: production traces become eval cases. PII-scrubbing of prompt logs is the compliance detail most candidates forget.`,
    examples: [
      {
        label: "Trace record worth its storage",
        tech: "ts",
        runnable: false,
        code: `await traces.write({
  id: reqId, feature: "support-answer", tenant: ctx.tenantId,
  promptVersion: "support-answer@v42",
  model, params: { temperature: 0.2, maxTokens: 800 },
  renderedPrompt: scrubPii(rendered),          // exact bytes, scrubbed
  retrieved: chunks.map((c) => ({ id: c.id, score: c.score })),
  toolCalls: trace.tools,                       // name, args-hash, ok/err, ms
  output: scrubPii(reply.text),
  usage: reply.usage, latencyMs, costUsd,
  feedback: null,                               // thumbs join later → eval candidates
});`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are guardrails and how do you implement them around a model?",
    answer: `**TL;DR.** Guardrails are **programmatic checks sandwiching every model call**: input-side (injection attempts, off-topic, abuse, PII) and output-side (schema, content policy, grounding, blocklists). Order them **cheap-deterministic first, model-based second**; on failure **repair, degrade or escalate** — and log every trigger.

<svg class='iq-diagram' viewBox='0 0 460 140' role='img' aria-label='Input guards before the model and output guards after it, with repair, degrade or escalate on failure'>
  <rect class='d-box' x='16' y='50' width='60 ' height='40' rx='8'/><text class='d-sub' x='46' y='74' text-anchor='middle'>input</text>
  <line class='d-edge' x1='76' y1='70' x2='96' y2='70'/><polygon class='d-arrow' points='96,65 104,70 96,75'/>
  <rect class='d-box-muted' x='106' y='42' width='86' height='56' rx='9'/><text class='d-text' x='149' y='64' text-anchor='middle'>in-guards</text><text class='d-sub' x='149' y='82' text-anchor='middle'>regex → classifier</text>
  <line class='d-edge' x1='192' y1='70' x2='212' y2='70'/><polygon class='d-arrow' points='212,65 220,70 212,75'/>
  <rect class='d-box-accent' x='222' y='42' width='70' height='56' rx='9'/><text class='d-text' x='257' y='74' text-anchor='middle'>model</text>
  <line class='d-edge' x1='292' y1='70' x2='312' y2='70'/><polygon class='d-arrow' points='312,65 320,70 312,75'/>
  <rect class='d-box-muted' x='322' y='42' width='86' height='56' rx='9'/><text class='d-text' x='365' y='64' text-anchor='middle'>out-guards</text><text class='d-sub' x='365' y='82' text-anchor='middle'>schema → policy</text>
  <line class='d-edge' x1='408' y1='70' x2='428' y2='70'/><polygon class='d-arrow' points='428,65 436,70 428,75'/>
  <text class='d-sub' x='226' y='126' text-anchor='middle'>on failure: repair (retry w/ error) → degrade (canned) → escalate (human)</text>
</svg>

**How it works.** **Input-side:** deterministic checks first — length caps, format validation, blocklist/allowlist regex, rate limits (free, zero latency); then model-based classifiers for nuance — prompt-injection detection, topical scope ("is this a banking question?"), abuse/PII detection (redact before the main call). **Output-side:** schema validation for structured endpoints; content-policy classification; **grounding checks** for RAG (citations resolve; sampled claim-support verification); brand rules (no competitor mentions, no unapproved claims, no raw URLs); PII echo prevention. **Failure policy per guard:** *repair* (retry once with the specific violation appended — fixes most schema/format misses), *degrade* (canned safe response for out-of-scope), *escalate* (human queue for high-stakes ambiguity). Design notes: budget guard latency (parallelize independent checks; a 2s guard chain on a 1s answer is product damage); tune thresholds with logged data because **false positives erode users and false negatives erode trust**; version guards and test them in evals like any behaviour — including red-team cases as permanent regressions.

### Guard inventory
| Side | Deterministic | Model-based |
| --- | --- | --- |
| Input | length, regex, rate limit | injection classifier, scope, PII |
| Output | schema, blocklists, citation resolution | policy, faithfulness sampling |

> **Interview tip:** Structure it as the **sandwich** plus the **cheap-first ordering** and the three-way failure policy (repair/degrade/escalate). Mentioning guard latency budgets and threshold tuning shows you have run these in production, not just drawn them.`,
    examples: [
      {
        label: "Guard pipeline with repair-once",
        tech: "ts",
        runnable: false,
        code: `async function guardedAnswer(input: string, ctx: Ctx) {
  await cheapInputGuards(input);                        // length, regex, rate — throws fast
  const [scopeOk, injectionRisk] = await Promise.all([  // model guards in parallel
    scopeClassifier(input), injectionClassifier(input),
  ]);
  if (!scopeOk) return CANNED.offTopic;                 // degrade
  if (injectionRisk > 0.9) return escalate(input, ctx); // human queue

  let out = await model.answer(input, ctx);
  const violations = await outputGuards(out, ctx);      // schema, citations, policy
  if (violations.length) {
    out = await model.answer(input, ctx, { repairNote: violations });  // repair once
    if ((await outputGuards(out, ctx)).length) return CANNED.safeFallback;
  }
  metrics.guardReport({ scopeOk, injectionRisk, violations });
  return out;
}`,
      },
    ],
  },
];

export default augments;
