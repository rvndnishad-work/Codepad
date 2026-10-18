/**
 * AI ENGINEERING ULTRA — batch 08: structured output and tools (reliable JSON
 * output, runtime validation and repair, tool calling vs function calling vs
 * structured output, how tool use works under the hood, designing tool definitions).
 * Every example was run by scripts/verify-variant-examples.ts (node, python);
 * quoted output is that run's output.
 */
import type { AiUltraAugment } from "./ai-augments.types";

const augments: AiUltraAugment[] = [
  {
    title: `How do you get reliable structured JSON output from an LLM?`,
    difficulty: "medium",
    seoDescription: `The structured-output ladder: prompting, JSON mode, schema-constrained decoding and validation, with what each guarantees and a verified token-mask demo.`,
    description: `**Question presented to candidate:**
"Our ticket-triage feature asks the model for JSON and about one response in fifty breaks the parser or has a field we cannot use. Walk me through how you would make the model's structured output reliable, and what each technique actually guarantees."

**What a strong answer should cover:**
- The reliability ladder: prompt-only instructions guarantee nothing, JSON mode guarantees syntax only, schema-constrained output (OpenAI Structured Outputs with \`strict: true\`, Anthropic \`output_config.format\`, Gemini \`responseJsonSchema\`) guarantees the shape, and application validation is still needed for meaning
- The mechanism: constrained decoding masks every token that would break the schema before sampling, so invalid output cannot be produced; the schema is compiled to a grammar or automaton, which costs extra latency on the first request with a new schema
- What constrained decoding does not guarantee: refusals, output cut off by the token limit, values that are well-typed but wrong, and (in some providers) exact casing of enum values, so the code still checks the stop reason and validates
- Schema design for accuracy: flat and small, enums for closed sets, every field required with \`null\` for "unknown", clear field descriptions, a supported subset of JSON Schema per provider, and putting any short explanation field before the answer field rather than asking for hidden reasoning
- The trade-off: strict formats can lower answer quality on reasoning-heavy tasks, so a common pattern is to let the model think first and then emit the structured result, and to measure both validity and accuracy with evals

**Clarifying questions expected:**
- Which provider and model, and is it an API model or a self-hosted open-weight model (that decides whether native strict mode exists or we add a constrained-decoding engine)?
- Is the output an answer for our code (extraction, classification) or the arguments for an action (a tool call)?
- What happens downstream if a record is wrong: shown to a user, written to a database, or used to move money?

**Code / implementation expected:** Optional — a request with a JSON Schema plus a validator on the response, or a sketch of how token masking enforces a schema.`,
    answer: `**Target Audience:** Engineers whose LLM feature has to hand JSON to ordinary code (a parser, a database, an API) and who want it to stop breaking.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (the constrained-decoding simulation below). Provider API shapes were checked against the vendor docs and announcements cited inline, in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Imagine you hire a brilliant assistant who has never filled in a form. You ask them to fill in a paper form with two boxes: "sentiment" and "score from 1 to 5". They hand back a sheet that says "Sure! Sentiment: Positive, score: about 4.5. Hope this helps!" Every word is sensible. The form is unusable: the clerk who types it into the computer needs exactly the word \`positive\` in one box and a whole number in the other.

You have three ways to fix this. You can **ask more nicely** ("please only fill in the boxes"); the assistant mostly complies, but not always. You can give them a form with **printed boxes**, so whatever they write at least lands in boxes. Or you can give them a form where each box is a **set of tick-boxes**: \`positive / negative / neutral\` and \`1 2 3 4 5\`. Now they physically cannot write anything else.

Getting JSON from an LLM is the same story. A language model writes text one small piece at a time and has no built-in idea that your code will run \`JSON.parse\` on it. "Ask nicely" is prompting. "Printed boxes" is JSON mode. "Tick-boxes" is schema-constrained decoding. And even with tick-boxes, someone still has to check that the ticked answer is *true*, which is the job of validation.

## 2. The Reliability Ladder

There are four rungs, and each one guarantees strictly more than the one below it.

📌 **Interview term: structured output** — model output that must follow a machine-readable format, almost always JSON matching a JSON Schema, so that code (not a person) can consume it.

📌 **Interview term: JSON Schema** — a standard JSON vocabulary for describing the shape of JSON data: types, required properties, \`enum\` lists of allowed values, nested objects and arrays. It is the common language every provider accepts for describing what you want back.

<svg class="iq-diagram" width="100%" viewBox="0 0 860 250" role="img" aria-label="Four rungs of reliability from prompt only to JSON mode to schema constrained output to validation in your code">
  <defs>
    <marker id="ai08q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="150" width="170" height="80" rx="10"/>
  <text class="d-text" x="105" y="183" text-anchor="middle">prompt only</text>
  <text class="d-sub" x="105" y="207" text-anchor="middle">guarantees nothing</text>
  <rect class="d-box-muted" x="230" y="110" width="170" height="80" rx="10"/>
  <text class="d-text" x="315" y="143" text-anchor="middle">JSON mode</text>
  <text class="d-sub" x="315" y="167" text-anchor="middle">valid syntax</text>
  <rect class="d-box" x="440" y="70" width="180" height="80" rx="10"/>
  <text class="d-text" x="530" y="103" text-anchor="middle">strict schema</text>
  <text class="d-sub" x="530" y="127" text-anchor="middle">valid shape and types</text>
  <rect class="d-box-accent" x="660" y="30" width="180" height="80" rx="10"/>
  <text class="d-text" x="750" y="63" text-anchor="middle">plus validation</text>
  <text class="d-sub" x="750" y="87" text-anchor="middle">valid meaning</text>
  <path class="d-edge" d="M 194 175 L 226 160" marker-end="url(#ai08q1-arrow)"/>
  <path class="d-edge" d="M 404 135 L 436 120" marker-end="url(#ai08q1-arrow)"/>
  <path class="d-edge" d="M 624 95 L 656 80" marker-end="url(#ai08q1-arrow)"/>
</svg>

Read it left to right. Each rung keeps everything the previous one guaranteed and adds one more promise. Production systems that matter sit on the top two rungs together.

| Rung | What you do | What it guarantees | What can still go wrong |
| :--- | :--- | :--- | :--- |
| **Prompt only** | "Reply only with JSON like this example" | Nothing; the model usually complies | Chatty preamble, code fences, trailing commas, wrong keys, wrong types |
| **JSON mode** | OpenAI \`response_format: {"type": "json_object"}\` (DevDay announcement, November 2023) | The output parses as JSON | Missing or extra keys, \`"Positive"\` instead of \`positive\`, \`4.5\` instead of an integer |
| **Strict schema** | OpenAI Structured Outputs (\`json_schema\` + \`strict: true\`), Anthropic \`output_config.format\`, Gemini \`responseJsonSchema\` | The output matches your schema: required keys, types, enums | Well-typed but wrong values, refusals, output cut off at the token limit |
| **+ Validation** | Parse into Zod / Pydantic, check business rules, check the stop reason | The values make sense for your domain | Nothing structural; remaining errors are judgement errors, measured with evals |

OpenAI introduced JSON mode at DevDay (November 6, 2023) and described it as guaranteeing valid JSON, not a particular schema. Structured Outputs followed on August 6, 2024; OpenAI reported that \`gpt-4o-2024-08-06\` with Structured Outputs scored 100% on their complex-schema eval, against under 40% for \`gpt-4-0613\` with prompting alone (OpenAI, "Introducing Structured Outputs in the API"). That 100% is about shape on that eval set, not about the values being correct.

## 3. How Schema-Constrained Decoding Works

A model produces text one **token** (a word piece) at a time. At every step it computes a score for every token in its vocabulary, and the sampler picks one. Constrained decoding adds one step in between: before picking, it removes every token that would make the output impossible to finish as valid JSON for your schema.

📌 **Interview term: constrained decoding (grammar-constrained sampling)** — at each generation step, set the probability of every token that would violate the target grammar to zero, then renormalise and sample from what is left. The output is valid by construction, not by luck.

📌 **Interview term: logit mask** — the per-step list of allowed and forbidden tokens. "Logits" are the raw scores before they become probabilities; masking a token means setting its logit to minus infinity.

<svg class="iq-diagram" width="100%" viewBox="0 0 860 300" role="img" aria-label="At one step the model proposes three tokens, the schema mask removes two that break the enum, and the sampler picks the only allowed token">
  <defs>
    <marker id="ai08q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="100" width="200" height="90" rx="10"/>
  <text class="d-text" x="120" y="135" text-anchor="middle">text so far</text>
  <text class="d-sub" x="120" y="162" text-anchor="middle">sentiment key written</text>
  <rect class="d-box" x="300" y="20" width="230" height="60" rx="10"/>
  <text class="d-text" x="415" y="56" text-anchor="middle">Positive  p 0.50</text>
  <rect class="d-box-accent" x="300" y="115" width="230" height="60" rx="10"/>
  <text class="d-text" x="415" y="151" text-anchor="middle">positive  p 0.40</text>
  <rect class="d-box" x="300" y="210" width="230" height="60" rx="10"/>
  <text class="d-text" x="415" y="246" text-anchor="middle">mixed  p 0.10</text>
  <rect class="d-box-accent" x="620" y="100" width="220" height="90" rx="10"/>
  <text class="d-text" x="730" y="135" text-anchor="middle">picked: positive</text>
  <text class="d-sub" x="730" y="162" text-anchor="middle">renormalised p 1.00</text>
  <path class="d-edge-dashed" d="M 224 135 L 294 55"/>
  <path class="d-edge-accent" d="M 224 145 L 294 145" marker-end="url(#ai08q1-arrow2)"/>
  <path class="d-edge-dashed" d="M 224 155 L 294 235"/>
  <path class="d-edge-accent" d="M 534 145 L 614 145" marker-end="url(#ai08q1-arrow2)"/>
</svg>

The dashed candidates are masked because the schema says \`sentiment\` is one of \`positive\`, \`negative\`, \`neutral\`. Only the solid path survives, and the sampler takes it even though the model preferred \`Positive\`.

Three engineering facts follow from this mechanism:

- **The schema is compiled first.** The engine turns your JSON Schema into a grammar or automaton that can answer "which tokens are legal now?" quickly. Anthropic documents that the first request with a new schema has extra latency while the grammar compiles, and that compiled grammars are cached for 24 hours from last use (Claude docs, "Structured outputs", checked October 2026). OpenAI staff gave the same reason for strict mode not being the default at launch: a new schema needs preprocessing (quoted by Simon Willison, August 6, 2024).
- **Only a subset of JSON Schema is supported.** A rule is only enforceable if it can be turned into a token mask. Anthropic lists \`minimum\`, \`maximum\`, \`minLength\`, \`maxLength\` and recursive schemas as unsupported and returns a 400 if you use them; its SDK helpers strip such constraints from the sent schema and check them locally instead (Claude docs, October 2026). OpenAI strict mode requires \`additionalProperties: false\` and every property listed in \`required\` (OpenAI docs and the August 2024 launch coverage). Each provider has its own list, so check it.
- **The engine can live in the API or in your server.** With an API model, the provider runs it. With a self-hosted open-weight model you add an engine yourself: Outlines (Willard and Louf, arXiv 2307.09702), XGrammar (arXiv 2411.15100) and llguidance are the common ones, and serving stacks such as vLLM integrate them. Which engine is the default in which vLLM release changes often; secondary sources disagree, so check the version you deploy.

## 4. What Constrained Decoding Does Not Guarantee

This is the part interviewers listen for. Strict mode removes syntax and shape errors. It does not remove these:

1. **Refusals.** If the model declines the request, the reply is a refusal, not your object. OpenAI's launch post introduced a separate \`refusal\` field on the message for this; Anthropic returns \`stop_reason: "refusal"\` and notes the output may not match the schema in that case (Claude docs). Check for it before parsing.
2. **Truncation.** If generation stops at the token limit (\`stop_reason: "max_tokens"\` on Anthropic, a length-limit finish or incomplete status on OpenAI), the JSON is cut off mid-way. The mask guaranteed every prefix was valid, not that the model finished. The fix is a larger limit and a check of the stop reason, never "close the brackets and hope"; [How do you validate and repair structured LLM output at runtime?](/interview-question/how-do-you-validate-and-repair-structured-llm-output-at-runtime) shows why, and covers the whole repair layer.
3. **Wrong but well-typed values.** \`{"customer_id": "C-1042"}\` is perfectly valid and may not exist. A date can be well-formed and in the wrong year. That is what application validation catches.
4. **Forced values the model did not mean.** In the run below the model wanted to say \`4.5\`; the schema only allowed integers, so the mask pushed it to \`4\`. The output is valid and has silently lost information. If half-points are real in your domain, the schema is wrong, not the model.
5. **Small provider quirks.** Anthropic documents that structured outputs do not guarantee the capitalisation of \`enum\` and \`const\` string values and recommends comparing them case-insensitively (Claude docs, October 2026). Read the "limitations" section of whichever provider you use.

📌 **Interview term: syntactic vs semantic validity** — syntactic validity means the output parses and has the right shape; semantic validity means the values are true and usable in your domain. Constrained decoding gives you the first; only your code and evals give you the second.

## 5. Designing a Schema the Model Fills in Well

The schema is not just a contract for your parser. The model reads it (names, descriptions, enum values) as part of its instructions, so a schema is also a prompt.

- **Flat and small beats deep and clever.** Every nesting level and every optional field is one more decision for the model. Ask for what the next step of your code needs, not everything that could be extracted.
- **Enums for closed sets.** \`"enum": ["positive", "negative", "neutral"]\` is far more reliable than a free string with "should be one of" in the description.
- **Required plus null instead of optional.** OpenAI strict mode requires every field to be listed in \`required\`; the way to say "may be unknown" is a union with \`null\` (for example \`"type": ["string", "null"]\`), as OpenAI's guide and third-party write-ups of it describe. This is also better design: the model must decide "unknown" explicitly instead of silently omitting a key.
- **Describe every field.** \`"description": "ISO 4217 currency code of the invoice total, e.g. EUR"\` removes a whole class of errors.
- **Order matters.** Models write keys in order, so a short \`evidence\` or \`explanation\` field placed *before* the \`label\` field lets the model commit to its supporting facts first. Two cautions: Anthropic documents that required properties are emitted first and optional ones after, so the order you see is not always the order you wrote; and Anthropic warns that a field asking for the model's step-by-step reasoning may trigger a \`reasoning_extraction\` refusal, so ask for a short explanation or evidence, not "your reasoning" (Claude docs, October 2026).
- **Do not over-constrain hard tasks.** Tam et al., "Let Me Speak Freely?" (arXiv 2408.02442, EMNLP 2024 Industry) found that strict format restrictions, JSON mode in particular, lowered accuracy on reasoning tasks while helping classification tasks. A common fix is two steps: let the model reason in free text (or use a reasoning model whose thinking is separate), then produce the structured result.

## 6. What the Calls Look Like

The same extraction in three APIs (not run here; shapes checked against each vendor's docs in October 2026). The schema is identical; only where it goes differs.

~~~python
# OpenAI, Responses API: the Python SDK parses into a Pydantic model
from pydantic import BaseModel
from typing import Literal
from openai import OpenAI

class Triage(BaseModel):
    sentiment: Literal["positive", "negative", "neutral"]
    score: int

client = OpenAI()
resp = client.responses.parse(model="<model>", input="Classify: ...", text_format=Triage)
triage = resp.output_parsed          # a Triage instance (None if the model refused)
~~~

~~~python
# Anthropic: output_config.format with a raw JSON Schema
response = client.messages.create(
    model="<model>", max_tokens=1024,
    messages=[{"role": "user", "content": "Classify: ..."}],
    output_config={"format": {"type": "json_schema", "schema": {
        "type": "object",
        "properties": {"sentiment": {"type": "string", "enum": ["positive", "negative", "neutral"]},
                       "score": {"type": "integer"}},
        "required": ["sentiment", "score"], "additionalProperties": False}}},
)
if response.stop_reason in ("refusal", "max_tokens"):
    ...                                # not a usable object: handle before parsing
~~~

The Anthropic SDK also offers \`client.messages.parse(..., output_format=PydanticModel)\` returning \`response.parsed_output\`. Its structured outputs launched in public beta in November 2025 under the beta header \`structured-outputs-2025-11-13\` with an \`output_format\` parameter; the current docs name it \`output_config.format\` and say the old name keeps working for a transition period (Claude docs, October 2026). Google moved Gemini to JSON Schema via \`response_mime_type: "application/json"\` plus \`response_json_schema\`, and announced on November 5, 2025 that this covers all actively supported Gemini models (Google developers blog, "Improving Structured Outputs in the Gemini API").

Before native structured outputs existed, the standard trick was to define a tool whose parameters are your schema and force the model to call it. That still works and is explained in [How does function calling (tool use) work under the hood?](/interview-question/how-does-function-calling-tool-use-work-under-the-hood). How "function calling", "tool calling" and "structured output" relate is its own question: [Tool calling vs function calling vs structured output — what changed in 2025?](/interview-question/tool-calling-vs-function-calling-vs-structured-output-what-changed-in-2025)

## 7. Verified: Running the Code

The example **"Toy constrained decoder: prompt-only vs JSON mode vs strict schema"** builds a tiny language model as a bigram table (the probability of each next token given the previous one), deliberately prone to the classic mistakes: a chatty preamble, a capitalised label, a decimal score, a trailing comma, a sign-off. It lists every output that model can produce (80 of them), marks which are valid JSON objects and which match the schema, and then decodes greedily three times with a different mask. The mask rule is exactly the real one: a token is allowed if at least one valid complete output starts with the text so far plus that token. A real engine computes the same answer from a compiled automaton instead of a list, because real languages are infinite.

The schema: \`sentiment\` is one of \`positive\`, \`negative\`, \`neutral\` and \`score\` is an integer from 1 to 5, both required.

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
possible outputs: 80 | parse as a JSON object: 12 | match the schema: 1

== prompt only (greedy, temperature 0)
  output : Sure! {"sentiment": "Positive", "score": 4.5,} Hope this helps!
  parse  : FAILS

== JSON mode (greedy, temperature 0)
  masked [Sure! ] (0.55) -> picked [{] (1.000 after renormalising)
  masked [,] (0.55) -> picked [}] (1.000 after renormalising)
  masked [ Hope this helps!] (0.55) -> picked [<eos>] (1.000 after renormalising)
  output : {"sentiment": "Positive", "score": 4.5}
  parse  : ok
  schema : sentiment "Positive" not in enum; score 4.5 is not an integer 1-5

== JSON Schema (strict) (greedy, temperature 0)
  masked [Sure! ] (0.55) -> picked [{] (1.000 after renormalising)
  masked ["score": ] (0.10) -> picked ["sentiment": ] (1.000 after renormalising)
  masked ["Positive"] (0.50), ["mixed"] (0.10) -> picked ["positive"] (1.000 after renormalising)
  masked [4.5] (0.50), ["five"] (0.05) -> picked [4] (1.000 after renormalising)
  masked [,] (0.55) -> picked [}] (1.000 after renormalising)
  masked [ Hope this helps!] (0.55) -> picked [<eos>] (1.000 after renormalising)
  output : {"sentiment": "positive", "score": 4}
  parse  : ok
  schema : ok

== sampling instead of greedy: P(output matches schema)
  prompt only           0.0148  expected attempts with retry-until-valid: 67.7
  JSON mode             0.1620  expected attempts with retry-until-valid: 6.2
  JSON Schema (strict)  1.0000  expected attempts with retry-until-valid: 1.0
~~~

What the run shows:

- **Prompt only** produced the classic failure: a preamble, a trailing comma and a sign-off. Even "extract what is between the braces" would fail here, because of the trailing comma.
- **JSON mode** masked three tokens and the output parses, but it fails the schema twice: wrong casing and a non-integer.
- **Strict schema** masked tokens at six steps and the output is valid. Note the fourth masked step: the model's favourite was \`4.5\`; the mask forced \`4\`. Valid, and the half-point is gone.
- **The sampling numbers** answer "why not just retry until it parses?". For this deliberately sloppy toy, prompt-only output matches the schema 1.48% of the time (about 68 attempts on average), JSON mode 16.2%, strict 100%. A frontier model starts far higher than the toy, but at a million requests a day even 99.5% means 5,000 failures, each one a retry that costs a full model call.

## Edge Cases Worth Knowing

- **Streaming.** With strict output you can stream, but each chunk is a fragment of JSON; parse incrementally with a partial-JSON parser or wait for the end. See [How does streaming work in LLM APIs and why does it matter for UX?](/interview-question/how-does-streaming-work-in-llm-apis-and-why-does-it-matter-for-ux)
- **Very large or recursive schemas** can be rejected or slow to compile; Anthropic documents compile limits (for example, at most 20 strict tools per request) and returns "Schema is too complex for compilation" when exceeded (Claude docs, October 2026). Split the task or simplify the schema.
- **Arrays of unknown length.** "Extract all line items" is fine for the mask, but the token limit still applies; a long document can truncate the array. Check the stop reason and size the limit for the worst case.
- **Gateway and wrapper libraries** sometimes silently drop \`strict\` for providers that do not support it, turning a guarantee into best effort. Confirm what reaches the provider.
- **Old JSON mode quirks.** OpenAI JSON mode required the word "JSON" to appear somewhere in the prompt (third-party docs of the November 2023 release); copy-pasted legacy code often still carries that instruction.

## Common Pitfalls

- **Treating "valid JSON" as "correct data".** Strict mode fixes shape; a valid object can still reference an order that does not exist. Always validate values.
- **Parsing without checking the stop reason.** A refusal or a \`max_tokens\` cut-off reaches your parser looking like a broken object. Branch on the stop reason first.
- **Regex-extracting JSON from prose** when the provider has a structured mode. It fails on nested braces, code fences and trailing commas, and it hides the real problem.
- **A schema that cannot hold the truth.** Forcing an integer where the source says 4.5, or an enum with no \`other\` or \`unknown\`, makes the mask invent an answer. Design the schema so the honest answer is expressible.
- **Asking for long hidden reasoning inside the JSON.** It costs tokens, may trigger refusals with some providers, and is hard to parse; ask for a short \`evidence\` field or use a reasoning model.
- **Keeping two sources of truth.** Hand-written JSON Schema next to a separate TypeScript type drifts. Define the schema once in Zod or Pydantic and generate the JSON Schema from it (Zod 4 has \`z.toJSONSchema()\`; Pydantic has \`model_json_schema()\`).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame it as a ladder:</strong> <span style="color:#f0e2c8;">Prompt-only instructions guarantee nothing, <strong style="color:#ffca28;">JSON mode</strong> guarantees the output parses, <strong style="color:#ffca28;">schema-constrained output</strong> guarantees the shape, and my own validation guarantees the values make sense. I climb to the top two rungs for anything code depends on.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Name the mechanism:</strong> <span style="color:#f0e2c8;">Strict mode is <strong style="color:#ffca28;">constrained decoding</strong>: the schema is compiled into a grammar, and at every step the tokens that would break it are masked to zero probability before sampling. Invalid output cannot be produced, at the price of a compile step for a new schema and a supported subset of JSON Schema.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Say what it does not fix:</strong> <span style="color:#f0e2c8;">It does not stop a <strong style="color:#ffca28;">refusal</strong>, it does not stop truncation at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_tokens</code>, and it does not make values true: a well-formed customer id can still not exist. So I check the stop reason first, then validate with Zod or Pydantic plus business rules.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Design the schema as a prompt:</strong> <span style="color:#f0e2c8;">Flat and small, enums for closed sets, every field required with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> for unknown, a description on each field, and a short <em style="color:#f0e2c8;">evidence</em> field before the label. And the schema must be able to hold the honest answer, otherwise the mask forces a wrong one: in my toy run the model wanted <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">4.5</code> and an integer schema forced <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">4</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close with measurement:</strong> <span style="color:#f0e2c8;">Strict formats can hurt reasoning-heavy tasks, so for hard tasks I let the model think first and emit the object second. I track validity rate and accuracy separately in evals, because 100% valid JSON says nothing about correct JSON.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If strict mode guarantees the schema, why keep a validator?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it only guarantees shape. Refusals and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_tokens</code> cut-offs still reach you, providers support only part of JSON Schema (Anthropic strips <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">minimum</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">maxLength</code> from the sent schema and checks them client-side), and semantic rules like <em style="color:#d8d8d8;">total equals the sum of line items</em> or <em style="color:#d8d8d8;">this id exists</em> are never in the schema. The validator is where those live.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between JSON mode and structured outputs?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">JSON mode constrains the output to valid JSON of any shape. Structured outputs constrain it to <em style="color:#d8d8d8;">your</em> JSON Schema: required keys present, no extra keys, types and enums respected. In my toy run JSON mode produced parseable JSON that still failed the schema twice.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you do this with a self-hosted open-weight model?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Add a constrained-decoding engine to the serving stack: Outlines, XGrammar or llguidance, which servers such as vLLM integrate. They do the same thing the API providers do, compiling the schema to an automaton and masking logits per token. Without one, I am back to prompting plus validate-and-retry.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does forcing JSON make the model dumber?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It can on reasoning tasks. The <em style="color:#d8d8d8;">Let Me Speak Freely?</em> paper (EMNLP 2024 Industry) found strict format restrictions lowered reasoning accuracy while helping classification. So for hard tasks I separate thinking from formatting: free-text or built-in reasoning first, then a small strict object, and I measure accuracy, not only validity.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you represent an optional field in strict mode?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With OpenAI strict mode every property must be in <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">required</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">additionalProperties</code> must be false, so an optional field becomes required with a type like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">["string", "null"]</code>. That is better design anyway: the model has to say <em style="color:#d8d8d8;">unknown</em> explicitly instead of silently leaving a key out.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Structured output | Model output that must follow a machine-readable format, usually JSON matching a schema |
| JSON Schema | Standard JSON vocabulary for describing data shape: types, required keys, enums, nesting |
| Constrained decoding | Zeroing the probability of grammar-violating tokens at each step so output is valid by construction |
| Logit mask | The per-step set of allowed and forbidden tokens applied before sampling |
| Syntactic vs semantic validity | Parses with the right shape, versus values that are true and usable |

**Conclusion:** Reliable structured output is a ladder. Prompting alone guarantees nothing, JSON mode guarantees syntax, and schema-constrained decoding guarantees shape by masking every token that would break the schema, at the cost of a compile step and a supported subset of JSON Schema. Above that rung the remaining failures are refusals, truncation and values that are well-typed but wrong, so production code checks the stop reason, validates the parsed object against business rules, and designs a schema in which the honest answer can be expressed. Say that sequence, mention the 4.5-becomes-4 trap, and you have shown you understand both the mechanism and its limit.`,
    examples: [
      {
        label: `Toy constrained decoder: prompt-only vs JSON mode vs strict schema`,
        variants: [
          { tech: "node", code: `// Constrained decoding on a toy model: prompt-only vs JSON mode vs schema mode.
// The "model" is a bigram table P(next token | previous token). Real engines
// compile the schema into an automaton; this language is small enough to list.
const MODEL = {
  "<s>": [["Sure! ", 0.55], ["{", 0.45]],
  "Sure! ": [["{", 1.0]],
  "{": [['"sentiment": ', 0.9], ['"score": ', 0.1]],
  '"sentiment": ': [['"Positive"', 0.5], ['"positive"', 0.4], ['"mixed"', 0.1]],
  '"Positive"': [[", ", 1.0]],
  '"positive"': [[", ", 1.0]],
  '"mixed"': [[", ", 1.0]],
  ", ": [['"score": ', 1.0]],
  '"score": ': [["4.5", 0.5], ["4", 0.45], ['"five"', 0.05]],
  "4.5": [[",", 0.55], ["}", 0.45]],
  "4": [[",", 0.55], ["}", 0.45]],
  '"five"': [["}", 1.0]],
  ",": [["}", 1.0]],
  "}": [[" Hope this helps!", 0.55], ["<eos>", 0.45]],
  " Hope this helps!": [["<eos>", 1.0]],
};
const ENUM = ["positive", "negative", "neutral"];

function parse(text) {
  try { return { ok: true, value: JSON.parse(text) }; } catch { return { ok: false }; }
}
function schemaErrors(v) {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return ["root is not an object"];
  const e = [];
  for (const k of ["sentiment", "score"]) if (!(k in v)) e.push(\`missing "\${k}"\`);
  if ("sentiment" in v && !ENUM.includes(v.sentiment)) e.push(\`sentiment \${JSON.stringify(v.sentiment)} not in enum\`);
  if ("score" in v && !(Number.isInteger(v.score) && v.score >= 1 && v.score <= 5))
    e.push(\`score \${JSON.stringify(v.score)} is not an integer 1-5\`);
  return e;
}
const textOf = (path) => path.join("");
const isJson = (path) => { const r = parse(textOf(path)); return r.ok && typeof r.value === "object" && r.value !== null && !Array.isArray(r.value); };
const isSchema = (path) => isJson(path) && schemaErrors(parse(textOf(path)).value).length === 0;

// Every complete output the model can produce (the whole "language").
function allPaths(last = "<s>", acc = []) {
  if (last === "<eos>") return [acc];
  return MODEL[last].flatMap(([t]) => allPaths(t, t === "<eos>" ? acc : [...acc, t]));
}
const PATHS = allPaths();
const MODES = { "prompt only": () => true, "JSON mode": isJson, "JSON Schema (strict)": isSchema };

// The mask: token t is allowed after prefix if some valid output starts with prefix + t.
function allowed(prefix, valid, t) {
  const want = t === "<eos>" ? prefix : [...prefix, t];
  return PATHS.some((p) => valid(p) && (t === "<eos>" ? p.length === want.length : p.length >= want.length) &&
    want.every((x, i) => p[i] === x));
}
function decode(valid) {
  const out = [], notes = [];
  let last = "<s>";
  while (last !== "<eos>") {
    const cands = MODEL[last];
    const ok = cands.filter(([t]) => allowed(out, valid, t));
    const total = ok.reduce((s, [, p]) => s + p, 0);
    const [pick, p] = ok.reduce((a, b) => (b[1] > a[1] ? b : a));
    if (ok.length < cands.length) {
      const masked = cands.filter((c) => !ok.includes(c)).map(([t, q]) => \`[\${t}] (\${q.toFixed(2)})\`);
      notes.push(\`masked \${masked.join(", ")} -> picked [\${pick}] (\${(p / total).toFixed(3)} after renormalising)\`);
    }
    if (pick !== "<eos>") out.push(pick);
    last = pick;
  }
  return { out, notes };
}
// Probability that SAMPLING (not greedy) in a mode yields a schema-valid object.
function sampleProb(valid, goal) {
  let sum = 0;
  for (const p of PATHS.filter(valid)) {
    if (!goal(p)) continue;
    let prob = 1, last = "<s>", prefix = [];
    for (const t of [...p, "<eos>"]) {
      const ok = MODEL[last].filter(([x]) => allowed(prefix, valid, x));
      prob *= ok.find(([x]) => x === t)[1] / ok.reduce((s, [, q]) => s + q, 0);
      if (t !== "<eos>") prefix = [...prefix, t];
      last = t;
    }
    sum += prob;
  }
  return sum;
}

console.log(\`possible outputs: \${PATHS.length} | parse as a JSON object: \${PATHS.filter(isJson).length} | match the schema: \${PATHS.filter(isSchema).length}\`);
for (const [name, valid] of Object.entries(MODES)) {
  const { out, notes } = decode(valid);
  const text = textOf(out), r = parse(text);
  console.log(\`\\n== \${name} (greedy, temperature 0)\`);
  for (const n of notes) console.log(\`  \${n}\`);
  console.log(\`  output : \${text}\`);
  console.log(\`  parse  : \${r.ok ? "ok" : "FAILS"}\`);
  if (r.ok) { const e = schemaErrors(r.value); console.log(\`  schema : \${e.length ? e.join("; ") : "ok"}\`); }
}
console.log("\\n== sampling instead of greedy: P(output matches schema)");
for (const [name, valid] of Object.entries(MODES)) {
  const p = sampleProb(valid, isSchema);
  console.log(\`  \${name.padEnd(21)} \${p.toFixed(4)}  expected attempts with retry-until-valid: \${p > 0 ? (1 / p).toFixed(1) : "never"}\`);
}` },
          { tech: "python", code: `# Constrained decoding on a toy model: prompt-only vs JSON mode vs schema mode.
# The "model" is a bigram table P(next token | previous token). Real engines
# compile the schema into an automaton; this language is small enough to list.
import json

MODEL = {
    "<s>": [("Sure! ", 0.55), ("{", 0.45)],
    "Sure! ": [("{", 1.0)],
    "{": [('"sentiment": ', 0.9), ('"score": ', 0.1)],
    '"sentiment": ': [('"Positive"', 0.5), ('"positive"', 0.4), ('"mixed"', 0.1)],
    '"Positive"': [(", ", 1.0)],
    '"positive"': [(", ", 1.0)],
    '"mixed"': [(", ", 1.0)],
    ", ": [('"score": ', 1.0)],
    '"score": ': [("4.5", 0.5), ("4", 0.45), ('"five"', 0.05)],
    "4.5": [(",", 0.55), ("}", 0.45)],
    "4": [(",", 0.55), ("}", 0.45)],
    '"five"': [("}", 1.0)],
    ",": [("}", 1.0)],
    "}": [(" Hope this helps!", 0.55), ("<eos>", 0.45)],
    " Hope this helps!": [("<eos>", 1.0)],
}
ENUM = ["positive", "negative", "neutral"]


def parse(text):
    try:
        return True, json.loads(text)
    except ValueError:
        return False, None


def schema_errors(v):
    if not isinstance(v, dict):
        return ["root is not an object"]
    e = []
    for k in ("sentiment", "score"):
        if k not in v:
            e.append(f'missing "{k}"')
    if "sentiment" in v and v["sentiment"] not in ENUM:
        e.append(f"sentiment {json.dumps(v['sentiment'])} not in enum")
    if "score" in v:
        s = v["score"]
        if not (isinstance(s, int) and not isinstance(s, bool) and 1 <= s <= 5):
            e.append(f"score {json.dumps(s)} is not an integer 1-5")
    return e


def text_of(path):
    return "".join(path)


def is_json(path):
    ok, v = parse(text_of(path))
    return ok and isinstance(v, dict)


def is_schema(path):
    return is_json(path) and not schema_errors(parse(text_of(path))[1])


# Every complete output the model can produce (the whole "language").
def all_paths(last="<s>", acc=()):
    if last == "<eos>":
        return [list(acc)]
    out = []
    for t, _ in MODEL[last]:
        out += all_paths(t, acc if t == "<eos>" else acc + (t,))
    return out


PATHS = all_paths()
MODES = {"prompt only": lambda p: True, "JSON mode": is_json, "JSON Schema (strict)": is_schema}


# The mask: token t is allowed after prefix if some valid output starts with prefix + t.
def allowed(prefix, valid, t):
    want = prefix if t == "<eos>" else prefix + [t]
    for p in PATHS:
        if not valid(p):
            continue
        if (len(p) == len(want)) if t == "<eos>" else (len(p) >= len(want)):
            if p[: len(want)] == want:
                return True
    return False


def decode(valid):
    out, notes, last = [], [], "<s>"
    while last != "<eos>":
        cands = MODEL[last]
        ok = [c for c in cands if allowed(out, valid, c[0])]
        total = sum(p for _, p in ok)
        pick, p = ok[0]
        for c in ok[1:]:
            if c[1] > p:
                pick, p = c
        if len(ok) < len(cands):
            masked = [f"[{t}] ({q:.2f})" for t, q in cands if (t, q) not in ok]
            notes.append(f"masked {', '.join(masked)} -> picked [{pick}] ({p / total:.3f} after renormalising)")
        if pick != "<eos>":
            out.append(pick)
        last = pick
    return out, notes


# Probability that SAMPLING (not greedy) in a mode yields a schema-valid object.
def sample_prob(valid, goal):
    total_p = 0.0
    for path in PATHS:
        if not valid(path) or not goal(path):
            continue
        prob, last, prefix = 1.0, "<s>", []
        for t in path + ["<eos>"]:
            ok = [c for c in MODEL[last] if allowed(prefix, valid, c[0])]
            prob *= dict(ok)[t] / sum(q for _, q in ok)
            if t != "<eos>":
                prefix = prefix + [t]
            last = t
        total_p += prob
    return total_p


print(f"possible outputs: {len(PATHS)} | parse as a JSON object: {sum(map(is_json, PATHS))} | match the schema: {sum(map(is_schema, PATHS))}")
for name, valid in MODES.items():
    out, notes = decode(valid)
    text = text_of(out)
    ok, v = parse(text)
    print(f"\\n== {name} (greedy, temperature 0)")
    for n in notes:
        print(f"  {n}")
    print(f"  output : {text}")
    print(f"  parse  : {'ok' if ok else 'FAILS'}")
    if ok:
        e = schema_errors(v)
        print(f"  schema : {'; '.join(e) if e else 'ok'}")
print("\\n== sampling instead of greedy: P(output matches schema)")
for name, valid in MODES.items():
    p = sample_prob(valid, is_schema)
    attempts = f"{1 / p:.1f}" if p > 0 else "never"
    print(f"  {name:<21} {p:.4f}  expected attempts with retry-until-valid: {attempts}")` },
        ],
      },
    ],
  },
  {
    title: `How do you validate and repair structured LLM output at runtime?`,
    difficulty: "hard",
    seoDescription: `Layered validation of LLM JSON (stop reason, schema, semantic, referential), safe local repair, bounded re-asks, fallbacks and repair-rate metrics.`,
    description: `**Question presented to candidate:**
"We extract invoices with an LLM and write them straight into our billing database. Even with strict JSON output we occasionally store a total that does not add up or a customer id that does not exist. Design the runtime layer that validates the model's output and repairs it, and tell me when you would stop trying."

**What a strong answer should cover:**
- Layers of validation in order: stop reason (refusal, \`max_tokens\` truncation), parse, schema (types, enums, required keys), semantic rules (cross-field arithmetic, ranges, dates) and referential checks (does this id exist, does this user own it)
- A repair ladder from cheap to expensive: deterministic local fixes that never invent values (strip code fences, trailing commas), then a re-ask that sends the previous output plus precise, path-named errors, then a deterministic fallback (review queue, safe default, partial result flagged)
- Bounding: one or two re-asks at most, because a value the model cannot know (a missing id) will only be re-invented; never accept on timeout and never auto-close truncated JSON
- Treating the output as untrusted input: validation is also a security boundary, since injected content can steer field values
- Metrics: first-pass validity, repair rate, fallback rate and errors per field, used both to fix the schema or prompt and as an early drift alarm after a model or prompt change

**Clarifying questions expected:**
- Does the provider support strict schema output for this model, so shape errors are already gone and the layer can focus on meaning?
- What is the cost of a wrong record compared with a delayed one (that sets how quickly we fall back to a human)?
- Can the model be given the lookup it needs (for example a customer-search tool) instead of being asked to recall ids?

**Code / implementation expected:** Yes — a validate-then-repair loop with a retry bound and a fallback, using Zod, Pydantic or hand-written checks.`,
    answer: `**Target Audience:** Engineers putting LLM output into systems of record (databases, billing, tickets) who need a runtime layer that catches bad output and fixes what can be fixed.
**Difficulty:** Hard
**Verified with:** Node 22.22.0 and Python 3.12.3 (two programs: the validate-repair-fallback pipeline and the truncation demo). Library and provider behaviour is cited inline with the source, checked October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the examples; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A bank does not trust a cheque because it is printed on the right paper. A clerk checks it in layers. Is it a cheque at all, or a torn half? Are all the boxes filled? Do the amount in words and the amount in figures agree? Does the account exist, and does it have the money? Each layer catches a different kind of problem, and each has a different fix: a smudged date can be read by the clerk, a mismatched amount goes back to the customer to rewrite, and a cheque from an account that does not exist is never "fixed" by asking again; it goes to a supervisor.

Your LLM output deserves the same treatment. Getting the model to produce schema-shaped JSON is covered in [How do you get reliable structured JSON output from an LLM?](/interview-question/how-do-you-get-reliable-structured-json-output-from-an-llm). This question starts where that one ends: the JSON has arrived, and some of it is still wrong. The runtime layer decides, for each record, *accept, repair, or refuse*, and it has to do so cheaply, boundedly and measurably.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is strict schema output available for this model? | If yes, parse and shape errors are rare and the layer focuses on meaning; if no, local repair and re-asks do much more work |
| What does a wrong record cost compared with a late one? | Sets the retry bound and how quickly you route to a human |
| Which fields are checkable against a source of truth? | Ids, totals and dates you can verify are where hallucinations get caught |
| What latency budget does the request have? | Each re-ask is another full model call |
| Is the input untrusted (emails, uploads, web pages)? | Then output values can be steered by injected text, and validation is a security control |

## 3. The Validation Layers

Validation runs in a fixed order, cheapest and most fundamental first. Each layer only runs if the previous one passed, because there is no point checking a total on an object that did not parse.

📌 **Interview term: stop reason (finish reason)** — the field in the API response that says why generation ended: normal completion, a tool call, a refusal, or hitting the token limit. Anthropic uses \`stop_reason\` values such as \`end_turn\`, \`tool_use\`, \`max_tokens\` and \`refusal\` (Claude docs, checked October 2026). It is check number zero.

<svg class="iq-diagram" width="100%" viewBox="0 0 900 270" role="img" aria-label="Model output passes stop reason, parse, schema and semantic checks in order; failures go to a bounded repair loop and then to a review queue">
  <defs>
    <marker id="ai08q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="130" height="70" rx="10"/>
  <text class="d-text" x="85" y="70" text-anchor="middle">model reply</text>
  <text class="d-sub" x="85" y="93" text-anchor="middle">untrusted</text>
  <rect class="d-box" x="190" y="40" width="130" height="70" rx="10"/>
  <text class="d-text" x="255" y="70" text-anchor="middle">stop reason</text>
  <text class="d-sub" x="255" y="93" text-anchor="middle">refusal, cut off</text>
  <rect class="d-box" x="360" y="40" width="130" height="70" rx="10"/>
  <text class="d-text" x="425" y="70" text-anchor="middle">parse</text>
  <text class="d-sub" x="425" y="93" text-anchor="middle">local repair</text>
  <rect class="d-box" x="530" y="40" width="130" height="70" rx="10"/>
  <text class="d-text" x="595" y="70" text-anchor="middle">schema</text>
  <text class="d-sub" x="595" y="93" text-anchor="middle">types, enums</text>
  <rect class="d-box" x="700" y="40" width="180" height="70" rx="10"/>
  <text class="d-text" x="790" y="70" text-anchor="middle">semantic</text>
  <text class="d-sub" x="790" y="93" text-anchor="middle">sums, ids exist</text>
  <rect class="d-box-accent" x="330" y="180" width="200" height="70" rx="10"/>
  <text class="d-text" x="430" y="210" text-anchor="middle">re-ask with errors</text>
  <text class="d-sub" x="430" y="233" text-anchor="middle">at most 2 times</text>
  <rect class="d-box-muted" x="640" y="180" width="200" height="70" rx="10"/>
  <text class="d-text" x="740" y="210" text-anchor="middle">review queue</text>
  <text class="d-sub" x="740" y="233" text-anchor="middle">deterministic fallback</text>
  <path class="d-edge" d="M 154 75 L 184 75" marker-end="url(#ai08q2-arrow)"/>
  <path class="d-edge" d="M 324 75 L 354 75" marker-end="url(#ai08q2-arrow)"/>
  <path class="d-edge" d="M 494 75 L 524 75" marker-end="url(#ai08q2-arrow)"/>
  <path class="d-edge" d="M 664 75 L 694 75" marker-end="url(#ai08q2-arrow)"/>
  <path class="d-edge-dashed" d="M 790 114 L 790 150 L 470 150 L 470 174" marker-end="url(#ai08q2-arrow)"/>
  <path class="d-edge-dashed" d="M 390 176 L 390 140 L 85 140 L 85 114" marker-end="url(#ai08q2-arrow)"/>
  <path class="d-edge-accent" d="M 534 215 L 634 215" marker-end="url(#ai08q2-arrow)"/>
</svg>

The solid path runs left to right when everything passes. A semantic or schema failure goes down to the re-ask box, whose new reply re-enters at the start; when the bound is used up, the record goes right to the review queue instead of into the database.

| Layer | Question it answers | Example failure | Typical fix |
| :--- | :--- | :--- | :--- |
| 0. Stop reason | Did the model finish normally? | \`max_tokens\` cut the array; a refusal | Retry with a larger limit; handle refusal as its own outcome |
| 1. Parse | Is it JSON at all? | Code fences, preamble, trailing comma | Deterministic local repair |
| 2. Schema | Right keys, types, enums? | \`"qty": "2"\`, \`"currency": "euro"\` | Re-ask with path-named errors |
| 3. Semantic | Do the values agree with each other? | Total is not the sum of line items | Re-ask with the computed numbers |
| 4. Referential | Do the values agree with the world? | \`customer_id\` that does not exist | Give the model a lookup tool, or route to a human |

📌 **Interview term: semantic validation** — rules about meaning that a JSON Schema cannot express: arithmetic across fields, date order, plausible ranges, and consistency with the source document.

📌 **Interview term: referential validation** — checking values against your own data: the id exists, belongs to this tenant, the product is active. This is where a "well-typed hallucination" (a perfectly formatted id that refers to nothing) gets caught.

In code, layers 2 to 4 usually live in one schema object with refinements, so the rules have one home. A sketch in each ecosystem (not run here; the libraries are standard, the example programs below hand-write the same checks):

~~~ts
// Zod: shape + a cross-field rule; safeParse never throws
const Invoice = z.object({
  customer_id: z.string(),
  currency: z.enum(["EUR", "USD", "GBP"]),
  line_items: z.array(z.object({ sku: z.string(), qty: z.number().int().min(1), unit_cents: z.number().int().min(0) })).min(1),
  total_cents: z.number().int(),
}).refine((o) => o.line_items.reduce((s, li) => s + li.qty * li.unit_cents, 0) === o.total_cents,
  { path: ["total_cents"], message: "total does not equal the sum of line items" });

const r = Invoice.safeParse(JSON.parse(text));
if (!r.success) errors = r.error.issues.map((i) => \`\${i.path.join(".")}: \${i.message}\`);
~~~

~~~python
# Pydantic v2: field types + a model validator; referential checks need context, so run them after
class Invoice(BaseModel):
    customer_id: str
    currency: Literal["EUR", "USD", "GBP"]
    line_items: list[LineItem] = Field(min_length=1)
    total_cents: int

    @model_validator(mode="after")
    def totals_match(self):
        if sum(li.qty * li.unit_cents for li in self.line_items) != self.total_cents:
            raise ValueError("total_cents does not equal the sum of line items")
        return self
~~~

Keep referential checks (database lookups) outside the pure schema: they need a connection and a tenant, and they should run after the cheap checks pass.

## 4. The Repair Ladder

Repair also runs cheapest first, and the rule that separates a safe repair from a dangerous one is simple: **a repair may change formatting, never invent a value.**

📌 **Interview term: local (deterministic) repair** — a code-only fix that changes formatting without guessing content: strip a "Here is the JSON:" preamble and code fences, remove trailing commas, normalise smart quotes. It costs no model call and is fully predictable.

📌 **Interview term: re-ask (repair prompt)** — a new model call that includes the original request, the model's previous output and the exact validation errors, asking for a corrected object. The Instructor library for Python is built around this: its \`max_retries\` setting re-sends the request with the Pydantic validation error attached so the model can correct it (Instructor docs, "Retry logic" and "Reask validation", checked October 2026).

📌 **Interview term: deterministic fallback** — what happens when the bound is used up: send the record to a human review queue, store it as a draft flagged "unverified", or return a safe default. It must be decided in advance, never improvised.

What makes a re-ask work is the precision of the error. "Invalid output, try again" gives the model nothing. \`line_items[0].qty: expected integer >= 1, got "2"\` tells it exactly what to change. Anthropic gives the same advice for tool errors: write instructive error messages that say what went wrong and what to try next, and it notes that Claude typically retries a malformed tool call 2-3 times with corrections when told what was missing (Claude docs, "Handle tool calls", checked October 2026). A re-ask message should contain:

1. The original task and source document (or the full conversation so far).
2. The previous output, verbatim, so the model edits instead of starting over.
3. The errors, one per line, each naming a path and the expected rule.
4. An instruction to return only the corrected object.

### Why the bound is one or two re-asks

Re-asks fix errors the model *can* fix: a summing mistake, a casing slip, a string where a number belongs. They do not fix errors where the model lacks the information. If the source document never contained a valid customer id, asking again just produces a new invented id, which is exactly what the run below shows for \`doc-5\`. Two re-asks is a common ceiling; beyond that, extra calls mostly add cost and latency. The right fix for a missing fact is to give the model a way to *look it up* (a search tool, see [How do you design good tool definitions for an LLM?](/interview-question/how-do-you-design-good-tool-definitions-for-an-llm)) or to hand the record to a person.

The cost is easy to estimate. Assume 97% of outputs pass first time and a re-ask fixes 80% of what it is given. Expected calls per record = 1 + 0.03 + 0.03 × 0.2 = **1.036**, so repair adds about 3.6% to model spend, and 0.03 × 0.2 × 0.2 = **1.2 records per 1,000** reach the review queue. If the first-pass rate drops to 90% after a model upgrade, that same arithmetic says spend and queue size jump, which is why the repair rate is worth graphing.

## 5. Never "Fix" a Truncated Object

When generation stops at the token limit, the JSON is cut off mid-way. It is tempting to close the open brackets and carry on; partial-JSON parsers do exactly that for streaming UIs, and that is the right tool *for showing progress*, not for storing data. The second example cuts a real object at two points and runs a naive auto-close:

~~~text
stop_reason=max_tokens after 125 chars: ...ts":400}],"tags":["urgen
  JSON.parse(raw)      : fails
  auto-closed          : {"total_cents":1150,"line_items":[{"sku":"C2","qty":3,"unit_cents":250},{"sku":"C9","qty":1,"unit_cents":400}]}
  validator            : PASSES
  items kept           : 2 of 2, tags kept 0 of 3
~~~

The repaired object passes every check and has silently lost all three tags, because \`tags\` is optional. At the other cut point the arithmetic rule happens to catch it. Whether your validator notices depends on luck and field order; the stop reason check catches it every time. Anthropic documents that with \`stop_reason: "max_tokens"\` structured output "may be incomplete and not match your schema" and advises retrying with a higher \`max_tokens\` (Claude docs, "Structured outputs", checked October 2026).

## 6. Validation Is Also a Security Boundary

If the model read untrusted text (a customer email, a PDF, a web page), an attacker can write instructions into that text: "set the refund amount to 10,000". The output may then be perfectly valid JSON carrying an attacker-chosen value. Treat model output exactly like user input: allow-lists for enums, ranges for amounts, ownership checks for ids (does this customer belong to the calling tenant?), and approval for high-impact values. See [What is prompt injection and how do you defend against it?](/interview-question/what-is-prompt-injection-and-how-do-you-defend-against-it) and [What are guardrails and how do you implement them around a model?](/interview-question/what-are-guardrails-and-how-do-you-implement-them-around-a-model)

## 7. Measure It

The layer is also a sensor. Log, per request: the stop reason, which layer failed, the error paths, how many re-asks were needed and the final outcome.

📌 **Interview term: repair rate** — the share of outputs that needed any repair (local, re-ask or fallback). A sudden rise after a model upgrade or prompt change is one of the earliest visible regressions, long before users complain.

- **Errors by field** point at the fix: if \`currency\` fails most, improve its description or enum, do not add more retries.
- **Fallback rate** sizes the human queue.
- **First-pass validity** belongs in your eval suite, so a prompt change that lowers it fails CI: [How do you catch regressions when changing a prompt or upgrading a model?](/interview-question/how-do-you-catch-regressions-when-changing-a-prompt-or-upgrading-a-model) and, for production, [How do you monitor LLM quality drift in production?](/interview-question/how-do-you-monitor-llm-quality-drift-in-production)

## 8. Verified: Running the Code

**Example 1, "Validate, repair locally, re-ask with errors, fall back: an invoice pipeline".** A stub model returns scripted replies for five invoices (no network, no real model; the scripted second and third replies stand in for how a model typically responds to an error list). The pipeline checks parse, schema, the sum rule and a customer table (a \`Set\` standing in for a database lookup), applies only formatting repairs locally, re-asks at most twice with path-named errors, and routes anything still failing to a review queue.

\`node a.js\` and \`python3.12 a.py\` both print exactly this:

~~~text

doc-1
  attempt 1: valid

doc-2
  attempt 1: valid (local repair: stripped prose/fences, removed trailing comma)

doc-3
  attempt 1: semantic errors
    - total_cents: 1250 but line items sum to 1150
  re-ask prompt sent:
    Your previous output had these problems:
    - total_cents: 1250 but line items sum to 1150
    Return the corrected JSON only.
  attempt 2: valid

doc-4
  attempt 1: schema errors
    - currency: expected one of EUR|USD|GBP, got "euro"
    - line_items[0].qty: expected integer >= 1, got "2"
  attempt 2: valid

doc-5
  attempt 1: semantic errors
    - customer_id: C-9999 does not exist
  attempt 2: semantic errors
    - customer_id: C-9999 does not exist
  attempt 3: semantic errors
    - customer_id: C-0005 does not exist
  -> gave up after 2 re-asks: routed to the human review queue, not saved

summary
  documents 5 | valid first pass 1 | fixed locally 1 | fixed by re-ask 2 | fallback 1
  model calls 9 for 5 documents (1.8 per document)
  repair rate (anything other than clean first pass): 80%
  errors by field: customer_id=3, currency=1, line_items[].qty=1, total_cents=1
~~~

What the run shows:

- \`doc-2\` was fixed with **zero model calls**: preamble, fences and a trailing comma are formatting, so local repair is safe.
- \`doc-3\` and \`doc-4\` were fixed by one re-ask each, because the errors were precise and fixable (a summing mistake, a string \`"2"\`, \`"euro"\` instead of \`EUR\`).
- \`doc-5\` shows why the loop is bounded: the customer id was never knowable, so the model repeated it, then invented a different one (\`C-0005\`). The pipeline refused to save it.
- The summary is the monitoring signal: 9 calls for 5 documents and an 80% repair rate would be an alarming dashboard in production (this toy is deliberately error-heavy), and \`customer_id\` tops the per-field errors, pointing at the real fix: a lookup tool.

**Example 2, "Truncated output: why auto-closing brackets is not a repair".** It serialises a complete object, cuts it at 75 and 125 characters as a \`max_tokens\` stop would, auto-closes the brackets and validates.

\`node b.js\` and \`python3.12 b.py\` both print exactly this:

~~~text
full output is 142 characters

stop_reason=max_tokens after 75 chars: ...:3,"unit_cents":250},{"s
  JSON.parse(raw)      : fails
  auto-closed          : {"total_cents":1150,"line_items":[{"sku":"C2","qty":3,"unit_cents":250}]}
  validator            : total 1150 != sum 750
  items kept           : 1 of 2, tags kept 0 of 3
  stop_reason check    : reject and retry with a larger max_tokens

stop_reason=max_tokens after 125 chars: ...ts":400}],"tags":["urgen
  JSON.parse(raw)      : fails
  auto-closed          : {"total_cents":1150,"line_items":[{"sku":"C2","qty":3,"unit_cents":250},{"sku":"C9","qty":1,"unit_cents":400}]}
  validator            : PASSES
  items kept           : 2 of 2, tags kept 0 of 3
  stop_reason check    : reject and retry with a larger max_tokens
~~~

At 75 characters the sum rule catches the damage; at 125 characters the damaged object passes. Only the stop reason is a reliable signal.

## Edge Cases Worth Knowing

- **Refusals are not repair cases.** A refusal is a decision, not a formatting error; re-asking with "fix the JSON" is wrong. Record it as its own outcome and route it.
- **Idempotency.** If a re-ask happens after a partial side effect (a row inserted, an email sent), you can double-apply. Validate fully *before* any write, and make writes idempotent by a stable key such as \`invoice_id\`.
- **Enum casing and synonyms.** Normalising \`EUR\` vs \`eur\` locally is a safe formatting repair. Mapping \`"euro"\` to \`EUR\` is a value judgement: fine with an explicit synonym table you own, not with a fuzzy guess.
- **Streaming.** You can validate partial objects for display, but run the full validation only on the final object.
- **Large batch jobs.** Collect failures and re-ask them in a second pass instead of blocking the batch; see [When should you use batch APIs instead of real-time LLM calls?](/interview-question/when-should-you-use-batch-apis-instead-of-real-time-llm-calls)

## Common Pitfalls

- **Unbounded retry loops.** "Retry until valid" turns one bad input into an unbounded bill and a hung request. Bound it and define the fallback.
- **Vague repair prompts.** "That was invalid, try again" wastes the call. Send path-named errors and the previous output.
- **Repairs that invent values.** Defaulting a missing \`total_cents\` to 0, coercing \`"about 4"\` to 4, or auto-closing truncated JSON produces valid-looking wrong data, which is worse than a visible failure.
- **Skipping referential checks.** Schema-valid ids that point at nothing are the most common well-typed hallucination; they only show up when you look them up.
- **Accepting on timeout.** If the repair budget runs out, the answer is the fallback, never "save what we have".
- **Not logging which layer failed.** Without per-layer and per-field counts you cannot tell a schema problem from a model regression.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Layers in order:</strong> <span style="color:#f0e2c8;">I treat model output as untrusted input and check it in layers: the <strong style="color:#ffca28;">stop reason</strong> first (refusal or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_tokens</code>), then parse, then schema, then <strong style="color:#ffca28;">semantic</strong> rules like the total equalling the line items, then <strong style="color:#ffca28;">referential</strong> checks such as whether the customer id exists for this tenant.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Repair cheapest first:</strong> <span style="color:#f0e2c8;">Formatting problems get a local, deterministic fix with no model call: strip fences and preamble, drop trailing commas. The rule is that a repair may change formatting but <strong style="color:#ffca28;">never invents a value</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Re-ask precisely, and bound it:</strong> <span style="color:#f0e2c8;">Anything else gets a re-ask containing the previous output and path-named errors such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">line_items[0].qty: expected integer &gt;= 1, got "2"</code>. I cap it at one or two re-asks, because a fact the model does not have, like a missing id, just gets re-invented. In my run the model swapped one fake id for another.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Fallback decided in advance:</strong> <span style="color:#f0e2c8;">When the budget is used up the record goes to a review queue or is stored as a flagged draft; never accept on timeout, and never auto-close truncated JSON. In my truncation demo the auto-closed object <em style="color:#f0e2c8;">passed</em> validation with all its tags missing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Measure it:</strong> <span style="color:#f0e2c8;">I log which layer failed, errors per field, re-asks and fallbacks. The per-field counts tell me what to fix in the schema or prompt, and the <strong style="color:#ffca28;">repair rate</strong> is an early drift alarm after a model or prompt change.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If we already use strict structured outputs, do we still need this?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, but it gets smaller. Strict mode removes parse and shape errors, so most of the work moves to the stop reason, semantic and referential checks. Refusals, truncation and well-typed wrong values are all still possible under strict mode.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What goes into the repair prompt?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The original task and source, the model's previous output verbatim so it edits instead of starting over, and one line per error naming the path and the expected rule, then <em style="color:#d8d8d8;">return only the corrected object</em>. Vague feedback like <em style="color:#d8d8d8;">invalid, try again</em> mostly wastes the call.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you choose the retry bound?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From cost and evidence. With 97% first-pass validity and 80% re-ask success, expected calls are <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1.036</code> per record and about 1.2 per 1,000 reach the queue. I measure re-ask success per error type; when the second re-ask rarely helps, the bound is one.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop the model from inventing ids?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do not ask it to recall them. Give it a lookup tool that returns real candidates, validate the chosen id against the database, and scope it to the tenant. If no candidate fits, the honest output is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> and a human review, which the schema must allow.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do you put these checks in the codebase?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One schema object with refinements, Zod or Pydantic, as the single source of truth that also generates the JSON Schema sent to the model. Referential checks run after it, because they need a database connection and the tenant. Writes happen only after everything passes, and they are idempotent on a stable key.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Stop reason (finish reason) | Why generation ended: normal end, tool call, refusal or token limit |
| Semantic validation | Rules about meaning across fields that a JSON Schema cannot express |
| Referential validation | Checking values against your own data, such as whether an id exists for this tenant |
| Local (deterministic) repair | Code-only formatting fixes that never invent a value |
| Re-ask (repair prompt) | A new call with the previous output and precise errors, asking for a correction |
| Deterministic fallback | The pre-decided outcome when repair is exhausted: review queue, flagged draft or safe default |
| Repair rate | Share of outputs that needed any repair; a drift signal |

**Conclusion:** A runtime validation layer checks model output the way a bank checks a cheque: stop reason first, then parse, schema, cross-field meaning and finally the facts in your own systems. Repairs climb from free formatting fixes to a bounded re-ask with precise, path-named errors, and end in a fallback decided in advance, because some errors (a missing id, a refusal, a truncated object) are not fixable by asking again. Treat the output as untrusted input, never let a repair invent a value, and graph the repair rate: it is both your error handler and one of your earliest warnings that something upstream changed.`,
    examples: [
      {
        label: `Validate, repair locally, re-ask with errors, fall back: an invoice pipeline`,
        variants: [
          { tech: "node", code: `// Validate -> cheap local repair -> bounded re-ask -> fallback, with metrics.
// The "model" is a stub with scripted replies per document (no network).
const CUSTOMERS = new Set(["C-1001", "C-1002", "C-1003"]);
const CURRENCIES = ["EUR", "USD", "GBP"];
const MAX_REASKS = 2;

const STUB = {
  "doc-1": ['{"invoice_id":"INV-0001","customer_id":"C-1001","currency":"EUR","line_items":[{"sku":"A1","qty":2,"unit_cents":500}],"total_cents":1000}'],
  "doc-2": ['Here is the JSON:\\n\`\`\`json\\n{"invoice_id":"INV-0002","customer_id":"C-1002","currency":"USD","line_items":[{"sku":"B7","qty":1,"unit_cents":1999},],"total_cents":1999}\\n\`\`\`'],
  "doc-3": ['{"invoice_id":"INV-0003","customer_id":"C-1003","currency":"GBP","line_items":[{"sku":"C2","qty":3,"unit_cents":250},{"sku":"C9","qty":1,"unit_cents":400}],"total_cents":1250}',
            '{"invoice_id":"INV-0003","customer_id":"C-1003","currency":"GBP","line_items":[{"sku":"C2","qty":3,"unit_cents":250},{"sku":"C9","qty":1,"unit_cents":400}],"total_cents":1150}'],
  "doc-4": ['{"invoice_id":"INV-0004","customer_id":"C-1002","currency":"euro","line_items":[{"sku":"D4","qty":"2","unit_cents":300}],"total_cents":600}',
            '{"invoice_id":"INV-0004","customer_id":"C-1002","currency":"EUR","line_items":[{"sku":"D4","qty":2,"unit_cents":300}],"total_cents":600}'],
  "doc-5": ['{"invoice_id":"INV-0005","customer_id":"C-9999","currency":"USD","line_items":[{"sku":"E1","qty":1,"unit_cents":100}],"total_cents":100}',
            '{"invoice_id":"INV-0005","customer_id":"C-9999","currency":"USD","line_items":[{"sku":"E1","qty":1,"unit_cents":100}],"total_cents":100}',
            '{"invoice_id":"INV-0005","customer_id":"C-0005","currency":"USD","line_items":[{"sku":"E1","qty":1,"unit_cents":100}],"total_cents":100}'],
};
const calls = {};
function callModel(doc, prompt) { calls[doc] = (calls[doc] || 0) + 1; return STUB[doc][Math.min(calls[doc] - 1, STUB[doc].length - 1)]; }

// Stage 1: safe, deterministic text repairs only (no guessing values).
function localRepair(text) {
  const fixes = [];
  let t = text;
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a > 0 || (b !== -1 && b < t.length - 1)) { t = t.slice(a, b + 1); fixes.push("stripped prose/fences"); }
  const noTrailing = t.replace(/,\\s*([}\\]])/g, "$1");
  if (noTrailing !== t) { t = noTrailing; fixes.push("removed trailing comma"); }
  return { t, fixes };
}
const isInt = (v) => typeof v === "number" && Number.isInteger(v);
// Stage 2: schema. Stage 3: semantic + referential rules. Errors name the path.
function validate(o) {
  const e = [];
  if (typeof o.invoice_id !== "string" || !/^INV-\\d{4}$/.test(o.invoice_id)) e.push(\`invoice_id: expected pattern INV-0000, got \${JSON.stringify(o.invoice_id)}\`);
  if (typeof o.customer_id !== "string") e.push(\`customer_id: expected string\`);
  if (!CURRENCIES.includes(o.currency)) e.push(\`currency: expected one of \${CURRENCIES.join("|")}, got \${JSON.stringify(o.currency)}\`);
  if (!Array.isArray(o.line_items) || o.line_items.length === 0) e.push("line_items: expected a non-empty array");
  else o.line_items.forEach((li, i) => {
    if (!isInt(li.qty) || li.qty < 1) e.push(\`line_items[\${i}].qty: expected integer >= 1, got \${JSON.stringify(li.qty)}\`);
    if (!isInt(li.unit_cents) || li.unit_cents < 0) e.push(\`line_items[\${i}].unit_cents: expected integer >= 0, got \${JSON.stringify(li.unit_cents)}\`);
  });
  if (!isInt(o.total_cents)) e.push("total_cents: expected integer");
  if (e.length) return { kind: "schema", errors: e };
  const sum = o.line_items.reduce((s, li) => s + li.qty * li.unit_cents, 0);
  if (sum !== o.total_cents) e.push(\`total_cents: \${o.total_cents} but line items sum to \${sum}\`);
  if (!CUSTOMERS.has(o.customer_id)) e.push(\`customer_id: \${o.customer_id} does not exist\`);
  return e.length ? { kind: "semantic", errors: e } : { kind: "ok", errors: [] };
}

const stats = { firstPass: 0, localOnly: 0, afterReask: 0, fallback: 0, modelCalls: 0 };
const fieldErrors = {};
function handle(doc) {
  console.log(\`\\n\${doc}\`);
  let prompt = \`Extract the invoice in \${doc} as JSON.\`;
  for (let attempt = 0; attempt <= MAX_REASKS; attempt++) {
    const raw = callModel(doc, prompt);
    stats.modelCalls++;
    const { t, fixes } = localRepair(raw);
    let obj = null;
    try { obj = JSON.parse(t); } catch { /* handled below */ }
    const v = obj ? validate(obj) : { kind: "parse", errors: ["output is not valid JSON"] };
    for (const err of v.errors) { const f = err.split(":")[0].replace(/\\[\\d+\\]/, "[]"); fieldErrors[f] = (fieldErrors[f] || 0) + 1; }
    const tag = fixes.length ? \` (local repair: \${fixes.join(", ")})\` : "";
    if (v.kind === "ok") {
      console.log(\`  attempt \${attempt + 1}: valid\${tag}\`);
      if (attempt > 0) stats.afterReask++; else if (fixes.length) stats.localOnly++; else stats.firstPass++;
      return;
    }
    console.log(\`  attempt \${attempt + 1}: \${v.kind} errors\${tag}\`);
    for (const err of v.errors) console.log(\`    - \${err}\`);
    if (attempt === MAX_REASKS) break;
    prompt = \`Your previous output had these problems:\\n\${v.errors.map((x) => \`- \${x}\`).join("\\n")}\\nReturn the corrected JSON only.\`;
    if (doc === "doc-3") console.log(\`  re-ask prompt sent:\\n    \${prompt.split("\\n").join("\\n    ")}\`);
  }
  stats.fallback++;
  console.log(\`  -> gave up after \${MAX_REASKS} re-asks: routed to the human review queue, not saved\`);
}

for (const doc of Object.keys(STUB)) handle(doc);
const n = Object.keys(STUB).length;
console.log("\\nsummary");
console.log(\`  documents \${n} | valid first pass \${stats.firstPass} | fixed locally \${stats.localOnly} | fixed by re-ask \${stats.afterReask} | fallback \${stats.fallback}\`);
console.log(\`  model calls \${stats.modelCalls} for \${n} documents (\${(stats.modelCalls / n).toFixed(1)} per document)\`);
console.log(\`  repair rate (anything other than clean first pass): \${((n - stats.firstPass) / n * 100).toFixed(0)}%\`);
console.log(\`  errors by field: \${Object.entries(fieldErrors).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([k, c]) => \`\${k}=\${c}\`).join(", ")}\`);` },
          { tech: "python", code: `# Validate -> cheap local repair -> bounded re-ask -> fallback, with metrics.
# The "model" is a stub with scripted replies per document (no network).
import json
import re

CUSTOMERS = {"C-1001", "C-1002", "C-1003"}
CURRENCIES = ["EUR", "USD", "GBP"]
MAX_REASKS = 2

STUB = {
    "doc-1": ['{"invoice_id":"INV-0001","customer_id":"C-1001","currency":"EUR","line_items":[{"sku":"A1","qty":2,"unit_cents":500}],"total_cents":1000}'],
    "doc-2": ['Here is the JSON:\\n\`\`\`json\\n{"invoice_id":"INV-0002","customer_id":"C-1002","currency":"USD","line_items":[{"sku":"B7","qty":1,"unit_cents":1999},],"total_cents":1999}\\n\`\`\`'],
    "doc-3": ['{"invoice_id":"INV-0003","customer_id":"C-1003","currency":"GBP","line_items":[{"sku":"C2","qty":3,"unit_cents":250},{"sku":"C9","qty":1,"unit_cents":400}],"total_cents":1250}',
              '{"invoice_id":"INV-0003","customer_id":"C-1003","currency":"GBP","line_items":[{"sku":"C2","qty":3,"unit_cents":250},{"sku":"C9","qty":1,"unit_cents":400}],"total_cents":1150}'],
    "doc-4": ['{"invoice_id":"INV-0004","customer_id":"C-1002","currency":"euro","line_items":[{"sku":"D4","qty":"2","unit_cents":300}],"total_cents":600}',
              '{"invoice_id":"INV-0004","customer_id":"C-1002","currency":"EUR","line_items":[{"sku":"D4","qty":2,"unit_cents":300}],"total_cents":600}'],
    "doc-5": ['{"invoice_id":"INV-0005","customer_id":"C-9999","currency":"USD","line_items":[{"sku":"E1","qty":1,"unit_cents":100}],"total_cents":100}',
              '{"invoice_id":"INV-0005","customer_id":"C-9999","currency":"USD","line_items":[{"sku":"E1","qty":1,"unit_cents":100}],"total_cents":100}',
              '{"invoice_id":"INV-0005","customer_id":"C-0005","currency":"USD","line_items":[{"sku":"E1","qty":1,"unit_cents":100}],"total_cents":100}'],
}
calls = {}


def call_model(doc, prompt):
    calls[doc] = calls.get(doc, 0) + 1
    return STUB[doc][min(calls[doc] - 1, len(STUB[doc]) - 1)]


# Stage 1: safe, deterministic text repairs only (no guessing values).
def local_repair(text):
    fixes, t = [], text
    a, b = t.find("{"), t.rfind("}")
    if a > 0 or (b != -1 and b < len(t) - 1):
        t = t[a:b + 1]
        fixes.append("stripped prose/fences")
    no_trailing = re.sub(r",\\s*([}\\]])", r"\\1", t)
    if no_trailing != t:
        t = no_trailing
        fixes.append("removed trailing comma")
    return t, fixes


def is_int(v):
    return isinstance(v, int) and not isinstance(v, bool)


# Stage 2: schema. Stage 3: semantic + referential rules. Errors name the path.
def validate(o):
    e = []
    if not isinstance(o.get("invoice_id"), str) or not re.fullmatch(r"INV-\\d{4}", o["invoice_id"]):
        e.append(f"invoice_id: expected pattern INV-0000, got {json.dumps(o.get('invoice_id'))}")
    if not isinstance(o.get("customer_id"), str):
        e.append("customer_id: expected string")
    if o.get("currency") not in CURRENCIES:
        e.append(f"currency: expected one of {'|'.join(CURRENCIES)}, got {json.dumps(o.get('currency'))}")
    items = o.get("line_items")
    if not isinstance(items, list) or not items:
        e.append("line_items: expected a non-empty array")
    else:
        for i, li in enumerate(items):
            if not is_int(li.get("qty")) or li["qty"] < 1:
                e.append(f"line_items[{i}].qty: expected integer >= 1, got {json.dumps(li.get('qty'))}")
            if not is_int(li.get("unit_cents")) or li["unit_cents"] < 0:
                e.append(f"line_items[{i}].unit_cents: expected integer >= 0, got {json.dumps(li.get('unit_cents'))}")
    if not is_int(o.get("total_cents")):
        e.append("total_cents: expected integer")
    if e:
        return "schema", e
    total = sum(li["qty"] * li["unit_cents"] for li in items)
    if total != o["total_cents"]:
        e.append(f"total_cents: {o['total_cents']} but line items sum to {total}")
    if o["customer_id"] not in CUSTOMERS:
        e.append(f"customer_id: {o['customer_id']} does not exist")
    return ("semantic", e) if e else ("ok", [])


stats = {"first": 0, "local": 0, "reask": 0, "fallback": 0, "calls": 0}
field_errors = {}


def handle(doc):
    print(f"\\n{doc}")
    prompt = f"Extract the invoice in {doc} as JSON."
    for attempt in range(MAX_REASKS + 1):
        raw = call_model(doc, prompt)
        stats["calls"] += 1
        t, fixes = local_repair(raw)
        try:
            obj = json.loads(t)
        except ValueError:
            obj = None
        kind, errors = validate(obj) if obj is not None else ("parse", ["output is not valid JSON"])
        for err in errors:
            f = re.sub(r"\\[\\d+\\]", "[]", err.split(":")[0], count=1)
            field_errors[f] = field_errors.get(f, 0) + 1
        tag = f" (local repair: {', '.join(fixes)})" if fixes else ""
        if kind == "ok":
            print(f"  attempt {attempt + 1}: valid{tag}")
            if attempt > 0:
                stats["reask"] += 1
            elif fixes:
                stats["local"] += 1
            else:
                stats["first"] += 1
            return
        print(f"  attempt {attempt + 1}: {kind} errors{tag}")
        for err in errors:
            print(f"    - {err}")
        if attempt == MAX_REASKS:
            break
        prompt = "Your previous output had these problems:\\n" + "\\n".join(f"- {x}" for x in errors) + "\\nReturn the corrected JSON only."
        if doc == "doc-3":
            print("  re-ask prompt sent:\\n    " + "\\n    ".join(prompt.split("\\n")))
    stats["fallback"] += 1
    print(f"  -> gave up after {MAX_REASKS} re-asks: routed to the human review queue, not saved")


for doc in STUB:
    handle(doc)
n = len(STUB)
print("\\nsummary")
print(f"  documents {n} | valid first pass {stats['first']} | fixed locally {stats['local']} | fixed by re-ask {stats['reask']} | fallback {stats['fallback']}")
print(f"  model calls {stats['calls']} for {n} documents ({stats['calls'] / n:.1f} per document)")
print(f"  repair rate (anything other than clean first pass): {(n - stats['first']) / n * 100:.0f}%")
ordered = sorted(field_errors.items(), key=lambda kv: (-kv[1], kv[0]))
print("  errors by field: " + ", ".join(f"{k}={c}" for k, c in ordered))` },
        ],
      },
      {
        label: `Truncated output: why auto-closing brackets is not a repair`,
        variants: [
          { tech: "node", code: `// Truncated output (stop_reason "max_tokens"): why "close the brackets" is not a repair.
const FULL = {
  total_cents: 1150,
  line_items: [
    { sku: "C2", qty: 3, unit_cents: 250 },
    { sku: "C9", qty: 1, unit_cents: 400 },
  ],
  tags: ["urgent", "eu", "paper"],
};
const text = JSON.stringify(FULL);

// Naive "repair": cut after the last complete } or ] and append the missing closers.
function autoClose(t) {
  let inStr = false, esc = false, lastClose = -1;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (esc) { esc = false; continue; }
    if (c === "\\\\") { esc = true; continue; }
    if (c === '"') inStr = !inStr;
    else if (!inStr && (c === "}" || c === "]")) lastClose = i;
  }
  let cut = t.slice(0, lastClose + 1);
  const stack = [];
  inStr = false;
  for (const c of cut) {
    if (c === '"') inStr = !inStr;
    else if (!inStr && (c === "{" || c === "[")) stack.push(c === "{" ? "}" : "]");
    else if (!inStr && (c === "}" || c === "]")) stack.pop();
  }
  return cut + stack.reverse().join("");
}
function check(o) {
  const errs = [];
  for (const k of ["total_cents", "line_items"]) if (!(k in o)) errs.push(\`missing \${k}\`); // tags is optional
  if (Array.isArray(o.line_items) && Number.isInteger(o.total_cents)) {
    const sum = o.line_items.reduce((s, li) => s + li.qty * li.unit_cents, 0);
    if (sum !== o.total_cents) errs.push(\`total \${o.total_cents} != sum \${sum}\`);
  }
  return errs;
}

console.log(\`full output is \${text.length} characters\`);
for (const cutAt of [75, 125]) {
  const truncated = text.slice(0, cutAt);
  console.log(\`\\nstop_reason=max_tokens after \${cutAt} chars: ...\${truncated.slice(-24)}\`);
  let parsed = true;
  try { JSON.parse(truncated); } catch { parsed = false; }
  console.log(\`  JSON.parse(raw)      : \${parsed ? "ok" : "fails"}\`);
  const fixed = autoClose(truncated);
  const o = JSON.parse(fixed);
  console.log(\`  auto-closed          : \${fixed}\`);
  const errs = check(o);
  console.log(\`  validator            : \${errs.length ? errs.join("; ") : "PASSES"}\`);
  console.log(\`  items kept           : \${o.line_items ? o.line_items.length : 0} of 2, tags kept \${o.tags ? o.tags.length : 0} of 3\`);
  console.log(\`  stop_reason check    : reject and retry with a larger max_tokens\`);
}` },
          { tech: "python", code: `# Truncated output (stop_reason "max_tokens"): why "close the brackets" is not a repair.
import json

FULL = {
    "total_cents": 1150,
    "line_items": [
        {"sku": "C2", "qty": 3, "unit_cents": 250},
        {"sku": "C9", "qty": 1, "unit_cents": 400},
    ],
    "tags": ["urgent", "eu", "paper"],
}
text = json.dumps(FULL, separators=(",", ":"))


# Naive "repair": cut after the last complete } or ] and append the missing closers.
def auto_close(t):
    in_str, esc, last_close = False, False, -1
    for i, c in enumerate(t):
        if esc:
            esc = False
            continue
        if c == "\\\\":
            esc = True
            continue
        if c == '"':
            in_str = not in_str
        elif not in_str and c in "}]":
            last_close = i
    cut = t[: last_close + 1]
    stack, in_str = [], False
    for c in cut:
        if c == '"':
            in_str = not in_str
        elif not in_str and c in "{[":
            stack.append("}" if c == "{" else "]")
        elif not in_str and c in "}]":
            stack.pop()
    return cut + "".join(reversed(stack))


def check(o):
    errs = [f"missing {k}" for k in ("total_cents", "line_items") if k not in o]  # tags is optional
    if isinstance(o.get("line_items"), list) and isinstance(o.get("total_cents"), int):
        total = sum(li["qty"] * li["unit_cents"] for li in o["line_items"])
        if total != o["total_cents"]:
            errs.append(f"total {o['total_cents']} != sum {total}")
    return errs


print(f"full output is {len(text)} characters")
for cut_at in (75, 125):
    truncated = text[:cut_at]
    print(f"\\nstop_reason=max_tokens after {cut_at} chars: ...{truncated[-24:]}")
    try:
        json.loads(truncated)
        parsed = True
    except ValueError:
        parsed = False
    print(f"  JSON.parse(raw)      : {'ok' if parsed else 'fails'}")
    fixed = auto_close(truncated)
    o = json.loads(fixed)
    print(f"  auto-closed          : {fixed}")
    errs = check(o)
    print(f"  validator            : {'; '.join(errs) if errs else 'PASSES'}")
    print(f"  items kept           : {len(o.get('line_items', []))} of 2, tags kept {len(o.get('tags', []))} of 3")
    print("  stop_reason check    : reject and retry with a larger max_tokens")` },
        ],
      },
    ],
  },
  {
    title: `Tool calling vs function calling vs structured output — what changed in 2025?`,
    difficulty: "medium",
    seoDescription: `Function calling and tool calling are one mechanism; structured output shapes the answer. A dated 2023-2025 timeline and its design impact.`,
    description: `**Question presented to candidate:**
"People on the team use 'function calling', 'tool calling' and 'structured output' as if they were the same thing. Untangle them for me: what does each one mean, how are they related, and what actually changed in the APIs during 2025 that we should design around?"

**What a strong answer should cover:**
- Function calling is OpenAI's original 2023 name; tool calling (Anthropic: tool use) is the general name for the same mechanism: the model emits a structured request naming a tool and its arguments, and your code executes it
- Structured output constrains the model's final answer to a JSON Schema; a tool call's arguments are themselves structured output, which is why the old way to get structured answers was a forced tool call
- The milestones: functions (June 2023), \`tools\`/\`tool_choice\` with parallel calls and JSON mode (November 2023), strict schemas for both answers and tool arguments (OpenAI, August 2024), MCP for sharing tools (November 2024)
- What changed in 2025: OpenAI's Responses API with flat tool definitions and \`function_call\` items, MCP tool output schemas, Gemini JSON Schema on all active models, Anthropic structured outputs and strict tool use, and SDKs folding structured output into the normal text call
- The design rule that follows: tools for actions and data the model needs, structured output for the shape of the answer; keep one internal tool and schema definition and adapt it per provider

**Code / implementation expected:** Optional — mapping one tool definition to two providers' formats, or showing a tool-call loop next to a schema-constrained answer.`,
    answer: `**Target Audience:** Engineers who keep meeting three overlapping names in docs, SDKs and interviews and want one clear mental model plus an accurate timeline.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (the wire-format adapter below, run against canned API responses). Dates and API shapes are cited inline with their source, checked October 2026. The title says 2025; this answer covers 2025 and notes what has changed since.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Think of a restaurant kitchen. A waiter can do two different things with an order slip. They can hand it to the kitchen as a **ticket**: "table 4, one soup", which makes something happen and comes back with a result. Or they can hand the customer the **bill**, a printed form with fixed fields that the till must be able to read. Both are pieces of paper with a strict layout. One triggers an action; the other *is* the final answer.

Tool calling is the ticket: the model fills in a slip ("call \`get_order_status\` with \`order_id = A-17\`"), your code does the work, and the result goes back to the model. Structured output is the bill: the model's final answer itself must fit a form your code can read. Function calling is simply the name the first restaurant gave to tickets, before everyone started calling them tool calls.

The confusion is understandable because the paperwork is identical: both are JSON that must match a JSON Schema, and the same token-masking machinery can enforce both. The difference is what happens next.

## 2. Three Names, Two Mechanisms

📌 **Interview term: function calling** — OpenAI's name, from June 2023, for letting the model return a JSON object naming a function and its arguments instead of prose. Your code runs the function and sends the result back (OpenAI, "Function calling and other API updates", June 13, 2023).

📌 **Interview term: tool calling (tool use)** — the general name for the same mechanism once "function" became one kind of "tool" among several. OpenAI's API moved from \`functions\`/\`function_call\` to \`tools\`/\`tool_choice\` in November 2023; Anthropic calls it tool use, and made it generally available for Claude 3 at the end of May 2024 (The Decoder and Maginative coverage, May 31, 2024).

📌 **Interview term: structured output** — constraining the model's *final answer* to a JSON Schema, so no action is taken; the JSON is the deliverable. OpenAI shipped it as Structured Outputs on August 6, 2024; Anthropic and Google followed with their own versions in 2025 (details in section 4).

📌 **Interview term: forced tool call** — setting \`tool_choice\` so the model must call one named tool. Before native structured output, the standard way to get schema-shaped answers was to define a fake "tool" whose parameters are the answer schema and force it.

| | Tool calling | Structured output |
| :--- | :--- | :--- |
| What the JSON is | A request: tool name + arguments | The answer itself |
| Who acts on it | Your code runs the tool, then calls the model again | Your code consumes it; the loop ends |
| Typical use | Look up data, take actions, agents | Extraction, classification, typed answers for the UI |
| Can it repeat? | Yes, many calls in a loop, several in parallel | One object per response |
| Strictness | \`strict: true\` on the tool makes arguments schema-valid | \`strict: true\` / JSON Schema format makes the answer schema-valid |
| Where it lives in the request | \`tools\` (+ \`tool_choice\`) | OpenAI \`response_format\` or Responses \`text.format\`, Anthropic \`output_config.format\`, Gemini \`response_json_schema\` |

The underlying model behaviour is covered in [How does function calling (tool use) work under the hood?](/interview-question/how-does-function-calling-tool-use-work-under-the-hood), and making the answer reliable in [How do you get reliable structured JSON output from an LLM?](/interview-question/how-do-you-get-reliable-structured-json-output-from-an-llm)

## 3. The Timeline, 2023 to 2024

<svg class="iq-diagram" width="100%" viewBox="0 0 880 200" role="img" aria-label="Timeline from June 2023 function calling to November 2023 tools and JSON mode to August 2024 strict schemas to November 2024 MCP">
  <defs>
    <marker id="ai08q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="50" width="180" height="100" rx="10"/>
  <text class="d-text" x="110" y="85" text-anchor="middle">Jun 2023</text>
  <text class="d-sub" x="110" y="110" text-anchor="middle">function calling</text>
  <text class="d-sub" x="110" y="130" text-anchor="middle">one call per turn</text>
  <rect class="d-box" x="240" y="50" width="180" height="100" rx="10"/>
  <text class="d-text" x="330" y="85" text-anchor="middle">Nov 2023</text>
  <text class="d-sub" x="330" y="110" text-anchor="middle">tools, tool_choice</text>
  <text class="d-sub" x="330" y="130" text-anchor="middle">parallel, JSON mode</text>
  <rect class="d-box" x="460" y="50" width="180" height="100" rx="10"/>
  <text class="d-text" x="550" y="85" text-anchor="middle">Aug 2024</text>
  <text class="d-sub" x="550" y="110" text-anchor="middle">strict schemas</text>
  <text class="d-sub" x="550" y="130" text-anchor="middle">answers and tools</text>
  <rect class="d-box-accent" x="680" y="50" width="180" height="100" rx="10"/>
  <text class="d-text" x="770" y="85" text-anchor="middle">Nov 2024</text>
  <text class="d-sub" x="770" y="110" text-anchor="middle">MCP</text>
  <text class="d-sub" x="770" y="130" text-anchor="middle">shareable tools</text>
  <path class="d-edge" d="M 204 100 L 234 100" marker-end="url(#ai08q3-arrow)"/>
  <path class="d-edge" d="M 424 100 L 454 100" marker-end="url(#ai08q3-arrow)"/>
  <path class="d-edge" d="M 644 100 L 674 100" marker-end="url(#ai08q3-arrow)"/>
</svg>

- **June 13, 2023 — function calling.** OpenAI let developers describe functions with JSON Schema for \`gpt-4-0613\` and \`gpt-3.5-turbo-0613\`; the model returned JSON naming a function to call (OpenAI announcement; Simon Willison, same day). Arguments were best effort: usually valid, not guaranteed.
- **November 6, 2023 — tools, parallel calls, JSON mode.** At DevDay, OpenAI added parallel function calling (several calls from one model turn) for the \`1106\` models and introduced JSON mode via \`response_format\` (OpenAI DevDay post). The \`functions\` and \`function_call\` parameters were deprecated in favour of \`tools\` and \`tool_choice\` (Azure OpenAI docs record this for API version \`2023-12-01-preview\`).
- **May 2024 — Anthropic tool use GA** for the Claude 3 family, with forced tool selection, after an April beta (secondary coverage, May 31, 2024).
- **August 6, 2024 — strict schemas.** OpenAI Structured Outputs: \`response_format: {type: "json_schema", strict: true}\` for answers, and \`strict: true\` on function definitions for arguments, enforced by constrained decoding (OpenAI announcement).
- **November 25, 2024 — Model Context Protocol.** Anthropic open-sourced MCP, a standard way to publish tools (and resources and prompts) once and use them from any compatible client. It changed *where tools come from*, not how a model calls them: [What is the Model Context Protocol (MCP) and what problem does it solve?](/interview-question/what-is-the-model-context-protocol-mcp-and-what-problem-does-it-solve)

## 4. What Changed in 2025 (and Since)

<svg class="iq-diagram" width="100%" viewBox="0 0 880 200" role="img" aria-label="Timeline of 2025 changes from the March Responses API to June MCP output schemas to November structured outputs at Google and Anthropic">
  <defs>
    <marker id="ai08q3-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="50" width="180" height="100" rx="10"/>
  <text class="d-text" x="110" y="85" text-anchor="middle">Mar 2025</text>
  <text class="d-sub" x="110" y="110" text-anchor="middle">Responses API</text>
  <text class="d-sub" x="110" y="130" text-anchor="middle">items, flat tools</text>
  <rect class="d-box" x="240" y="50" width="180" height="100" rx="10"/>
  <text class="d-text" x="330" y="85" text-anchor="middle">Jun 2025</text>
  <text class="d-sub" x="330" y="110" text-anchor="middle">MCP spec</text>
  <text class="d-sub" x="330" y="130" text-anchor="middle">tool output schema</text>
  <rect class="d-box" x="460" y="50" width="180" height="100" rx="10"/>
  <text class="d-text" x="550" y="85" text-anchor="middle">Oct to Dec 2025</text>
  <text class="d-sub" x="550" y="110" text-anchor="middle">SDKs merge answer</text>
  <text class="d-sub" x="550" y="130" text-anchor="middle">and text calls</text>
  <rect class="d-box-accent" x="680" y="50" width="180" height="100" rx="10"/>
  <text class="d-text" x="770" y="85" text-anchor="middle">Nov 2025</text>
  <text class="d-sub" x="770" y="110" text-anchor="middle">Gemini, Anthropic</text>
  <text class="d-sub" x="770" y="130" text-anchor="middle">native schemas</text>
  <path class="d-edge" d="M 204 100 L 234 100" marker-end="url(#ai08q3-arrow2)"/>
  <path class="d-edge" d="M 424 100 L 454 100" marker-end="url(#ai08q3-arrow2)"/>
  <path class="d-edge" d="M 644 100 L 674 100" marker-end="url(#ai08q3-arrow2)"/>
</svg>

**1. OpenAI's Responses API (March 11, 2025).** Launched with built-in tools (web search, file search, computer use) and the Agents SDK (InfoQ, Maginative and SD Times coverage). For function tools the visible changes are structural: a tool definition is flat (\`{type: "function", name, parameters, strict}\` instead of nested under \`function\`), the model's call arrives as a \`function_call\` output item with a \`call_id\`, and you answer with a \`function_call_output\` item carrying the same \`call_id\`; structured answers move from \`response_format\` to \`text.format\` (third-party guides and the OpenAI community forum; OpenAI's own docs host was not reachable from this environment, so these shapes are reported from secondary sources). Mixing the Chat Completions and Responses tool formats is a common source of 400 errors.

**2. MCP tools gained typed results (spec revision 2025-06-18).** A tool may declare an \`outputSchema\`, and if it does, the server must return \`structuredContent\` conforming to it, alongside a text copy for older clients (MCP 2025-06-18 specification, as summarised in several write-ups). Tool *results* became structured output too.

**3. Structured output became native almost everywhere.**
- **Google, November 5, 2025:** JSON Schema support (\`response_mime_type: "application/json"\` plus \`response_json_schema\`) across all actively supported Gemini models, adding \`anyOf\`, \`$ref\` and \`prefixItems\`; the older \`responseSchema\` field takes an OpenAPI subset (Google developers blog; Firebase docs).
- **Anthropic, November 2025:** structured outputs in public beta with two halves, JSON outputs for answers and \`strict: true\` tool use for arguments, behind the header \`structured-outputs-2025-11-13\`. The current docs list it as generally available with the parameter now named \`output_config.format\` (Claude docs, checked October 2026).
- **Anthropic advanced tool use, November 2025:** a tool search tool (\`defer_loading\` so large catalogues do not fill the context), programmatic tool calling from a code sandbox, and \`input_examples\` on tool definitions (Anthropic engineering post "Advanced tool use"; Claude docs).

**4. SDKs folded structured output into the normal text call.** In the Vercel AI SDK 6 (beta announced October 2025), \`generateObject\` and \`streamObject\` are deprecated; the migration guide replaces them with \`generateText\`/\`streamText\` plus \`output: Output.object({ schema })\` (AI SDK 6.0 migration guide). Details are in [AI SDK 5: when to use streamText vs generateText vs generateObject?](/interview-question/ai-sdk-5-when-to-use-streamtext-vs-generatetext-vs-generateobject)

**5. Since then: forced tool calls are no longer universal.** Anthropic's current docs say some of the newest Claude models return a 400 for \`tool_choice\` of \`any\` or a named \`tool\`, and recommend \`auto\` with strict tool use, or structured outputs when you need a fixed JSON shape (Claude docs, "Define tools", checked October 2026). The "fake tool as answer schema" trick from 2023 is now a fallback, not the default.

The direction across all of this: one constrained-decoding mechanism, exposed twice (for answers and for tool arguments), with strictness opt-in becoming routine, and tools increasingly arriving from outside the app via MCP.

## 5. Design Consequences

- **Tools for actions and missing data; structured output for the answer shape.** If the model needs facts it does not have, or something must happen in the world, that is a tool. If code needs to read the final answer, that is structured output. Many requests use both: tools in the loop, a schema on the final turn.
- **One internal definition, thin adapters.** Wire formats differ in small, error-prone ways: nested vs flat definitions, \`parameters\` vs \`input_schema\`, arguments as a JSON *string* (OpenAI, which must be parsed) vs an object (Anthropic), \`tool_call_id\` vs \`call_id\` vs \`tool_use_id\`. Keep your tools as one internal type (often generated from Zod or Pydantic) and translate at the edge, which is what the example does and what gateways and SDKs do for you.
- **Strict mode changes the schema you send.** OpenAI strict requires every property in \`required\` and \`additionalProperties: false\`, so an optional field becomes required-and-nullable. Anthropic strict accepts optional parameters but caps them (24 across strict schemas in a request) and limits strict tools to 20 per request (Claude docs). Your adapter must apply these rules.
- **Good definitions still matter more than the API version.** Names, descriptions and parameter design decide whether the right tool gets called: [How do you design good tool definitions for an LLM?](/interview-question/how-do-you-design-good-tool-definitions-for-an-llm)

## 6. Verified: Running the Code

The example **"One tool, three wire formats, one internal ToolCall type"** takes one neutral tool definition and renders it for OpenAI Chat Completions, OpenAI Responses and Anthropic Messages, applying each provider's strict-mode rule. It then parses a canned reply in each provider's shape (no network: the replies are hand-written stubs following the documented field names) into one internal \`{id, name, args}\` type, runs a fake tool, and builds each provider's result message. Finally it shows the same idea for a final answer: native structured output in three formats, and the older forced-tool trick.

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
== 1. the same tool on the wire
OpenAI Chat Completions (nested under function):
  {"type":"function","function":{"name":"get_order_status","description":"Look up the shipping status of one order by its id. Use when the user asks where an order is.","parameters":{"type":"object","properties":{"order_id":{"type":"string","description":"Order id such as A-17"},"include_items":{"type":["boolean","null"],"description":"Also return the line items"}},"required":["order_id","include_items"],"additionalProperties":false},"strict":true}}
OpenAI Responses (flat):
  {"type":"function","name":"get_order_status","description":"Look up the shipping status of one order by its id. Use when the user asks where an order is.","parameters":{"type":"object","properties":{"order_id":{"type":"string","description":"Order id such as A-17"},"include_items":{"type":["boolean","null"],"description":"Also return the line items"}},"required":["order_id","include_items"],"additionalProperties":false},"strict":true}
Anthropic Messages (input_schema):
  {"name":"get_order_status","description":"Look up the shipping status of one order by its id. Use when the user asks where an order is.","input_schema":{"type":"object","properties":{"order_id":{"type":"string","description":"Order id such as A-17"},"include_items":{"type":"boolean","description":"Also return the line items"}},"required":["order_id"],"additionalProperties":false},"strict":true}

== 2. parse each reply into one internal type, run the tool, send the result back
chat      signal=tool_calls
  internal : {"id":"call_a1","name":"get_order_status","args":{"order_id":"A-17","include_items":null}}
  reply    : {"role":"tool","tool_call_id":"call_a1","content":"{\\"order_id\\":\\"A-17\\",\\"status\\":\\"shipped\\"}"}
responses signal=function_call
  internal : {"id":"call_b2","name":"get_order_status","args":{"order_id":"A-17","include_items":null}}
  reply    : {"type":"function_call_output","call_id":"call_b2","output":"{\\"order_id\\":\\"A-17\\",\\"status\\":\\"shipped\\"}"}
anthropic signal=tool_use
  internal : {"id":"toolu_c3","name":"get_order_status","args":{"order_id":"A-17"}}
  reply    : {"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_c3","content":"{\\"order_id\\":\\"A-17\\",\\"status\\":\\"shipped\\"}"}]}

== 3. structured output for the FINAL answer (no tool runs)
OpenAI Chat Completions response_format:
  {"type":"json_schema","json_schema":{"name":"order_answer","strict":true,"schema":{"type":"object","properties":{"status":{"type":"string","description":"Shipping status"},"eta_days":{"type":"integer","description":"Days until delivery"}},"required":["status","eta_days"],"additionalProperties":false}}}
OpenAI Responses text.format:
  {"format":{"type":"json_schema","name":"order_answer","strict":true,"schema":{"type":"object","properties":{"status":{"type":"string","description":"Shipping status"},"eta_days":{"type":"integer","description":"Days until delivery"}},"required":["status","eta_days"],"additionalProperties":false}}}
Anthropic output_config:
  {"format":{"type":"json_schema","schema":{"type":"object","properties":{"status":{"type":"string","description":"Shipping status"},"eta_days":{"type":"integer","description":"Days until delivery"}},"required":["status","eta_days"],"additionalProperties":false}}}
Older trick: define the answer as a tool and force the model to call it
  Anthropic tool_choice:
  {"tool_choice":{"type":"tool","name":"order_answer"}}
  OpenAI Chat Completions tool_choice:
  {"tool_choice":{"type":"function","function":{"name":"order_answer"}}}
~~~

What the run shows:

- The optional \`include_items\` became \`["boolean","null"]\` and required in both OpenAI formats, and stayed optional for Anthropic.
- OpenAI's arguments arrive as a string (\`'{"order_id":"A-17","include_items":null}'\`) and must be parsed; Anthropic's \`input\` is already an object. After \`normalise\`, all three are the same internal value except for the explicit \`null\`, which your tool must treat as "not provided".
- The three result messages differ only in envelope: a \`tool\` role message, a \`function_call_output\` item, or a \`tool_result\` block inside a \`user\` message.
- The final-answer schemas are the same JSON Schema in three different places in the request.

## Edge Cases Worth Knowing

- **Parallel calls.** One model turn can contain several tool calls; you must return a result for every id. Anthropic requires all \`tool_result\` blocks to come first in the next user message (Claude docs, "Handle tool calls").
- **Text plus tool calls.** Anthropic replies can include a \`text\` block before the \`tool_use\` block, as in the canned reply; do not assume the first block is the call.
- **Combining both.** With Anthropic you can send strict tools and a JSON output format in one request; the reply is then either a \`tool_use\` block or a JSON text block (Claude docs). Branch on the stop reason.
- **Gateways.** OpenAI-compatible endpoints from other vendors accept the Chat Completions tool format but may ignore \`strict\`. Test the guarantee, do not assume it.

## Common Pitfalls

- **Using the terms interchangeably in a design review.** "We will use function calling for extraction" usually means a forced tool; today native structured output is simpler and is the documented path on newer models.
- **Copying Chat Completions tool definitions into the Responses API.** Nested vs flat is the most common cause of "invalid parameter" errors when migrating.
- **Forgetting to parse OpenAI arguments.** They are a JSON string; with streaming they arrive in fragments and must be concatenated before parsing.
- **Assuming \`strict\` is on.** It is opt-in on several APIs and silently dropped by some wrappers; a non-strict tool call can still have missing or wrong-typed arguments.
- **Building on \`tool_choice\` forcing everywhere.** Some current models reject it; design for \`auto\` plus strict tools, or structured output for answers.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Untangle the names:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Function calling</strong> is OpenAI's 2023 name and <strong style="color:#ffca28;">tool calling</strong> or tool use is the general one; they are the same mechanism. The model emits a request naming a tool and its arguments, my code runs it, and the result goes back to the model.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Separate the purpose:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Structured output</strong> is different in purpose: it constrains the <em style="color:#f0e2c8;">final answer</em> to a JSON Schema, and no action runs. The paperwork is identical, JSON matching a schema, which is why the old way to get structured answers was a forced tool call.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Give the timeline:</strong> <span style="color:#f0e2c8;">Functions in June 2023; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tools</code>, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tool_choice</code>, parallel calls and JSON mode in November 2023; strict schemas for both answers and arguments in August 2024; MCP in November 2024 to make tools portable.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Say what changed in 2025:</strong> <span style="color:#f0e2c8;">OpenAI's Responses API with flat tool definitions and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function_call</code> items; MCP tool output schemas; Gemini JSON Schema on all active models; Anthropic structured outputs and strict tool use in November; and SDKs like AI SDK 6 folding object generation into the normal text call.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Turn it into a design rule:</strong> <span style="color:#f0e2c8;">Tools for actions and missing data, a schema for the answer, often both in one request. I keep one internal definition and thin adapters, because providers differ in small ways: nested vs flat, arguments as a JSON <em style="color:#f0e2c8;">string</em> vs an object, three different id field names.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you still use a forced tool call to get structured output?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only as a fallback, for a provider or model without native structured output. Native answer schemas are simpler and documented, and Anthropic's current docs say some newest models reject <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tool_choice</code> of <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">any</code> or a named tool, recommending <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">auto</code> with strict tools or structured outputs instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does parallel tool calling change in my code?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One model turn can contain several calls, so I execute independent ones concurrently and return a result for every call id before calling the model again. On Anthropic all <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tool_result</code> blocks must come first in the next user message.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does MCP replace tool calling?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. MCP standardises how tools are <em style="color:#d8d8d8;">published and discovered</em>, so one server works across clients. The model still calls tools through the provider tool-calling interface; the client translates MCP tool definitions into that format.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between strict on a tool and a response format?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;"><code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict: true</code> on a tool makes the tool <em style="color:#d8d8d8;">arguments</em> schema-valid. A response format such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text.format</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">output_config.format</code> makes the <em style="color:#d8d8d8;">final answer</em> schema-valid. Anthropic lets you use both in one request, and the reply is then either a tool call or a JSON answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What breaks when migrating from Chat Completions to the Responses API?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The tool definition shape, nested under <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function</code> vs flat, the call arriving as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function_call</code> item with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">call_id</code>, results sent back as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">function_call_output</code>, and structured answers moving from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">response_format</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">text.format</code>. An adapter layer keeps that migration in one file.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Function calling | OpenAI's 2023 name for the model returning a named function plus JSON arguments for your code to run |
| Tool calling (tool use) | The general name for that mechanism across providers and tool types |
| Structured output | Constraining the final answer to a JSON Schema so code can consume it directly |
| Forced tool call | \`tool_choice\` set so the model must call a given tool; the old way to get schema-shaped answers |

**Conclusion:** Function calling and tool calling are the same mechanism under an old and a new name: the model emits a structured request, your code executes it, and the result goes back. Structured output applies the same schema discipline to the final answer instead. Between 2023 and 2025 the guarantees went from best effort to strict, the forced-tool workaround gave way to native answer schemas at OpenAI, Google and Anthropic, OpenAI's Responses API reshaped the wire format, and MCP made tools portable with typed results. The design that survives these changes is simple: tools for actions and missing data, a schema for the answer, one internal definition, and thin adapters per provider.`,
    examples: [
      {
        label: `One tool, three wire formats, one internal ToolCall type`,
        variants: [
          { tech: "node", code: `// One tool definition, three wire formats, one internal ToolCall type.
// Response objects are canned stubs shaped like each API (no network).
const TOOL = {
  name: "get_order_status",
  description: "Look up the shipping status of one order by its id. Use when the user asks where an order is.",
  params: {
    order_id: { type: "string", description: "Order id such as A-17" },
    include_items: { type: "boolean", description: "Also return the line items" },
  },
  required: ["order_id"],
};
const show = (label, v) => console.log(\`\${label}\\n  \${JSON.stringify(v)}\`);

function jsonSchema(t, strictAllRequired) {
  const props = {};
  for (const [k, p] of Object.entries(t.params)) {
    const optional = !t.required.includes(k);
    // OpenAI strict mode: every key must be required, so "optional" becomes "may be null".
    props[k] = strictAllRequired && optional ? { ...p, type: [p.type, "null"] } : { ...p };
  }
  return {
    type: "object", properties: props,
    required: strictAllRequired ? Object.keys(t.params) : t.required,
    additionalProperties: false,
  };
}
const toChat = (t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: jsonSchema(t, true), strict: true } });
const toResponses = (t) => ({ type: "function", name: t.name, description: t.description, parameters: jsonSchema(t, true), strict: true });
const toAnthropic = (t) => ({ name: t.name, description: t.description, input_schema: jsonSchema(t, false), strict: true });

console.log("== 1. the same tool on the wire");
show("OpenAI Chat Completions (nested under function):", toChat(TOOL));
show("OpenAI Responses (flat):", toResponses(TOOL));
show("Anthropic Messages (input_schema):", toAnthropic(TOOL));

// Canned replies in each API shape. Note: OpenAI sends arguments as a JSON STRING.
const REPLIES = {
  chat: { choices: [{ finish_reason: "tool_calls", message: { role: "assistant", content: null, tool_calls: [
    { id: "call_a1", type: "function", function: { name: "get_order_status", arguments: '{"order_id":"A-17","include_items":null}' } }] } }] },
  responses: { output: [{ type: "function_call", call_id: "call_b2", name: "get_order_status", arguments: '{"order_id":"A-17","include_items":null}' }] },
  anthropic: { stop_reason: "tool_use", content: [
    { type: "text", text: "Let me check that order." },
    { type: "tool_use", id: "toolu_c3", name: "get_order_status", input: { order_id: "A-17" } }] },
};
function normalise(api, r) {
  if (api === "chat") return r.choices[0].message.tool_calls.map((c) => ({ id: c.id, name: c.function.name, args: JSON.parse(c.function.arguments) }));
  if (api === "responses") return r.output.filter((o) => o.type === "function_call").map((o) => ({ id: o.call_id, name: o.name, args: JSON.parse(o.arguments) }));
  return r.content.filter((b) => b.type === "tool_use").map((b) => ({ id: b.id, name: b.name, args: b.input }));
}
const stopSignal = { chat: (r) => r.choices[0].finish_reason, responses: (r) => r.output.map((o) => o.type).join(","), anthropic: (r) => r.stop_reason };
function runTool(args) {
  const out = { order_id: args.order_id, status: "shipped" };
  if (args.include_items) out.items = ["mug"];
  return out;
}
const resultMessage = {
  chat: (c, out) => ({ role: "tool", tool_call_id: c.id, content: out }),
  responses: (c, out) => ({ type: "function_call_output", call_id: c.id, output: out }),
  anthropic: (c, out) => ({ role: "user", content: [{ type: "tool_result", tool_use_id: c.id, content: out }] }),
};

console.log("\\n== 2. parse each reply into one internal type, run the tool, send the result back");
for (const api of Object.keys(REPLIES)) {
  const calls = normalise(api, REPLIES[api]);
  console.log(\`\${api.padEnd(9)} signal=\${stopSignal[api](REPLIES[api])}\`);
  for (const c of calls) {
    console.log(\`  internal : \${JSON.stringify(c)}\`);
    const out = JSON.stringify(runTool(c.args));
    console.log(\`  reply    : \${JSON.stringify(resultMessage[api](c, out))}\`);
  }
}

console.log("\\n== 3. structured output for the FINAL answer (no tool runs)");
const ANSWER = { name: "order_answer", params: { status: { type: "string", description: "Shipping status" }, eta_days: { type: "integer", description: "Days until delivery" } }, required: ["status", "eta_days"] };
show("OpenAI Chat Completions response_format:", { type: "json_schema", json_schema: { name: ANSWER.name, strict: true, schema: jsonSchema(ANSWER, true) } });
show("OpenAI Responses text.format:", { format: { type: "json_schema", name: ANSWER.name, strict: true, schema: jsonSchema(ANSWER, true) } });
show("Anthropic output_config:", { format: { type: "json_schema", schema: jsonSchema(ANSWER, false) } });
console.log("Older trick: define the answer as a tool and force the model to call it");
show("  Anthropic tool_choice:", { tool_choice: { type: "tool", name: ANSWER.name } });
show("  OpenAI Chat Completions tool_choice:", { tool_choice: { type: "function", function: { name: ANSWER.name } } });` },
          { tech: "python", code: `# One tool definition, three wire formats, one internal ToolCall type.
# Response objects are canned stubs shaped like each API (no network).
import json

TOOL = {
    "name": "get_order_status",
    "description": "Look up the shipping status of one order by its id. Use when the user asks where an order is.",
    "params": {
        "order_id": {"type": "string", "description": "Order id such as A-17"},
        "include_items": {"type": "boolean", "description": "Also return the line items"},
    },
    "required": ["order_id"],
}


def dumps(v):
    return json.dumps(v, separators=(",", ":"), ensure_ascii=False)


def show(label, v):
    print(f"{label}\\n  {dumps(v)}")


def json_schema(t, strict_all_required):
    props = {}
    for k, p in t["params"].items():
        optional = k not in t["required"]
        # OpenAI strict mode: every key must be required, so "optional" becomes "may be null".
        props[k] = {**p, "type": [p["type"], "null"]} if strict_all_required and optional else dict(p)
    return {
        "type": "object", "properties": props,
        "required": list(t["params"]) if strict_all_required else t["required"],
        "additionalProperties": False,
    }


def to_chat(t):
    return {"type": "function", "function": {"name": t["name"], "description": t["description"], "parameters": json_schema(t, True), "strict": True}}


def to_responses(t):
    return {"type": "function", "name": t["name"], "description": t["description"], "parameters": json_schema(t, True), "strict": True}


def to_anthropic(t):
    return {"name": t["name"], "description": t["description"], "input_schema": json_schema(t, False), "strict": True}


print("== 1. the same tool on the wire")
show("OpenAI Chat Completions (nested under function):", to_chat(TOOL))
show("OpenAI Responses (flat):", to_responses(TOOL))
show("Anthropic Messages (input_schema):", to_anthropic(TOOL))

# Canned replies in each API shape. Note: OpenAI sends arguments as a JSON STRING.
REPLIES = {
    "chat": {"choices": [{"finish_reason": "tool_calls", "message": {"role": "assistant", "content": None, "tool_calls": [
        {"id": "call_a1", "type": "function", "function": {"name": "get_order_status", "arguments": '{"order_id":"A-17","include_items":null}'}}]}}]},
    "responses": {"output": [{"type": "function_call", "call_id": "call_b2", "name": "get_order_status", "arguments": '{"order_id":"A-17","include_items":null}'}]},
    "anthropic": {"stop_reason": "tool_use", "content": [
        {"type": "text", "text": "Let me check that order."},
        {"type": "tool_use", "id": "toolu_c3", "name": "get_order_status", "input": {"order_id": "A-17"}}]},
}


def normalise(api, r):
    if api == "chat":
        return [{"id": c["id"], "name": c["function"]["name"], "args": json.loads(c["function"]["arguments"])} for c in r["choices"][0]["message"]["tool_calls"]]
    if api == "responses":
        return [{"id": o["call_id"], "name": o["name"], "args": json.loads(o["arguments"])} for o in r["output"] if o["type"] == "function_call"]
    return [{"id": b["id"], "name": b["name"], "args": b["input"]} for b in r["content"] if b["type"] == "tool_use"]


STOP_SIGNAL = {
    "chat": lambda r: r["choices"][0]["finish_reason"],
    "responses": lambda r: ",".join(o["type"] for o in r["output"]),
    "anthropic": lambda r: r["stop_reason"],
}


def run_tool(args):
    out = {"order_id": args["order_id"], "status": "shipped"}
    if args.get("include_items"):
        out["items"] = ["mug"]
    return out


RESULT_MESSAGE = {
    "chat": lambda c, out: {"role": "tool", "tool_call_id": c["id"], "content": out},
    "responses": lambda c, out: {"type": "function_call_output", "call_id": c["id"], "output": out},
    "anthropic": lambda c, out: {"role": "user", "content": [{"type": "tool_result", "tool_use_id": c["id"], "content": out}]},
}

print("\\n== 2. parse each reply into one internal type, run the tool, send the result back")
for api, reply in REPLIES.items():
    calls = normalise(api, reply)
    print(f"{api:<9} signal={STOP_SIGNAL[api](reply)}")
    for c in calls:
        print(f"  internal : {dumps(c)}")
        out = dumps(run_tool(c["args"]))
        print(f"  reply    : {dumps(RESULT_MESSAGE[api](c, out))}")

print("\\n== 3. structured output for the FINAL answer (no tool runs)")
ANSWER = {"name": "order_answer", "params": {"status": {"type": "string", "description": "Shipping status"}, "eta_days": {"type": "integer", "description": "Days until delivery"}}, "required": ["status", "eta_days"]}
show("OpenAI Chat Completions response_format:", {"type": "json_schema", "json_schema": {"name": ANSWER["name"], "strict": True, "schema": json_schema(ANSWER, True)}})
show("OpenAI Responses text.format:", {"format": {"type": "json_schema", "name": ANSWER["name"], "strict": True, "schema": json_schema(ANSWER, True)}})
show("Anthropic output_config:", {"format": {"type": "json_schema", "schema": json_schema(ANSWER, False)}})
print("Older trick: define the answer as a tool and force the model to call it")
show("  Anthropic tool_choice:", {"tool_choice": {"type": "tool", "name": ANSWER["name"]}})
show("  OpenAI Chat Completions tool_choice:", {"tool_choice": {"type": "function", "function": {"name": ANSWER["name"]}}})` },
        ],
      },
    ],
  },
  {
    title: `How does function calling (tool use) work under the hood?`,
    difficulty: "medium",
    seoDescription: `Tool use step by step: definitions rendered into the prompt, tool calls as model text, stop reasons, your runtime executing, and the re-sent history.`,
    description: `**Question presented to candidate:**
"When we pass a list of tools to the model API and it 'calls' one, what is actually happening? Walk me through one tool call end to end: what the model sees, what it produces, who runs the code, and how the result gets back."

**What a strong answer should cover:**
- The model never executes anything: tool definitions are rendered into the prompt as text, and a model post-trained on tool-use data emits a special tool-call format with a name and JSON arguments
- The API server parses that output into structured blocks (Anthropic \`tool_use\` blocks, OpenAI \`tool_calls\` or \`function_call\` items) and signals it with a stop reason such as \`tool_use\`; strict mode constrains the argument tokens to the schema
- Your runtime validates the arguments, checks permissions, executes the function, and sends the result back tied to the call id; errors go back as data (\`is_error\`) so the model can correct itself
- It is a loop: the whole history, including tool definitions and every result, is re-sent on each call until the model answers in text or a step limit stops it, so cost and latency grow per step
- Details that break naive implementations: parallel calls in one turn, \`tool_choice\` (auto, any or a named tool, none), ordering rules for results, truncated calls at \`max_tokens\`, and tool results as untrusted input

**Code / implementation expected:** Optional — a minimal loop that executes tool calls and appends results, or pseudo-code of the message sequence.`,
    answer: `**Target Audience:** Engineers who have passed a \`tools\` array to an LLM API and want to know exactly what happens between "the model decided to call a tool" and "the answer came back".
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (a full tool-use loop with a stub model that reads and writes plain text). API behaviour is quoted from the Claude docs ("Define tools", "Handle tool calls", "Stop reasons"), checked October 2026, and other vendors where cited.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Picture a manager who works only by passing notes under a door. They cannot leave the room, cannot use a computer, cannot phone anyone. Taped to the inside of the door is a menu: "You may request: \`get_weather(city, unit)\`. Write requests on the pink slips." When a question comes in, the manager writes a pink slip, "get_weather, city Paris, unit fahrenheit", and slides it out. Someone outside does the work, writes the answer on a blue slip, and slides it back with the same number. The manager reads it and either writes another pink slip or writes the final answer.

That is all tool calling is. The model is the manager: it only reads and writes text. The menu on the door is your tool definitions. The pink slip is the tool call. The person outside is **your code**. Everything that touches the real world happens outside the room, and the manager only learns what you slide back in.

Interviewers ask this because so many bugs come from forgetting it: "the model looked up the order" (no, your code did), "the model checked permissions" (it cannot), "why did it call the tool with a made-up id?" (because arguments are text the model wrote).

## 2. The Round Trip

<svg class="iq-diagram" width="100%" viewBox="0 0 880 330" role="img" aria-label="Your app sends tools and messages to the API, the API renders a prompt for the model, the model writes tool call text, the API parses it into blocks, your app runs the tool and sends the result back">
  <defs>
    <marker id="ai08q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="30" width="220" height="80" rx="10"/>
  <text class="d-text" x="130" y="63" text-anchor="middle">your runtime</text>
  <text class="d-sub" x="130" y="88" text-anchor="middle">tools plus messages</text>
  <rect class="d-box" x="330" y="30" width="220" height="80" rx="10"/>
  <text class="d-text" x="440" y="63" text-anchor="middle">API server</text>
  <text class="d-sub" x="440" y="88" text-anchor="middle">renders one prompt</text>
  <rect class="d-box-muted" x="640" y="30" width="220" height="80" rx="10"/>
  <text class="d-text" x="750" y="63" text-anchor="middle">model</text>
  <text class="d-sub" x="750" y="88" text-anchor="middle">text in, text out</text>
  <rect class="d-box" x="330" y="220" width="220" height="80" rx="10"/>
  <text class="d-text" x="440" y="253" text-anchor="middle">API server</text>
  <text class="d-sub" x="440" y="278" text-anchor="middle">parses tool_use blocks</text>
  <rect class="d-box-accent" x="20" y="220" width="220" height="80" rx="10"/>
  <text class="d-text" x="130" y="253" text-anchor="middle">your runtime</text>
  <text class="d-sub" x="130" y="278" text-anchor="middle">validate and execute</text>
  <path class="d-edge" d="M 244 70 L 324 70" marker-end="url(#ai08q4-arrow)"/>
  <path class="d-edge" d="M 554 70 L 634 70" marker-end="url(#ai08q4-arrow)"/>
  <path class="d-edge" d="M 750 114 L 750 260 L 556 260" marker-end="url(#ai08q4-arrow)"/>
  <path class="d-edge" d="M 326 260 L 246 260" marker-end="url(#ai08q4-arrow)"/>
  <path class="d-edge-dashed" d="M 130 216 L 130 116" marker-end="url(#ai08q4-arrow)"/>
</svg>

The solid arrows are one model call. The dashed arrow is your runtime appending the tool result to the conversation and starting the next call; the loop repeats until the model writes an answer instead of a tool call.

### Step 1: tool definitions become prompt text

You send \`tools\` as structured JSON, but the model consumes one sequence of tokens. The API server renders your definitions into the prompt. Anthropic documents this directly: when you call the API with \`tools\`, "the API constructs a special system prompt from the tool definitions, tool configuration, and any user-specified system prompt", and it publishes the template, which begins "In this environment you have access to a set of tools you can use to answer the user's question" and includes the tool definitions in JSON Schema format (Claude docs, "Define tools"). For open-weight models the chat template shipped with the model shows the exact markup it was trained on.

📌 **Interview term: tool definition** — a name, a natural-language description and a JSON Schema for the arguments (Anthropic \`input_schema\`, OpenAI \`parameters\`). It is prompt text the model reads, which is why it costs input tokens on every call and why its wording decides which tool gets picked.

### Step 2: the model writes a tool call, as text

The model was post-trained on many examples of conversations where calling a tool was the right move, so given a question it cannot answer from the prompt, the most likely next tokens are the tool-call markup: a tool name and a JSON object of arguments. Nothing is executed. The arguments are generated exactly like any other text, which is why they can be wrong, invented, or (without strict mode) not even schema-valid. With strict tool use enabled, the argument tokens are constrained by a compiled grammar so they always match the schema (Claude docs: strict tool use "guarantees that tool inputs will always match your schema exactly").

📌 **Interview term: tool call** — the model's structured request: which tool, which arguments, and an id. Anthropic returns it as a \`tool_use\` content block with \`id\`, \`name\` and \`input\`; OpenAI Chat Completions as \`tool_calls\` entries whose \`arguments\` is a JSON string; the OpenAI Responses API as a \`function_call\` item with a \`call_id\`. The id-naming differences are covered in [Tool calling vs function calling vs structured output — what changed in 2025?](/interview-question/tool-calling-vs-function-calling-vs-structured-output-what-changed-in-2025)

### Step 3: the server parses the text and stops

The API server recognises the markup, turns it into structured blocks and ends the response with a reason that says "your turn".

📌 **Interview term: stop reason** — why the model stopped. Anthropic lists seven values: \`end_turn\` (finished naturally), \`max_tokens\`, \`stop_sequence\`, \`tool_use\` (it is calling a tool and expects you to run it), \`pause_turn\` (a server-side tool loop hit its iteration limit), \`refusal\`, and \`model_context_window_exceeded\` (Claude docs, "Stop reasons"). OpenAI Chat Completions reports \`finish_reason: "tool_calls"\`. Your loop branches on this field, never on whether the text "looks like" a call.

### Step 4: your runtime executes

This is ordinary backend code, and it owns everything the model cannot do:

1. **Look up** the tool by name (an unknown name is an error you report back).
2. **Validate** the arguments against the schema, plus business rules.
3. **Authorise**: is this user allowed to do this, on this resource? See [How do you sandbox an agent and enforce least-privilege tool access?](/interview-question/how-do-you-sandbox-an-agent-and-enforce-least-privilege-tool-access)
4. **Execute** with a timeout, possibly with human approval for risky actions.
5. **Return** the result tied to the call id, or an error marked as an error.

📌 **Interview term: tool result** — the message you send back with the output of a call. Anthropic: a \`tool_result\` block with \`tool_use_id\`, \`content\` and optional \`is_error: true\`, inside a \`user\` message; OpenAI Chat Completions: a message with role \`tool\` and \`tool_call_id\`.

Anthropic's formatting rules are strict: tool results must immediately follow the assistant message that made the calls, and in that user message the \`tool_result\` blocks must come first, before any text, or the request fails with a 400 (Claude docs, "Handle tool calls"). When a call is invalid, you can return an \`is_error\` result describing the problem; Anthropic notes Claude will retry 2-3 times with corrections before apologising to the user, and recommends instructive messages such as "Rate limit exceeded. Retry after 60 seconds." over a bare "failed". How to design retries and timeouts around this is its own question: [How should an agent handle tool errors, timeouts and retries?](/interview-question/how-should-an-agent-handle-tool-errors-timeouts-and-retries)

### Step 5: loop

The next request contains everything again: system prompt, tool definitions, the user message, the assistant's tool calls and your results. The model is stateless between calls, so the history *is* its memory. The loop ends when the stop reason is \`end_turn\` (or when your own step, time or cost limit fires). This loop is the core of every agent: [What is an AI agent and how does the agent loop work?](/interview-question/what-is-an-ai-agent-and-how-does-the-agent-loop-work)

## 3. Controlling Whether a Tool Is Called

📌 **Interview term: tool_choice** — the request setting that controls tool calling. Anthropic documents four options: \`auto\` (the model decides; the default when tools are provided), \`any\` (must call one of the tools), \`tool\` (must call this named tool) and \`none\` (no tools; the default when none are provided). OpenAI has equivalent settings.

Two documented details are worth knowing. With \`any\` or \`tool\`, the API *prefills* the assistant turn to force a tool call, so the model will not write any explanation before the \`tool_use\` block, and forcing a tool also skips extended thinking. And some of the newest Claude models reject \`any\` and \`tool\` with a 400 error; the documented alternative is \`auto\` with strict tool use, or structured outputs when you need a fixed JSON shape (Claude docs, "Define tools", checked October 2026).

## 4. Client Tools and Server Tools

Not every tool runs in your code. **Client tools** are the ones you define and execute, as above. **Server tools** (such as a provider's web search or code execution) are executed by the provider during the same request; you see their calls and results in the response but do not run them. With Anthropic, if a server-side tool loop hits its iteration limit the response stops with \`pause_turn\`, and you send the content back to let it continue (Claude docs, "Stop reasons"). A third variant, **MCP tools**, are client tools whose definitions and execution live in a separate MCP server that your app connects to: [What is the Model Context Protocol (MCP) and what problem does it solve?](/interview-question/what-is-the-model-context-protocol-mcp-and-what-problem-does-it-solve)

## 5. Verified: Running the Code

The example **"Tool use under the hood: render, generate text, parse, execute, loop"** makes every hidden step visible. A \`render\` function turns the tool list and message history into one string, as an API server does. A stub \`model\` function receives only that string and returns only text (scripted: a real model would generate these tokens itself). \`parseReply\` plays the API server, extracting \`<tool_call>\` markup into \`tool_use\` blocks with ids and a stop reason. The runtime validates arguments against the schema, executes valid calls and returns invalid ones as \`is_error\` results. Token counts are estimated as characters divided by 4, a common rule of thumb for English, not a real tokenizer.

The markup \`<tool_call>...</tool_call>\` is invented for this demo; each provider uses its own internal format.

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text

--- model call 1: prompt 7 lines, ~108 input tokens (tool definitions ~63)
raw model text : I will check both cities.<tool_call>{"name":"get_weather","input":{"city":"Paris","unit":"fahrenheit"}}</tool_call><tool_call>{"name":"get_weather","input":{"city":"Oslo","unit":"kelvin"}}</tool_call>
parsed by API  : stop_reason=tool_use blocks=text,tool_use(toolu_01),tool_use(toolu_02)
runtime        : toolu_01 -> {"city":"Paris","temp":68,"unit":"fahrenheit"}
runtime        : toolu_02 -> ERROR invalid arguments: unit must be one of celsius|fahrenheit, got kelvin. Fix and call again.

--- model call 2: prompt 15 lines, ~220 input tokens (tool definitions ~63)
raw model text : <tool_call>{"name":"get_weather","input":{"city":"Oslo","unit":"fahrenheit"}}</tool_call>
parsed by API  : stop_reason=tool_use blocks=tool_use(toolu_03)
runtime        : toolu_03 -> {"city":"Oslo","temp":41,"unit":"fahrenheit"}

full prompt the model will read on call 3:
[system]
You can call tools. To call one, write <tool_call>{json}</tool_call>.
Tools (JSON Schema):
{"name":"get_weather","description":"Current temperature for one city. Call once per city.","input_schema":{"type":"object","properties":{"city":{"type":"string"},"unit":{"type":"string","enum":["celsius","fahrenheit"]}},"required":["city","unit"]}}
[user]
Is it warmer in Paris or Oslo right now? Answer in Fahrenheit.
[assistant]
I will check both cities.
<tool_call id="toolu_01">{"name":"get_weather","input":{"city":"Paris","unit":"fahrenheit"}}</tool_call>
<tool_call id="toolu_02">{"name":"get_weather","input":{"city":"Oslo","unit":"kelvin"}}</tool_call>
[tool_result id="toolu_01"]
{"city":"Paris","temp":68,"unit":"fahrenheit"}
[tool_result id="toolu_02" is_error]
invalid arguments: unit must be one of celsius|fahrenheit, got kelvin. Fix and call again.
[assistant]
<tool_call id="toolu_03">{"name":"get_weather","input":{"city":"Oslo","unit":"fahrenheit"}}</tool_call>
[tool_result id="toolu_03"]
{"city":"Oslo","temp":41,"unit":"fahrenheit"}
[assistant]

--- model call 3: prompt 19 lines, ~267 input tokens (tool definitions ~63)
raw model text : Paris is warmer: 68 F against 41 F in Oslo.
parsed by API  : stop_reason=end_turn blocks=text
final answer   : Paris is warmer: 68 F against 41 F in Oslo.

total input tokens over the loop ~595 (history is re-sent on every call)
~~~

What the run shows:

- **Parallel calls.** Call 1 produced two tool calls in one turn. The runtime handled both and returned two results, each tied to its id.
- **The model wrote a bad argument.** \`unit: "kelvin"\` is not in the enum. Without strict mode the model *can* write it; the runtime caught it and sent it back as an error, and the model fixed it on call 2. With strict tool use this particular mistake could not be generated, but a valid-but-wrong value (say, the wrong city) still could.
- **The model only ever saw text.** The full prompt before call 3 is printed: definitions, question, calls, results, all as one string.
- **History is re-sent every time.** Input grew from about 108 to 220 to 267 tokens, about 595 in total for one question, and the tool definitions (about 63 tokens here) were paid for on every call. With real tool catalogues of thousands of tokens, this is why tool definitions belong in the cached prefix: [What is prompt caching and how does it reduce cost and latency?](/interview-question/what-is-prompt-caching-and-how-does-it-reduce-cost-and-latency)

## 6. What a Real Loop Looks Like

The same loop against the Anthropic Messages API (not run here; field names from the Claude docs, checked October 2026). Anthropic's SDKs also provide a Tool Runner that manages this loop for you; writing it once by hand is the best way to understand what that helper does.

~~~python
messages = [{"role": "user", "content": "Is it warmer in Paris or Oslo? Answer in Fahrenheit."}]
for step in range(MAX_STEPS):
    resp = client.messages.create(model=MODEL, max_tokens=1024, tools=TOOLS, messages=messages)
    messages.append({"role": "assistant", "content": resp.content})
    if resp.stop_reason != "tool_use":
        break                                   # end_turn, max_tokens, refusal...: handle each
    results = []
    for block in resp.content:
        if block.type == "tool_use":
            results.append(run_tool_safely(block.id, block.name, block.input))  # validate, authorise, execute
    messages.append({"role": "user", "content": results})   # tool_result blocks first
~~~

## Edge Cases Worth Knowing

- **Truncated calls.** If the response hits \`max_tokens\` while writing a \`tool_use\` block, the call is incomplete and unusable; the documented fix is to retry with a higher \`max_tokens\` (Claude docs, "Stop reasons").
- **Text alongside calls.** A response can contain prose ("Let me check that") before the tool call. Do not assume the first block is the call, and do not show half-turns to users as final answers.
- **Every call needs a result.** If you run three of four parallel calls and send back three results, the next request fails or the model is confused. Return an error result for anything you skipped.
- **Tool results are untrusted.** A web page or email returned by a tool can contain instructions aimed at the model (indirect prompt injection). Anthropic recommends keeping such content inside \`tool_result\` blocks rather than system prompts: [What is prompt injection and how do you defend against it?](/interview-question/what-is-prompt-injection-and-how-do-you-defend-against-it)
- **Changing \`tool_choice\` mid-conversation** invalidates cached message blocks in Anthropic prompt caching, though tool definitions and system prompt stay cached (Claude docs).

## Common Pitfalls

- **Believing the model executed something.** It produced text; if the action "happened", your code did it, so your code is where validation, authorisation and logging live.
- **Executing arguments without validation.** Arguments are model-written text. Validate types and enums, then check that ids exist and belong to the caller.
- **No step limit.** A loop that runs "until the model stops" can run forever on a confused model. Cap steps, time and spend.
- **Dropping the call id.** Results must reference the exact id they answer; mixing them up silently swaps facts between calls.
- **Raising exceptions instead of returning errors.** A crashed loop teaches the model nothing; an \`is_error\` result with a precise message lets it recover.
- **Ignoring the growing context.** Each step re-sends everything. Long loops need summarising, result trimming and caching: [How do you manage conversations that outgrow the context window?](/interview-question/how-do-you-manage-conversations-that-outgrow-the-context-window)

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The one-liner:</strong> <span style="color:#f0e2c8;">The model never executes anything. <strong style="color:#ffca28;">It emits intents, my code executes them.</strong> Tool calling is a conversation protocol between the model, the API server and my runtime.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What the model sees:</strong> <span style="color:#f0e2c8;">The API renders my <strong style="color:#ffca28;">tool definitions</strong>, name, description and JSON Schema, into the prompt as text; Anthropic even documents the system prompt template it builds. That is why definitions cost input tokens on every call and why their wording decides which tool is picked.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What the model produces:</strong> <span style="color:#f0e2c8;">A model post-trained on tool-use data writes a tool call as text: a name and JSON arguments. The server parses it into a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tool_use</code> block or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tool_calls</code> entry with an id and stops with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stop_reason: tool_use</code>. With strict mode the argument tokens are grammar-constrained to the schema.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What my runtime does:</strong> <span style="color:#f0e2c8;">Look up the tool, validate the arguments, authorise the user, execute with a timeout, and send back a <strong style="color:#ffca28;">tool result</strong> tied to the call id, or an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">is_error</code> result with a precise message so the model can correct itself. In my run the model asked for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">kelvin</code>, got an error back, and fixed it on the next call.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Why it is a loop:</strong> <span style="color:#f0e2c8;">The whole history is re-sent each call until the model answers in text or my step limit fires. My three-call demo went from about 108 to 267 input tokens per call, so I cap steps, cache the tool definitions in the prefix, and trim large results.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the model know when to call a tool instead of answering?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Training, not magic: post-training on conversations where a tool call was the right next step makes the call markup the most likely continuation when the prompt lacks the needed facts. The descriptions steer that choice, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tool_choice</code> can force or forbid it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens with several tool calls in one response?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each has its own id. I run independent ones concurrently and return a result for every id in the next message; on Anthropic all <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tool_result</code> blocks must come first in that user message. Skipping one breaks the next request or confuses the model.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can the model call a tool that does not exist or pass bad arguments?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without strict mode, yes, because arguments are generated text. My runtime treats unknown names and invalid arguments as errors returned to the model. Strict tool use removes schema violations, but not valid-but-wrong values like the wrong customer id, so validation against real data stays.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does tool_choice any or a named tool actually do?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The API prefills the assistant turn so a tool call is forced, which means no explanation text before it and, per Anthropic docs, no extended thinking on that turn. Some of the newest Claude models reject forced choices and recommend <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">auto</code> with strict tools or structured outputs instead.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Who runs a server tool like web search?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The provider, inside the same request: I see the call and result in the response but do not execute it. Client tools run in my code, and MCP tools run in a separate MCP server my app connects to. Anthropic signals a server-side loop that hit its iteration limit with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">pause_turn</code>.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Tool definition | Name, description and argument JSON Schema, rendered into the prompt the model reads |
| Tool call | The model's structured request: tool name, arguments and an id |
| Stop reason | Why generation stopped; \`tool_use\` means "run the tool and call me again" |
| Tool result | Your reply with the tool's output (or an error) tied to the call id |
| tool_choice | Setting that lets the model decide, forces a tool, or disables tools |

**Conclusion:** Function calling is a conversation protocol, not remote execution. The API renders your tool definitions into the prompt, the model writes a tool call as text because it was trained to, the server parses that text into structured blocks and stops with \`tool_use\`, and your runtime validates, authorises, executes and sends back a result tied to the call id. Then the whole history goes back to the model and the loop repeats until it answers. Say "the model emits intents, my code executes them", then show you know the details that break real systems: parallel calls, errors returned as data, truncated calls, untrusted results and the cost of re-sending history on every step.`,
    examples: [
      {
        label: `Tool use under the hood: render, generate text, parse, execute, loop`,
        variants: [
          { tech: "node", code: `// Tool use under the hood: the model only reads and writes TEXT. The "API" renders
// tools + history into a prompt, parses tool-call markup out of the model text, and
// your runtime validates, executes and appends results until the model stops.
const TOOLS = [{
  name: "get_weather",
  description: "Current temperature for one city. Call once per city.",
  input_schema: { type: "object", properties: { city: { type: "string" }, unit: { type: "string", enum: ["celsius", "fahrenheit"] } }, required: ["city", "unit"] },
}];
const CELSIUS = { Paris: 20, Oslo: 5 };
const IMPL = { get_weather: ({ city, unit }) => ({ city, temp: unit === "fahrenheit" ? CELSIUS[city] * 9 / 5 + 32 : CELSIUS[city], unit }) };

// 1. What the model actually receives: one long string.
function render(messages) {
  const lines = ["[system]", "You can call tools. To call one, write <tool_call>{json}</tool_call>.", "Tools (JSON Schema):"];
  for (const t of TOOLS) lines.push(JSON.stringify(t));
  for (const m of messages) {
    if (m.content.some((b) => b.type !== "tool_result")) lines.push(\`[\${m.role}]\`);
    for (const b of m.content) {
      if (b.type === "text") lines.push(b.text);
      if (b.type === "tool_use") lines.push(\`<tool_call id="\${b.id}">\${JSON.stringify({ name: b.name, input: b.input })}</tool_call>\`);
      if (b.type === "tool_result") lines.push(\`[tool_result id="\${b.tool_use_id}"\${b.is_error ? " is_error" : ""}]\`, b.content);
    }
  }
  lines.push("[assistant]");
  return lines.join("\\n");
}
// 2. Stub model: text in, text out (a real model predicts these tokens).
function model(prompt) {
  if (!prompt.includes("[tool_result")) return 'I will check both cities.<tool_call>{"name":"get_weather","input":{"city":"Paris","unit":"fahrenheit"}}</tool_call><tool_call>{"name":"get_weather","input":{"city":"Oslo","unit":"kelvin"}}</tool_call>';
  if (!prompt.includes('"city":"Oslo","temp"')) return '<tool_call>{"name":"get_weather","input":{"city":"Oslo","unit":"fahrenheit"}}</tool_call>';
  return "Paris is warmer: 68 F against 41 F in Oslo.";
}
// 3. The API server parses the markup into structured blocks and a stop reason.
let nextId = 1;
function parseReply(text) {
  const content = [];
  const first = text.indexOf("<tool_call>");
  const prose = first === -1 ? text : text.slice(0, first);
  if (prose) content.push({ type: "text", text: prose });
  for (const m of text.matchAll(/<tool_call>(.*?)<\\/tool_call>/g)) {
    const call = JSON.parse(m[1]);
    content.push({ type: "tool_use", id: \`toolu_\${String(nextId++).padStart(2, "0")}\`, name: call.name, input: call.input });
  }
  return { stop_reason: content.some((b) => b.type === "tool_use") ? "tool_use" : "end_turn", content };
}
// 4. Your runtime: validate arguments (the model wrote them), execute, report errors as data.
function validate(tool, input) {
  const s = tool.input_schema, errs = [];
  for (const k of s.required) if (!(k in input)) errs.push(\`missing \${k}\`);
  for (const [k, v] of Object.entries(input)) {
    const p = s.properties[k];
    if (!p) errs.push(\`unknown argument \${k}\`);
    else if (p.enum && !p.enum.includes(v)) errs.push(\`\${k} must be one of \${p.enum.join("|")}, got \${v}\`);
  }
  return errs;
}
function runTool(block) {
  const tool = TOOLS.find((t) => t.name === block.name);
  if (!tool) return { type: "tool_result", tool_use_id: block.id, is_error: true, content: \`unknown tool \${block.name}\` };
  const errs = validate(tool, block.input);
  if (errs.length) return { type: "tool_result", tool_use_id: block.id, is_error: true, content: \`invalid arguments: \${errs.join("; ")}. Fix and call again.\` };
  return { type: "tool_result", tool_use_id: block.id, content: JSON.stringify(IMPL[block.name](block.input)) };
}

const messages = [{ role: "user", content: [{ type: "text", text: "Is it warmer in Paris or Oslo right now? Answer in Fahrenheit." }] }];
const toolTokens = Math.ceil(TOOLS.map((t) => JSON.stringify(t)).join("\\n").length / 4);
let totalIn = 0;
for (let turn = 1; turn <= 5; turn++) {
  const prompt = render(messages);
  const inTok = Math.ceil(prompt.length / 4);
  totalIn += inTok;
  const raw = model(prompt);
  const reply = parseReply(raw);
  console.log(\`\\n--- model call \${turn}: prompt \${prompt.split("\\n").length} lines, ~\${inTok} input tokens (tool definitions ~\${toolTokens})\`);
  console.log(\`raw model text : \${raw}\`);
  console.log(\`parsed by API  : stop_reason=\${reply.stop_reason} blocks=\${reply.content.map((b) => b.type === "tool_use" ? \`tool_use(\${b.id})\` : b.type).join(",")}\`);
  messages.push({ role: "assistant", content: reply.content });
  if (reply.stop_reason !== "tool_use") { console.log(\`final answer   : \${reply.content[0].text}\`); break; }
  const results = reply.content.filter((b) => b.type === "tool_use").map(runTool);
  for (const r of results) console.log(\`runtime        : \${r.tool_use_id} -> \${r.is_error ? "ERROR " : ""}\${r.content}\`);
  messages.push({ role: "user", content: results });
  if (turn === 2) console.log(\`\\nfull prompt the model will read on call 3:\\n\${render(messages)}\`);
}
console.log(\`\\ntotal input tokens over the loop ~\${totalIn} (history is re-sent on every call)\`);` },
          { tech: "python", code: `# Tool use under the hood: the model only reads and writes TEXT. The "API" renders
# tools + history into a prompt, parses tool-call markup out of the model text, and
# your runtime validates, executes and appends results until the model stops.
import json
import re

TOOLS = [{
    "name": "get_weather",
    "description": "Current temperature for one city. Call once per city.",
    "input_schema": {"type": "object", "properties": {"city": {"type": "string"}, "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}}, "required": ["city", "unit"]},
}]
CELSIUS = {"Paris": 20, "Oslo": 5}


def get_weather(city, unit):
    return {"city": city, "temp": CELSIUS[city] * 9 // 5 + 32 if unit == "fahrenheit" else CELSIUS[city], "unit": unit}


IMPL = {"get_weather": lambda a: get_weather(a["city"], a["unit"])}


def dumps(v):
    return json.dumps(v, separators=(",", ":"))


# 1. What the model actually receives: one long string.
def render(messages):
    lines = ["[system]", "You can call tools. To call one, write <tool_call>{json}</tool_call>.", "Tools (JSON Schema):"]
    lines += [dumps(t) for t in TOOLS]
    for m in messages:
        if any(b["type"] != "tool_result" for b in m["content"]):
            lines.append(f"[{m['role']}]")
        for b in m["content"]:
            if b["type"] == "text":
                lines.append(b["text"])
            if b["type"] == "tool_use":
                lines.append(f'<tool_call id="{b["id"]}">{dumps({"name": b["name"], "input": b["input"]})}</tool_call>')
            if b["type"] == "tool_result":
                lines += [f'[tool_result id="{b["tool_use_id"]}"{" is_error" if b.get("is_error") else ""}]', b["content"]]
    lines.append("[assistant]")
    return "\\n".join(lines)


# 2. Stub model: text in, text out (a real model predicts these tokens).
def model(prompt):
    if "[tool_result" not in prompt:
        return 'I will check both cities.<tool_call>{"name":"get_weather","input":{"city":"Paris","unit":"fahrenheit"}}</tool_call><tool_call>{"name":"get_weather","input":{"city":"Oslo","unit":"kelvin"}}</tool_call>'
    if '"city":"Oslo","temp"' not in prompt:
        return '<tool_call>{"name":"get_weather","input":{"city":"Oslo","unit":"fahrenheit"}}</tool_call>'
    return "Paris is warmer: 68 F against 41 F in Oslo."


# 3. The API server parses the markup into structured blocks and a stop reason.
next_id = 1


def parse_reply(text):
    global next_id
    content = []
    first = text.find("<tool_call>")
    prose = text if first == -1 else text[:first]
    if prose:
        content.append({"type": "text", "text": prose})
    for m in re.finditer(r"<tool_call>(.*?)</tool_call>", text):
        call = json.loads(m.group(1))
        content.append({"type": "tool_use", "id": f"toolu_{next_id:02d}", "name": call["name"], "input": call["input"]})
        next_id += 1
    stop = "tool_use" if any(b["type"] == "tool_use" for b in content) else "end_turn"
    return {"stop_reason": stop, "content": content}


# 4. Your runtime: validate arguments (the model wrote them), execute, report errors as data.
def validate(tool, inp):
    s, errs = tool["input_schema"], []
    errs += [f"missing {k}" for k in s["required"] if k not in inp]
    for k, v in inp.items():
        p = s["properties"].get(k)
        if p is None:
            errs.append(f"unknown argument {k}")
        elif "enum" in p and v not in p["enum"]:
            errs.append(f"{k} must be one of {'|'.join(p['enum'])}, got {v}")
    return errs


def run_tool(block):
    tool = next((t for t in TOOLS if t["name"] == block["name"]), None)
    if tool is None:
        return {"type": "tool_result", "tool_use_id": block["id"], "is_error": True, "content": f"unknown tool {block['name']}"}
    errs = validate(tool, block["input"])
    if errs:
        return {"type": "tool_result", "tool_use_id": block["id"], "is_error": True, "content": f"invalid arguments: {'; '.join(errs)}. Fix and call again."}
    return {"type": "tool_result", "tool_use_id": block["id"], "content": dumps(IMPL[block["name"]](block["input"]))}


def ceil4(n):
    return -(-n // 4)


messages = [{"role": "user", "content": [{"type": "text", "text": "Is it warmer in Paris or Oslo right now? Answer in Fahrenheit."}]}]
tool_tokens = ceil4(len("\\n".join(dumps(t) for t in TOOLS)))
total_in = 0
for turn in range(1, 6):
    prompt = render(messages)
    in_tok = ceil4(len(prompt))
    total_in += in_tok
    raw = model(prompt)
    reply = parse_reply(raw)
    print(f"\\n--- model call {turn}: prompt {len(prompt.split(chr(10)))} lines, ~{in_tok} input tokens (tool definitions ~{tool_tokens})")
    print(f"raw model text : {raw}")
    blocks = ",".join(f"tool_use({b['id']})" if b["type"] == "tool_use" else b["type"] for b in reply["content"])
    print(f"parsed by API  : stop_reason={reply['stop_reason']} blocks={blocks}")
    messages.append({"role": "assistant", "content": reply["content"]})
    if reply["stop_reason"] != "tool_use":
        print(f"final answer   : {reply['content'][0]['text']}")
        break
    results = [run_tool(b) for b in reply["content"] if b["type"] == "tool_use"]
    for r in results:
        print(f"runtime        : {r['tool_use_id']} -> {'ERROR ' if r.get('is_error') else ''}{r['content']}")
    messages.append({"role": "user", "content": results})
    if turn == 2:
        print(f"\\nfull prompt the model will read on call 3:\\n{render(messages)}")
print(f"\\ntotal input tokens over the loop ~{total_in} (history is re-sent on every call)")` },
        ],
      },
    ],
  },
  {
    title: `How do you design good tool definitions for an LLM?`,
    difficulty: "medium",
    seoDescription: `Tool design for LLMs: namespaced names, when-not-to-use descriptions, typed params, compact results, actionable errors, and a selection eval to prove it.`,
    description: `**Question presented to candidate:**
"We are exposing our order-management backend to an LLM agent as tools. Our first attempt mirrored the REST API, about forty endpoints, and the agent keeps picking the wrong one or filling arguments badly. How would you design the tool definitions so the model uses them well?"

**What a strong answer should cover:**
- The definition is the whole interface the model sees: a clear, namespaced verb-object name, and a description that says what the tool does, when to use it, when not to (naming the sibling to use instead), what it returns and its limits
- Fewer, task-level tools instead of one per endpoint, with no overlapping siblings; very large catalogues loaded on demand (tool search) instead of all at once
- Parameters the model can fill reliably: few, typed, enums and patterns for closed sets, required plus \`null\` for unknown, examples for format-sensitive inputs, and nothing the application already knows (user id, tenant), which the server injects
- Results and errors designed for the model: compact, high-signal fields with stable ids, pagination or truncation for big outputs, and error messages that say what to change
- Treat it as an engineering loop: a labelled tool-selection and argument eval, read the confusions, fix the descriptions, re-run; and watch the token cost of definitions on every call

**Clarifying questions expected:**
- Which tasks do users actually ask for (the tool set should follow tasks, not endpoints)?
- Which operations have side effects or are irreversible, and do they need confirmation?
- How many tools will the agent see at once, and from how many sources (our own, MCP servers)?

**Code / implementation expected:** Optional — rewriting a weak definition into a strong one, or a small eval that checks which tool is chosen for labelled requests.`,
    answer: `**Target Audience:** Engineers turning a backend (REST endpoints, database queries, internal scripts) into tools for an LLM or agent, and anyone who has watched a model pick the wrong tool.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (a tool-definition linter and a tool-selection eval). Vendor guidance is quoted from the Claude docs ("Define tools", "Handle tool calls"), Anthropic engineering posts and other sources as cited, checked October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the examples; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Imagine a new contractor who will never meet your team, never read your code and never ask a question. All they get is a printed list of buttons, each with a label and a sticky note. Their job is to help customers by pressing the right buttons. If the labels say \`get_user\`, \`fetch_account\` and \`lookup_profile\`, and the sticky notes say "Gets user data", "Fetch account info" and "Lookup profile", which one do they press? They guess. If one button is labelled \`order\` with a free-text box called \`action\`, what do they type into it? They guess again.

That contractor is the model. A tool definition is the *only* documentation it will ever see, and it reads it fresh on every request. Designing tools is API design for a consumer that reads nothing but the docs, takes them literally, and cannot ask for clarification. Anthropic's own guidance puts it bluntly: detailed descriptions are "by far the most important factor in tool performance" (Claude docs, "Define tools", checked October 2026).

How the definitions reach the model is covered in [How does function calling (tool use) work under the hood?](/interview-question/how-does-function-calling-tool-use-work-under-the-hood). This question is about what to write in them.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What do users actually ask the agent to do? | Tools should map to tasks, not to endpoints; the list of tasks is the design input |
| Which actions change data or cannot be undone? | Decides read/write separation, confirmation steps and idempotency |
| How many tools will be visible at once, from how many sources? | Large catalogues need namespacing and on-demand loading |
| Which values does the backend already know (user, tenant, locale)? | Those must never be parameters the model fills in |
| Is there a labelled set of real requests? | It becomes the selection eval that tells you if a change helped |

## 3. Anatomy of a Good Definition

<svg class="iq-diagram" width="100%" viewBox="0 0 860 400" role="img" aria-label="A tool definition has five parts the model relies on: name, description, parameters, result and errors, each with its design rule">
  <rect class="d-box-accent" x="20" y="20" width="250" height="60" rx="10"/>
  <text class="d-text" x="145" y="56" text-anchor="middle">name</text>
  <rect class="d-box-muted" x="320" y="20" width="520" height="60" rx="10"/>
  <text class="d-sub" x="580" y="56" text-anchor="middle">namespaced verb and object, unique among siblings</text>
  <rect class="d-box-accent" x="20" y="95" width="250" height="60" rx="10"/>
  <text class="d-text" x="145" y="131" text-anchor="middle">description</text>
  <rect class="d-box-muted" x="320" y="95" width="520" height="60" rx="10"/>
  <text class="d-sub" x="580" y="131" text-anchor="middle">what, when, when not, returns, limits</text>
  <rect class="d-box-accent" x="20" y="170" width="250" height="60" rx="10"/>
  <text class="d-text" x="145" y="206" text-anchor="middle">parameters</text>
  <rect class="d-box-muted" x="320" y="170" width="520" height="60" rx="10"/>
  <text class="d-sub" x="580" y="206" text-anchor="middle">few, typed, enums, examples, no server-known values</text>
  <rect class="d-box" x="20" y="245" width="250" height="60" rx="10"/>
  <text class="d-text" x="145" y="281" text-anchor="middle">result</text>
  <rect class="d-box-muted" x="320" y="245" width="520" height="60" rx="10"/>
  <text class="d-sub" x="580" y="281" text-anchor="middle">compact, high signal, stable ids, paginated</text>
  <rect class="d-box" x="20" y="320" width="250" height="60" rx="10"/>
  <text class="d-text" x="145" y="356" text-anchor="middle">errors</text>
  <rect class="d-box-muted" x="320" y="320" width="520" height="60" rx="10"/>
  <text class="d-sub" x="580" y="356" text-anchor="middle">say what went wrong and what to do next</text>
</svg>

The top three rows are what the model reads *before* calling; the bottom two are what it reads *after*. Both halves are part of the tool design.

### Name

📌 **Interview term: tool namespacing** — prefixing tool names with the service or resource (\`orders_cancel\`, \`github_list_prs\`, \`slack_send_message\`) so that names stay unambiguous as the catalogue grows. Anthropic recommends it explicitly, especially with tool search (Claude docs). Names must also fit the API rule: Anthropic requires \`^[a-zA-Z0-9_-]{1,128}$\`, so \`lookup profile\` with a space is rejected outright.

The model maps intent to names first. \`refunds_create\` and \`orders_cancel\` tell it what each does before it reads a word of description.

### Description

📌 **Interview term: when-not-to-use guidance** — a sentence in the description that names the situations where a *different* tool is right, ideally naming that sibling ("Do not use for refunds; use refunds_create."). It is the single cheapest fix for wrong-tool selection between similar tools.

Anthropic's checklist for a description: what the tool does, when it should be used *and when it should not*, what each parameter means, and caveats such as what the tool does not return; aim for at least 3-4 sentences, more for complex tools (Claude docs, "Define tools"). OpenAI's function-calling guide gives similar advice, including stating in the system prompt when (and when not) to use each function (OpenAI docs, as shown in search results; the docs host was not reachable from this environment).

Compare a weak and a strong definition for the same backend call:

~~~json
{ "name": "order", "description": "Order operations.",
  "input_schema": { "type": "object", "properties": { "action": { "type": "string" }, "data": { "type": "string" } } } }
~~~

~~~json
{ "name": "orders_cancel",
  "description": "Cancel or stop an order that has not shipped yet. Use only when the user explicitly asks to cancel or stop it. Do not use for refunds; use refunds_create.",
  "input_schema": { "type": "object",
    "properties": {
      "order_id": { "type": "string", "pattern": "^A-[0-9]+$", "description": "Order id, e.g. A-17" },
      "reason": { "type": "string", "enum": ["customer_request", "duplicate", "fraud"], "description": "Why the order is cancelled" } },
    "required": ["order_id", "reason"] } }
~~~

### Parameters

Every parameter is a decision you hand to the model; hand over as few as possible and make each one easy.

- **Enums for closed sets** (\`reason\`, \`status\`, \`unit\`), patterns or formats for ids and dates, and an example in the description for anything format-sensitive.
- **Required plus null** rather than many optionals, so "unknown" is an explicit choice (and so the schema works with strict modes; see [How do you get reliable structured JSON output from an LLM?](/interview-question/how-do-you-get-reliable-structured-json-output-from-an-llm)).
- **Never ask the model for what the server knows.** The current user id, tenant, permissions and locale come from the session, injected by your runtime. A \`user_id\` parameter is an invitation to act on someone else's account if the model is confused or injected.
- **Examples for complex inputs.** Anthropic supports \`input_examples\` on a tool: example argument objects, validated against the schema, that show conventions JSON Schema cannot express; they cost roughly 20-50 tokens each for simple examples and 100-200 for complex nested ones (Claude docs, "Define tools").

📌 **Interview term: task-level tool** — a tool shaped around a user task (\`refunds_create\`) rather than around a backend endpoint (\`POST /v2/ledger/entries\`). One task-level tool may call several endpoints internally.

Anthropic also recommends consolidating related operations into fewer tools, for example one tool with an \`action\` parameter instead of \`create_pr\`, \`review_pr\` and \`merge_pr\` (Claude docs). That is compatible with everything above as long as \`action\` is an **enum** with documented values; the anti-pattern is a free-text \`action\`, which the eval below catches.

### Results and errors

📌 **Interview term: high-signal tool response** — a result that contains only what the model needs for its next step, with stable, meaningful identifiers instead of raw internal dumps. Anthropic advises returning "semantic, stable identifiers" and only the fields Claude needs, because bloated responses waste context (Claude docs). Its engineering post "Writing effective tools for agents" lists token-efficient responses and namespacing among its principles; secondary summaries describe it suggesting a \`response_format\` parameter with concise and detailed options, pagination and sensible default limits (not verified against the post text here).

📌 **Interview term: actionable error message** — an error result that says what was wrong and what to try next ("\`unit\` must be one of celsius|fahrenheit, got kelvin"), sent back as a tool result marked as an error. Anthropic's example contrasts a generic \`"failed"\` with \`"Rate limit exceeded. Retry after 60 seconds."\` (Claude docs, "Handle tool calls"). The model can recover from the second; from the first it can only guess or give up. See [How should an agent handle tool errors, timeouts and retries?](/interview-question/how-should-an-agent-handle-tool-errors-timeouts-and-retries)

## 4. How Many Tools?

More tools mean more description tokens on every call and more near-neighbours to confuse. Several third-party guides repeat an OpenAI suggestion to keep fewer than 20 functions available at once as a soft limit (reproduced on inference.net and PromptLayer; not confirmed against OpenAI's own page here). Anthropic's strict tool use has a hard limit of 20 strict tools per request (Claude docs, "Structured outputs").

For large catalogues, do not show everything at once:

- **Load per phase or per intent.** A router step picks the relevant subset (orders tools for order questions).
- **Tool search.** Anthropic's advanced tool use (November 2025) lets you mark tools with \`defer_loading\` so only a search tool is loaded up front and Claude discovers definitions as needed; the announcement motivates it with a five-server MCP setup of 58 tools that used about 55K tokens before the conversation started (Anthropic engineering, "Advanced tool use"). See also [MCP authoring: how do you build a Model Context Protocol server in 2025-26?](/interview-question/mcp-authoring-how-do-you-build-a-model-context-protocol-server-in-2025-26)
- **Cache the definitions.** They sit at the start of every request, so they belong in the cached prefix: [What is prompt caching and how does it reduce cost and latency?](/interview-question/what-is-prompt-caching-and-how-does-it-reduce-cost-and-latency)

## 5. Side Effects Are Part of the Design

- **Separate reads from writes.** \`orders_get_status\` can be retried freely; \`orders_cancel\` cannot. Separate tools let your runtime apply different policies.
- **Idempotency.** A write tool should accept or derive an idempotency key, so a retried call after a timeout does not cancel or refund twice.
- **Confirmation for irreversible actions.** Pause for a human or a policy check before money moves: [How do you design human-in-the-loop approval for agent actions?](/interview-question/how-do-you-design-human-in-the-loop-approval-for-agent-actions)
- **Least privilege.** Expose only the tools this agent needs, scoped to the caller: [How do you sandbox an agent and enforce least-privilege tool access?](/interview-question/how-do-you-sandbox-an-agent-and-enforce-least-privilege-tool-access)

## 6. Treat Tool Design as an Eval Loop

<svg class="iq-diagram" width="100%" viewBox="0 0 860 220" role="img" aria-label="A loop of writing definitions, running a labelled selection eval, reading the confusions and rewording one description, then running the eval again">
  <defs>
    <marker id="ai08q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="180" height="80" rx="10"/>
  <text class="d-text" x="110" y="75" text-anchor="middle">write definitions</text>
  <text class="d-sub" x="110" y="100" text-anchor="middle">lint the basics</text>
  <rect class="d-box-accent" x="240" y="40" width="180" height="80" rx="10"/>
  <text class="d-text" x="330" y="75" text-anchor="middle">run eval</text>
  <text class="d-sub" x="330" y="100" text-anchor="middle">labelled requests</text>
  <rect class="d-box" x="460" y="40" width="180" height="80" rx="10"/>
  <text class="d-text" x="550" y="75" text-anchor="middle">read confusions</text>
  <text class="d-sub" x="550" y="100" text-anchor="middle">expected vs picked</text>
  <rect class="d-box" x="680" y="40" width="160" height="80" rx="10"/>
  <text class="d-text" x="760" y="75" text-anchor="middle">reword one</text>
  <text class="d-sub" x="760" y="100" text-anchor="middle">description</text>
  <path class="d-edge" d="M 204 80 L 234 80" marker-end="url(#ai08q5-arrow)"/>
  <path class="d-edge" d="M 424 80 L 454 80" marker-end="url(#ai08q5-arrow)"/>
  <path class="d-edge" d="M 644 80 L 674 80" marker-end="url(#ai08q5-arrow)"/>
  <path class="d-edge-dashed" d="M 760 124 L 760 180 L 330 180 L 330 126" marker-end="url(#ai08q5-arrow)"/>
</svg>

Change one thing at a time and re-run, exactly as with prompts; the dashed arrow is the re-run. The two parts that can be automated cheaply are a **linter** for the mechanical rules and a **selection eval** for behaviour.

📌 **Interview term: tool-selection eval** — a labelled set of realistic requests, each with the tool (and ideally the arguments) that should be chosen, run against the model with your tool set; you track accuracy and the confusion pairs (expected tool, picked tool). A wider version scores whole multi-step runs: [How do you evaluate and debug agent trajectories?](/interview-question/how-do-you-evaluate-and-debug-agent-trajectories)

## 7. Verified: Running the Code

**Example 1, "Tool-definition linter: names, descriptions, parameters and overlap".** It checks two tool sets for the mechanical rules from section 3: the API name rule and a namespaced style, description length and a when-not-to-use sentence, parameter descriptions, free strings with no enum, pattern or example, too many optional parameters, and word overlap between sibling descriptions. It also estimates the definitions' size in tokens (characters divided by 4, a rough rule of thumb).

\`node a.js\` and \`python3.12 a.py\` both print exactly this:

~~~text
== bad toolset: 5 tools, ~173 tokens of definitions, 34 findings
  get_user:
    - description has 1 sentence(s); aim for 3-4
    - no when-NOT-to-use guidance
    - param q: no description
    - param q: free string with no enum, pattern or example
  fetch_account:
    - description has 1 sentence(s); aim for 3-4
    - no when-NOT-to-use guidance
    - param id: no description
    - param id: free string with no enum, pattern or example
  lookup profile:
    - name breaks the API name rule ^[a-zA-Z0-9_-]{1,128}$
    - description has 1 sentence(s); aim for 3-4
    - no when-NOT-to-use guidance
    - param input: no description
    - param input: free string with no enum, pattern or example
  order:
    - name is not service_verb or verb_object
    - description has 1 sentence(s); aim for 3-4
    - no when-NOT-to-use guidance
    - 5 optional params: each is a decision delegated to the model
    - param action: no description
    - param action: free string with no enum, pattern or example
    - param data: no description
    - param data: free string with no enum, pattern or example
    - param opts: no description
    - param opts: free string with no enum, pattern or example
    - param flag: no description
    - param extra: no description
    - param extra: free string with no enum, pattern or example
    - overlaps with refund (similarity 0.25)
  refund:
    - name is not service_verb or verb_object
    - description has 1 sentence(s); aim for 3-4
    - no when-NOT-to-use guidance
    - param order: no description
    - param order: free string with no enum, pattern or example
    - param amount: no description
    - param amount: free string with no enum, pattern or example
== good toolset: 4 tools, ~407 tokens of definitions, 2 findings
  customers_find: ok
  orders_get_status:
    - overlaps with orders_cancel (similarity 0.31)
  orders_cancel:
    - overlaps with refunds_create (similarity 0.44)
  refunds_create: ok
~~~

Two things to notice. The good set costs about 2.4 times the tokens of the bad one (~407 against ~173) and is still the right trade: descriptions are paid per call, wrong tool choices are paid per failure. And the lexical overlap check flagged the *good* siblings (they share words like order and cancel, which is expected and resolved by their when-not-to-use sentences) but **missed** \`get_user\`, \`fetch_account\` and \`lookup_profile\`, which share no words and mean the same thing. Mechanical checks catch mechanical problems; semantic duplicates need the eval.

**Example 2, "Tool-selection eval: labelled requests, accuracy and confusions".** Eight labelled requests are routed against each tool set by a deliberately crude stand-in for the model: a bag-of-words scorer that rewards words found in the name and description and penalises words found in "Do not use" sentences. It is *not* an LLM and its scores mean nothing in absolute terms; what carries over is the harness (labelled cases, accuracy, confusion pairs, iterate). In a real project \`route()\` is a model call with your tools and \`tool_choice: auto\`, run over a few hundred real requests.

\`node b.js\` and \`python3.12 b.py\` both print exactly this:

~~~text
== bad toolset
  PASS  Where is my order A-17?                                  picked order (score 1)
  PASS  Please cancel order A-18, it has not shipped             picked order (score 1)
  FAIL  I want my money back for order A-19, it arrived broken   picked order (score 1), expected refund
  FAIL  Find the customer with email ann@example.com             picked fetch_account (score 1), expected get_user
  PASS  What items are in order A-20?                            picked order (score 1)
  PASS  Refund the delivered order A-21                          picked refund (score 2)
  PASS  What plan and account status does Bob Lee have?          picked fetch_account (score 1)
  PASS  Stop order A-22 before it ships                          picked order (score 1)
  tool-selection accuracy: 6/8
  confusion: refund -> order x1
  confusion: get_user -> fetch_account x1
  5 picks went to a catch-all tool whose free-string "action" argument the model must still guess
== good toolset
  PASS  Where is my order A-17?                                  picked orders_get_status (score 1)
  PASS  Please cancel order A-18, it has not shipped             picked orders_cancel (score 1)
  PASS  I want my money back for order A-19, it arrived broken   picked refunds_create (score 2)
  PASS  Find the customer with email ann@example.com             picked customers_find (score 3)
  PASS  What items are in order A-20?                            picked orders_get_status (score 2)
  PASS  Refund the delivered order A-21                          picked refunds_create (score 1)
  PASS  What plan and account status does Bob Lee have?          picked customers_find (score 3)
  FAIL  Stop order A-22 before it ships                          picked orders_get_status (score 1), expected orders_cancel
  tool-selection accuracy: 7/8
  confusion: orders_cancel -> orders_get_status x1
== good v2 toolset
  PASS  Where is my order A-17?                                  picked orders_get_status (score 1)
  PASS  Please cancel order A-18, it has not shipped             picked orders_cancel (score 3)
  PASS  I want my money back for order A-19, it arrived broken   picked refunds_create (score 2)
  PASS  Find the customer with email ann@example.com             picked customers_find (score 3)
  PASS  What items are in order A-20?                            picked orders_get_status (score 2)
  PASS  Refund the delivered order A-21                          picked refunds_create (score 1)
  PASS  What plan and account status does Bob Lee have?          picked customers_find (score 3)
  PASS  Stop order A-22 before it ships                          picked orders_cancel (score 2)
  tool-selection accuracy: 8/8
~~~

What the run shows:

- **The bad set scores 6/8 and is still worse.** Five of its passes went to the catch-all \`order\` tool, so the ambiguity moved from *which tool* to *which free-text action*, which a selection score does not see. Measure argument correctness too.
- **The eval found a real wording problem.** In the good set, \`orders_cancel\` said "Do not use for refunds of delivered orders", and the generic word "orders" in that sentence pushed a cancel request to \`orders_get_status\`.
- **One reworded sentence fixed it.** \`good v2\` changes only that sentence to "Do not use for refunds; use refunds_create." and reaches 8/8. That is the loop from section 6: one change, re-run, compare.

## Edge Cases Worth Knowing

- **Tools from MCP servers you do not control** arrive with someone else's names and descriptions; namespace them and test selection with them loaded, because a vague third-party tool can steal calls from yours.
- **Descriptions are prompt text, so they are an attack surface.** A malicious tool description can contain instructions; only install MCP servers you trust: [What is prompt injection and how do you defend against it?](/interview-question/what-is-prompt-injection-and-how-do-you-defend-against-it)
- **Asking for reasoning in a parameter.** Anthropic warns that a parameter asking for the model's step-by-step reasoning may lead to a \`reasoning_extraction\` refusal; ask for a short explanation or evidence instead (Claude docs, "Define tools").
- **Changing descriptions changes behaviour.** Treat tool definitions like prompts: version them, review them and run the eval on every change: [How do you version, test and safely roll out prompt changes?](/interview-question/how-do-you-version-test-and-safely-roll-out-prompt-changes)

## Common Pitfalls

- **Mirroring the REST API one endpoint per tool.** Forty fine-grained tools with overlapping meanings guarantee misrouting; design around user tasks.
- **One-line descriptions.** "Gets user data" gives the model nothing to choose with. Say what, when, when not, returns and limits.
- **Free-text parameters for closed sets.** A string \`action\` or \`status\` makes the model invent values; use enums.
- **Letting the model supply identity.** \`user_id\` or \`tenant_id\` as parameters is a privilege-escalation path; inject them server-side.
- **Huge raw results.** Returning a 50 KB JSON dump fills the context and buries the answer; return the few fields the next step needs and paginate.
- **Unhelpful errors.** A bare 400 or "failed" stops the model from recovering; say what to change.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Frame it:</strong> <span style="color:#f0e2c8;">A tool definition is the <em style="color:#f0e2c8;">only</em> documentation the model sees, read fresh on every call, so I design it like an API for a consumer who reads nothing but the docs. Anthropic calls detailed descriptions <strong style="color:#ffca28;">by far the most important factor</strong> in tool performance.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Names and descriptions:</strong> <span style="color:#f0e2c8;">Namespaced verb-object names like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">orders_cancel</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">refunds_create</code>. Descriptions of three or four sentences: what it does, when to use it, <strong style="color:#ffca28;">when not to</strong> and which sibling to use instead, what it returns and its limits.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Parameters:</strong> <span style="color:#f0e2c8;">Few and typed: enums for closed sets, patterns and examples for ids and dates, required plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">null</code> instead of many optionals. Nothing the server already knows: user id and tenant are injected by my runtime, never filled in by the model.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Results, errors, scale:</strong> <span style="color:#f0e2c8;">Results carry only the high-signal fields and stable ids, paginated. Errors say what to change. Task-level tools rather than one per endpoint, reads separated from writes, and for big catalogues I load tools on demand and cache the definitions.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Prove it with an eval:</strong> <span style="color:#f0e2c8;">A labelled set of real requests with the expected tool and arguments, scored for accuracy and confusion pairs. In my demo the eval caught a <em style="color:#f0e2c8;">do not use</em> sentence whose generic wording misrouted cancels; rewording that one sentence took it from 7/8 to 8/8.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should we expose all forty endpoints as tools?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. I map user tasks to a handful of task-level tools that call endpoints internally. Forty fine-grained tools with overlapping meanings cost tokens on every call and invite wrong choices; for large catalogues I use per-intent subsets or tool search with deferred loading.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">One tool with an action parameter or many small tools?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either can work. Anthropic even recommends consolidating related operations behind an <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">action</code> parameter. The rule is that <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">action</code> must be an <strong style="color:#ffca28;">enum</strong> with documented values. A free-text <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">action</code> just moves the ambiguity from tool choice into the arguments, which my eval showed: the catch-all tool scored well on selection while hiding five guessed actions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How long should a description be?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Long enough to answer what, when, when not, returns and limits, which Anthropic puts at least three to four sentences. It costs tokens on every call, so I keep it dense and cache it, but a wrong tool choice costs far more than forty extra tokens.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop the agent acting on the wrong account?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do not give it the choice. Identity and tenant come from the authenticated session and are injected server-side; tools then check ownership of every id they receive. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">user_id</code> parameter is a privilege-escalation path under confusion or prompt injection.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know a tool change is an improvement?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The same way as a prompt change: a versioned definition and a labelled eval run before and after, tracking selection accuracy, argument correctness and confusion pairs. A linter catches mechanical issues like missing descriptions or invalid names, but semantic duplicates such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">get_user</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">fetch_account</code> only show up in the eval.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Tool namespacing | Prefixing names with the service or resource so they stay unique as the catalogue grows |
| When-not-to-use guidance | A description sentence naming when a sibling tool is right instead |
| Task-level tool | A tool shaped around a user task rather than a backend endpoint |
| High-signal tool response | A compact result with only the fields the next step needs and stable ids |
| Actionable error message | An error result that says what went wrong and what to try next |
| Tool-selection eval | Labelled requests with expected tools, scored for accuracy and confusion pairs |

**Conclusion:** Designing tool definitions is API design for a reader that sees only the documentation. Give each tool a namespaced verb-object name, a description that covers what, when, when not, returns and limits, and few well-typed parameters with enums and examples, never values the server already knows. Shape results and errors for the model's next step, keep the catalogue small or load it on demand, separate reads from writes, and then treat the whole thing as an eval loop: lint the mechanics, measure selection and arguments on labelled requests, read the confusions and change one description at a time.`,
    examples: [
      {
        label: `Tool-definition linter: names, descriptions, parameters and overlap`,
        variants: [
          { tech: "node", code: `// Lint tool definitions the way a model will read them: names, descriptions, params, overlap.
const SETS = {
  "bad": [
    {"name": "get_user", "description": "Gets user data.", "params": {"q": {"type": "string"}}, "required": ["q"]},
    {"name": "fetch_account", "description": "Fetch account info for a customer.", "params": {"id": {"type": "string"}}, "required": ["id"]},
    {"name": "lookup profile", "description": "Lookup profile.", "params": {"input": {"type": "string"}}, "required": []},
    {"name": "order", "description": "Order operations.", "params": {"action": {"type": "string"}, "data": {"type": "string"}, "opts": {"type": "string"}, "flag": {"type": "boolean"}, "extra": {"type": "string"}}, "required": []},
    {"name": "refund", "description": "Handles refunds and orders.", "params": {"order": {"type": "string"}, "amount": {"type": "string"}}, "required": ["order"]}
  ],
  "good": [
    {"name": "customers_find", "description": "Find a customer by email, name or phone and return their customer id, plan and account status. Use this first when the user mentions a person but gives no customer id. Do not use for order or refund questions.", "params": {"query": {"type": "string", "description": "Email, full name or phone, e.g. ann@example.com"}}, "required": ["query"]},
    {"name": "orders_get_status", "description": "Get the shipping status and line items of one order by its order id. Use when the user asks where an order is or what it contains. Do not use to cancel or refund.", "params": {"order_id": {"type": "string", "pattern": "^A-[0-9]+$", "description": "Order id, e.g. A-17"}}, "required": ["order_id"]},
    {"name": "orders_cancel", "description": "Cancel or stop an order that has not shipped yet. Use only when the user explicitly asks to cancel or stop it. Do not use for refunds of delivered orders.", "params": {"order_id": {"type": "string", "pattern": "^A-[0-9]+$", "description": "Order id, e.g. A-17"}, "reason": {"type": "string", "enum": ["customer_request", "duplicate", "fraud"], "description": "Why the order is cancelled"}}, "required": ["order_id", "reason"]},
    {"name": "refunds_create", "description": "Refund a delivered order, fully or partly, and return the refund id. Use when the user asks for money back on an order that has arrived. Do not use to cancel an order that has not shipped.", "params": {"order_id": {"type": "string", "pattern": "^A-[0-9]+$", "description": "Order id, e.g. A-17"}, "amount_cents": {"type": ["integer", "null"], "description": "Amount in cents; null refunds the full order"}}, "required": ["order_id", "amount_cents"]}
  ]
};
const STOP = new Set(["the", "and", "for", "use", "this", "that", "not", "one", "its", "their", "when", "has", "yet", "only", "with", "get", "gets", "data", "info"]);
const words = (s) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)).map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w)));
const jaccard = (a, b) => { const i = [...a].filter((x) => b.has(x)).length; return i / (a.size + b.size - i); };
const sentences = (s) => s.split(/[.!?](?:\\s|$)/).filter((x) => x.trim()).length;

function lint(tools) {
  const findings = {};
  for (const t of tools) {
    const f = [];
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(t.name)) f.push("name breaks the API name rule ^[a-zA-Z0-9_-]{1,128}$");
    else if (!/^[a-z]+(_[a-z]+)+$/.test(t.name)) f.push("name is not service_verb or verb_object");
    const n = sentences(t.description);
    if (n < 3) f.push(\`description has \${n} sentence(s); aim for 3-4\`);
    if (!/\\bdo not use\\b|\\bnot for\\b/i.test(t.description)) f.push("no when-NOT-to-use guidance");
    const optional = Object.keys(t.params).filter((k) => !t.required.includes(k));
    if (optional.length > 2) f.push(\`\${optional.length} optional params: each is a decision delegated to the model\`);
    for (const [k, p] of Object.entries(t.params)) {
      if (!p.description) f.push(\`param \${k}: no description\`);
      if (p.type === "string" && !p.enum && !p.pattern && !(p.description || "").includes("e.g.")) f.push(\`param \${k}: free string with no enum, pattern or example\`);
    }
    findings[t.name] = f;
  }
  for (let i = 0; i < tools.length; i++) for (let j = i + 1; j < tools.length; j++) {
    const a = tools[i], b = tools[j];
    const s = jaccard(words(a.name + " " + a.description), words(b.name + " " + b.description));
    if (s >= 0.25) findings[a.name].push(\`overlaps with \${b.name} (similarity \${s.toFixed(2)})\`);
  }
  return findings;
}

for (const [label, tools] of Object.entries(SETS)) {
  const findings = lint(tools);
  const total = Object.values(findings).reduce((s, f) => s + f.length, 0);
  const tokens = Math.ceil(JSON.stringify(tools).length / 4);
  console.log(\`== \${label} toolset: \${tools.length} tools, ~\${tokens} tokens of definitions, \${total} findings\`);
  for (const [name, f] of Object.entries(findings)) {
    console.log(\`  \${name}:\${f.length ? "" : " ok"}\`);
    for (const x of f) console.log(\`    - \${x}\`);
  }
}` },
          { tech: "python", code: `# Lint tool definitions the way a model will read them: names, descriptions, params, overlap.
import json
import math
import re

SETS = json.loads(r'''{
  "bad": [
    {"name": "get_user", "description": "Gets user data.", "params": {"q": {"type": "string"}}, "required": ["q"]},
    {"name": "fetch_account", "description": "Fetch account info for a customer.", "params": {"id": {"type": "string"}}, "required": ["id"]},
    {"name": "lookup profile", "description": "Lookup profile.", "params": {"input": {"type": "string"}}, "required": []},
    {"name": "order", "description": "Order operations.", "params": {"action": {"type": "string"}, "data": {"type": "string"}, "opts": {"type": "string"}, "flag": {"type": "boolean"}, "extra": {"type": "string"}}, "required": []},
    {"name": "refund", "description": "Handles refunds and orders.", "params": {"order": {"type": "string"}, "amount": {"type": "string"}}, "required": ["order"]}
  ],
  "good": [
    {"name": "customers_find", "description": "Find a customer by email, name or phone and return their customer id, plan and account status. Use this first when the user mentions a person but gives no customer id. Do not use for order or refund questions.", "params": {"query": {"type": "string", "description": "Email, full name or phone, e.g. ann@example.com"}}, "required": ["query"]},
    {"name": "orders_get_status", "description": "Get the shipping status and line items of one order by its order id. Use when the user asks where an order is or what it contains. Do not use to cancel or refund.", "params": {"order_id": {"type": "string", "pattern": "^A-[0-9]+$", "description": "Order id, e.g. A-17"}}, "required": ["order_id"]},
    {"name": "orders_cancel", "description": "Cancel or stop an order that has not shipped yet. Use only when the user explicitly asks to cancel or stop it. Do not use for refunds of delivered orders.", "params": {"order_id": {"type": "string", "pattern": "^A-[0-9]+$", "description": "Order id, e.g. A-17"}, "reason": {"type": "string", "enum": ["customer_request", "duplicate", "fraud"], "description": "Why the order is cancelled"}}, "required": ["order_id", "reason"]},
    {"name": "refunds_create", "description": "Refund a delivered order, fully or partly, and return the refund id. Use when the user asks for money back on an order that has arrived. Do not use to cancel an order that has not shipped.", "params": {"order_id": {"type": "string", "pattern": "^A-[0-9]+$", "description": "Order id, e.g. A-17"}, "amount_cents": {"type": ["integer", "null"], "description": "Amount in cents; null refunds the full order"}}, "required": ["order_id", "amount_cents"]}
  ]
}''')
STOP = {"the", "and", "for", "use", "this", "that", "not", "one", "its", "their", "when", "has", "yet", "only", "with", "get", "gets", "data", "info"}


def words(s):
    out = set()
    for w in re.split(r"[^a-z0-9]+", s.lower()):
        if len(w) > 2 and w not in STOP:
            out.add(w[:-1] if len(w) > 4 and w.endswith("s") else w)
    return out


def jaccard(a, b):
    i = len(a & b)
    return i / (len(a) + len(b) - i)


def sentences(s):
    return len([x for x in re.split(r"[.!?](?:\\s|$)", s) if x.strip()])


def lint(tools):
    findings = {}
    for t in tools:
        f = []
        if not re.fullmatch(r"[a-zA-Z0-9_-]{1,128}", t["name"]):
            f.append("name breaks the API name rule ^[a-zA-Z0-9_-]{1,128}$")
        elif not re.fullmatch(r"[a-z]+(_[a-z]+)+", t["name"]):
            f.append("name is not service_verb or verb_object")
        n = sentences(t["description"])
        if n < 3:
            f.append(f"description has {n} sentence(s); aim for 3-4")
        if not re.search(r"\\bdo not use\\b|\\bnot for\\b", t["description"], re.I):
            f.append("no when-NOT-to-use guidance")
        optional = [k for k in t["params"] if k not in t["required"]]
        if len(optional) > 2:
            f.append(f"{len(optional)} optional params: each is a decision delegated to the model")
        for k, p in t["params"].items():
            if not p.get("description"):
                f.append(f"param {k}: no description")
            if p["type"] == "string" and "enum" not in p and "pattern" not in p and "e.g." not in p.get("description", ""):
                f.append(f"param {k}: free string with no enum, pattern or example")
        findings[t["name"]] = f
    for i in range(len(tools)):
        for j in range(i + 1, len(tools)):
            a, b = tools[i], tools[j]
            s = jaccard(words(a["name"] + " " + a["description"]), words(b["name"] + " " + b["description"]))
            if s >= 0.25:
                findings[a["name"]].append(f"overlaps with {b['name']} (similarity {s:.2f})")
    return findings


for label, tools in SETS.items():
    findings = lint(tools)
    total = sum(len(f) for f in findings.values())
    tokens = math.ceil(len(json.dumps(tools, separators=(",", ":"))) / 4)
    print(f"== {label} toolset: {len(tools)} tools, ~{tokens} tokens of definitions, {total} findings")
    for name, f in findings.items():
        print(f"  {name}:{'' if f else ' ok'}")
        for x in f:
            print(f"    - {x}")` },
        ],
      },
      {
        label: `Tool-selection eval: labelled requests, accuracy and confusions`,
        variants: [
          { tech: "node", code: `// A tool-selection eval: labelled requests -> expected tool, scored per toolset.
// The "model" here is a crude bag-of-words router (a stand-in, not an LLM): it can only
// use what the names and descriptions say, which is the point being measured.
const SETS = {
  "bad": [
    {"name": "get_user", "description": "Gets user data.", "params": {"q": {"type": "string"}}, "required": ["q"]},
    {"name": "fetch_account", "description": "Fetch account info for a customer.", "params": {"id": {"type": "string"}}, "required": ["id"]},
    {"name": "lookup profile", "description": "Lookup profile.", "params": {"input": {"type": "string"}}, "required": []},
    {"name": "order", "description": "Order operations.", "params": {"action": {"type": "string"}, "data": {"type": "string"}, "opts": {"type": "string"}, "flag": {"type": "boolean"}, "extra": {"type": "string"}}, "required": []},
    {"name": "refund", "description": "Handles refunds and orders.", "params": {"order": {"type": "string"}, "amount": {"type": "string"}}, "required": ["order"]}
  ],
  "good": [
    {"name": "customers_find", "description": "Find a customer by email, name or phone and return their customer id, plan and account status. Use this first when the user mentions a person but gives no customer id. Do not use for order or refund questions.", "params": {"query": {"type": "string", "description": "Email, full name or phone, e.g. ann@example.com"}}, "required": ["query"]},
    {"name": "orders_get_status", "description": "Get the shipping status and line items of one order by its order id. Use when the user asks where an order is or what it contains. Do not use to cancel or refund.", "params": {"order_id": {"type": "string", "pattern": "^A-[0-9]+$", "description": "Order id, e.g. A-17"}}, "required": ["order_id"]},
    {"name": "orders_cancel", "description": "Cancel or stop an order that has not shipped yet. Use only when the user explicitly asks to cancel or stop it. Do not use for refunds of delivered orders.", "params": {"order_id": {"type": "string", "pattern": "^A-[0-9]+$", "description": "Order id, e.g. A-17"}, "reason": {"type": "string", "enum": ["customer_request", "duplicate", "fraud"], "description": "Why the order is cancelled"}}, "required": ["order_id", "reason"]},
    {"name": "refunds_create", "description": "Refund a delivered order, fully or partly, and return the refund id. Use when the user asks for money back on an order that has arrived. Do not use to cancel an order that has not shipped.", "params": {"order_id": {"type": "string", "pattern": "^A-[0-9]+$", "description": "Order id, e.g. A-17"}, "amount_cents": {"type": ["integer", "null"], "description": "Amount in cents; null refunds the full order"}}, "required": ["order_id", "amount_cents"]}
  ]
};
const CASES = [
  ["Where is my order A-17?", "order", "orders_get_status"],
  ["Please cancel order A-18, it has not shipped", "order", "orders_cancel"],
  ["I want my money back for order A-19, it arrived broken", "refund", "refunds_create"],
  ["Find the customer with email ann@example.com", "get_user", "customers_find"],
  ["What items are in order A-20?", "order", "orders_get_status"],
  ["Refund the delivered order A-21", "refund", "refunds_create"],
  ["What plan and account status does Bob Lee have?", "fetch_account", "customers_find"],
  ["Stop order A-22 before it ships", "order", "orders_cancel"],
];
const STOP = new Set(["the", "and", "for", "use", "this", "that", "not", "one", "its", "their", "when", "has", "yet", "only", "with", "get", "gets", "data", "info", "what", "where", "want", "please", "does", "have", "before"]);
const words = (s) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)).map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w)));
// Iteration 2: the eval showed a confusion, so ONE description was reworded.
SETS["good v2"] = SETS.good.map((t) => t.name !== "orders_cancel" ? t : { ...t,
  description: "Cancel or stop an order that has not shipped yet. Use only when the user explicitly asks to cancel or stop it. Do not use for refunds; use refunds_create." });
const catchAll = (t) => Object.entries(t.params).some(([k, p]) => k === "action" && !p.enum);
const overlap = (a, b) => [...a].filter((x) => b.has(x)).length;

function route(request, tools) {
  const req = words(request);
  let best = null, bestScore = -Infinity;
  for (const t of tools) {
    const parts = t.description.split(/(?<=[.!?])\\s+/);
    const pos = words([t.name.replace(/_/g, " "), ...parts.filter((p) => !/^do not use/i.test(p))].join(" "));
    const neg = words(parts.filter((p) => /^do not use/i.test(p)).join(" "));
    const score = overlap(req, pos) - 2 * overlap(req, neg);
    if (score > bestScore) { best = t.name; bestScore = score; }
  }
  return [best, bestScore];
}

for (const [label, tools] of Object.entries(SETS)) {
  let correct = 0, vague = 0;
  const confusions = {};
  console.log(\`== \${label} toolset\`);
  for (const [request, expBad, expGood] of CASES) {
    const expected = label === "bad" ? expBad : expGood;
    const [picked, score] = route(request, tools);
    const ok = picked === expected;
    if (catchAll(tools.find((t) => t.name === picked))) vague++;
    if (ok) correct++;
    else confusions[\`\${expected} -> \${picked}\`] = (confusions[\`\${expected} -> \${picked}\`] || 0) + 1;
    console.log(\`  \${ok ? "PASS" : "FAIL"}  \${request.padEnd(56)} picked \${picked} (score \${score})\${ok ? "" : \`, expected \${expected}\`}\`);
  }
  console.log(\`  tool-selection accuracy: \${correct}/\${CASES.length}\`);
  for (const [k, n] of Object.entries(confusions)) console.log(\`  confusion: \${k} x\${n}\`);
  if (vague) console.log(\`  \${vague} picks went to a catch-all tool whose free-string "action" argument the model must still guess\`);
}` },
          { tech: "python", code: `# A tool-selection eval: labelled requests -> expected tool, scored per toolset.
# The "model" here is a crude bag-of-words router (a stand-in, not an LLM): it can only
# use what the names and descriptions say, which is the point being measured.
import json
import re

SETS = json.loads(r'''{
  "bad": [
    {"name": "get_user", "description": "Gets user data.", "params": {"q": {"type": "string"}}, "required": ["q"]},
    {"name": "fetch_account", "description": "Fetch account info for a customer.", "params": {"id": {"type": "string"}}, "required": ["id"]},
    {"name": "lookup profile", "description": "Lookup profile.", "params": {"input": {"type": "string"}}, "required": []},
    {"name": "order", "description": "Order operations.", "params": {"action": {"type": "string"}, "data": {"type": "string"}, "opts": {"type": "string"}, "flag": {"type": "boolean"}, "extra": {"type": "string"}}, "required": []},
    {"name": "refund", "description": "Handles refunds and orders.", "params": {"order": {"type": "string"}, "amount": {"type": "string"}}, "required": ["order"]}
  ],
  "good": [
    {"name": "customers_find", "description": "Find a customer by email, name or phone and return their customer id, plan and account status. Use this first when the user mentions a person but gives no customer id. Do not use for order or refund questions.", "params": {"query": {"type": "string", "description": "Email, full name or phone, e.g. ann@example.com"}}, "required": ["query"]},
    {"name": "orders_get_status", "description": "Get the shipping status and line items of one order by its order id. Use when the user asks where an order is or what it contains. Do not use to cancel or refund.", "params": {"order_id": {"type": "string", "pattern": "^A-[0-9]+$", "description": "Order id, e.g. A-17"}}, "required": ["order_id"]},
    {"name": "orders_cancel", "description": "Cancel or stop an order that has not shipped yet. Use only when the user explicitly asks to cancel or stop it. Do not use for refunds of delivered orders.", "params": {"order_id": {"type": "string", "pattern": "^A-[0-9]+$", "description": "Order id, e.g. A-17"}, "reason": {"type": "string", "enum": ["customer_request", "duplicate", "fraud"], "description": "Why the order is cancelled"}}, "required": ["order_id", "reason"]},
    {"name": "refunds_create", "description": "Refund a delivered order, fully or partly, and return the refund id. Use when the user asks for money back on an order that has arrived. Do not use to cancel an order that has not shipped.", "params": {"order_id": {"type": "string", "pattern": "^A-[0-9]+$", "description": "Order id, e.g. A-17"}, "amount_cents": {"type": ["integer", "null"], "description": "Amount in cents; null refunds the full order"}}, "required": ["order_id", "amount_cents"]}
  ]
}''')
CASES = [
    ("Where is my order A-17?", "order", "orders_get_status"),
    ("Please cancel order A-18, it has not shipped", "order", "orders_cancel"),
    ("I want my money back for order A-19, it arrived broken", "refund", "refunds_create"),
    ("Find the customer with email ann@example.com", "get_user", "customers_find"),
    ("What items are in order A-20?", "order", "orders_get_status"),
    ("Refund the delivered order A-21", "refund", "refunds_create"),
    ("What plan and account status does Bob Lee have?", "fetch_account", "customers_find"),
    ("Stop order A-22 before it ships", "order", "orders_cancel"),
]
STOP = {"the", "and", "for", "use", "this", "that", "not", "one", "its", "their", "when", "has", "yet", "only", "with", "get", "gets", "data", "info", "what", "where", "want", "please", "does", "have", "before"}


def words(s):
    out = set()
    for w in re.split(r"[^a-z0-9]+", s.lower()):
        if len(w) > 2 and w not in STOP:
            out.add(w[:-1] if len(w) > 4 and w.endswith("s") else w)
    return out


# Iteration 2: the eval showed a confusion, so ONE description was reworded.
SETS["good v2"] = [t if t["name"] != "orders_cancel" else {**t,
    "description": "Cancel or stop an order that has not shipped yet. Use only when the user explicitly asks to cancel or stop it. Do not use for refunds; use refunds_create."}
    for t in SETS["good"]]


def catch_all(t):
    return any(k == "action" and "enum" not in p for k, p in t["params"].items())


def route(request, tools):
    req = words(request)
    best, best_score = None, float("-inf")
    for t in tools:
        parts = re.split(r"(?<=[.!?])\\s+", t["description"])
        pos = words(" ".join([t["name"].replace("_", " ")] + [p for p in parts if not re.match(r"do not use", p, re.I)]))
        neg = words(" ".join(p for p in parts if re.match(r"do not use", p, re.I)))
        score = len(req & pos) - 2 * len(req & neg)
        if score > best_score:
            best, best_score = t["name"], score
    return best, best_score


for label, tools in SETS.items():
    correct, vague, confusions = 0, 0, {}
    print(f"== {label} toolset")
    for request, exp_bad, exp_good in CASES:
        expected = exp_bad if label == "bad" else exp_good
        picked, score = route(request, tools)
        ok = picked == expected
        if catch_all(next(t for t in tools if t["name"] == picked)):
            vague += 1
        if ok:
            correct += 1
        else:
            key = f"{expected} -> {picked}"
            confusions[key] = confusions.get(key, 0) + 1
        tail = "" if ok else f", expected {expected}"
        print(f"  {'PASS' if ok else 'FAIL'}  {request:<56} picked {picked} (score {score}){tail}")
    print(f"  tool-selection accuracy: {correct}/{len(CASES)}")
    for k, n in confusions.items():
        print(f"  confusion: {k} x{n}")
    if vague:
        print(f'  {vague} picks went to a catch-all tool whose free-string "action" argument the model must still guess')` },
        ],
      },
    ],
  },
];

export default augments;
