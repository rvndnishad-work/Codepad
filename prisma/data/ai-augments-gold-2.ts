/**
 * AI Engineering — Batch 2 (adaptation, deployment fundamentals, prompting
 * basics). Same gold conventions as batch 1. Picked up by `npm run augment:ai`.
 */
import type { AiAugment } from "./ai-augments.types";

const augments: AiAugment[] = [
  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between fine-tuning, LoRA and prompt engineering?",
    answer: `**TL;DR.** Three levers, increasing cost: **prompt engineering** changes the input (no training), **LoRA** trains small adapter matrices, **full fine-tuning** updates all weights. Default path: prompt (+RAG for knowledge) first; fine-tune for **style, format, narrow-task specialization** — never to add facts.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Three levers ordered by cost: prompting changes context, LoRA adds adapters, fine-tuning updates all weights'>
  <rect class='d-box-accent' x='16' y='30' width='130' height='60' rx='10'/><text class='d-text' x='81' y='54' text-anchor='middle'>prompting</text><text class='d-sub' x='81' y='72' text-anchor='middle'>edit the context</text>
  <rect class='d-box' x='164' y='30' width='130' height='60' rx='10'/><text class='d-text' x='229' y='54' text-anchor='middle'>LoRA</text><text class='d-sub' x='229' y='72' text-anchor='middle'>train tiny adapters</text>
  <rect class='d-box-muted' x='312' y='30' width='132' height='60' rx='10'/><text class='d-text' x='378' y='54' text-anchor='middle'>full fine-tune</text><text class='d-sub' x='378' y='72' text-anchor='middle'>update all weights</text>
  <line class='d-edge' x1='30' y1='112' x2='430' y2='112'/><polygon class='d-arrow' points='430,107 440,112 430,117'/>
  <text class='d-sub' x='230' y='134' text-anchor='middle'>cost, iteration time, ops burden →</text>
</svg>

**How it works.** **Prompting** covers most needs: instructions, few-shot examples, retrieved context; it iterates in seconds and deploys as a config change. **LoRA** freezes the base weights and learns low-rank matrices injected into attention layers — typically under 1% of parameters — giving most of the specialization benefit cheaply, with swappable per-task adapters. **Full fine-tuning** retrains everything: highest ceiling, highest cost, plus risks (catastrophic forgetting, alignment drift) and an ops tail (data pipeline, eval, re-tuning on every base-model upgrade). The classic interview trap: "the model does not know our product docs, should we fine-tune?" — no, that is a **RAG** problem; fine-tuning is unreliable at storing facts and cannot be updated per-document.

### Choosing
| Need | Right lever |
| --- | --- |
| Knowledge of your data | RAG (not fine-tuning) |
| Output format / tone / persona | prompting → LoRA if stubborn |
| Narrow task at scale (classify, extract) | LoRA on a small model |
| New language / domain shift | full fine-tune |

> **Interview tip:** Lead with the decision rule — **prompt first, RAG for knowledge, fine-tune for behaviour** — and mention that fine-tunes need their own eval suite and re-validation whenever the base model changes.`,
    examples: [
      {
        label: "LoRA in one glance (PEFT-style)",
        tech: "python",
        runnable: false,
        code: `from peft import LoraConfig, get_peft_model

config = LoraConfig(r=16, lora_alpha=32,
                    target_modules=["q_proj", "v_proj"],
                    task_type="CAUSAL_LM")
model = get_peft_model(base_model, config)
model.print_trainable_parameters()
# trainable params: 4.2M || all params: 7B || trainable%: 0.06`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is quantization and when would you use a quantized model?",
    answer: `**TL;DR.** Quantization stores weights at **lower precision** (e.g. 4-bit ints instead of 16-bit floats), cutting memory ~4x and boosting throughput with a small quality loss. It is what makes **local and single-GPU LLMs** practical.

<svg class='iq-diagram' viewBox='0 0 460 140' role='img' aria-label='FP16 weights compressed to INT4 shrink memory from 14GB to about 4GB'>
  <rect class='d-box-muted' x='30' y='30' width='170' height='60' rx='10'/><text class='d-text' x='115' y='55' text-anchor='middle'>FP16 weights</text><text class='d-sub' x='115' y='74' text-anchor='middle'>7B model ≈ 14 GB</text>
  <line class='d-edge' x1='200' y1='60' x2='244' y2='60'/><polygon class='d-arrow' points='244,55 254,60 244,65'/>
  <text class='d-sub' x='227' y='46' text-anchor='middle'>quantize</text>
  <rect class='d-box-accent' x='256' y='40' width='120' height='40' rx='10'/><text class='d-text' x='316' y='58' text-anchor='middle'>INT4 weights</text><text class='d-sub' x='316' y='73' text-anchor='middle'>≈ 4 GB</text>
  <text class='d-sub' x='230' y='118' text-anchor='middle'>less memory + faster memory-bound inference, small perplexity hit</text>
</svg>

**How it works.** Weights are mapped to a small integer grid with per-group scale factors; at inference they are dequantized on the fly. Because LLM inference is **memory-bandwidth-bound**, smaller weights mean faster token generation, not just smaller files. Common schemes: **GGUF** (llama.cpp, CPU/consumer GPU), **AWQ/GPTQ** (GPU-optimized post-training quantization), plus **KV-cache quantization** for long contexts. Quality degrades gracefully to ~4-bit; below that it falls off fast, and the loss concentrates in fine-grained reasoning, math and code — exactly the tasks to re-eval before shipping a quantized model.

### Precision ladder
| Precision | Memory (7B) | Quality |
| --- | --- | --- |
| FP16 | ~14 GB | reference |
| INT8 | ~7 GB | near-lossless |
| INT4 | ~4 GB | small, task-dependent loss |
| 2-3 bit | ~2-3 GB | noticeable degradation |

> **Interview tip:** Name the mechanism (**low-bit weights + scale factors**), why it speeds decoding (**memory-bound inference**), the formats (GGUF/AWQ/GPTQ), and the caveat: **re-run your evals on the quantized artifact** — benchmark parity claims do not transfer to your task automatically.`,
    examples: [
      {
        label: "Running a quantized model locally",
        tech: "bash",
        runnable: false,
        code: `# Ollama pulls a 4-bit GGUF by default — 8B fits in ~5 GB RAM
ollama run llama3.1:8b

# llama.cpp: pick the quantization level explicitly
./llama-cli -m models/llama-3.1-8b-Q4_K_M.gguf -p "..."
# Q4_K_M ≈ best size/quality trade-off in practice`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do you choose between open-weight models and proprietary API models?",
    answer: `**TL;DR.** **Proprietary APIs** buy top capability with zero infrastructure; **open weights** buy data control, customization and at-scale cost predictability — paid for in serving ops and a capability gap. Decide on **capability need, privacy constraints, volume economics, and team maturity**.

<svg class='iq-diagram' viewBox='0 0 460 160' role='img' aria-label='Two columns comparing proprietary API models and open-weight models'>
  <rect class='d-box-accent' x='20' y='24' width='200' height='112' rx='10'/>
  <text class='d-text' x='120' y='48' text-anchor='middle'>proprietary API</text>
  <text class='d-sub' x='120' y='70' text-anchor='middle'>frontier capability</text>
  <text class='d-sub' x='120' y='88' text-anchor='middle'>zero infra, pay per token</text>
  <text class='d-sub' x='120' y='106' text-anchor='middle'>data leaves your VPC*</text>
  <text class='d-sub' x='120' y='124' text-anchor='middle'>provider controls versions</text>
  <rect class='d-box-muted' x='240' y='24' width='200' height='112' rx='10'/>
  <text class='d-text' x='340' y='48' text-anchor='middle'>open weights</text>
  <text class='d-sub' x='340' y='70' text-anchor='middle'>data stays in-house</text>
  <text class='d-sub' x='340' y='88' text-anchor='middle'>fine-tunable, pinnable</text>
  <text class='d-sub' x='340' y='106' text-anchor='middle'>you own serving + scaling</text>
  <text class='d-sub' x='340' y='124' text-anchor='middle'>capability gap vs frontier</text>
  <text class='d-sub' x='230' y='152' text-anchor='middle'>*enterprise terms: no training on your data, short retention, regional endpoints</text>
</svg>

**How it works.** Work the decision as four questions. **Capability:** if the task needs frontier reasoning or agentic reliability, APIs usually win outright — a failing cheap model is expensive. **Privacy/compliance:** regulated data may mandate in-VPC inference (self-hosted open weights or private cloud endpoints like Bedrock/Vertex, which blur the line). **Economics:** APIs are elastic OPEX with zero idle cost; self-hosting wins only at sustained high utilization after you count GPUs **and** engineers. **Ops maturity:** serving LLMs well (vLLM/TGI, autoscaling, quality monitoring, upgrades) is a real team. Hybrid routing is common: frontier API for the hard 20%, small open model for the bulk.

### Decision grid
| Factor | Favors API | Favors open weights |
| --- | --- | --- |
| Capability ceiling | frontier reasoning | narrow, tunable tasks |
| Data constraints | standard terms suffice | strict in-VPC mandates |
| Volume | spiky / low | huge and steady |
| Team | product-focused | has inference-ops skill |

> **Interview tip:** Avoid ideology; give the four-factor framework, mention **private cloud endpoints** as the middle path, and note that model choice should be revisited per release — encapsulate the provider behind one interface.`,
    examples: [
      {
        label: "Provider-agnostic seam so you can switch",
        tech: "ts",
        runnable: false,
        code: `interface LlmClient {
  complete(req: { system: string; messages: Msg[]; maxTokens: number }): Promise<Reply>;
}

// implementations: AnthropicClient, BedrockClient, VllmClient...
// routing by task tier keeps economics honest:
const client = task.tier === "frontier" ? anthropic : selfHostedSmall;`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "How do multimodal models handle images, audio and other non-text inputs?",
    answer: `**TL;DR.** Non-text inputs are encoded into the **same token/embedding space** the language model reasons over — images become visual tokens via a vision encoder, audio becomes acoustic tokens. One model then attends across modalities. Engineering realities: **images cost thousands of tokens**, resolution settings matter, and prompts should reference the media explicitly.

<svg class='iq-diagram' viewBox='0 0 460 150' role='img' aria-label='Image and audio encoders project into the shared token space of the language model'>
  <rect class='d-box' x='16' y='20' width='110' height='40' rx='8'/><text class='d-text' x='71' y='44' text-anchor='middle'>image</text>
  <rect class='d-box' x='16' y='70' width='110' height='40' rx='8'/><text class='d-text' x='71' y='94' text-anchor='middle'>audio</text>
  <line class='d-edge' x1='126' y1='40' x2='170' y2='58'/><line class='d-edge' x1='126' y1='90' x2='170' y2='72'/><polygon class='d-arrow' points='170,60 180,65 170,70'/>
  <rect class='d-box-muted' x='182' y='42' width='108' height='46' rx='8'/><text class='d-text' x='236' y='62' text-anchor='middle'>encoders</text><text class='d-sub' x='236' y='79' text-anchor='middle'>patches → tokens</text>
  <line class='d-edge' x1='290' y1='65' x2='330' y2='65'/><polygon class='d-arrow' points='330,60 340,65 330,70'/>
  <rect class='d-box-accent' x='342' y='36' width='102' height='58' rx='10'/><text class='d-text' x='393' y='60' text-anchor='middle'>LLM</text><text class='d-sub' x='393' y='78' text-anchor='middle'>shared token space</text>
  <text class='d-sub' x='230' y='132' text-anchor='middle'>one attention stack reasons across text + visual + acoustic tokens</text>
</svg>

**How it works.** For vision, the image is split into fixed-size **patches**; a vision transformer encodes them and a projection layer maps them into the LLM's embedding space, so a screenshot arrives as a sequence of "visual tokens" interleaved with your text. This enables OCR-free document reading, chart and screenshot reasoning, and UI understanding (the basis of computer-use agents). Practical levers: **token cost scales with resolution** (a detailed image can be 1-2k+ tokens — downscale when detail is not needed), multiple images multiply cost, and grounding language ("in the attached invoice, find the total") outperforms vague references. Native audio models skip the transcribe-then-read pipeline, preserving tone and timing.

### App design notes
| Concern | Guidance |
| --- | --- |
| Cost | tokens scale with resolution — downscale receipts, keep diagrams sharp |
| Accuracy | crop to the region of interest when possible |
| Prompting | name the artifact and the task explicitly |
| Fallback | pair with real OCR when exact character fidelity is critical |

> **Interview tip:** The phrase that lands: **"encoders project other modalities into the token space"** — then show product sense with the cost/resolution trade-off and one concrete use case (screenshot agents or OCR-free document Q&A).`,
    examples: [
      {
        label: "Vision request with cost control",
        tech: "ts",
        runnable: false,
        code: `const resized = await sharp(buf).resize({ width: 1024 }).toBuffer(); // cap tokens

await client.messages.create({
  model,
  max_tokens: 500,
  messages: [{
    role: "user",
    content: [
      { type: "image", source: { type: "base64", media_type: "image/png",
        data: resized.toString("base64") } },
      { type: "text", text: "From this invoice, extract vendor, date, total as JSON." },
    ],
  }],
});`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is the difference between zero-shot, one-shot and few-shot prompting?",
    answer: `**TL;DR.** **Zero-shot** = instruction only; **one-/few-shot** = include worked examples so the model infers the pattern (**in-context learning**, no training). Modern chat models are strong zero-shot — add examples when **format or edge-case behaviour** must be nailed, not by default.

<svg class='iq-diagram' viewBox='0 0 460 140' role='img' aria-label='Zero-shot prompt has instruction only; few-shot prepends example pairs before the real input'>
  <rect class='d-box-muted' x='20' y='24' width='190' height='96' rx='10'/>
  <text class='d-text' x='115' y='48' text-anchor='middle'>zero-shot</text>
  <rect class='d-box' x='36' y='60' width='158' height='24' rx='6'/><text class='d-sub' x='115' y='76' text-anchor='middle'>instruction</text>
  <rect class='d-box-accent' x='36' y='90' width='158' height='22' rx='6'/><text class='d-sub' x='115' y='105' text-anchor='middle'>input → ?</text>
  <rect class='d-box-muted' x='250' y='24' width='190' height='96' rx='10'/>
  <text class='d-text' x='345' y='44' text-anchor='middle'>few-shot</text>
  <rect class='d-box' x='266' y='52' width='158' height='16' rx='5'/><text class='d-sub' x='345' y='64' text-anchor='middle'>instruction</text>
  <rect class='d-box' x='266' y='72' width='158' height='14' rx='5'/><text class='d-sub' x='345' y='83' text-anchor='middle'>example in → out</text>
  <rect class='d-box' x='266' y='89' width='158' height='14' rx='5'/><text class='d-sub' x='345' y='100' text-anchor='middle'>example in → out</text>
  <rect class='d-box-accent' x='266' y='106' width='158' height='12' rx='5'/><text class='d-sub' x='345' y='116' text-anchor='middle'>input → ?</text>
</svg>

**How it works.** Examples in the prompt act like gradient-free training: the model completes the pattern it sees. That makes few-shot the highest-leverage tool for **strict output formats**, **subtle label boundaries** in classification (show the confusable cases!), and **house style**. Craft rules: examples must be **correct and diverse** (the model imitates mistakes), formatted **identically** to the desired output, ordered with awareness of **recency bias** (the last example pulls hardest), and counted against your token budget on every call — a stable example block placed early also becomes **prompt-cache** friendly.

### When to add examples
| Situation | Shots |
| --- | --- |
| Capable model, clear task | zero-shot |
| Strict format / schema quirks | 1-3 |
| Nuanced classification boundaries | 3-8 incl. hard negatives |
| House style imitation | 2-5 |

> **Interview tip:** Name the mechanism (**in-context learning**) and one non-obvious craft rule — e.g. put the **confusable** cases in the examples, since the model already handles the easy ones zero-shot.`,
    examples: [
      {
        label: "Few-shot with hard negatives for a classifier",
        tech: "ts",
        runnable: false,
        code: `const prompt = [
  "Classify the ticket as: bug | feature_request | question.",
  "",
  'Ticket: "App crashes when I tap export" → bug',
  'Ticket: "Export to CSV would be great" → feature_request',
  // hard negative: sounds like a bug, is actually a question
  'Ticket: "Is export supposed to include archived items?" → question',
  "",
  "Ticket: " + JSON.stringify(ticketText) + " →",
].join("\\n");`,
      },
    ],
  },

  // ──────────────────────────────────────────────────────────────────────────
  {
    title: "What is chain-of-thought prompting and when does it actually help?",
    answer: `**TL;DR.** Chain-of-thought (CoT) asks the model to **reason step by step before answering**. It lifts accuracy on math, logic and multi-step tasks because each reasoning token conditions the next; it wastes tokens on simple lookups. **Reasoning models** now internalize it with dedicated thinking tokens.

<svg class='iq-diagram' viewBox='0 0 460 140' role='img' aria-label='Direct answering jumps to output; chain of thought inserts reasoning steps before the answer'>
  <text class='d-text' x='30' y='34'>direct</text>
  <rect class='d-box' x='80' y='20' width='90' height='30' rx='7'/><text class='d-sub' x='125' y='39' text-anchor='middle'>question</text>
  <line class='d-edge' x1='170' y1='35' x2='330' y2='35'/><polygon class='d-arrow' points='330,30 340,35 330,40'/>
  <rect class='d-box-muted' x='342' y='20' width='90' height='30' rx='7'/><text class='d-sub' x='387' y='39' text-anchor='middle'>answer (guess)</text>
  <text class='d-text' x='30' y='94'>CoT</text>
  <rect class='d-box' x='80' y='80' width='90' height='30' rx='7'/><text class='d-sub' x='125' y='99' text-anchor='middle'>question</text>
  <line class='d-edge' x1='170' y1='95' x2='184' y2='95'/><polygon class='d-arrow' points='184,90 192,95 184,100'/>
  <rect class='d-box-accent' x='194' y='80' width='42' height='30' rx='7'/><text class='d-sub' x='215' y='99' text-anchor='middle'>step</text>
  <line class='d-edge' x1='236' y1='95' x2='248' y2='95'/><polygon class='d-arrow' points='248,90 256,95 248,100'/>
  <rect class='d-box-accent' x='258' y='80' width='42' height='30' rx='7'/><text class='d-sub' x='279' y='99' text-anchor='middle'>step</text>
  <line class='d-edge' x1='300' y1='95' x2='330' y2='95'/><polygon class='d-arrow' points='330,90 340,95 330,100'/>
  <rect class='d-box-muted' x='342' y='80' width='90' height='30' rx='7'/><text class='d-sub' x='387' y='99' text-anchor='middle'>answer (derived)</text>
  <text class='d-sub' x='230' y='130' text-anchor='middle'>each reasoning token conditions the next — the model computes in its output</text>
</svg>

**How it works.** A transformer does fixed compute per token; CoT lets it **spend more tokens = more compute** on hard problems, writing intermediate state into its own context. It shines on arithmetic, planning, constraint puzzles and multi-hop questions; it adds cost and latency without benefit on retrieval-style lookups or easy classification. Two structural rules survive even with modern models: order output as **reason first, answer last** (an early answer anchors the reasoning post-hoc), and for parsing, fence the final answer in a marked section. **Reasoning models** (extended thinking) budget internal thinking tokens instead of needing the magic phrase — with those, control the thinking budget per task rather than prompting "step by step".

### Use it when
| Task | CoT value |
| --- | --- |
| Math, logic, planning | high |
| Multi-hop synthesis | high |
| Extraction / lookup | none (wasted tokens) |
| Latency-critical paths | use a reasoning-model budget instead |

> **Interview tip:** The mechanism soundbite: **"CoT converts extra tokens into extra compute"**. Add the anchoring rule (answer last) and the modern-model nuance to sound current.`,
    examples: [
      {
        label: "Structured reason-then-answer output",
        tech: "ts",
        runnable: false,
        code: `const prompt = [
  "Solve the scheduling question below.",
  "First write your reasoning inside <thinking> tags.",
  "Then output ONLY the final schedule as JSON inside <answer> tags.",
  "",
  question,
].join("\\n");

const reply = await complete(prompt);
const answer = between(reply, "<answer>", "</answer>"); // parse the fenced part only`,
      },
    ],
  },
];

export default augments;
