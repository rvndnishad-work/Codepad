/**
 * AI Engineering — Batch 6 (semantic caching + tool calling and agent
 * foundations). Same gold conventions as batch 1. Picked up by augment:ai.
 */
import type { AiAugment } from "./ai-augments.types";

const augments: AiAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is semantic caching and when is it safe to use?",
    answer: `**TL;DR.** Semantic caching **embeds incoming queries** and returns a **previous answer** when a past query is within a similarity threshold. Huge savings on FAQ-like traffic — but similar wording ≠ same intent, so it is only safe for **idempotent, non-personalized, informational** queries with high thresholds, tenant scoping and TTLs.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='New query is embedded and compared to cached queries; a hit returns the stored answer, a miss calls the model'>
  <rect class='d-box' x='16' y='52' width='96' height='46' rx='9'/><text class='d-text' x='64' y='72' text-anchor='middle'>query</text><text class='d-sub' x='64' y='89' text-anchor='middle'>embed</text>
  <line class='d-edge' x1='112' y1='75' x2='142' y2='75'/><polygon class='d-arrow' points='142,70 150,75 142,80'/>
  <rect class='d-box-accent' x='152' y='42' width='140' height='66' rx='10'/>
  <text class='d-text' x='222' y='66' text-anchor='middle'>similarity ≥ 0.95?</text>
  <text class='d-sub' x='222' y='86' text-anchor='middle'>vs cached query vectors</text>
  <line class='d-edge' x1='292' y1='60' x2='330' y2='44'/><polygon class='d-arrow' points='327,40 337,41 330,49'/>
  <line class='d-edge' x1='292' y1='90' x2='330' y2='106'/><polygon class='d-arrow' points='330,101 337,109 327,110'/>
  <text class='d-sub' x='305' y='42'>hit</text><text class='d-sub' x='305' y='116'>miss</text>
  <rect class='d-box-muted' x='340' y='22' width='104' height='40' rx='9'/><text class='d-sub' x='392' y='46' text-anchor='middle'>cached answer</text>
  <rect class='d-box' x='340' y='90' width='104' height='40' rx='9'/><text class='d-sub' x='392' y='114' text-anchor='middle'>LLM call + store</text>
</svg>

**How it works.** Unlike exact-match caching (which whiffs on any rewording), semantic caching matches meaning: "how do I reset my password" hits a cache entry created by "password reset steps?". The danger is **false positives**: "cancel my order" and "can I cancel my order?" embed nearly identically, but one is an action request and one is a policy question — serving the wrong cached answer is a correctness bug users notice. Safety rails: very **high thresholds** (0.95+, tuned on your traffic with a labeled paraphrase set); **scope keys** — cache per tenant, per prompt-version, per model, per user-locale, and never across personalized context; **TTLs** matched to content volatility; an **exclusion list** for intents that must always go live (account state, anything transactional); and log hits so mis-serves are auditable. Layer it: exact-match cache first (free wins), semantic second, model last. Measure the hit rate *and* the mis-serve rate — a 40% hit rate with 1% wrong answers is usually a bad trade.

### Safety checklist
| Rail | Why |
| --- | --- |
| Threshold 0.95+ (tuned) | paraphrase ≠ same intent |
| Key by tenant + prompt/model version | stale/wrong-audience answers |
| TTL by content volatility | prices, policies change |
| Exclude transactional intents | actions must never be cached |

> **Interview tip:** Lead with the risk, not the savings: **"similar wording does not imply identical intent"** — then give the rails. Distinguishing semantic caching from provider **prompt caching** (KV-cache reuse, exact prefix) is a frequent follow-up.`,
    examples: [
      {
        label: "Guarded semantic cache lookup",
        tech: "ts",
        runnable: false,
        code: `async function cachedAnswer(q: string, ctx: Ctx) {
  if (TRANSACTIONAL.test(q)) return llm(q, ctx);          // never cache these

  const key = { tenant: ctx.tenantId, promptV: PROMPT_VERSION, model: MODEL };
  const hit = await semCache.nearest(await embed(q), { where: key, minSim: 0.95 });
  if (hit && !expired(hit, ttlFor(hit.topic))) {
    metrics.increment("semcache.hit");
    return hit.answer;
  }
  const ans = await llm(q, ctx);
  await semCache.put({ ...key, query: q, answer: ans });
  return ans;
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How does function calling (tool use) work under the hood?",
    answer: `**TL;DR.** You send **tool definitions** (name, description, JSON-Schema params) with the conversation. The model **does not execute anything** — it returns a structured **tool-call message** (name + arguments); your code runs the function, appends the **result message**, and calls the model again until it answers in text. The model plans; **your runtime executes**.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Loop between model emitting tool calls and runtime executing them and returning results until a final text answer'>
  <rect class='d-box-accent' x='40' y='30' width='150' height='54' rx='10'/><text class='d-text' x='115' y='53' text-anchor='middle'>model</text><text class='d-sub' x='115' y='71' text-anchor='middle'>emits tool_use: name+args</text>
  <line class='d-edge' x1='190' y1='48' x2='270' y2='48'/><polygon class='d-arrow' points='270,43 280,48 270,53'/>
  <rect class='d-box' x='282' y='30' width='150' height='54' rx='10'/><text class='d-text' x='357' y='53' text-anchor='middle'>your runtime</text><text class='d-sub' x='357' y='71' text-anchor='middle'>validate · execute · authorize</text>
  <line class='d-edge' x1='357' y1='84' x2='357' y2='108'/>
  <line class='d-edge' x1='357' y1='108' x2='125 ' y2='108'/>
  <line class='d-edge' x1='115' y1='108' x2='115' y2='90'/><polygon class='d-arrow' points='110,92 115,84 120,92'/>
  <text class='d-sub' x='236' y='102' text-anchor='middle'>tool_result appended → model called again</text>
  <text class='d-sub' x='230' y='140' text-anchor='middle'>loop ends when the model replies with plain text (or a step/cost cap fires)</text>
</svg>

**How it works.** Tool definitions are injected into the model's context (they consume input tokens and are trained-format-specific); the model was post-trained to emit a special **structured block** when a tool would help. Key mechanics interviewers probe: the **stop reason** changes (e.g. <code>tool_use</code>) so your code knows to execute rather than display; multiple tool calls can arrive in one turn (execute in **parallel** when independent); arguments are model-generated so **validate them against the schema** before executing (constrained decoding helps syntax, not semantics — it can still pass a wrong-but-valid id); and results go back as **tool-result messages** tied to the call id, becoming context the model reads. Two design consequences: every loop iteration re-sends the growing conversation (put tool defs in the cacheable prefix), and <code>tool_choice</code> lets you force a specific tool — the standard trick for guaranteed-schema extraction.

### Responsibilities
| Model | Your runtime |
| --- | --- |
| decide if/which tool | validate arguments |
| generate arguments | authorize + execute |
| interpret results | handle errors, timeouts |
| final answer | enforce loop/cost caps |

> **Interview tip:** The one-liner that shows understanding: **"the model emits intents, never executes"**. Then mention parallel tool calls and argument validation — both are where naive implementations break.`,
    examples: [
      {
        label: "The canonical tool loop",
        tech: "ts",
        runnable: false,
        code: `let messages: Msg[] = [{ role: "user", content: task }];

for (let step = 0; step < MAX_STEPS; step++) {
  const res = await client.messages.create({ model, tools, messages, max_tokens: 1024 });
  if (res.stop_reason !== "tool_use") return textOf(res);       // done

  const calls = res.content.filter((b) => b.type === "tool_use");
  const results = await Promise.all(calls.map(async (c) => ({
    type: "tool_result", tool_use_id: c.id,
    content: await execValidated(c.name, c.input),               // schema-check first
  })));
  messages.push({ role: "assistant", content: res.content },
                 { role: "user", content: results });
}
throw new Error("step budget exhausted");`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you design good tool definitions for an LLM?",
    answer: `**TL;DR.** The model is your API consumer: **verb-object names**, descriptions that say **when to use (and not use)** the tool, **few well-typed parameters** (enums over free strings), and results/errors the model can act on. **Fewer, higher-level tools** beat many granular ones — wrong-tool selection is the top tool-use failure.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='A bad vague tool definition contrasted with a good one that has clear name, usage guidance and typed parameters'>
  <rect class='d-box-muted' x='16' y='24' width='206' height='104' rx='10'/>
  <text class='d-text' x='119' y='46' text-anchor='middle'>✘ hard to use</text>
  <text class='d-sub' x='119' y='68' text-anchor='middle'>name: doStuff</text>
  <text class='d-sub' x='119' y='86' text-anchor='middle'>desc: helper for data</text>
  <text class='d-sub' x='119' y='104' text-anchor='middle'>params: input (string)</text>
  <rect class='d-box-accent' x='238' y='24' width='206' height='104' rx='10'/>
  <text class='d-text' x='341' y='46' text-anchor='middle'>✔ self-explaining</text>
  <text class='d-sub' x='341' y='66' text-anchor='middle'>name: search_orders</text>
  <text class='d-sub' x='341' y='84' text-anchor='middle'>desc: find orders by customer/date.</text>
  <text class='d-sub' x='341' y='98' text-anchor='middle'>NOT for refunds → use create_refund</text>
  <text class='d-sub' x='341' y='114' text-anchor='middle'>params: status: enum[open,shipped...]</text>
</svg>

**How it works.** The definition **is** the interface the model reasons over — it sees text, not your codebase. **Names**: <code>search_orders</code>, <code>create_refund</code> — the model maps user intent to names first. **Descriptions** carry the routing logic: what it does, when to prefer it over sibling tools, constraints ("max 90-day range"), and one worked example if the input is subtle; this is prompt text, spend it wisely. **Parameters**: prefer enums, formats and defaults over free strings; every optional field is a decision you are delegating to the model — delegate few. Avoid overlapping tools (<code>get_user</code> + <code>fetch_account</code> + <code>lookup_profile</code> guarantees misrouting); collapse a 40-endpoint API into 5-8 **task-level** tools rather than mirroring REST. **Results** should be concise structured summaries (not 50KB JSON dumps — they flood context) and **errors must teach**: "date must be YYYY-MM-DD, got 3/2/25" lets the model self-correct; a bare 400 does not. Finally: eval tool selection like any behaviour — a labeled set of (request → expected tool + args).

### Definition checklist
| Element | Rule |
| --- | --- |
| Name | verb_object, unambiguous among siblings |
| Description | when to use, when NOT to, constraints |
| Params | few, typed, enums, defaults |
| Result | compact, structured, context-friendly |
| Error | states what to fix |

> **Interview tip:** Frame it as **API design where the consumer reads only the docs**: the killer details are anti-overlap ("when NOT to use") and actionable errors — both directly reduce loop failures.`,
    examples: [
      {
        label: "A well-shaped tool definition",
        tech: "ts",
        runnable: false,
        code: `{
  name: "search_orders",
  description:
    "Search a customer's orders by status and date range. Use for questions " +
    "about order history or delivery status. NOT for refunds (create_refund) " +
    "or catalog items (search_products). Max range: 90 days.",
  input_schema: {
    type: "object",
    properties: {
      customer_id: { type: "string", description: "UUID from the session context" },
      status: { type: "string", enum: ["open", "shipped", "delivered", "returned"] },
      from_date: { type: "string", format: "date" },
      to_date:   { type: "string", format: "date" },
    },
    required: ["customer_id"],
  },
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is an AI agent and how does the agent loop work?",
    answer: `**TL;DR.** An agent = **model + tools + loop**: the model repeatedly decides an action, the runtime executes it, the observation feeds back — until the goal is met or a **budget** stops it. Everything else in agent frameworks is elaboration on this loop.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Agent loop cycling through decide, act, observe with a termination check to final answer'>
  <rect class='d-box-accent' x='60' y='24' width='120' height='46' rx='10'/><text class='d-text' x='120' y='44' text-anchor='middle'>decide</text><text class='d-sub' x='120' y='60' text-anchor='middle'>model picks action</text>
  <line class='d-edge' x1='180' y1='47' x2='268' y2='47'/><polygon class='d-arrow' points='268,42 278,47 268,52'/>
  <rect class='d-box' x='280' y='24' width='120' height='46' rx='10'/><text class='d-text' x='340' y='44' text-anchor='middle'>act</text><text class='d-sub' x='340' y='60' text-anchor='middle'>runtime runs tool</text>
  <line class='d-edge' x1='340' y1='70' x2='340' y2='96'/><polygon class='d-arrow' points='335,96 340,104 345,96'/>
  <rect class='d-box' x='280' y='106' width='120' height='42' rx='10'/><text class='d-text' x='340' y='124' text-anchor='middle'>observe</text><text class='d-sub' x='340' y='140' text-anchor='middle'>result → context</text>
  <line class='d-edge' x1='280' y1='127' x2='120' y2='127'/>
  <line class='d-edge' x1='120' y1='127' x2='120' y2='78'/><polygon class='d-arrow' points='115,80 120,72 125,80'/>
  <text class='d-sub' x='195' y='120' text-anchor='middle'>loop (until done</text>
  <text class='d-sub' x='195' y='136' text-anchor='middle'>or budget cap)</text>
</svg>

**How it works.** Workflows chain LLM calls along a **predetermined** path; an agent decides its own path at runtime — use a workflow when steps are known (cheaper, more predictable), an agent when the route genuinely depends on intermediate findings. The engineering concerns that separate demos from production: **termination** — max steps, token/cost caps, wall-clock timeouts, and detection of unproductive loops (same tool + same args repeatedly); **state** — the transcript grows every iteration (compaction, scratch files, and cache-friendly prefix ordering keep it viable); **error recovery** — actionable tool errors let the model retry differently, while the runtime absorbs transient faults; **checkpointing** — long tasks should persist plan and progress so a crash or compaction does not restart from zero; and **observability** — full traces per step, since debugging agents is reading trajectories. A crisp mental model to quote: *the model chooses the next move; the harness makes choosing safe, bounded and resumable*.

### Workflow vs agent
| | Workflow | Agent |
| --- | --- | --- |
| Path | fixed by code | chosen at runtime |
| Cost/predictability | low/high | higher/lower |
| Fits | known pipelines | open-ended tasks |

> **Interview tip:** Define it minimally (**model + tools + loop**), contrast with workflows, then list your loop guards — step caps, cost caps, loop detection. Naming the guards is what marks production experience.`,
    examples: [
      {
        label: "Loop guards around the tool loop",
        tech: "ts",
        runnable: false,
        code: `const budget = { steps: 25, usd: 2.0, deadline: Date.now() + 120_000 };
const seen = new Set<string>();

while (true) {
  assertBudget(budget);                          // steps, cost, wall clock
  const action = await decide(messages);
  if (action.type === "final") return action.text;

  const sig = action.name + ":" + hash(action.input);
  if (seen.has(sig)) {
    messages.push(hint("You already tried this exact call. Change approach."));
    continue;                                    // loop detection
  }
  seen.add(sig);
  messages.push(await execute(action));
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the ReAct pattern and why did it become the default for agents?",
    answer: `**TL;DR.** **ReAct = Reason + Act**: the model alternates explicit **thoughts** ("user wants X, I should check Y") with **actions** (tool calls), feeding each **observation** back before the next thought. Verbalized reasoning improves action selection and makes trajectories **debuggable** — which is why the structure stuck.

<svg class='iq-diagram' viewBox='0 0 460 140' role='img' aria-label='ReAct alternates thought, action and observation in a repeating chain'>
  <rect class='d-box-accent' x='16' y='40' width='96' height='44' rx='9'/><text class='d-text' x='64' y='59' text-anchor='middle'>thought</text><text class='d-sub' x='64' y='76' text-anchor='middle'>plan next step</text>
  <line class='d-edge' x1='112' y1='62' x2='134' y2='62'/><polygon class='d-arrow' points='134,57 142,62 134,67'/>
  <rect class='d-box' x='144' y='40' width='96' height='44' rx='9'/><text class='d-text' x='192' y='59' text-anchor='middle'>action</text><text class='d-sub' x='192' y='76' text-anchor='middle'>tool call</text>
  <line class='d-edge' x1='240' y1='62' x2='262' y2='62'/><polygon class='d-arrow' points='262,57 270,62 262,67'/>
  <rect class='d-box' x='272' y='40' width='96' height='44' rx='9'/><text class='d-text' x='320' y='59' text-anchor='middle'>observation</text><text class='d-sub' x='320' y='76' text-anchor='middle'>result read</text>
  <path class='d-edge-dashed' d='M 320 84 L 320 112 L 64 112 L 64 84'/><polygon class='d-arrow' points='59,86 64,78 69,86'/>
  <text class='d-sub' x='192' y='126' text-anchor='middle'>repeat until the answer is grounded in observations</text>
</svg>

**How it works.** The 2022 insight: reasoning-only (CoT) hallucinates facts it cannot look up, and acting-only picks tools poorly with no plan; **interleaving** fixes both — thoughts ground the next action in the latest observation, and observations ground the next thought in reality. The debuggability dividend is huge in practice: when an agent misbehaves you read its thoughts and see *why* it chose the wrong tool (misread result? bad assumption? ambiguous tool description?) — that tells you what to fix. Today, native tool-calling APIs and **reasoning models** internalize much of the pattern (models deliberate in thinking tokens before emitting calls), so you rarely hand-roll Thought/Action/Observation text templates anymore; but the triad remains the mental model for **designing** loops (make observations feed decisions), **debugging** trajectories, and **evaluating** process quality (were the thoughts consistent with the observations?).

### Why each piece matters
| Piece | Failure without it |
| --- | --- |
| Thought | impulsive wrong-tool actions |
| Action | reasoning detached from reality |
| Observation fed back | plans based on stale assumptions |

> **Interview tip:** Give the two failure modes it fixed (reason-only hallucinates, act-only flails), then the modern caveat — **native tool use + thinking tokens internalized ReAct** — so you sound current, not stuck in 2023 tutorials.`,
    examples: [
      {
        label: "A ReAct trajectory (what you read when debugging)",
        tech: "bash",
        runnable: false,
        code: `Thought: The user asks for Q2 refunds for customer 811. I need order data first.
Action:  search_orders({ customer_id: "811", from_date: "2026-04-01",
                         to_date: "2026-06-30", status: "returned" })
Observation: 3 returned orders: #90312 ($120), #90417 ($60), #90583 ($75)

Thought: Refund totals come from the payments tool, not order totals.
Action:  get_refunds({ order_ids: ["90312", "90417", "90583"] })
Observation: refunds: 90312=$120, 90417=$60, 90583=$0 (pending)

Thought: Two completed refunds ($180), one pending. I can answer precisely.
Final:   "Q2 2026: $180 refunded across 2 orders; 1 refund ($75) still pending."`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the Model Context Protocol (MCP) and what problem does it solve?",
    answer: `**TL;DR.** MCP is an **open protocol** standardizing how AI apps connect to tools and data: a service ships **one MCP server** (exposing tools, resources, prompts) and **any MCP client** — Claude Desktop/Code, IDEs, custom agents — can use it. It kills the **N×M** custom-connector problem.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Without MCP every client needs a connector per service; with MCP clients and servers meet at one protocol'>
  <text class='d-text' x='110' y='30' text-anchor='middle'>before: N × M</text>
  <circle class='d-accent' cx='40' cy='60' r='5'/><circle class='d-accent' cx='40' cy='90' r='5'/><circle class='d-accent' cx='40' cy='120' r='5'/>
  <circle class='d-arrow' cx='180' cy='60' r='5'/><circle class='d-arrow' cx='180' cy='90' r='5'/><circle class='d-arrow' cx='180' cy='120' r='5'/>
  <line class='d-edge' x1='45' y1='60' x2='175' y2='60'/><line class='d-edge' x1='45' y1='60' x2='175' y2='90'/><line class='d-edge' x1='45' y1='60' x2='175' y2='120'/>
  <line class='d-edge' x1='45' y1='90' x2='175' y2='60'/><line class='d-edge' x1='45' y1='90' x2='175' y2='90'/><line class='d-edge' x1='45' y1='90' x2='175' y2='120'/>
  <line class='d-edge' x1='45' y1='120' x2='175' y2='60'/><line class='d-edge' x1='45' y1='120' x2='175' y2='90'/><line class='d-edge' x1='45' y1='120' x2='175' y2='120'/>
  <text class='d-text' x='345' y='30' text-anchor='middle'>with MCP: N + M</text>
  <circle class='d-accent' cx='270' cy='60' r='5'/><circle class='d-accent' cx='270' cy='90' r='5'/><circle class='d-accent' cx='270' cy='120' r='5'/>
  <rect class='d-box-accent' x='320' y='72' width='54' height='36' rx='8'/><text class='d-sub' x='347' y='94' text-anchor='middle'>MCP</text>
  <circle class='d-arrow' cx='425' cy='60' r='5'/><circle class='d-arrow' cx='425' cy='90' r='5'/><circle class='d-arrow' cx='425' cy='120' r='5'/>
  <line class='d-edge' x1='275' y1='60' x2='320' y2='84'/><line class='d-edge' x1='275' y1='90' x2='320' y2='90'/><line class='d-edge' x1='275' y1='120' x2='320' y2='96'/>
  <line class='d-edge' x1='374' y1='84' x2='420' y2='60'/><line class='d-edge' x1='374' y1='90' x2='420' y2='90'/><line class='d-edge' x1='374' y1='96' x2='420' y2='120'/>
</svg>

**How it works.** An **MCP server** is a small program exposing three primitives: **tools** (model-invokable functions — "create_ticket"), **resources** (readable data the app can load as context — files, tables, docs), and **prompts** (reusable parameterized templates). A **host application** runs an **MCP client** that connects over **stdio** (local process) or **HTTP** (remote), discovers capabilities at runtime, and surfaces them to the model. Crucial nuance: the **host mediates everything** — the model never talks to servers directly; the host decides which tools to expose, enforces permissions/approvals, and executes calls. Security follows: an MCP server is third-party code with credentials (supply-chain surface), and tool results are untrusted content (indirect prompt-injection vector) — treat both accordingly. Adopted across the ecosystem (Anthropic, OpenAI, IDEs), it turned integrations into an off-the-shelf catalog: point your agent at existing GitHub/Postgres/Slack servers instead of writing connectors.

### Primitives
| Primitive | Direction | Example |
| --- | --- | --- |
| Tool | model invokes | run_query(sql) |
| Resource | app loads as context | schema of a DB |
| Prompt | user/app applies | "review this PR" template |

> **Interview tip:** Frame it as **"N×M connectors → N+M via one protocol"**, name the three primitives, and add the security posture (servers are third-party code; results are untrusted input) — that last part separates users from engineers.`,
    examples: [
      {
        label: "Minimal MCP server (TypeScript SDK)",
        tech: "ts",
        runnable: false,
        code: `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "orders", version: "1.0.0" });

server.tool(
  "search_orders",
  "Search orders by customer and status.",
  { customerId: z.string(), status: z.enum(["open", "shipped", "returned"]) },
  async ({ customerId, status }) => ({
    content: [{ type: "text", text: JSON.stringify(await findOrders(customerId, status)) }],
  }),
);

await server.connect(new StdioServerTransport());
// any MCP client (Claude Code, IDE, custom host) can now discover + call it`,
      },
    ],
  },
];

export default augments;
