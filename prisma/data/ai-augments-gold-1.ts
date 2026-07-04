/**
 * AI Engineering — Batch 1 (LLM fundamentals). Gold-standard answers:
 * TL;DR + theme-aware <svg class='iq-diagram'> diagram + GFM table + interview
 * tip + a static code example. Picked up by `npm run augment:ai`.
 *
 * Conventions: SVGs use the shared .iq-diagram helper classes (d-box, d-box-accent,
 * d-box-muted, d-text, d-sub, d-accent, d-edge[-accent][-dashed], d-arrow),
 * single-quoted attrs (no apostrophes inside), &lt;/&gt; for angle brackets.
 * Inline code uses <code> tags. Examples are NOT runnable → runnable:false.
 */
import type { AiAugment } from "./ai-augments.types";

const augments: AiAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is a Large Language Model and how does it generate text?",
    answer: `**TL;DR.** An LLM is a **transformer** trained on massive text to **predict the next token**. Generation is **autoregressive**: it predicts one token, appends it to the input, and repeats. Instruction-following and reasoning emerge from this objective plus **post-training** (instruction tuning, preference training).

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Autoregressive loop: prompt tokens go into the transformer which predicts the next token and feeds it back'>
  <rect class='d-box-muted' x='16' y='55' width='120' height='44' rx='8'/><text class='d-text' x='76' y='75' text-anchor='middle'>prompt tokens</text><text class='d-sub' x='76' y='91' text-anchor='middle'>The cat sat on</text>
  <line class='d-edge' x1='136' y1='77' x2='176' y2='77'/><polygon class='d-arrow' points='176,72 186,77 176,82'/>
  <rect class='d-box-accent' x='188' y='45' width='110' height='64' rx='10'/><text class='d-text' x='243' y='73' text-anchor='middle'>transformer</text><text class='d-sub' x='243' y='91' text-anchor='middle'>attention layers</text>
  <line class='d-edge' x1='298' y1='77' x2='338' y2='77'/><polygon class='d-arrow' points='338,72 348,77 338,82'/>
  <rect class='d-box' x='350' y='55' width='94' height='44' rx='8'/><text class='d-text' x='397' y='75' text-anchor='middle'>next token</text><text class='d-sub' x='397' y='91' text-anchor='middle'>the (p=0.62)</text>
  <path class='d-edge-dashed' d='M 397 99 L 397 128 L 76 128 L 76 99'/><polygon class='d-arrow' points='71,101 76,93 81,101'/>
  <text class='d-sub' x='236' y='142' text-anchor='middle'>append + repeat (autoregressive decoding)</text>
</svg>

**How it works.** Text is split into **tokens**; the transformer's **attention** layers let every token condition on all previous ones, producing a probability distribution over the vocabulary for the next token. A **sampling** step picks one (greedy, temperature, top-p), it is appended, and the model runs again — so output length directly costs latency. **Pretraining** on internet-scale text teaches language and world knowledge; **post-training** (instruction tuning + RLHF-style preference optimization) turns the raw predictor into an assistant that follows instructions and refuses harmful requests.

### The stack in one view
| Stage | What it learns | Result |
| --- | --- | --- |
| Pretraining | next-token prediction | knowledge + fluency |
| Instruction tuning | (instruction, response) pairs | follows requests |
| Preference training | human-ranked outputs | helpful, safe chat |

> **Interview tip:** Say **"autoregressive next-token prediction over tokens, with capabilities shaped by post-training"** — then connect it to engineering: per-token pricing, output-length latency, and why hallucinations are a statistical artifact, not a bug.`,
    examples: [
      {
        label: "One decoding step, conceptually",
        tech: "python",
        runnable: false,
        code: `context = tokenize("The cat sat on")
while not done:
    logits = transformer(context)          # scores for every vocab token
    probs  = softmax(logits[-1] / temperature)
    tok    = sample(probs)                 # greedy / top-p / top-k
    context.append(tok)                    # feed it back in
    done   = (tok == EOS) or len(context) >= max_tokens`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are tokens and why do they matter for cost and limits?",
    answer: `**TL;DR.** Tokens are the **sub-word units** a model reads and writes (~4 English characters each). They are the currency of everything: **pricing** (per input/output token), **context limits**, and **latency** (one forward pass per output token).

<svg class='iq-diagram' viewBox='0 0 460 130' role='img' aria-label='A sentence split into tokens, each token feeding pricing, limits and latency'>
  <rect class='d-box-muted' x='16' y='20' width='428' height='36' rx='8'/>
  <text class='d-sub' x='40' y='43'>inter</text><text class='d-sub' x='80' y='43'>view</text><text class='d-sub' x='122' y='43'>pad</text><text class='d-sub' x='165' y='43'>_is</text><text class='d-sub' x='200' y='43'>_great</text><text class='d-sub' x='250' y='43'>!</text>
  <line class='d-edge' x1='36' y1='56' x2='36' y2='60'/><line class='d-edge' x1='76' y1='56' x2='76' y2='60'/><line class='d-edge' x1='118' y1='56' x2='118' y2='60'/><line class='d-edge' x1='160' y1='56' x2='160' y2='60'/><line class='d-edge' x1='196' y1='56' x2='196' y2='60'/><line class='d-edge' x1='246' y1='56' x2='246' y2='60'/>
  <rect class='d-box-accent' x='40' y='78' width='110' height='38' rx='8'/><text class='d-text' x='95' y='95' text-anchor='middle'>pricing</text><text class='d-sub' x='95' y='110' text-anchor='middle'>per in/out token</text>
  <rect class='d-box-accent' x='175' y='78' width='110' height='38' rx='8'/><text class='d-text' x='230' y='95' text-anchor='middle'>limits</text><text class='d-sub' x='230' y='110' text-anchor='middle'>context window</text>
  <rect class='d-box-accent' x='310' y='78' width='110' height='38' rx='8'/><text class='d-text' x='365' y='95' text-anchor='middle'>latency</text><text class='d-sub' x='365' y='110' text-anchor='middle'>1 pass per token</text>
</svg>

**How it works.** A **tokenizer** (usually byte-pair encoding) maps text to integer IDs from a fixed vocabulary; common words are one token, rare words split into pieces. Consequences engineers must internalize: output tokens usually cost **several times more** than input tokens; JSON-heavy payloads, code and non-English text tokenize inefficiently (more tokens per character); models are weak at character-level tasks (counting letters) because they never see characters; and an agent that re-sends a growing conversation each turn pays **quadratic** cumulative token cost over the session.

### Rules of thumb
| Fact | Rule of thumb |
| --- | --- |
| 1 token | ~4 chars / ~0.75 English words |
| Output vs input price | output often 3-5x dearer |
| JSON / code / non-English | tokenizes heavier than prose |
| Latency | scales with output tokens |

> **Interview tip:** Mention <code>tiktoken</code>-style counters and the agent-loop gotcha: context grows every turn, so token cost compounds — the fix is trimming, summarizing, and prompt caching.`,
    examples: [
      {
        label: "Counting tokens before sending",
        tech: "ts",
        runnable: false,
        code: `import { countTokens } from "@anthropic-ai/tokenizer";

const prompt = buildPrompt(docs, question);
const n = countTokens(prompt);

// budget check before the call, not after the invoice
if (n > MAX_INPUT_BUDGET) {
  docs = rankAndTrim(docs, MAX_INPUT_BUDGET - countTokens(question));
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is a context window and what happens when you exceed it?",
    answer: `**TL;DR.** The context window is the **maximum tokens (input + output)** a model can attend to per request. Exceed it and you get an **API error or truncation**; apps cope by **trimming, summarizing, or retrieving** only what matters. Long contexts also degrade recall (**lost in the middle**) and cost more.

<svg class='iq-diagram' viewBox='0 0 460 140' role='img' aria-label='Context window as a fixed-size bar holding system prompt, history, retrieved docs and output, with overflow falling out'>
  <rect class='d-box-muted' x='16' y='30' width='380' height='44' rx='8'/>
  <rect class='d-box-accent' x='22' y='36' width='80' height='32' rx='6'/><text class='d-sub' x='62' y='56' text-anchor='middle'>system</text>
  <rect class='d-box' x='106' y='36' width='104' height='32' rx='6'/><text class='d-sub' x='158' y='56' text-anchor='middle'>history</text>
  <rect class='d-box' x='214' y='36' width='104' height='32' rx='6'/><text class='d-sub' x='266' y='56' text-anchor='middle'>retrieved docs</text>
  <rect class='d-box-accent' x='322' y='36' width='68' height='32' rx='6'/><text class='d-sub' x='356' y='56' text-anchor='middle'>output</text>
  <line class='d-edge-dashed' x1='396' y1='24' x2='396' y2='80'/>
  <text class='d-sub' x='428' y='45' text-anchor='middle'>hard</text><text class='d-sub' x='428' y='59' text-anchor='middle'>limit</text>
  <text class='d-sub' x='206' y='96' text-anchor='middle'>overflow → error / truncation → trim, summarize, retrieve</text>
  <text class='d-sub' x='206' y='118' text-anchor='middle'>quality note: middle content is recalled worst (lost in the middle)</text>
</svg>

**How it works.** Attention is computed across every token in the request, so the limit covers **system prompt + conversation + tool results + documents + the generated answer** (reserve room for output via <code>max_tokens</code>). When conversations outgrow it, strategies are: **sliding window** (drop oldest turns), **running summary** (compress old turns), **externalized memory/RAG** (store outside, retrieve on demand). Even under the limit, more context is not free: attention quality dilutes, latency and cost rise — retrieval of 5 relevant chunks routinely beats stuffing 100.

### Coping strategies
| Strategy | Keeps | Loses |
| --- | --- | --- |
| Sliding window | recent turns verbatim | old details |
| Running summary | gist of everything | nuance, exact wording |
| External memory / RAG | durable facts on demand | needs retrieval quality |

> **Interview tip:** Two senior points: budget output tokens inside the window, and **bigger windows do not replace retrieval** — relevance beats volume on both quality and cost.`,
    examples: [
      {
        label: "Guarding the window before a chat call",
        tech: "ts",
        runnable: false,
        code: `const WINDOW = 200_000;
const RESERVED_OUTPUT = 4_096;

function fitMessages(system: string, turns: Msg[], docs: Doc[]) {
  let budget = WINDOW - RESERVED_OUTPUT - countTokens(system);
  const keptDocs  = takeWhileUnderBudget(rankByRelevance(docs), 0.4 * budget);
  const keptTurns = takeRecentUnderBudget(turns, budget - tokensOf(keptDocs));
  return { system, docs: keptDocs, turns: keptTurns };
}`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do temperature, top-p and other sampling parameters affect output?",
    answer: `**TL;DR.** The model outputs a **probability distribution** per token; sampling params shape the pick. **Temperature** rescales confidence (0 = deterministic-ish, high = diverse), **top-p** keeps the smallest set of tokens whose probabilities sum to p, **top-k** caps candidates. Low for extraction, higher for creative work — and tune **one**, not both.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Token probability bars at low temperature are peaked and at high temperature are flat'>
  <text class='d-text' x='110' y='26' text-anchor='middle'>temperature 0.1</text>
  <rect class='d-box-accent' x='40' y='40' width='24' height='70'/><rect class='d-box' x='72' y='85' width='24' height='25'/><rect class='d-box' x='104' y='95' width='24' height='15'/><rect class='d-box' x='136' y='102' width='24' height='8'/>
  <text class='d-sub' x='110' y='128' text-anchor='middle'>peaked → picks the winner</text>
  <text class='d-text' x='340' y='26' text-anchor='middle'>temperature 1.0</text>
  <rect class='d-box-accent' x='270' y='68' width='24' height='42'/><rect class='d-box' x='302' y='75' width='24' height='35'/><rect class='d-box' x='334' y='82' width='24' height='28'/><rect class='d-box' x='366' y='88' width='24' height='22'/>
  <text class='d-sub' x='340' y='128' text-anchor='middle'>flat → diverse picks</text>
  <line class='d-edge-dashed' x1='230' y1='30' x2='230' y2='120'/>
</svg>

**How it works.** Logits are divided by **temperature** before softmax: below 1 sharpens the distribution toward the argmax, above 1 flattens it, raising the chance of unusual tokens (and off-rails output). **Top-p (nucleus)** truncates the tail dynamically — with p=0.9 only the most probable tokens covering 90% mass stay candidates. **Top-k** is a fixed-count version. Others worth knowing: **stop sequences** (end generation on a marker), <code>max_tokens</code> (hard output cap), and penalties (frequency/presence) against repetition. Note that temperature 0 still is not a reproducibility guarantee across hardware/batching — do not build tests that assume byte-identical outputs.

### Cheat sheet
| Task | Temperature |
| --- | --- |
| Extraction / classification / structured output | 0 - 0.2 |
| Q&A, summarization | 0.2 - 0.5 |
| Drafting, chat | ~0.7 |
| Brainstorming, fiction | 0.9 - 1.2 |

> **Interview tip:** Explain the mechanism (logit rescaling before softmax; nucleus truncation), give the task-based table, and add the pro note: providers advise adjusting **temperature or top-p, not both**.`,
    examples: [
      {
        label: "Different settings per task",
        tech: "ts",
        runnable: false,
        code: `// extraction: deterministic and schema-bound
await client.messages.create({
  model, temperature: 0, max_tokens: 500,
  messages: [{ role: "user", content: extractPrompt }],
});

// brainstorming: allow diversity
await client.messages.create({
  model, temperature: 1.0, max_tokens: 800,
  messages: [{ role: "user", content: "Give 10 campaign angles for..." }],
});`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between a base model, an instruction-tuned model and a chat model?",
    answer: `**TL;DR.** A **base model** is the raw next-token predictor — it completes text, it does not answer you. **Instruction tuning** teaches it to follow requests; **chat models** add multi-turn structure plus **preference training** (RLHF/RLAIF) for helpfulness and safety. Production APIs serve chat models.

<svg class='iq-diagram' viewBox='0 0 460 130' role='img' aria-label='Pipeline from base model through instruction tuning to chat model'>
  <rect class='d-box-muted' x='16' y='40' width='120' height='54' rx='10'/><text class='d-text' x='76' y='63' text-anchor='middle'>base model</text><text class='d-sub' x='76' y='81' text-anchor='middle'>completes text</text>
  <line class='d-edge' x1='136' y1='67' x2='166' y2='67'/><polygon class='d-arrow' points='166,62 176,67 166,72'/>
  <rect class='d-box' x='178' y='40' width='120' height='54' rx='10'/><text class='d-text' x='238' y='63' text-anchor='middle'>instruction-tuned</text><text class='d-sub' x='238' y='81' text-anchor='middle'>follows requests</text>
  <line class='d-edge' x1='298' y1='67' x2='328' y2='67'/><polygon class='d-arrow' points='328,62 338,67 328,72'/>
  <rect class='d-box-accent' x='340' y='40' width='104' height='54' rx='10'/><text class='d-text' x='392' y='63' text-anchor='middle'>chat model</text><text class='d-sub' x='392' y='81' text-anchor='middle'>multi-turn + RLHF</text>
  <text class='d-sub' x='230' y='116' text-anchor='middle'>SFT on (instruction, response) pairs → preference optimization on ranked outputs</text>
</svg>

**How it works.** Ask a base model "What is the capital of France?" and a likely completion is another quiz question — statistically plausible continuation, not an answer. **Supervised fine-tuning (SFT)** on curated (instruction, response) pairs shifts the distribution toward answering. **Preference training** (RLHF, or RLAIF/constitutional variants) then optimizes for outputs humans rate higher — more helpful, honest, safe. Chat models finally wrap conversations in a **role-structured template** (system/user/assistant), which is why chat APIs take message arrays, and why the system role carries extra instruction-following weight.

### Side by side
| | Base | Instruction-tuned | Chat |
| --- | --- | --- | --- |
| Objective | next token | follow one request | multi-turn assistant |
| Alignment | none | SFT | SFT + preference |
| Use | research, fine-tune source | single-shot tasks | products, agents |

> **Interview tip:** The crisp line is **"base models complete, chat models converse"** — then name the two post-training stages (SFT, preference optimization) and why the system role exists at all.`,
    examples: [
      {
        label: "Same input, different behaviour",
        tech: "bash",
        runnable: false,
        code: `# base model — plausible continuation, not an answer
IN:  "What is the capital of France?"
OUT: " What is the capital of Spain? What is..."   # quiz-sheet pattern

# chat model — role-structured, answers the request
IN:  [system] You are a concise assistant.
     [user]   What is the capital of France?
OUT: "Paris."`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What are hallucinations and what causes them?",
    answer: `**TL;DR.** Hallucinations are **fluent but false** outputs — invented citations, nonexistent APIs, confident wrong facts. Root cause: the model optimizes **plausibility, not truth**; when the answer is missing from weights and context, the most likely-sounding continuation may be fabricated.

<svg class='iq-diagram' viewBox='0 0 460 140' role='img' aria-label='A query missing from training data and context leads the model to output a plausible fabrication'>
  <rect class='d-box' x='16' y='24' width='130' height='40' rx='8'/><text class='d-sub' x='81' y='48' text-anchor='middle'>training data: no answer</text>
  <rect class='d-box' x='16' y='76' width='130' height='40' rx='8'/><text class='d-sub' x='81' y='100' text-anchor='middle'>context: no answer</text>
  <line class='d-edge' x1='146' y1='44' x2='196' y2='62'/><line class='d-edge' x1='146' y1='96' x2='196' y2='78'/><polygon class='d-arrow' points='196,65 206,70 196,75'/>
  <rect class='d-box-accent' x='208' y='48' width='110' height='44' rx='10'/><text class='d-text' x='263' y='68' text-anchor='middle'>model</text><text class='d-sub' x='263' y='84' text-anchor='middle'>maximizes plausibility</text>
  <line class='d-edge' x1='318' y1='70' x2='348' y2='70'/><polygon class='d-arrow' points='348,65 358,70 348,75'/>
  <rect class='d-box-muted' x='360' y='48' width='84' height='44' rx='8'/><text class='d-text' x='402' y='68' text-anchor='middle'>fluent</text><text class='d-sub' x='402' y='84' text-anchor='middle'>fabrication</text>
  <text class='d-sub' x='230' y='126' text-anchor='middle'>sounds right ≠ is right — verify before you trust</text>
</svg>

**How it works.** Next-token training rewards outputs that **look like** the training distribution. Contributing factors: knowledge gaps and the **cutoff date**; compression (a model is a lossy summary of its data); questions premised on false assumptions (models tend to accept the premise); long chains where one early error compounds; and decoding randomness. Classic engineering examples: **fabricated citations**, **hallucinated package names** (a real supply-chain risk — attackers register the fake packages), and **plausible-but-wrong API signatures** in generated code.

### High-risk situations
| Situation | Why it hallucinates |
| --- | --- |
| Niche/recent facts | missing from weights |
| Citations, URLs, IDs | pattern is learnable, contents are not |
| Leading questions | accepts your false premise |
| Long derivations | early error compounds |

> **Interview tip:** Define it as a **statistical artifact of the training objective**, not a bug to patch — then pivot to mitigations: grounding via retrieval, explicit permission to say "I do not know", citations, and downstream verification.`,
    examples: [
      {
        label: "The abstain-or-cite pattern",
        tech: "ts",
        runnable: false,
        code: `const system = [
  "Answer ONLY from the provided context.",
  "Cite the doc id for every claim, like [doc-3].",
  "If the context does not contain the answer, reply exactly:",
  '"I could not find this in the provided documents."',
].join("\\n");

// downstream: reject answers whose citations do not resolve
const ok = extractCitations(reply).every((id) => contextIds.has(id));`,
      },
    ],
  },
];

export default augments;
