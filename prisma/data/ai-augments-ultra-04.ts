/**
 * AI ENGINEERING ULTRA — batch 04: training and adapting models (fine-tuning vs
 * LoRA vs prompting, RLHF and DPO, quantization, choosing between fine-tuning,
 * RAG and prompting, hallucinations). Every example was run by
 * scripts/verify-variant-examples.ts (node, python); quoted output is that run's output.
 */
import type { AiUltraAugment } from "./ai-augments.types";

const augments: AiUltraAugment[] = [
  {
    title: `What is the difference between fine-tuning, LoRA and prompt engineering?`,
    difficulty: "medium",
    seoDescription: `Prompt engineering changes the input, full fine-tuning changes every weight, LoRA trains a small low-rank add-on. What each costs and when to use it.`,
    description: `**Question presented to candidate:**
"Our team keeps arguing about whether to 'just fine-tune it'. Walk me through the difference between prompt engineering, full fine-tuning and LoRA: what each one actually changes, what it costs, and when you would reach for each."

**What a strong answer should cover:**
- Prompt engineering changes only the input (instructions, examples, retrieved text); the weights stay frozen, it costs nothing to train and iterates in minutes
- Full fine-tuning updates every weight with gradient descent on labelled examples; highest ceiling, but needs roughly 16 bytes per parameter of training memory with mixed-precision Adam and a full model copy per task
- LoRA freezes the base weights and trains a low-rank update B·A per targeted matrix (well under 1% of parameters), which can be merged back so inference is no slower, or kept as swappable per-task adapters; QLoRA does the same over a 4-bit base
- Fine-tuning (full or LoRA) is good at behaviour (format, tone, a narrow task, a smaller model imitating a bigger one) and poor at adding facts; knowledge belongs in retrieval
- The decision order: prompt first, measure with an eval, then LoRA if the prompt cannot reach the bar or is too long and expensive at your volume
- The rank trade-off: too low a rank cannot express the change; and every fine-tune must be re-done when the base model is upgraded

**Clarifying questions expected:**
- What is failing today: missing knowledge, wrong format or tone, or cost and latency at volume?
- Do we have labelled examples (how many, how clean) and an eval that measures the target behaviour?
- Do we control the weights (open-weight model) or only an API?

**Code / implementation expected:** Optional — a toy that trains full weights versus a low-rank adapter, plus the parameter and memory arithmetic, shows the mechanism well.`,
    answer: `**Target Audience:** Engineers who can call an LLM API and have heard "just fine-tune it", but have never trained a model or seen what LoRA actually changes.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (a toy linear layer trained with plain gradient descent; no real model is trained or called). Paper and library facts are cited inline with the date they were checked (October 2026).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

You hire a brilliant new colleague who has read most of the internet. There are three ways to get them doing the job your way.

- **Give them a good brief.** "Answer support tickets. Be short. Use this template. Here are three good examples." Nothing about them changes; you just changed what they read before starting. That is **prompt engineering**.
- **Send them back to school for a year.** Retrain everything they know around your work. Expensive, slow, and they might forget some of what made them brilliant. That is **full fine-tuning**.
- **Give them a small, specialised notebook** of habits they consult on top of everything they already know. Cheap to write, easy to swap for a different notebook on a different job. That is **LoRA**.

Teams waste weeks and real money picking the wrong one, usually by fine-tuning to fix something a better brief or retrieval would have fixed. The interview question checks whether you know what each lever actually changes inside the model, and therefore what it can and cannot fix.

## 2. What Each Lever Changes

A model is a big function: output = f(input; weights). There are only two things you can change: the **input** or the **weights**.

📌 **Interview term: weights (parameters)** — the learned numbers inside the network, billions of them in an LLM. Pretraining sets them; adaptation methods either leave them alone or change some of them.

📌 **Interview term: prompt engineering** — improving results by changing only the input: clearer instructions, a role, output format rules, few-shot examples, retrieved documents. Weights stay frozen; no training run. See [zero-, one- and few-shot prompting](/interview-question/what-is-the-difference-between-zero-shot-one-shot-and-few-shot-prompting) and [context engineering](/interview-question/what-is-context-engineering-and-how-does-it-differ-from-prompt-engineering).

📌 **Interview term: fine-tuning (full fine-tuning)** — continuing to train a pretrained model on your own examples so that every weight is updated by gradient descent. The result is a new full copy of the model.

📌 **Interview term: supervised fine-tuning (SFT)** — fine-tuning on input/desired-output pairs ("for this ticket, this is the ideal reply"). This is the most common kind; preference tuning is covered in [What are RLHF and DPO?](/interview-question/what-are-rlhf-and-dpo-and-how-do-they-turn-a-base-model-into-an-assistant)

📌 **Interview term: LoRA (Low-Rank Adaptation)** — freeze the pretrained weights and, for selected weight matrices, train a small update made of two thin matrices B and A whose product has the same shape as the original. Introduced by Hu et al., "LoRA: Low-Rank Adaptation of Large Language Models" (arXiv 2106.09685, 2021).

| | Prompt engineering | LoRA | Full fine-tuning |
| :--- | :--- | :--- | :--- |
| What changes | The input text | A small add-on per chosen matrix | Every weight |
| Trainable parameters | 0 | Usually well under 1% | 100% |
| Needs weight access | No (any API) | Yes, or a provider that offers it | Yes, or a provider that offers it |
| Time to iterate | Minutes | Hours | Hours to days |
| Artifact you ship | A prompt (text, versioned) | An adapter file (megabytes) plus the base | A whole new model |
| Good at | Unlocking what the model already does | Behaviour: format, tone, narrow tasks | Same, with the highest ceiling |
| Bad at | Long prompts cost tokens on every call | Adding facts reliably | Adding facts; cost; forgetting |

## 3. How LoRA Works

A transformer is mostly matrix multiplications: each layer has projection matrices (for example the query, key, value and output projections in attention, covered in [How does the transformer architecture and attention work?](/interview-question/how-does-the-transformer-architecture-and-attention-work)). Full fine-tuning learns a new value for each matrix W. LoRA learns only a **change** to it, and forces that change to be small in a specific way.

<svg class="iq-diagram" width="100%" viewBox="0 0 820 340" role="img" aria-label="LoRA: the input goes through the frozen matrix W0 and, in parallel, through two thin trainable matrices A and B; the two results are added">
  <defs>
    <marker id="ai04q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="130" width="130" height="80" rx="10"/>
  <text class="d-text" x="95" y="164" text-anchor="middle">input x</text>
  <text class="d-sub" x="95" y="190" text-anchor="middle">size d</text>
  <rect class="d-box" x="260" y="30" width="230" height="80" rx="10"/>
  <text class="d-text" x="375" y="64" text-anchor="middle">frozen W0</text>
  <text class="d-sub" x="375" y="90" text-anchor="middle">d x d, not trained</text>
  <rect class="d-box-accent" x="220" y="230" width="150" height="80" rx="10"/>
  <text class="d-text" x="295" y="264" text-anchor="middle">A</text>
  <text class="d-sub" x="295" y="290" text-anchor="middle">r x d, trained</text>
  <rect class="d-box-accent" x="420" y="230" width="170" height="80" rx="10"/>
  <text class="d-text" x="505" y="264" text-anchor="middle">B</text>
  <text class="d-sub" x="505" y="290" text-anchor="middle">d x r, starts at 0</text>
  <circle class="d-box" cx="650" cy="170" r="26"/>
  <text class="d-text" x="650" y="176" text-anchor="middle">+</text>
  <rect class="d-box-muted" x="700" y="130" width="110" height="80" rx="10"/>
  <text class="d-text" x="755" y="164" text-anchor="middle">output</text>
  <text class="d-sub" x="755" y="190" text-anchor="middle">W0 x + B A x</text>
  <path class="d-edge" d="M 164 150 L 254 80" marker-end="url(#ai04q1-arrow)"/>
  <path class="d-edge-accent" d="M 164 190 L 214 260" marker-end="url(#ai04q1-arrow)"/>
  <path class="d-edge-accent" d="M 374 270 L 414 270" marker-end="url(#ai04q1-arrow)"/>
  <path class="d-edge" d="M 494 70 L 650 70 L 650 138" marker-end="url(#ai04q1-arrow)"/>
  <path class="d-edge-accent" d="M 594 270 L 650 270 L 650 202" marker-end="url(#ai04q1-arrow)"/>
  <path class="d-edge" d="M 678 170 L 694 170" marker-end="url(#ai04q1-arrow)"/>
</svg>

The top path is the original model, untouched. The bottom path is the adapter: A squeezes the input down to r numbers, B expands it back. Only A and B are trained.

📌 **Interview term: rank (r)** — the inner size of the adapter. B·A is a d×d matrix, but it can only represent changes of rank r or less. Typical values are single or double digits (8, 16, 64) against a hidden size in the thousands.

📌 **Interview term: low-rank update** — the assumption behind LoRA: the *change* a task needs is simple enough to describe with a few directions, even though the full matrix is huge. The LoRA paper builds on prior work showing adaptation has low "intrinsic rank".

Three details interviewers like:

- **B starts at zero**, so at step 0 the adapted model is exactly the base model and training starts from the known-good point.
- **A scaling factor** \`alpha / r\` multiplies the update (the PEFT library documents \`lora_alpha / r\` as the original scaling, and offers an \`rsLoRA\` variant using \`lora_alpha / sqrt(r)\`), so you can change r without re-tuning the learning rate from scratch.
- **Merging**: after training, \`W = W0 + B·A\` is just a matrix of the original shape. Merge it and inference costs exactly what the base model costs. The LoRA paper lists "no additional inference latency" as an advantage over earlier adapter methods that insert extra layers.

📌 **Interview term: adapter** — the small set of trained weights (here A and B for each targeted matrix) stored separately from the base model. You can merge it in, or keep it separate and load different adapters for different tasks or tenants.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="One shared base model in memory with three small adapters, one per task, selected per request">
  <defs>
    <marker id="ai04q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="20" width="200" height="70" rx="10"/>
  <text class="d-text" x="130" y="50" text-anchor="middle">support adapter</text>
  <text class="d-sub" x="130" y="74" text-anchor="middle">tens of MB</text>
  <rect class="d-box-muted" x="30" y="115" width="200" height="70" rx="10"/>
  <text class="d-text" x="130" y="145" text-anchor="middle">legal adapter</text>
  <text class="d-sub" x="130" y="169" text-anchor="middle">tens of MB</text>
  <rect class="d-box-muted" x="30" y="210" width="200" height="70" rx="10"/>
  <text class="d-text" x="130" y="240" text-anchor="middle">SQL adapter</text>
  <text class="d-sub" x="130" y="264" text-anchor="middle">tens of MB</text>
  <rect class="d-box-accent" x="440" y="95" width="290" height="110" rx="12"/>
  <text class="d-text" x="585" y="142" text-anchor="middle">one frozen base model</text>
  <text class="d-sub" x="585" y="170" text-anchor="middle">loaded once, many GB</text>
  <path class="d-edge-dashed" d="M 234 55 L 434 125" marker-end="url(#ai04q1-arrow2)"/>
  <path class="d-edge-dashed" d="M 234 150 L 434 150" marker-end="url(#ai04q1-arrow2)"/>
  <path class="d-edge-dashed" d="M 234 245 L 434 175" marker-end="url(#ai04q1-arrow2)"/>
</svg>

With full fine-tuning, three tasks mean three full model copies. With LoRA they share one base in GPU memory and each request picks its adapter. Serving stacks support this directly: the vLLM docs (checked October 2026) describe an \`enable_lora\` switch, adapters registered by name that a request selects through its \`model\` field, and a \`max_loras\` limit on how many different adapters can be active in one batch, since each slot pre-allocates memory.

## 4. The Toy Experiment

The example **"Prompting vs full fine-tuning vs LoRA on a toy layer, plus parameter and memory arithmetic"** uses one linear layer y = W·x with 8 outputs and 9 inputs: 8 features plus one "instruction" slot that stands in for the prompt. W0 is a random "pretrained" matrix. Two tasks:

- **Task A, a latent skill:** the right behaviour is what W0 already does when the instruction slot is set to 1. This is the case where the base model *can* do the job if asked properly.
- **Task B, a new behaviour:** the right behaviour is W0 plus a rank-1 or rank-3 change. No input can produce it; the weights must change.

The heart of LoRA training is four lines: compute the gradient for the combined matrix, then push it into B and A by the chain rule.

~~~js
const G = gradOf(add(W0, mul(B, A)), inputs, targets); // dLoss/dW for W = W0 + B*A
const gB = mul(G, T(A)), gA = mul(T(B), G);             // chain rule into the two thin matrices
B = B.map((row, i) => row.map((v, j) => v - lr * gB[i][j]));
A = A.map((row, i) => row.map((v, j) => v - lr * gA[i][j]));   // W0 is never touched
~~~

What it printed for the two tasks:

~~~text
Task A (latent skill) loss, plain prompt : 0.1074
Task A (latent skill) loss, with instruction: 0.0000 | trainable params: 0
Task B (new behaviour, true change has rank 1):
  prompt only (0 params)   loss: 0.0231
  full fine-tune (72 params) loss: 0.0000
  LoRA r=1 (17 params)     loss: 0.0000
  LoRA r=4 (68 params)     loss: 0.0000
Task B (new behaviour, true change has rank 3):
  prompt only (0 params)   loss: 0.1651
  full fine-tune (72 params) loss: 0.0000
  LoRA r=1 (17 params)     loss: 0.0732
  LoRA r=4 (68 params)     loss: 0.0000
  merged vs adapter path, max diff: below 1e-12
~~~

Read it like an interviewer would:

1. **Task A:** the right instruction took the loss from 0.1074 to 0 with zero training. When the capability is already in the weights, prompting is the cheapest fix there is.
2. **Task B:** no prompt helps (0.0231 and 0.1651 stay put). The weights have to change.
3. **Rank matters:** a rank-1 adapter (17 parameters) fully learns a rank-1 change, but stalls at 0.0732 when the real change has rank 3. Rank 4 gets to zero. Too small an r under-fits.
4. **Merging is exact:** W0 + B·A gives the same output as running the adapter side path.

One honest caveat about the toy: with only 8×9 = 72 weights, r=4 already trains 68 parameters, so LoRA saves almost nothing. The savings appear when r is tiny compared with d, which is the case in real models, as the next section computes.

## 5. The Numbers at Real Scale

Assume a 7B-class shape: hidden size 4096, 32 layers, LoRA on the four attention projections, each treated as 4096×4096 (real models with grouped-query attention have smaller key/value projections, so this slightly overestimates). One adapter on one matrix has r × (4096 + 4096) parameters.

~~~text
r=8: LoRA trains 8,388,608 params = 0.13% of 6.7B
r=16: LoRA trains 16,777,216 params = 0.25% of 6.7B
r=64: LoRA trains 67,108,864 params = 1.00% of 6.7B
~~~

Memory is where the real difference lives.

📌 **Interview term: optimizer state** — the extra numbers an optimizer keeps per trainable parameter. Adam keeps two running averages, and mixed-precision training also keeps a 32-bit master copy of the weights. The ZeRO paper (Rajbhandari et al.) counts mixed-precision Adam as 2 + 2 + 12 = 16 bytes per parameter (16-bit weights, 16-bit gradients, 12 bytes of 32-bit optimizer state), before activations.

~~~text
full FT, mixed-precision Adam (16 bytes/param): 107.2 GB
LoRA, frozen 16-bit base (2 bytes/param)      : 13.4 GB + adapters and their optimizer state
QLoRA, frozen 4-bit base (0.5 bytes/param)    : 3.4 GB + adapters and their optimizer state
~~~

With LoRA, only the adapters need gradients and Adam state; the frozen base needs only its weights. That is the difference between a multi-GPU training job and one GPU.

📌 **Interview term: QLoRA** — LoRA trained on top of a base model stored in 4 bits. Dettmers et al., "QLoRA: Efficient Finetuning of Quantized LLMs" (arXiv 2305.14314, NeurIPS 2023) introduced the 4-bit NormalFloat (NF4) data type, double quantization and paged optimizers, and reported fine-tuning a 65B-parameter model on a single 48 GB GPU while matching 16-bit fine-tuning on their benchmarks. Quantization itself is covered in [What is quantization?](/interview-question/what-is-quantization-and-when-would-you-use-a-quantized-model)

📌 **Interview term: PEFT (parameter-efficient fine-tuning)** — the family of methods, LoRA being the best known, that train a small number of new or selected parameters instead of all of them. Also the name of the Hugging Face library that implements them.

For reference, this is the usual shape of a LoRA setup with Hugging Face PEFT. It is **not run here** (it needs a GPU and a downloaded model); the argument names follow the PEFT docs (checked October 2026), which describe \`get_peft_model\`, \`print_trainable_parameters\` and \`merge_and_unload\`:

~~~python
# not run here: shape of a PEFT LoRA setup
from peft import LoraConfig, get_peft_model

config = LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05,
                    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"])
model = get_peft_model(base_model, config)
model.print_trainable_parameters()   # trainable vs total parameter counts
# ... train with your usual trainer ...
merged = model.merge_and_unload()    # fold B*A into W0 for plain inference
~~~

## 6. What Fine-Tuning Is Good At (and Not)

Fine-tuning, full or LoRA, changes **how the model behaves**. It is a poor way to make it **know new facts**.

- **Good:** a strict output format the prompt keeps breaking; a house tone; a narrow task like classifying tickets into 40 labels; making a small, cheap model match a big model on one task (training it on the big model's outputs, often called distillation); cutting a 6,000-token prompt of instructions and examples down to a short one because the behaviour is now in the weights.
- **Poor:** teaching the product catalogue, this week's policies or a customer's documents. Two published results back this up. Ovadia et al., "Fine-Tuning or Retrieval? Comparing Knowledge Injection in LLMs" (EMNLP 2024) found retrieval beat unsupervised fine-tuning for both previously seen and new knowledge. Gekhman et al., "Does Fine-Tuning LLMs on New Knowledge Encourage Hallucinations?" (EMNLP 2024) found that fine-tuning examples with new facts are learned slowly, and once learned they linearly increase the model's tendency to hallucinate.

📌 **Interview term: catastrophic forgetting** — when training on a new task degrades abilities the model had before. Full fine-tuning is more exposed to it because every weight moves; LoRA keeps the base intact, which limits (but does not remove) the effect on the merged model.

For knowledge, use retrieval: [What is RAG and why use it instead of fine-tuning for knowledge?](/interview-question/what-is-rag-and-why-use-it-instead-of-fine-tuning-for-knowledge). For the full decision across prompting, RAG and fine-tuning, with cost break-evens, see [Fine-tune vs RAG vs prompt engineering: how do you choose in 2025-26?](/interview-question/fine-tune-vs-rag-vs-prompt-engineering-how-do-you-choose-in-2025-26)

## 7. Verified: Running the Code

\`node main.js\` and \`python3.12 main.py\` both print exactly this (the two outputs were diffed and are identical):

~~~text
Task A (latent skill) loss, plain prompt : 0.1074
Task A (latent skill) loss, with instruction: 0.0000 | trainable params: 0
Task B (new behaviour, true change has rank 1):
  prompt only (0 params)   loss: 0.0231
  full fine-tune (72 params) loss: 0.0000
  LoRA r=1 (17 params)     loss: 0.0000
  LoRA r=4 (68 params)     loss: 0.0000
Task B (new behaviour, true change has rank 3):
  prompt only (0 params)   loss: 0.1651
  full fine-tune (72 params) loss: 0.0000
  LoRA r=1 (17 params)     loss: 0.0732
  LoRA r=4 (68 params)     loss: 0.0000
  merged vs adapter path, max diff: below 1e-12
r=8: LoRA trains 8,388,608 params = 0.13% of 6.7B
r=16: LoRA trains 16,777,216 params = 0.25% of 6.7B
r=64: LoRA trains 67,108,864 params = 1.00% of 6.7B
full FT, mixed-precision Adam (16 bytes/param): 107.2 GB
LoRA, frozen 16-bit base (2 bytes/param)      : 13.4 GB + adapters and their optimizer state
QLoRA, frozen 4-bit base (0.5 bytes/param)    : 3.4 GB + adapters and their optimizer state
~~~

What the run proves rather than asserts:

- When the capability is latent, an instruction alone reaches loss 0 with zero trainable parameters.
- When the behaviour is new, no input change helps; both full fine-tuning and a large-enough LoRA fix it.
- LoRA rank caps what the adapter can express (0.0732 at r=1 on a rank-3 change).
- Merging the adapter is mathematically exact, so a merged LoRA model has no inference overhead.
- At a 7B-class shape, r=16 on the attention projections trains 0.25% of the parameters, and the training-memory gap is roughly 107 GB versus 13 GB.

What the toy leaves out: real training uses mini-batches, Adam, many layers and non-linear activations; the "prompt" here is a single input slot rather than tokens; and a real LLM's ability to follow an instruction comes from its post-training, not from a hand-built input feature.

## Edge Cases Worth Knowing

- **API-only models.** If you only have API access, you can fine-tune only what the provider offers, on their terms. Offerings change: OpenAI's own fine-tuning guide says (as of October 2026) that it is winding down its fine-tuning platform and no longer accepts new users. Check the provider's current docs before planning on it.
- **Base model upgrades.** An adapter is tied to the exact base weights it was trained on. A new base model version means a new training run and a new eval, while a prompt usually carries over with light testing ([catching regressions on model upgrades](/interview-question/how-do-you-catch-regressions-when-changing-a-prompt-or-upgrading-a-model)).
- **Safety behaviour can shift.** Fine-tuning on a narrow dataset can weaken refusals and other post-training behaviour. Re-run safety and red-team checks after any tune.
- **Unmerged adapters cost a little.** Keeping adapters separate (for multi-tenant serving) adds the side-path compute on every call; merged adapters do not.

## Common Pitfalls

- **Fine-tuning to add knowledge.** The model will learn the style of your documents more reliably than their facts, and you cannot update one fact without retraining. Use RAG for facts.
- **Skipping the prompt baseline.** If you never measured a well-built prompt with few-shot examples, you do not know what the fine-tune bought you. Build the eval first ([golden datasets](/interview-question/how-do-you-build-a-golden-dataset-for-evaluating-an-llm-feature)).
- **Training on messy examples.** Fine-tuning copies whatever is in the data, including inconsistencies and mistakes. A few hundred clean examples beat thousands of noisy ones for format and tone.
- **Picking the rank blindly.** Too low under-fits (the toy stalled at 0.0732); very high gives up most of the memory saving. Start small, check the eval, raise it if the loss plateaus.
- **Forgetting the long-term cost.** A fine-tune is a model you now own: data pipeline, training job, eval, re-tune on every base upgrade. Prompt changes are a config change by comparison.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Three levers:</strong> <span style="color:#f0e2c8;">They differ in <strong style="color:#ffca28;">what changes</strong>. Prompt engineering changes the input and leaves the weights frozen. Full fine-tuning updates every weight. LoRA freezes the weights and trains a small low-rank update <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">W0 + B·A</code> on chosen matrices.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Cost:</strong> <span style="color:#f0e2c8;">Prompting costs nothing to train and iterates in minutes. Full fine-tuning with mixed-precision Adam needs about 16 bytes per parameter, over 100 GB for a 7B model, and a full copy per task. LoRA trains well under 1% of parameters, and QLoRA does it over a 4-bit base on one GPU.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What each is good for:</strong> <span style="color:#f0e2c8;">Prompting unlocks what the model can already do. Fine-tuning teaches <strong style="color:#ffca28;">behaviour</strong>: a strict format, a tone, a narrow task, or a small model copying a bigger one. Neither is a good way to add facts; knowledge goes in retrieval.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. How I decide:</strong> <span style="color:#f0e2c8;">Prompt first and measure with an eval. If the prompt cannot reach the bar, or the prompt has grown so long it is too expensive at our volume, LoRA on a few thousand clean examples, then re-run the eval.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Trade-offs:</strong> <span style="color:#f0e2c8;">Rank limits what LoRA can express. A tuned model must be retrained when the base model is upgraded. The adapter can be merged for zero extra latency or kept separate so one base serves many tasks.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does LoRA work at all if it trains so few parameters?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The LoRA paper (Hu et al., 2021) built on the observation that the <em style="color:#d8d8d8;">change</em> needed to adapt a pretrained model has low intrinsic rank. The base already holds the knowledge; the task needs a small adjustment. In the toy example a rank-1 adapter fully learns a rank-1 change, but stalls at loss <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.0732</code> on a rank-3 change, where rank 4 reaches zero.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does LoRA make inference slower?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not if you merge it: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">W = W0 + B·A</code> is the same shape as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">W0</code>, so the merged model runs exactly like the original. The example checks that the merged weights and the adapter path give the same output. You only pay extra if you keep adapters unmerged to swap them per request.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can we fine-tune the model on our product docs so it knows them?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is the classic trap. Fine-tuning is weak at reliably adding new facts and cannot be updated per document; Gekhman et al. (EMNLP 2024) found that once a model learns fine-tuning examples with new facts, its tendency to hallucinate rises. Put the docs in retrieval and fine-tune, if at all, for format.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is QLoRA?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">LoRA trained on top of a base model stored in 4 bits. The QLoRA paper (Dettmers et al., 2023) introduced the 4-bit NormalFloat type and reported fine-tuning a 65B model on a single 48 GB GPU. Gradients pass through the frozen quantized weights into 16-bit adapters.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many examples do I need?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There is no universal number, and I would not quote one as a rule. Hundreds of clean, consistent examples can move format and tone; narrow classification tasks benefit from thousands. What matters more is a held-out eval set, because without it you cannot tell whether the tune helped.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Weights (parameters) | The learned numbers inside the model |
| Prompt engineering | Improving results by changing only the input; no training |
| Fine-tuning (full) | Continuing training so every weight is updated |
| Supervised fine-tuning (SFT) | Fine-tuning on input and ideal-output pairs |
| LoRA | Freeze the weights; train a low-rank update B·A on chosen matrices |
| Rank (r) | Inner size of the adapter; caps the complexity of the change |
| Low-rank update | A weight change expressible with a few directions |
| Adapter | The small trained add-on, mergeable or swappable per task |
| Optimizer state | Per-parameter numbers Adam keeps; why full fine-tuning needs ~16 bytes per parameter |
| QLoRA | LoRA over a 4-bit quantized frozen base |
| PEFT | Parameter-efficient fine-tuning methods, and the Hugging Face library of that name |
| Catastrophic forgetting | Losing earlier abilities after training on a new task |

**Conclusion:** The three levers differ in what they change. Prompt engineering changes the input and is the right first move whenever the model can already do the job. Full fine-tuning changes every weight, needs around 16 bytes of training memory per parameter and produces a whole new model to own. LoRA freezes the base and trains a thin low-rank update — a fraction of a percent of the parameters — which can be merged for free inference or swapped per task, and QLoRA makes that possible over a 4-bit base on a single GPU. Fine-tuning of either kind teaches behaviour, not facts; facts go in retrieval. Lead with that distinction, back it with the memory arithmetic, and say you would prove each step with an eval.`,
    examples: [
      {
        label: `Prompting vs full fine-tuning vs LoRA on a toy layer, plus parameter and memory arithmetic`,
        variants: [
          { tech: "node", code: `// Three ways to adapt a "pretrained" model, on a toy linear layer y = W x.
// Prompt engineering changes the input; full fine-tuning updates every weight;
// LoRA freezes W0 and trains a low-rank update B*A.
let seed = 7;
const rand = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647 * 2 - 1; };
const D_IN = 9, D_OUT = 8, N = 64; // input = 8 features + 1 "instruction" slot
const mat = (r, c, f) => Array.from({ length: r }, () => Array.from({ length: c }, f));
const W0 = mat(D_OUT, D_IN, () => rand() * 0.5);          // the pretrained weights
const X = mat(N, D_IN - 1, () => rand());                  // 64 inputs, no instruction yet
const withFlag = (x, f) => x.concat([f]);
const matvec = (W, x) => W.map((row) => row.reduce((s, w, j) => s + w * x[j], 0));
const add = (A, B) => A.map((row, i) => row.map((v, j) => v + B[i][j]));
const mul = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((s, v, k) => s + v * B[k][j], 0)));
const T = (A) => A[0].map((_, j) => A.map((row) => row[j]));
const lossOf = (W, inputs, targets) => {
  let s = 0;
  inputs.forEach((x, n) => matvec(W, x).forEach((v, i) => { s += (v - targets[n][i]) ** 2; }));
  return s / (inputs.length * D_OUT);
};
const gradOf = (W, inputs, targets) => { // dLoss/dW
  const G = mat(D_OUT, D_IN, () => 0);
  inputs.forEach((x, n) => matvec(W, x).forEach((v, i) => {
    const e = 2 * (v - targets[n][i]) / (inputs.length * D_OUT);
    for (let j = 0; j < D_IN; j++) G[i][j] += e * x[j];
  }));
  return G;
};
const f4 = (v) => v.toFixed(4);

// Task A: a skill the model already has, switched on by the instruction slot.
const inA = X.map((x) => withFlag(x, 1));
const yA = inA.map((x) => matvec(W0, x));
console.log("Task A (latent skill) loss, plain prompt :", f4(lossOf(W0, X.map((x) => withFlag(x, 0)), yA)));
console.log("Task A (latent skill) loss, with instruction:", f4(lossOf(W0, inA, yA)), "| trainable params: 0");

// Task B: genuinely new behaviour = W0 plus a rank-k change.
function lowRankDelta(k) {
  let d = mat(D_OUT, D_IN, () => 0);
  for (let t = 0; t < k; t++) d = add(d, mul(mat(D_OUT, 1, () => rand() * 0.6), mat(1, D_IN, () => rand() * 0.6)));
  return d;
}
function fullFT(inputs, targets, steps, lr) {
  let W = W0.map((r) => r.slice());
  for (let s = 0; s < steps; s++) { const G = gradOf(W, inputs, targets); W = W.map((row, i) => row.map((w, j) => w - lr * G[i][j])); }
  return lossOf(W, inputs, targets);
}
function lora(inputs, targets, r, steps, lr) {
  let B = mat(D_OUT, r, () => 0), A = mat(r, D_IN, () => rand() * 0.5); // B starts at 0: no change at step 0
  for (let s = 0; s < steps; s++) {
    const G = gradOf(add(W0, mul(B, A)), inputs, targets);
    const gB = mul(G, T(A)), gA = mul(T(B), G);
    B = B.map((row, i) => row.map((v, j) => v - lr * gB[i][j]));
    A = A.map((row, i) => row.map((v, j) => v - lr * gA[i][j]));
  }
  return { loss: lossOf(add(W0, mul(B, A)), inputs, targets), B, A };
}
for (const k of [1, 3]) {
  const Wt = add(W0, lowRankDelta(k));
  const yB = inA.map((x) => matvec(Wt, x));
  console.log(\`Task B (new behaviour, true change has rank \${k}):\`);
  console.log("  prompt only (0 params)   loss:", f4(lossOf(W0, inA, yB)));
  console.log("  full fine-tune (" + D_OUT * D_IN + " params) loss:", f4(fullFT(inA, yB, 400, 1.5)));
  for (const r of [1, 4]) {
    const res = lora(inA, yB, r, 400, 1.5);
    console.log(\`  LoRA r=\${r} (\${r * (D_IN + D_OUT)} params)     loss:\`, f4(res.loss));
    if (k === 3 && r === 4) { // merge check: W0 + B*A gives the same output as the adapter path
      const x = inA[0], merged = matvec(add(W0, mul(res.B, res.A)), x);
      const path = matvec(W0, x).map((v, i) => v + matvec(res.B, matvec(res.A, x))[i]);
      console.log("  merged vs adapter path, max diff:", Math.max(...merged.map((v, i) => Math.abs(v - path[i]))) < 1e-12 ? "below 1e-12" : "MISMATCH");
    }
  }
}

// Scale it up: LoRA on the q,k,v,o projections of an assumed 7B-class shape.
const hidden = 4096, layers = 32, totalParams = 6.7e9;
for (const r of [8, 16, 64]) {
  const p = layers * 4 * r * (hidden + hidden);
  console.log(\`r=\${r}: LoRA trains \${p.toLocaleString("en-US")} params = \${(100 * p / totalParams).toFixed(2)}% of \${totalParams / 1e9}B\`);
}
const gb = (bytes) => (bytes / 1e9).toFixed(1) + " GB";
console.log("full FT, mixed-precision Adam (16 bytes/param):", gb(totalParams * 16));
console.log("LoRA, frozen 16-bit base (2 bytes/param)      :", gb(totalParams * 2), "+ adapters and their optimizer state");
console.log("QLoRA, frozen 4-bit base (0.5 bytes/param)    :", gb(totalParams * 0.5), "+ adapters and their optimizer state");` },
          { tech: "python", code: `# Three ways to adapt a "pretrained" model, on a toy linear layer y = W x.
# Prompt engineering changes the input; full fine-tuning updates every weight;
# LoRA freezes W0 and trains a low-rank update B*A.
seed = 7
def rand():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647 * 2 - 1

D_IN, D_OUT, N = 9, 8, 64  # input = 8 features + 1 "instruction" slot
def mat(r, c, f): return [[f() for _ in range(c)] for _ in range(r)]
W0 = mat(D_OUT, D_IN, lambda: rand() * 0.5)          # the pretrained weights
X = mat(N, D_IN - 1, rand)                            # 64 inputs, no instruction yet
def with_flag(x, f): return x + [f]
def matvec(W, x): return [sum(w * x[j] for j, w in enumerate(row)) for row in W]
def add(A, B): return [[v + B[i][j] for j, v in enumerate(row)] for i, row in enumerate(A)]
def mul(A, B): return [[sum(row[k] * B[k][j] for k in range(len(row))) for j in range(len(B[0]))] for row in A]
def T(A): return [[row[j] for row in A] for j in range(len(A[0]))]
def loss_of(W, inputs, targets):
    s = 0
    for n, x in enumerate(inputs):
        for i, v in enumerate(matvec(W, x)):
            s += (v - targets[n][i]) ** 2
    return s / (len(inputs) * D_OUT)
def grad_of(W, inputs, targets):  # dLoss/dW
    G = mat(D_OUT, D_IN, lambda: 0)
    for n, x in enumerate(inputs):
        for i, v in enumerate(matvec(W, x)):
            e = 2 * (v - targets[n][i]) / (len(inputs) * D_OUT)
            for j in range(D_IN):
                G[i][j] += e * x[j]
    return G
def f4(v): return f"{v:.4f}"

# Task A: a skill the model already has, switched on by the instruction slot.
inA = [with_flag(x, 1) for x in X]
yA = [matvec(W0, x) for x in inA]
print("Task A (latent skill) loss, plain prompt :", f4(loss_of(W0, [with_flag(x, 0) for x in X], yA)))
print("Task A (latent skill) loss, with instruction:", f4(loss_of(W0, inA, yA)), "| trainable params: 0")

# Task B: genuinely new behaviour = W0 plus a rank-k change.
def low_rank_delta(k):
    d = mat(D_OUT, D_IN, lambda: 0)
    for _ in range(k):
        u = mat(D_OUT, 1, lambda: rand() * 0.6)
        v = mat(1, D_IN, lambda: rand() * 0.6)
        d = add(d, mul(u, v))
    return d
def full_ft(inputs, targets, steps, lr):
    W = [r[:] for r in W0]
    for _ in range(steps):
        G = grad_of(W, inputs, targets)
        W = [[w - lr * G[i][j] for j, w in enumerate(row)] for i, row in enumerate(W)]
    return loss_of(W, inputs, targets)
def lora(inputs, targets, r, steps, lr):
    B = mat(D_OUT, r, lambda: 0)
    A = mat(r, D_IN, lambda: rand() * 0.5)  # B starts at 0: no change at step 0
    for _ in range(steps):
        G = grad_of(add(W0, mul(B, A)), inputs, targets)
        gB, gA = mul(G, T(A)), mul(T(B), G)
        B = [[v - lr * gB[i][j] for j, v in enumerate(row)] for i, row in enumerate(B)]
        A = [[v - lr * gA[i][j] for j, v in enumerate(row)] for i, row in enumerate(A)]
    return loss_of(add(W0, mul(B, A)), inputs, targets), B, A
for k in [1, 3]:
    Wt = add(W0, low_rank_delta(k))
    yB = [matvec(Wt, x) for x in inA]
    print(f"Task B (new behaviour, true change has rank {k}):")
    print("  prompt only (0 params)   loss:", f4(loss_of(W0, inA, yB)))
    print("  full fine-tune (" + str(D_OUT * D_IN) + " params) loss:", f4(full_ft(inA, yB, 400, 1.5)))
    for r in [1, 4]:
        loss, B, A = lora(inA, yB, r, 400, 1.5)
        print(f"  LoRA r={r} ({r * (D_IN + D_OUT)} params)     loss:", f4(loss))
        if k == 3 and r == 4:  # merge check: W0 + B*A gives the same output as the adapter path
            x = inA[0]
            merged = matvec(add(W0, mul(B, A)), x)
            side = matvec(B, matvec(A, x))
            path = [v + side[i] for i, v in enumerate(matvec(W0, x))]
            diff = max(abs(v - path[i]) for i, v in enumerate(merged))
            print("  merged vs adapter path, max diff:", "below 1e-12" if diff < 1e-12 else "MISMATCH")

# Scale it up: LoRA on the q,k,v,o projections of an assumed 7B-class shape.
hidden, layers, total_params = 4096, 32, 6.7e9
for r in [8, 16, 64]:
    p = layers * 4 * r * (hidden + hidden)
    print(f"r={r}: LoRA trains {p:,} params = {100 * p / total_params:.2f}% of {total_params / 1e9}B")
def gb(b): return f"{b / 1e9:.1f} GB"
print("full FT, mixed-precision Adam (16 bytes/param):", gb(total_params * 16))
print("LoRA, frozen 16-bit base (2 bytes/param)      :", gb(total_params * 2), "+ adapters and their optimizer state")
print("QLoRA, frozen 4-bit base (0.5 bytes/param)    :", gb(total_params * 0.5), "+ adapters and their optimizer state")` },
        ],
      },
    ],
  },
  {
    title: `What are RLHF and DPO, and how do they turn a base model into an assistant?`,
    difficulty: "medium",
    seoDescription: `RLHF trains a reward model on human preference pairs and optimises the LLM against it with RL; DPO gets the same result directly from the pairs.`,
    description: `**Question presented to candidate:**
"A pretrained base model can write fluent text but it is not an assistant. Explain how RLHF turns it into one, what DPO changes about that recipe, and what can go wrong."

**What a strong answer should cover:**
- The pipeline: pretraining gives a base model; supervised fine-tuning (SFT) on demonstrations teaches the answer format; preference tuning on "response A is better than B" comparisons teaches which answers people prefer
- RLHF: train a reward model on preference pairs (a Bradley-Terry style loss: P(chosen beats rejected) = sigmoid(r_c − r_r)), then optimise the policy with RL (classically PPO) to maximise reward minus a KL penalty that keeps it close to the SFT model
- DPO: the KL-regularised objective has a closed-form optimum, so the reward can be written in terms of the policy itself; DPO trains directly on the pairs with a simple classification-style loss, with no separate reward model and no RL sampling loop
- The role of beta / the KL term: small beta lets the policy drift far and collapse onto whatever the reward favours; large beta keeps it near the SFT model
- Failure modes: reward hacking and over-optimisation, sycophancy learned from human raters, loss of diversity; and the newer variants (AI feedback / Constitutional AI, RL on verifiable rewards with methods like GRPO for reasoning)

**Code / implementation expected:** Optional — a toy that fits a reward model on preference pairs and shows DPO landing on the same policy as the KL-regularised RLHF optimum is a strong way to show the mechanism.`,
    answer: `**Target Audience:** Engineers who use chat models every day and want to know what happened between "a model that continues text" and "an assistant that answers questions", without a reinforcement-learning background.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (a four-response toy, solved exactly; no real model is trained or called). Paper facts are cited inline with the date they were checked (October 2026).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Picture an apprentice chef who has memorised every cookbook ever printed. Ask for "a quick dinner" and they might recite a cookbook's table of contents, write a restaurant review, or continue with "...is what my mother never made." They know everything about food and nothing about *serving you*.

Training them takes two steps. First you **show** them: here is a request, here is the plate a good chef would serve. After a few thousand of those they get the format right. Then you **taste-test**: they cook two versions, you say which you prefer, and they adjust. You never had to write the perfect recipe yourself; you only had to say "this one is better".

That is the journey from a base model to an assistant. The showing step is supervised fine-tuning. The taste-testing step is preference tuning, done with **RLHF** or **DPO**. It is the reason chat models answer the question instead of continuing it, and also the source of some of their quirks: verbosity, flattery, over-refusal. Interviewers ask about it because it explains *why* assistants behave the way they do.

## 2. The Three-Stage Pipeline

<svg class="iq-diagram" width="100%" viewBox="0 0 820 200" role="img" aria-label="Pipeline: a pretrained base model goes through supervised fine-tuning and then preference tuning to become an assistant">
  <defs>
    <marker id="ai04q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="50" width="160" height="90" rx="10"/>
  <text class="d-text" x="100" y="88" text-anchor="middle">base model</text>
  <text class="d-sub" x="100" y="114" text-anchor="middle">continues text</text>
  <rect class="d-box" x="230" y="50" width="160" height="90" rx="10"/>
  <text class="d-text" x="310" y="88" text-anchor="middle">SFT</text>
  <text class="d-sub" x="310" y="114" text-anchor="middle">demonstrations</text>
  <rect class="d-box-accent" x="440" y="50" width="170" height="90" rx="10"/>
  <text class="d-text" x="525" y="88" text-anchor="middle">preference tuning</text>
  <text class="d-sub" x="525" y="114" text-anchor="middle">RLHF or DPO</text>
  <rect class="d-box-muted" x="660" y="50" width="140" height="90" rx="10"/>
  <text class="d-text" x="730" y="88" text-anchor="middle">assistant</text>
  <text class="d-sub" x="730" y="114" text-anchor="middle">answers you</text>
  <path class="d-edge" d="M 184 95 L 224 95" marker-end="url(#ai04q2-arrow)"/>
  <path class="d-edge" d="M 394 95 L 434 95" marker-end="url(#ai04q2-arrow)"/>
  <path class="d-edge" d="M 614 95 L 654 95" marker-end="url(#ai04q2-arrow)"/>
</svg>

Pretraining supplies the knowledge; the two later stages shape behaviour. What each stage of model you get looks like (base, instruction-tuned, chat) is its own question: [What is the difference between a base model, an instruction-tuned model and a chat model?](/interview-question/what-is-the-difference-between-a-base-model-an-instruction-tuned-model-and-a-cha) This doc is about *how* the last stage works.

📌 **Interview term: supervised fine-tuning (SFT)** — training on prompt and ideal-response pairs written or curated by people, with the ordinary next-token loss. It teaches the format of an answer. The general mechanics of fine-tuning are in [fine-tuning vs LoRA vs prompt engineering](/interview-question/what-is-the-difference-between-fine-tuning-lora-and-prompt-engineering).

📌 **Interview term: preference data** — comparisons instead of demonstrations: for one prompt, two (or more) model responses and a label saying which is better. Easier for people to produce than perfect answers, and it captures qualities that are hard to write down ("more helpful", "less preachy").

📌 **Interview term: policy** — reinforcement-learning word for "the model being trained". It maps a prompt to a probability for every possible response.

📌 **Interview term: reference model** — a frozen copy of the SFT model. Preference tuning measures how far the policy has moved away from it and penalises moving too far.

The landmark result for this recipe is OpenAI's InstructGPT paper (Ouyang et al., "Training language models to follow instructions with human feedback", arXiv 2203.02155, 2022): labellers preferred outputs of the 1.3B-parameter InstructGPT model over outputs of the 175B-parameter GPT-3, a model more than 100 times larger. Alignment to what people want mattered more than raw size for that judgment.

## 3. RLHF: Learn a Reward, Then Optimise Against It

**Reinforcement Learning from Human Feedback** has two steps.

**Step 1: the reward model.** Train a model that reads a prompt and a response and outputs a single score. It learns from the preference pairs: the chosen response should score higher than the rejected one.

📌 **Interview term: reward model** — a model (usually the SFT model with its output layer replaced by a single number) trained so that its score difference predicts which response people prefer.

📌 **Interview term: Bradley-Terry model** — the probability rule used for that: P(chosen beats rejected) = sigmoid(r_chosen − r_rejected). Training maximises the log of that probability over all labelled pairs. Only score *differences* matter, so rewards are defined up to a constant.

**Step 2: optimise the policy.** Generate responses with the policy, score them with the reward model, and nudge the policy toward high-scoring responses. The objective is:

~~~text
maximise   E[ reward(response) ]  -  beta * KL( policy || reference )
~~~

📌 **Interview term: KL penalty** — KL divergence measures how different two probability distributions are. Subtracting beta × KL stops the policy from drifting far from the SFT model, where the reward model was never trained and its scores cannot be trusted.

📌 **Interview term: PPO (Proximal Policy Optimization)** — the RL algorithm classically used for this step. It samples responses, estimates how much better than expected each was, and takes small, clipped update steps. It needs the policy, the reference, the reward model and a value (critic) network in memory, which is why RLHF is expensive and fiddly to run.

<svg class="iq-diagram" width="100%" viewBox="0 0 800 300" role="img" aria-label="RLHF loop: preference pairs train a reward model; the policy samples responses, the reward model scores them, and a PPO update with a KL penalty to a frozen reference changes the policy">
  <defs>
    <marker id="ai04q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="180" height="80" rx="10"/>
  <text class="d-text" x="110" y="64" text-anchor="middle">preference pairs</text>
  <text class="d-sub" x="110" y="90" text-anchor="middle">chosen vs rejected</text>
  <rect class="d-box" x="260" y="30" width="190" height="80" rx="10"/>
  <text class="d-text" x="355" y="64" text-anchor="middle">reward model</text>
  <text class="d-sub" x="355" y="90" text-anchor="middle">scores a response</text>
  <rect class="d-box-accent" x="570" y="30" width="200" height="80" rx="10"/>
  <text class="d-text" x="670" y="64" text-anchor="middle">policy</text>
  <text class="d-sub" x="670" y="90" text-anchor="middle">model being tuned</text>
  <rect class="d-box" x="260" y="190" width="190" height="80" rx="10"/>
  <text class="d-text" x="355" y="224" text-anchor="middle">PPO update</text>
  <text class="d-sub" x="355" y="250" text-anchor="middle">reward minus KL</text>
  <rect class="d-box-muted" x="570" y="190" width="200" height="80" rx="10"/>
  <text class="d-text" x="670" y="224" text-anchor="middle">frozen SFT copy</text>
  <text class="d-sub" x="670" y="250" text-anchor="middle">the KL anchor</text>
  <path class="d-edge" d="M 204 70 L 254 70" marker-end="url(#ai04q2-arrow2)"/>
  <path class="d-edge-dashed" d="M 566 55 L 456 55" marker-end="url(#ai04q2-arrow2)"/>
  <path class="d-edge" d="M 355 114 L 355 184" marker-end="url(#ai04q2-arrow2)"/>
  <path class="d-edge-accent" d="M 454 210 L 515 210 L 515 95 L 564 95" marker-end="url(#ai04q2-arrow2)"/>
  <path class="d-edge-dashed" d="M 566 250 L 456 250" marker-end="url(#ai04q2-arrow2)"/>
</svg>

The dashed arrows are inputs to scoring (sampled responses, and the reference for the KL term); the accent arrow is the update that actually changes the policy.

### The shortcut that makes DPO possible

The KL-regularised objective above has a known exact solution. For each response y:

~~~text
policy*(y)  is proportional to  reference(y) * exp( reward(y) / beta )
~~~

PPO is a sampling-based way of getting close to that target for a real model, where you cannot list every possible response. In the toy example there are only four responses, so the program computes the target directly.

## 4. DPO: Skip the Reward Model

Rafailov et al., "Direct Preference Optimization: Your Language Model is Secretly a Reward Model" (arXiv 2305.18290, 2023) turned the formula above around. If the optimal policy is reference × exp(reward / beta), then the reward is:

~~~text
reward(y) = beta * log( policy(y) / reference(y) ) + a constant
~~~

Plug that into the Bradley-Terry loss and the reward model disappears. The constant cancels because only differences matter. What remains is a loss on the policy alone:

~~~text
loss = - log sigmoid( beta * [ (log pi(chosen) - log ref(chosen)) - (log pi(rejected) - log ref(rejected)) ] )
~~~

📌 **Interview term: DPO (Direct Preference Optimization)** — preference tuning with that loss: for every pair, raise the policy's log-probability of the chosen response and lower the rejected one, both measured relative to the reference model. No reward model, no sampling loop; it trains like supervised learning.

📌 **Interview term: implied reward** — beta × log(policy / reference) for a response. A DPO-trained model *is* a reward model in this sense, which is the "secretly a reward model" in the title.

<svg class="iq-diagram" width="100%" viewBox="0 0 800 230" role="img" aria-label="DPO: preference pairs and the frozen SFT copy feed a DPO loss that updates the policy directly">
  <defs>
    <marker id="ai04q2-arrow3" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="190" height="80" rx="10"/>
  <text class="d-text" x="115" y="54" text-anchor="middle">preference pairs</text>
  <text class="d-sub" x="115" y="80" text-anchor="middle">chosen vs rejected</text>
  <rect class="d-box-muted" x="20" y="130" width="190" height="80" rx="10"/>
  <text class="d-text" x="115" y="164" text-anchor="middle">frozen SFT copy</text>
  <text class="d-sub" x="115" y="190" text-anchor="middle">log ref(y)</text>
  <rect class="d-box-accent" x="310" y="70" width="200" height="90" rx="10"/>
  <text class="d-text" x="410" y="108" text-anchor="middle">DPO loss</text>
  <text class="d-sub" x="410" y="134" text-anchor="middle">classification style</text>
  <rect class="d-box" x="610" y="70" width="170" height="90" rx="10"/>
  <text class="d-text" x="695" y="108" text-anchor="middle">policy</text>
  <text class="d-sub" x="695" y="134" text-anchor="middle">updated directly</text>
  <path class="d-edge" d="M 214 60 L 304 100" marker-end="url(#ai04q2-arrow3)"/>
  <path class="d-edge" d="M 214 170 L 304 130" marker-end="url(#ai04q2-arrow3)"/>
  <path class="d-edge-accent" d="M 514 115 L 604 115" marker-end="url(#ai04q2-arrow3)"/>
</svg>

Two boxes fewer than RLHF: no reward model to train or host, and no sampling during training.

## 5. Watching It Happen on a Toy

The example **"Reward model, KL-regularised RLHF optimum and DPO on one prompt with four responses"** has one prompt and four possible responses: \`helpful\`, \`curt\`, \`refusal\` and \`confident-wrong\`. The SFT model gives the confident wrong answer the same probability as the helpful one (0.300 each), which is exactly the problem preference tuning exists to fix. Sixty labeller votes over the six response pairs say which is better, with some disagreement.

**Step 1, the reward model**, fitted by gradient ascent on the Bradley-Terry log-likelihood:

~~~text
reward model      : helpful=1.071 curt=0.099 refusal=-0.349 confident-wrong=-0.821
reward model agrees with 43 of 60 labeller votes
~~~

43 of 60 is the best any single ranking can do here, because on each pair the minority of labellers disagreed (7 vs 3, 8 vs 2 and so on). Human preference data is noisy, and the reward model inherits that.

**Step 2, the RLHF optimum** at three values of beta:

~~~text
RLHF beta=4.0     : helpful=0.381 curt=0.249 refusal=0.133 confident-wrong=0.237 | E[r]=0.191 KL=0.018
RLHF beta=1.0     : helpful=0.630 curt=0.199 refusal=0.076 confident-wrong=0.095 | E[r]=0.590 KL=0.261
RLHF beta=0.1     : helpful=1.000 curt=0.000 refusal=0.000 confident-wrong=0.000 | E[r]=1.071 KL=1.203
~~~

Large beta barely moves the SFT model. Beta 1 moves most probability to \`helpful\` and cuts \`confident-wrong\` from 0.300 to 0.095. Beta 0.1 maximises reward by putting everything on one response: highest reward, no diversity left, and fully dependent on the reward model being right.

**Step 3, DPO** on the same 60 votes, trained by gradient descent on the DPO loss, starting from the SFT model:

~~~text
DPO beta=1.0      : helpful=0.630 curt=0.199 refusal=0.076 confident-wrong=0.095 | KL=0.261
max |DPO - RLHF optimum| at beta=1.0: below 1e-6
DPO implied reward: helpful=1.071 curt=0.099 refusal=-0.349 confident-wrong=-0.821
~~~

DPO never trained a reward model, yet it landed on the same policy as the RLHF optimum (to within one in a million), and its implied rewards equal the fitted reward model's scores. That is the DPO paper's central claim, reproduced on a problem small enough to check exactly.

The key line of the DPO step, where the reference model enters:

~~~js
const margin = beta * ((lp[c] - Math.log(ref[c])) - (lp[l] - Math.log(ref[l])));
const w = n * beta * (1 - sigmoid(margin)); // push chosen up and rejected down, less once the margin is large
~~~

## 6. RLHF vs DPO

| | RLHF (reward model + PPO) | DPO |
| :--- | :--- | :--- |
| Models in memory while training | Policy, reference, reward model, value network | Policy, reference |
| Training data | Preference pairs (for the reward model), then prompts to sample on | Preference pairs only |
| Generates samples during training | Yes, online | No, offline on a fixed dataset |
| Stability | Sensitive to many hyperparameters | Trains like supervised learning |
| Can improve beyond the dataset | Yes, by exploring and scoring new samples | Only as far as the fixed pairs go |
| Reusable reward model | Yes, also useful for ranking and filtering | No separate one (implied reward only) |

In the open-model world DPO and its variants became a common default because they are simple to run; libraries such as Hugging Face TRL ship a \`DPOTrainer\` that takes a dataset with \`prompt\`, \`chosen\` and \`rejected\` fields (per the TRL docs, checked October 2026). This is the shape, **not run here**:

~~~python
# not run here: shape of a DPO run with Hugging Face TRL
from trl import DPOConfig, DPOTrainer

args = DPOConfig(output_dir="dpo-out", beta=0.1)
trainer = DPOTrainer(model=sft_model, args=args,
                     train_dataset=pairs,          # rows with prompt / chosen / rejected
                     processing_class=tokenizer)
trainer.train()
~~~

## 7. Beyond Human Labels

- **RLAIF and Constitutional AI.** Bai et al., "Constitutional AI: Harmlessness from AI Feedback" (Anthropic, arXiv 2212.08073, 2022): the model critiques and revises its own answers against a short list of written principles, then an AI judge produces the preference labels that train the preference model. Human effort moves from labelling thousands of pairs to writing and auditing the principles.

📌 **Interview term: RLAIF** — reinforcement learning from AI feedback: the same pipeline as RLHF, with some or all preference labels produced by a model instead of people.

- **RL on verifiable rewards.** For maths and code, the reward can be checked automatically: does the final answer match, do the unit tests pass? DeepSeekMath (Shao et al., arXiv 2402.03300, 2024) introduced GRPO, a PPO simplification that drops the value network and scores each sampled answer against the average of a group of answers to the same prompt; DeepSeek-R1 used it with checkable rewards to train reasoning. This is the training story behind [reasoning models](/interview-question/what-are-reasoning-models-and-when-should-you-use-them).

📌 **Interview term: GRPO (Group Relative Policy Optimization)** — sample several answers per prompt, reward each, and use each answer's reward relative to the group's mean (scaled by the spread) as its advantage, instead of a learned critic.

## 8. Verified: Running the Code

\`node main.js\` and \`python3.12 main.py\` both print exactly this (the two outputs were diffed and are identical):

~~~text
SFT policy        : helpful=0.300 curt=0.250 refusal=0.150 confident-wrong=0.300
reward model      : helpful=1.071 curt=0.099 refusal=-0.349 confident-wrong=-0.821
reward model agrees with 43 of 60 labeller votes
RLHF beta=4.0     : helpful=0.381 curt=0.249 refusal=0.133 confident-wrong=0.237 | E[r]=0.191 KL=0.018
RLHF beta=1.0     : helpful=0.630 curt=0.199 refusal=0.076 confident-wrong=0.095 | E[r]=0.590 KL=0.261
RLHF beta=0.1     : helpful=1.000 curt=0.000 refusal=0.000 confident-wrong=0.000 | E[r]=1.071 KL=1.203
DPO beta=1.0      : helpful=0.630 curt=0.199 refusal=0.076 confident-wrong=0.095 | KL=0.261
max |DPO - RLHF optimum| at beta=1.0: below 1e-6
DPO implied reward: helpful=1.071 curt=0.099 refusal=-0.349 confident-wrong=-0.821
ranking by reward model: helpful > curt > refusal > confident-wrong
ranking by DPO policy  : helpful > curt > refusal > confident-wrong
~~~

What the run proves rather than asserts:

- A Bradley-Terry reward model recovers a sensible ranking from noisy pairwise votes.
- The KL-regularised optimum moves probability toward high-reward responses, and beta sets how far: KL 0.018 at beta 4, 0.261 at beta 1, 1.203 (full collapse) at beta 0.1.
- DPO, with no reward model, reaches the same policy as the RLHF optimum at the same beta, and its implied reward reproduces the reward model.

What the toy leaves out: real responses are sequences of tokens, so probabilities are products over tokens and cannot be listed; real RLHF approximates the optimum by sampling with PPO, with all its instability; and a real reward model generalises (and mis-generalises) to responses it never saw, which is where reward hacking comes from.

## Edge Cases Worth Knowing

- **Reward models are wrong off-distribution.** They were trained on SFT-style answers. If the policy drifts toward odd outputs the reward model never saw, the scores become meaningless while still looking high.
- **Length bias.** Raters and reward models often prefer longer answers, so tuned models drift verbose unless the data or the objective corrects for it.
- **DPO is only as good as its pairs.** It cannot find better answers than the ones in the dataset. If the chosen responses are mediocre, DPO makes the model reliably mediocre.
- **Preference tuning is not fact-checking.** It shapes style and helpfulness; it does not add knowledge, and it can reward confident-sounding answers, which feeds [hallucinations](/interview-question/what-are-hallucinations-and-what-causes-them).

## Common Pitfalls

- **Saying RLHF "teaches the model facts".** Knowledge comes from pretraining. RLHF and DPO change which of the things the model could say it prefers to say.
- **Forgetting the reference model in DPO.** The loss is relative to the SFT model; drop it and you get plain "push chosen up, rejected down", which over-fits and drifts.
- **Treating beta as a minor knob.** It is the whole trade-off between following the preferences and staying close to a fluent, diverse SFT model. The toy shows the range from no change to full collapse.
- **Calling DPO "no reward at all".** There is still a reward; it is implicit in the policy's log-probability ratio. That is the point of the paper's title.
- **Ignoring rater bias.** Sharma et al., "Towards Understanding Sycophancy in Language Models" (ICLR 2024) found raters were more likely to prefer responses that agreed with the user's views, and that both people and preference models sometimes preferred convincing sycophantic answers over correct ones. Optimising for preferences amplifies that.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The pipeline:</strong> <span style="color:#f0e2c8;">Pretraining gives a <strong style="color:#ffca28;">base model</strong> that continues text. <strong style="color:#ffca28;">SFT</strong> on written demonstrations teaches it the shape of an answer. <strong style="color:#ffca28;">Preference tuning</strong> on comparisons, A is better than B, teaches it which answers people actually prefer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. RLHF:</strong> <span style="color:#f0e2c8;">Train a <strong style="color:#ffca28;">reward model</strong> on the preference pairs with a Bradley-Terry loss, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sigmoid(r_chosen - r_rejected)</code>. Then use RL, classically PPO, to make the policy produce high-reward answers, minus a <strong style="color:#ffca28;">KL penalty</strong> that keeps it close to the SFT model.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. DPO:</strong> <span style="color:#f0e2c8;">That KL-regularised objective has a closed-form optimum, so the reward can be rewritten in terms of the policy itself. <strong style="color:#ffca28;">DPO</strong> trains directly on the pairs with a classification-style loss: no reward model, no sampling loop, far simpler to run.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Beta:</strong> <span style="color:#f0e2c8;">Beta controls how far the model may drift. In my toy, beta 4 barely moves the SFT model, beta 1 moves helpful from 0.300 to 0.630, and beta 0.1 collapses onto one answer. DPO at beta 1 landed exactly on the RLHF optimum at beta 1.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Risks:</strong> <span style="color:#f0e2c8;">The policy optimises the <strong style="color:#ffca28;">proxy</strong>, not the goal: reward hacking, length bias, and sycophancy, because raters reward agreement. Newer recipes add AI feedback (Constitutional AI) and RL on <strong style="color:#ffca28;">verifiable rewards</strong> such as unit tests and checked maths answers.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is there a KL penalty at all?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without it, the policy chases the reward model wherever it is wrong. The reward model was only trained on answers near the SFT distribution, so far from it its scores are unreliable. The KL term keeps the policy where the reward is trustworthy and keeps the model fluent. In the toy, beta 0.1 pushed KL to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1.203</code> and put all probability on a single answer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If DPO is simpler, why does anyone still use RL?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">DPO learns only from a fixed set of pairs. RL methods generate fresh samples from the current policy and score them, so they can keep improving beyond the dataset, which matters when a cheap automatic reward exists. That is the reasoning-model recipe: DeepSeekMath introduced GRPO, which drops the critic network that PPO uses and uses the group of sampled answers as the baseline, scored by checkable rewards.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is reward hacking?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The policy finds outputs the reward model scores highly that people would not prefer: longer answers, confident tone, flattering agreement. It is Goodhart's law applied to a learned reward. Mitigations are the KL penalty, refreshing the reward model with new comparisons, and evaluating with held-out human or rubric judgments.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does sycophancy come from?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Partly from the preference data itself. Sharma et al. (ICLR 2024) found that responses matching the user's views were more likely to be preferred by raters, and that both people and preference models sometimes preferred convincing sycophantic answers over correct ones. Optimising for that preference amplifies it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is RLAIF or Constitutional AI?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Replacing some human labels with model labels. In Anthropic's Constitutional AI paper (Bai et al., 2022), the model critiques and revises its own answers against written principles, then an AI judge produces the preference pairs used to train the preference model. It cuts labelling cost, but the principles and the judge become the thing to audit.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Supervised fine-tuning (SFT) | Training on prompt and ideal-response pairs; teaches answer format |
| Preference data | Pairs of responses with a label for the better one |
| Policy | The model being trained, as a distribution over responses |
| Reference model | Frozen SFT copy used to measure and limit drift |
| Reward model | Model that scores a response; trained on preference pairs |
| Bradley-Terry model | P(chosen beats rejected) = sigmoid(score difference) |
| KL penalty | beta × KL(policy, reference); keeps the policy near the SFT model |
| PPO | The RL algorithm classically used to optimise the policy in RLHF |
| DPO | Preference tuning directly on pairs, with no reward model or RL loop |
| Implied reward | beta × log(policy / reference): the reward a DPO model encodes |
| RLAIF | RLHF with preference labels produced by a model |
| GRPO | PPO variant that uses a group of sampled answers as its baseline instead of a critic |

**Conclusion:** A base model knows a great deal but only continues text. SFT on demonstrations teaches it the shape of an answer, and preference tuning teaches it which answers people prefer. RLHF does that in two steps — fit a reward model to comparisons, then optimise the policy against it with a KL leash to the SFT model — while DPO exploits the closed-form optimum of that same objective to train directly on the comparisons, which the toy confirms by landing on the identical policy. Beta decides how far the model is allowed to move. The weaknesses are the proxy's weaknesses: noisy, biased preferences and a reward that can be gamed, which is why the newer recipes lean on written principles and on rewards that can be checked automatically.`,
    examples: [
      {
        label: `Reward model, KL-regularised RLHF optimum and DPO on one prompt with four responses`,
        variants: [
          { tech: "node", code: `// Preference tuning on one prompt with four candidate responses.
// 1) fit a reward model from human preference pairs (Bradley-Terry),
// 2) RLHF target: maximise reward minus beta*KL to the SFT model,
// 3) DPO: train the policy directly on the same pairs, no reward model.
const responses = ["helpful", "curt", "refusal", "confident-wrong"];
const ref = [0.30, 0.25, 0.15, 0.30]; // the SFT model: wrong answers are as likely as good ones
// Labeller comparisons: [chosen, rejected, how many labellers]
const pairs = [[0, 1, 7], [1, 0, 3], [0, 2, 8], [2, 0, 2], [0, 3, 9], [3, 0, 1], [1, 2, 6], [2, 1, 4], [1, 3, 7], [3, 1, 3], [2, 3, 6], [3, 2, 4]];
const sigmoid = (z) => 1 / (1 + Math.exp(-z));
const softmax = (z) => { const m = Math.max(...z); const e = z.map((v) => Math.exp(v - m)); const s = e.reduce((a, b) => a + b, 0); return e.map((v) => v / s); };
const kl = (p, q) => p.reduce((s, pi, i) => s + pi * Math.log(pi / q[i]), 0);
const fmt = (p) => p.map((v, i) => responses[i] + "=" + v.toFixed(3)).join(" ");
const total = pairs.reduce((s, p) => s + p[2], 0);
console.log("SFT policy        :", fmt(ref));

// 1) Reward model: P(chosen beats rejected) = sigmoid(r_c - r_r); maximise log-likelihood.
let r = [0, 0, 0, 0];
for (let step = 0; step < 4000; step++) {
  const g = [0, 0, 0, 0];
  for (const [c, l, n] of pairs) { const p = sigmoid(r[c] - r[l]); g[c] += n * (1 - p); g[l] -= n * (1 - p); }
  r = r.map((v, i) => v + 1.0 * g[i] / total);
}
const mean = r.reduce((a, b) => a + b, 0) / 4;
r = r.map((v) => v - mean); // rewards are only defined up to a constant
console.log("reward model      :", fmt(r));
let agree = 0;
for (const [c, l, n] of pairs) if (r[c] > r[l]) agree += n;
console.log("reward model agrees with", agree, "of", total, "labeller votes");

// 2) RLHF objective E[r] - beta*KL(pi || ref) has the closed-form optimum pi ~ ref * exp(r / beta).
//    PPO approximates this by sampling; here we compute the target exactly.
for (const beta of [4.0, 1.0, 0.1]) {
  const pi = softmax(ref.map((p, i) => Math.log(p) + r[i] / beta));
  const er = pi.reduce((s, p, i) => s + p * r[i], 0);
  console.log(\`RLHF beta=\${beta.toFixed(1)}     :\`, fmt(pi), \`| E[r]=\${er.toFixed(3)} KL=\${kl(pi, ref).toFixed(3)}\`);
}

// 3) DPO: loss = -log sigmoid(beta * ((log pi_c - log ref_c) - (log pi_r - log ref_r))) over the pairs.
function dpo(beta, steps, lr) {
  let theta = ref.map(Math.log); // start from the SFT model
  for (let step = 0; step < steps; step++) {
    const lp = softmax(theta).map(Math.log);
    const g = [0, 0, 0, 0];
    for (const [c, l, n] of pairs) {
      const margin = beta * ((lp[c] - Math.log(ref[c])) - (lp[l] - Math.log(ref[l])));
      const w = n * beta * (1 - sigmoid(margin)); // the softmax normaliser cancels in the difference
      g[c] += w; g[l] -= w;
    }
    theta = theta.map((v, i) => v + lr * g[i] / total);
  }
  return softmax(theta);
}
const beta = 1.0;
const pi = dpo(beta, 4000, 1.0);
console.log(\`DPO beta=\${beta.toFixed(1)}      :\`, fmt(pi), \`| KL=\${kl(pi, ref).toFixed(3)}\`);
const rlhf = softmax(ref.map((p, i) => Math.log(p) + r[i] / beta));
const gap = Math.max(...pi.map((p, i) => Math.abs(p - rlhf[i])));
console.log(\`max |DPO - RLHF optimum| at beta=\${beta.toFixed(1)}:\`, gap < 1e-6 ? "below 1e-6" : gap.toFixed(6));
const implied = pi.map((p, i) => beta * Math.log(p / ref[i]));
const im = implied.reduce((a, b) => a + b, 0) / 4;
console.log("DPO implied reward:", fmt(implied.map((v) => v - im)));
const order = (x) => x.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).map((t) => responses[t[1]]).join(" > ");
console.log("ranking by reward model:", order(r));
console.log("ranking by DPO policy  :", order(implied));` },
          { tech: "python", code: `# Preference tuning on one prompt with four candidate responses.
# 1) fit a reward model from human preference pairs (Bradley-Terry),
# 2) RLHF target: maximise reward minus beta*KL to the SFT model,
# 3) DPO: train the policy directly on the same pairs, no reward model.
import math
responses = ["helpful", "curt", "refusal", "confident-wrong"]
ref = [0.30, 0.25, 0.15, 0.30]  # the SFT model: wrong answers are as likely as good ones
# Labeller comparisons: [chosen, rejected, how many labellers]
pairs = [[0, 1, 7], [1, 0, 3], [0, 2, 8], [2, 0, 2], [0, 3, 9], [3, 0, 1], [1, 2, 6], [2, 1, 4], [1, 3, 7], [3, 1, 3], [2, 3, 6], [3, 2, 4]]
def sigmoid(z): return 1 / (1 + math.exp(-z))
def softmax(z):
    m = max(z)
    e = [math.exp(v - m) for v in z]
    s = sum(e)
    return [v / s for v in e]
def kl(p, q): return sum(pi * math.log(pi / q[i]) for i, pi in enumerate(p))
def fmt(p): return " ".join(f"{responses[i]}={v:.3f}" for i, v in enumerate(p))
total = sum(p[2] for p in pairs)
print("SFT policy        :", fmt(ref))

# 1) Reward model: P(chosen beats rejected) = sigmoid(r_c - r_r); maximise log-likelihood.
r = [0.0, 0.0, 0.0, 0.0]
for step in range(4000):
    g = [0, 0, 0, 0]
    for c, l, n in pairs:
        p = sigmoid(r[c] - r[l])
        g[c] += n * (1 - p)
        g[l] -= n * (1 - p)
    r = [v + 1.0 * g[i] / total for i, v in enumerate(r)]
mean = sum(r) / 4
r = [v - mean for v in r]  # rewards are only defined up to a constant
print("reward model      :", fmt(r))
agree = sum(n for c, l, n in pairs if r[c] > r[l])
print("reward model agrees with", agree, "of", total, "labeller votes")

# 2) RLHF objective E[r] - beta*KL(pi || ref) has the closed-form optimum pi ~ ref * exp(r / beta).
#    PPO approximates this by sampling; here we compute the target exactly.
for beta in [4.0, 1.0, 0.1]:
    pi = softmax([math.log(p) + r[i] / beta for i, p in enumerate(ref)])
    er = sum(p * r[i] for i, p in enumerate(pi))
    print(f"RLHF beta={beta:.1f}     :", fmt(pi), f"| E[r]={er:.3f} KL={kl(pi, ref):.3f}")

# 3) DPO: loss = -log sigmoid(beta * ((log pi_c - log ref_c) - (log pi_r - log ref_r))) over the pairs.
def dpo(beta, steps, lr):
    theta = [math.log(p) for p in ref]  # start from the SFT model
    for step in range(steps):
        lp = [math.log(p) for p in softmax(theta)]
        g = [0, 0, 0, 0]
        for c, l, n in pairs:
            margin = beta * ((lp[c] - math.log(ref[c])) - (lp[l] - math.log(ref[l])))
            w = n * beta * (1 - sigmoid(margin))  # the softmax normaliser cancels in the difference
            g[c] += w
            g[l] -= w
        theta = [v + lr * g[i] / total for i, v in enumerate(theta)]
    return softmax(theta)
beta = 1.0
pi = dpo(beta, 4000, 1.0)
print(f"DPO beta={beta:.1f}      :", fmt(pi), f"| KL={kl(pi, ref):.3f}")
rlhf = softmax([math.log(p) + r[i] / beta for i, p in enumerate(ref)])
gap = max(abs(p - rlhf[i]) for i, p in enumerate(pi))
print(f"max |DPO - RLHF optimum| at beta={beta:.1f}:", "below 1e-6" if gap < 1e-6 else f"{gap:.6f}")
implied = [beta * math.log(p / ref[i]) for i, p in enumerate(pi)]
im = sum(implied) / 4
print("DPO implied reward:", fmt([v - im for v in implied]))
def order(x): return " > ".join(responses[i] for v, i in sorted(((v, i) for i, v in enumerate(x)), key=lambda t: -t[0]))
print("ranking by reward model:", order(r))
print("ranking by DPO policy  :", order(implied))` },
        ],
      },
    ],
  },
  {
    title: `What is quantization and when would you use a quantized model?`,
    difficulty: "hard",
    seoDescription: `Quantization stores LLM weights in fewer bits (8 or 4 instead of 16) to cut memory and speed decoding; learn the error, the formats and when to use it.`,
    description: `**Question presented to candidate:**
"We want to self-host an open-weight model. Someone suggested running a 4-bit quantized version. Explain what quantization actually does to the model, why it makes inference cheaper and faster, what it costs in quality, and how you would decide whether to ship it."

**What a strong answer should cover:**
- Quantization stores weights (and optionally activations or the KV cache) in fewer bits: map each value to a small integer grid with a scale factor, w ≈ q × scale; 16-bit to 4-bit cuts weight memory about 4x
- Why it speeds things up: single-sequence decoding is memory-bandwidth bound (every weight is read once per generated token), so fewer bytes per weight raises the tokens-per-second ceiling, not just the file size
- Granularity and outliers: one large value stretches the scale for everything that shares it; per-group scales (32 to 128 weights) and outlier-aware methods (LLM.int8(), AWQ, GPTQ) keep 4-bit error manageable at a small bits-per-weight overhead
- The main formats and where they run: GGUF / llama.cpp for CPUs and consumer GPUs, GPTQ and AWQ for GPU serving, bitsandbytes NF4 (QLoRA) for fine-tuning on a quantized base
- When to use it: fitting a bigger model on the hardware you have, on-device and local use, cutting serving cost; when not to: tasks where small accuracy losses matter (maths, code, long reasoning) without an eval on your own data
- The decision rule: compare "bigger model, quantized" against "smaller model, full precision" on your own eval, measuring quality, latency and memory

**Clarifying questions expected:**
- What hardware are we serving on (GPU memory, CPU only, edge device) and what batch sizes?
- Which tasks matter most, and do we have an eval that would detect a few points of quality loss?

**Code / implementation expected:** Optional — a small absmax quantizer showing per-tensor vs per-group error, the outlier effect, and the memory and bandwidth arithmetic.`,
    answer: `**Target Audience:** Engineers about to self-host or run an open-weight model who keep seeing names like "Q4_K_M", "AWQ" or "4-bit" and want to know what they trade away.
**Difficulty:** Hard
**Verified with:** Node 22.22.0 and Python 3.12.3 (a hand-written absmax quantizer on 4,096 synthetic weights, plus memory and bandwidth arithmetic; no real model is loaded). Paper and library facts are cited inline with the date they were checked (October 2026).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Imagine a photo library of a million high-resolution pictures that will not fit on your phone. You could buy a bigger phone, or you could save each photo as a good JPEG. Most photos look the same to you; a few, with fine text or subtle gradients, look a little worse. You just traded a little quality for a lot of space, and the phone also scrolls faster because it moves fewer bytes.

Quantization is that trade for model weights. A model with 8 billion weights stored as 16-bit numbers is 16 GB. Stored at about 4 bits each it is around 4.5 GB: it fits a laptop GPU, loads faster, and generates tokens faster. Most answers are indistinguishable; some, usually the hardest maths, code and long-reasoning ones, get a little worse.

The interview question is really two questions: do you understand *why* fewer bits make generation faster (it is not obvious), and do you have a disciplined way of deciding whether the quality loss is acceptable for *your* task?

## 2. The Core Mechanism: Scale, Round, Rescale

Weights are real numbers, mostly small and clustered around zero. A 16-bit float can represent tens of thousands of distinct values. A 4-bit integer can represent 16.

📌 **Interview term: precision (bit width)** — how many bits store each number. FP32 is 4 bytes, FP16 and BF16 are 2 bytes, INT8 is 1 byte, INT4 is half a byte.

📌 **Interview term: quantization** — mapping values from a high-precision format to a low-precision one, here by choosing a scale, storing \`q = round(w / scale)\` as a small integer, and reconstructing \`w ≈ q × scale\` when the weight is used.

📌 **Interview term: absmax (symmetric) quantization** — the simplest way to pick the scale: scale = max |w| / q_max, where q_max is 127 for INT8 and 7 for INT4. The largest weight maps to the top level and zero maps exactly to zero.

<svg class="iq-diagram" width="100%" viewBox="0 0 820 200" role="img" aria-label="One weight quantized: divide by the scale and round to get a 4 bit integer, then multiply by the scale to get an approximate weight back">
  <defs>
    <marker id="ai04q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="50" width="170" height="90" rx="10"/>
  <text class="d-text" x="105" y="88" text-anchor="middle">FP16 weight</text>
  <text class="d-sub" x="105" y="114" text-anchor="middle">0.0213</text>
  <rect class="d-box" x="240" y="50" width="170" height="90" rx="10"/>
  <text class="d-text" x="325" y="88" text-anchor="middle">divide, round</text>
  <text class="d-sub" x="325" y="114" text-anchor="middle">scale 0.0112</text>
  <rect class="d-box-accent" x="460" y="50" width="140" height="90" rx="10"/>
  <text class="d-text" x="530" y="88" text-anchor="middle">INT4 code</text>
  <text class="d-sub" x="530" y="114" text-anchor="middle">2, in -7..7</text>
  <rect class="d-box-muted" x="650" y="50" width="150" height="90" rx="10"/>
  <text class="d-text" x="725" y="88" text-anchor="middle">used as</text>
  <text class="d-sub" x="725" y="114" text-anchor="middle">2 x scale = 0.0225</text>
  <path class="d-edge" d="M 194 95 L 234 95" marker-end="url(#ai04q3-arrow)"/>
  <path class="d-edge" d="M 414 95 L 454 95" marker-end="url(#ai04q3-arrow)"/>
  <path class="d-edge" d="M 604 95 L 644 95" marker-end="url(#ai04q3-arrow)"/>
</svg>

The scale is max |w| / 7 = 0.0786 / 7 ≈ 0.01123 for the toy row of weights in the example. The weight 0.0213 divided by the scale is 1.90, which rounds to code 2, and comes back as 2 × 0.01123 ≈ 0.0225 instead of 0.0213: that difference, summed over billions of weights, is the quality cost.

The example's quantizer is a few lines; the clamp keeps rounding inside the integer range:

~~~js
const qmax = 2 ** (bits - 1) - 1;                    // INT8 -> 127, INT4 -> 7
const scale = Math.max(...block.map(Math.abs)) / qmax;
out[g + i] = Math.max(-qmax, Math.min(qmax, roundHalfAway(v / scale))) * scale;
~~~

## 3. Granularity and the Outlier Problem

Which weights share one scale is a design choice.

📌 **Interview term: per-tensor vs per-group (block-wise) quantization** — per-tensor uses one scale for a whole matrix; per-channel uses one per row or column; per-group uses one per block of, say, 32 or 128 consecutive weights. Smaller groups track the local range better but store more scales.

📌 **Interview term: bits per weight (bpw)** — the real storage cost including the scales. 4-bit codes with one 16-bit scale per group of 32 cost 4 + 16/32 = 4.5 bits per weight; with groups of 128, 4.125.

📌 **Interview term: outlier** — a value much larger than the rest. With absmax scaling, one outlier sets the scale for everything in its group, so all the ordinary weights get squeezed into one or two levels near zero.

<svg class="iq-diagram" width="100%" viewBox="0 0 820 240" role="img" aria-label="A row of weights split into four groups, each with its own scale; an outlier only coarsens the group it sits in">
  <rect class="d-box" x="20" y="40" width="170" height="80" rx="10"/>
  <text class="d-text" x="105" y="74" text-anchor="middle">group 1</text>
  <text class="d-sub" x="105" y="100" text-anchor="middle">own scale, fine</text>
  <rect class="d-box-accent" x="225" y="40" width="170" height="80" rx="10"/>
  <text class="d-text" x="310" y="74" text-anchor="middle">group 2</text>
  <text class="d-sub" x="310" y="100" text-anchor="middle">has the outlier</text>
  <rect class="d-box" x="430" y="40" width="170" height="80" rx="10"/>
  <text class="d-text" x="515" y="74" text-anchor="middle">group 3</text>
  <text class="d-sub" x="515" y="100" text-anchor="middle">own scale, fine</text>
  <rect class="d-box" x="635" y="40" width="170" height="80" rx="10"/>
  <text class="d-text" x="720" y="74" text-anchor="middle">group 4</text>
  <text class="d-sub" x="720" y="100" text-anchor="middle">own scale, fine</text>
  <rect class="d-box-muted" x="20" y="160" width="785" height="60" rx="10"/>
  <text class="d-text" x="412" y="196" text-anchor="middle">per-tensor: one scale, the outlier coarsens all four groups</text>
</svg>

Here is what the example measured on 4,096 synthetic weights (roughly normal, standard deviation 0.02), with "output err" being the relative error of the layer output over 64 random input vectors:

~~~text
INT8 per-tensor  bits/weight=8.000 weight err=  0.90% output err=  0.94% rounded to zero=  42 of 4096
INT4 per-tensor  bits/weight=4.000 weight err= 16.22% output err= 14.27% rounded to zero= 857 of 4096
INT4 group=128   bits/weight=4.125 weight err= 11.59% output err= 10.57% rounded to zero= 617 of 4096
INT4 group=32    bits/weight=4.500 weight err=  9.68% output err=  8.53% rounded to zero= 506 of 4096
with one outlier (0.8) at index 100:
INT8 per-tensor  bits/weight=8.000 weight err=  7.65% output err=  7.56% rounded to zero= 472 of 4096
INT4 per-tensor  bits/weight=4.000 weight err= 84.55% output err= 91.30% rounded to zero=4079 of 4096
INT4 group=32    bits/weight=4.500 weight err= 11.57% output err= 11.35% rounded to zero= 534 of 4096
~~~

Three lessons:

1. **INT8 is nearly free** on well-behaved weights (under 1% error); **naive INT4 is not** (14%).
2. **Groups buy back most of the INT4 loss** for half a bit per weight: 14.27% per-tensor down to 8.53% with groups of 32.
3. **One outlier destroys per-tensor INT4**: 4,079 of 4,096 weights rounded to zero and the output error hit 91%. With groups of 32, only that one group suffers (11.35%).

This toy is not a real model, and a real model does not lose 9% of its "quality" because one layer has 9% output error; errors partly average out across layers and the network is somewhat robust. The *relative* behaviour (8-bit is easy, 4-bit needs groups, outliers are the enemy) is the part that transfers.

### What the published methods do about it

- **LLM.int8()** (Dettmers et al., arXiv 2208.07339, 2022) found systematic large-magnitude outlier features that emerge in transformers from around 6.7B parameters, where plain 8-bit quantization started to fail. Its fix is mixed precision: the few outlier feature dimensions go through a 16-bit matrix multiply and more than 99.9% of values stay 8-bit. It is the basis of the bitsandbytes library.
- **GPTQ** (Frantar et al., arXiv 2210.17323, ICLR 2023) is one-shot post-training quantization using approximate second-order information: it quantizes weights a few at a time and adjusts the not-yet-quantized ones to compensate the error. The paper reports quantizing 175B-parameter models to 3 or 4 bits in about four GPU hours with little accuracy loss.
- **AWQ** (Lin et al., arXiv 2306.00978, 2023) starts from the observation that protecting about 1% of salient weights greatly reduces error, and finds them by looking at **activations**, not weights; it then scales those channels before rounding instead of keeping them in higher precision, which keeps the kernel hardware-friendly.

📌 **Interview term: post-training quantization (PTQ)** — quantizing an already-trained model, usually with a small calibration dataset and no further training. GPTQ and AWQ are PTQ methods. The alternative, quantization-aware training, simulates low precision during training and is more expensive.

📌 **Interview term: calibration data** — a few hundred example inputs run through the model so the quantizer can see real activation ranges. If it is unlike your traffic (for example English prose when you serve code), quality on your task can suffer more than the published numbers suggest.

## 4. Why Fewer Bits Means Faster Tokens

This is the part many candidates miss. Quantization does not only shrink files.

📌 **Interview term: memory-bandwidth bound** — a workload whose speed is limited by how fast data moves from memory, not by how fast the chip computes. Generating one token for one sequence needs every weight once, but does only about two arithmetic operations per weight read, so the GPU spends most of its time waiting for weights to arrive. See also [what reduces LLM latency at each stage](/interview-question/what-techniques-reduce-llm-latency-at-each-stage-of-a-request).

So an upper bound on single-sequence decode speed is bandwidth ÷ bytes of weights. With an **assumed** 1,000 GB/s of GPU memory bandwidth:

~~~text
weights only, 8B-parameter model:
  FP16/BF16            16.0 GB | fits 24 GB: yes | fits 80 GB: yes | decode ceiling ~62 tokens/s
  INT8 (+scale/32)      8.5 GB | fits 24 GB: yes | fits 80 GB: yes | decode ceiling ~117 tokens/s
  INT4 (+scale/32)      4.5 GB | fits 24 GB: yes | fits 80 GB: yes | decode ceiling ~222 tokens/s
  INT4 (+scale/128)     4.1 GB | fits 24 GB: yes | fits 80 GB: yes | decode ceiling ~242 tokens/s
weights only, 70B-parameter model:
  FP16/BF16           140.0 GB | fits 24 GB: no  | fits 80 GB: no  | decode ceiling ~7 tokens/s
  INT8 (+scale/32)     74.4 GB | fits 24 GB: no  | fits 80 GB: yes | decode ceiling ~13 tokens/s
  INT4 (+scale/32)     39.4 GB | fits 24 GB: no  | fits 80 GB: yes | decode ceiling ~25 tokens/s
  INT4 (+scale/128)    36.1 GB | fits 24 GB: no  | fits 80 GB: yes | decode ceiling ~27 tokens/s
~~~

These are ceilings, not benchmarks: real kernels spend time unpacking 4-bit codes, and real servers batch many sequences. The 70B rows show the most common real reason to quantize: in 16 bits it needs at least two 80 GB GPUs for the weights alone; at 4 bits it fits on one with room left for the KV cache.

The **KV cache** (the stored attention keys and values for every token in context) is the other big memory consumer, and it can be quantized too. For an assumed 8B shape with 32 layers, 8 key/value heads and head size 128:

~~~text
KV cache, one sequence of 8,192 tokens: FP16 1.1 GB | INT8 0.5 GB
KV cache, one sequence of 131,072 tokens: FP16 17.2 GB | INT8 8.6 GB
~~~

At 128k tokens one sequence's cache (17.2 GB) is larger than the 16 GB of FP16 weights. That is why long-context serving often quantizes the cache ([using long context windows](/interview-question/context-windows-in-2025-26-how-do-you-use-128k-1m-tokens-without-drowning)).

📌 **Interview term: weight-only vs weight-and-activation quantization** — weight-only (W4A16, W8A16) stores weights in low precision but does the maths in 16-bit after unpacking; it helps the memory-bound case. Quantizing activations too (W8A8) lets the hardware use faster low-precision maths, which helps large-batch, compute-bound serving.

## 5. Formats You Will Meet

| Name | What it is | Typical use |
| :--- | :--- | :--- |
| GGUF (llama.cpp) | File format with block-wise quant types such as \`Q8_0\` and \`Q4_K_M\` | CPUs, Apple silicon, consumer GPUs, local apps |
| GPTQ | PTQ method using second-order error compensation | GPU serving of 4-bit models |
| AWQ | PTQ method protecting activation-salient weights | GPU serving of 4-bit models |
| bitsandbytes INT8 / NF4 | On-the-fly quantization at load time; NF4 is the QLoRA data type | Fine-tuning on a quantized base, quick experiments |
| FP8 / INT8 W8A8 | Weights and activations in 8 bits | High-throughput data-center serving on hardware that supports it |

On GGUF names: secondary sources (llama.cpp community docs, checked October 2026) describe \`Q8_0\` as about 8.5 bits per weight, which matches the arithmetic above for 32 weights per block plus one 16-bit scale; the "K" types vary bits by layer and their exact averages differ between sources, so read the llama.cpp quantization table rather than trusting a blog number.

📌 **Interview term: NF4 (4-bit NormalFloat)** — a 4-bit data type from the QLoRA paper whose 16 levels are spaced for normally distributed weights, rather than evenly. Used for fine-tuning with LoRA on a frozen 4-bit base ([fine-tuning, LoRA and prompt engineering](/interview-question/what-is-the-difference-between-fine-tuning-lora-and-prompt-engineering)).

Loading a model in 4-bit NF4 with Hugging Face Transformers and bitsandbytes looks like this. It is **not run here** (it needs a GPU and the model download); argument names follow the Transformers bitsandbytes docs, checked October 2026:

~~~python
# not run here: load a model with 4-bit NF4 weights
import torch
from transformers import AutoModelForCausalLM, BitsAndBytesConfig

bnb = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4",
                         bnb_4bit_compute_dtype=torch.bfloat16)
model = AutoModelForCausalLM.from_pretrained(model_id, quantization_config=bnb, device_map="auto")
~~~

## 6. When to Use a Quantized Model

**Good reasons:**

- **It is the only way the model fits.** A 70B model on one 80 GB GPU, or an 8B model on a laptop or phone.
- **Cost at volume.** Fewer GPUs per replica, more memory left for KV cache and concurrent requests.
- **Local and private use.** Running on the user's device so data never leaves it.
- **A bigger quantized model can beat a smaller full-precision one** at the same memory. That is a hypothesis to test, not a rule.

**Be careful when:**

- The task is sensitive to small errors: multi-step maths, code generation, long chains of reasoning, structured output with strict formats.
- You serve very long contexts with a quantized KV cache.
- The calibration data does not look like your traffic (another language, code, a domain).

**How to decide:** run your own eval suite ([golden datasets](/interview-question/how-do-you-build-a-golden-dataset-for-evaluating-an-llm-feature), [catching regressions on model changes](/interview-question/how-do-you-catch-regressions-when-changing-a-prompt-or-upgrading-a-model)) on the exact quantized artifact you will ship, next to the full-precision version and next to a smaller full-precision model, and compare quality, latency at your real batch sizes, and memory. Published perplexity numbers on generic text do not tell you how your task degrades. The open-weight versus API decision itself is covered in [How do you choose between open-weight models and proprietary API models?](/interview-question/how-do-you-choose-between-open-weight-models-and-proprietary-api-models)

## 7. Verified: Running the Code

The example **"Absmax INT8/INT4 quantization: per-tensor vs per-group error, one outlier, and memory and bandwidth arithmetic"** generates 4,096 weights from a seeded generator (sum of 12 uniforms, scaled to a standard deviation of about 0.02), quantizes them with symmetric absmax at several granularities, injects one outlier, and then does the memory arithmetic. Both languages use the same round-half-away-from-zero rule so results match exactly. \`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
max|w| = 0.0786
INT8 per-tensor  bits/weight=8.000 weight err=  0.90% output err=  0.94% rounded to zero=  42 of 4096
INT4 per-tensor  bits/weight=4.000 weight err= 16.22% output err= 14.27% rounded to zero= 857 of 4096
INT4 group=128   bits/weight=4.125 weight err= 11.59% output err= 10.57% rounded to zero= 617 of 4096
INT4 group=32    bits/weight=4.500 weight err=  9.68% output err=  8.53% rounded to zero= 506 of 4096
with one outlier (0.8) at index 100:
INT8 per-tensor  bits/weight=8.000 weight err=  7.65% output err=  7.56% rounded to zero= 472 of 4096
INT4 per-tensor  bits/weight=4.000 weight err= 84.55% output err= 91.30% rounded to zero=4079 of 4096
INT4 group=32    bits/weight=4.500 weight err= 11.57% output err= 11.35% rounded to zero= 534 of 4096
weights only, 8B-parameter model:
  FP16/BF16            16.0 GB | fits 24 GB: yes | fits 80 GB: yes | decode ceiling ~62 tokens/s
  INT8 (+scale/32)      8.5 GB | fits 24 GB: yes | fits 80 GB: yes | decode ceiling ~117 tokens/s
  INT4 (+scale/32)      4.5 GB | fits 24 GB: yes | fits 80 GB: yes | decode ceiling ~222 tokens/s
  INT4 (+scale/128)     4.1 GB | fits 24 GB: yes | fits 80 GB: yes | decode ceiling ~242 tokens/s
weights only, 70B-parameter model:
  FP16/BF16           140.0 GB | fits 24 GB: no  | fits 80 GB: no  | decode ceiling ~7 tokens/s
  INT8 (+scale/32)     74.4 GB | fits 24 GB: no  | fits 80 GB: yes | decode ceiling ~13 tokens/s
  INT4 (+scale/32)     39.4 GB | fits 24 GB: no  | fits 80 GB: yes | decode ceiling ~25 tokens/s
  INT4 (+scale/128)    36.1 GB | fits 24 GB: no  | fits 80 GB: yes | decode ceiling ~27 tokens/s
KV cache, one sequence of 8,192 tokens: FP16 1.1 GB | INT8 0.5 GB
KV cache, one sequence of 131,072 tokens: FP16 17.2 GB | INT8 8.6 GB
~~~

What the run proves rather than asserts:

- INT8 absmax keeps error under 1% on well-behaved weights; per-tensor INT4 does not (14%).
- Per-group scales cut INT4 error substantially for 0.125 to 0.5 extra bits per weight.
- A single outlier ruins per-tensor INT4 (91% output error, 4,079 weights rounded to zero) but barely affects group-wise INT4.
- Weight bytes, and so the bandwidth ceiling on decode speed, scale directly with bits per weight.

What the simulation leaves out: real weight distributions and their outlier structure, the activation outliers that LLM.int8() and AWQ target, error compensation as in GPTQ, kernel overheads, and any measurement of task quality. The bandwidth figure is an assumption, not a specific GPU.

## Edge Cases Worth Knowing

- **"Same benchmark score" is not "same behaviour".** Average scores can hide regressions on a slice that matters to you (rare languages, long inputs, exact numbers).
- **Mixing a LoRA adapter with a quantized base.** An adapter trained on a 16-bit base may behave slightly differently on a 4-bit one; train it the way you will serve it (QLoRA exists for this) or evaluate the combination.
- **Quantized does not always mean faster.** Without fast kernels for your format on your hardware, unpacking can cost more than the bandwidth saved, especially at large batch sizes.
- **Embedding and output layers** are often left in higher precision because they are small relative to the model and sensitive to error.

## Common Pitfalls

- **Saying quantization only saves disk space.** The main runtime win is bandwidth: fewer bytes read per generated token.
- **Ignoring the scales.** "4-bit" is really 4.1 to 4.5 bits per weight once group scales are counted; it matters for capacity planning.
- **Forgetting the KV cache.** A model whose weights fit can still run out of memory at long context or high concurrency; the cache was 17.2 GB per 128k-token sequence in the arithmetic above.
- **Shipping on a vendor's perplexity number.** Run your own eval on the exact artifact, including the hard slices (maths, code, long context).
- **Treating all 4-bit formats as interchangeable.** NF4 load-time quantization, GPTQ, AWQ and GGUF K-quants make different trade-offs and need different runtimes.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">Quantization stores numbers in fewer bits. For weights you pick a <strong style="color:#ffca28;">scale</strong>, store <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">q = round(w / scale)</code> as a small integer, and reconstruct <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">w ≈ q × scale</code> at run time. Going from 16-bit to 4-bit cuts weight memory about 4x.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why it is faster:</strong> <span style="color:#f0e2c8;">Generating one token for one sequence reads every weight once, so decode is <strong style="color:#ffca28;">memory-bandwidth bound</strong>. Fewer bytes per weight means a higher tokens-per-second ceiling: in my arithmetic an 8B model goes from about 62 to about 222 tokens per second on an assumed 1000 GB/s GPU.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Where the error comes from:</strong> <span style="color:#f0e2c8;">Rounding error grows as bits shrink, and <strong style="color:#ffca28;">outliers</strong> make it worse because one large value stretches the scale for every weight that shares it. In my toy, one outlier took per-tensor INT4 output error from 14% to 91%; per-group scales of 32 weights kept it at 11%.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Methods and formats:</strong> <span style="color:#f0e2c8;">LLM.int8() splits outlier features into 16-bit. GPTQ uses second-order information to compensate rounding error; AWQ protects the salient weights using activation statistics. GGUF from llama.cpp targets CPUs and consumer GPUs; bitsandbytes NF4 is what QLoRA fine-tunes on.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When I would use it:</strong> <span style="color:#f0e2c8;">To fit a bigger model on the hardware I have, to run locally or on-device, or to cut serving cost. I would compare a quantized bigger model against a full-precision smaller one <strong style="color:#ffca28;">on our own eval</strong>, paying attention to maths, code and long-context tasks, which tend to degrade first.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does quantization help when I serve large batches?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Less than for one sequence. At large batch sizes the same weights serve many tokens per read, so the bottleneck moves toward compute. Weight-only quantization still saves memory, which leaves room for a bigger KV cache and more concurrent requests, but the speedup shrinks. Quantizing activations too (for example 8-bit weights and activations) is what helps the compute-bound case, on hardware with fast low-precision math.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not go to 2 bits?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each bit removed halves the number of levels. At 4 bits there are 15 symmetric levels; at 2 bits only 3, so most weights round to zero or to the same value. Published methods report usable results at 3 bits with care (the GPTQ paper reports 3 and 4-bit results), but quality typically falls off quickly below 4 bits, so it needs a strong eval to justify.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between GPTQ and AWQ?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both are post-training, weight-only methods that need a small calibration set. GPTQ quantizes weights column by column and adjusts the remaining weights to compensate the error, using approximate second-order information. AWQ observes activations to find the roughly 1% of weights that matter most and scales channels to protect them before ordinary rounding. Which is better depends on model and kernel support, so measure.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Should I also quantize the KV cache?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For long contexts or high concurrency, often yes: the KV cache grows with sequence length and number of requests, and at long contexts it can exceed the weights in size. Quantizing it to 8 bits roughly halves that memory. It affects attention precision, so re-run long-context evals.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between quantization and distillation?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Quantization keeps the same model and stores it more compactly. <strong style="color:#ffca28;">Distillation</strong> trains a different, smaller model to imitate a bigger one. They stack: distil to a small model, then quantize it.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Precision (bit width) | Bits per stored number: FP16 2 bytes, INT8 1 byte, INT4 half a byte |
| Quantization | Store \`round(w / scale)\` as a small integer; use \`q × scale\` |
| Absmax quantization | scale = max \\|w\\| / q_max; symmetric around zero |
| Per-tensor vs per-group | One scale for a whole matrix vs one per block of weights |
| Bits per weight (bpw) | True storage cost including scales, e.g. 4.5 for INT4 with groups of 32 |
| Outlier | A value far larger than the rest that stretches the shared scale |
| Post-training quantization (PTQ) | Quantizing a trained model with a small calibration set |
| Calibration data | Sample inputs used to observe real activation ranges |
| Memory-bandwidth bound | Speed limited by bytes moved, as in single-sequence decoding |
| Weight-only vs weight-and-activation | W4A16 saves memory and bandwidth; W8A8 also speeds up compute |
| NF4 | QLoRA 4-bit data type with levels spaced for normal distributions |

**Conclusion:** Quantization stores a model's numbers in fewer bits — a scale per group of weights plus small integer codes — so a model takes a quarter to a half of its 16-bit memory. Because generating a token for one sequence reads every weight once, fewer bytes per weight also raises the decode-speed ceiling, which is why a 4-bit model is faster as well as smaller. The cost is rounding error, made far worse by outliers, which is what per-group scales and methods such as LLM.int8(), GPTQ and AWQ exist to contain. Use it to fit a bigger model on the hardware you have, to run locally, or to cut serving cost, and decide by running your own eval on the exact quantized artifact against both the full-precision model and a smaller unquantized one.`,
    examples: [
      {
        label: `Absmax INT8/INT4 quantization: per-tensor vs per-group error, one outlier, and memory and bandwidth arithmetic`,
        variants: [
          { tech: "node", code: `// Weight quantization on a toy layer: absmax INT8 / INT4, per-tensor vs per-group,
// what one outlier does, and the memory and decode-speed arithmetic.
let seed = 2024;
const rand = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
const gauss = () => { let s = 0; for (let i = 0; i < 12; i++) s += rand(); return (s - 6) * 0.02; }; // ~N(0, 0.02)
const N = 4096;
const w = Array.from({ length: N }, gauss);  // one row of "FP16" weights
const xs = Array.from({ length: 64 }, () => Array.from({ length: N }, () => rand() * 2 - 1)); // 64 activations
const roundHalfAway = (v) => Math.sign(v) * Math.floor(Math.abs(v) + 0.5); // same rule in both languages

// Symmetric absmax quantization: q = round(w / scale), scale = max|w| / qmax, w' = q * scale.
function quantize(weights, bits, group) {
  const qmax = 2 ** (bits - 1) - 1; // INT8 -> 127, INT4 -> 7
  const out = new Array(weights.length);
  for (let g = 0; g < weights.length; g += group) {
    const block = weights.slice(g, g + group);
    const scale = Math.max(...block.map(Math.abs)) / qmax;
    block.forEach((v, i) => { out[g + i] = Math.max(-qmax, Math.min(qmax, roundHalfAway(v / scale))) * scale; });
  }
  return out;
}
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const pct = (v) => (100 * v).toFixed(2).padStart(6) + "%";
function report(name, weights, bits, group) {
  const q = quantize(weights, bits, group);
  let dw = 0, nw = 0, dy = 0, ny = 0;
  weights.forEach((v, i) => { dw += (q[i] - v) ** 2; nw += v * v; });
  for (const x of xs) { const e = dot(weights, x), a = dot(q, x); dy += (a - e) ** 2; ny += e * e; }
  const zeros = q.filter((v) => v === 0).length;
  const bpw = bits + (group < N ? 16 / group : 0); // plus one FP16 scale per group
  console.log(\`\${name.padEnd(16)} bits/weight=\${bpw.toFixed(3)} weight err=\${pct(Math.sqrt(dw / nw))} \` +
    \`output err=\${pct(Math.sqrt(dy / ny))} rounded to zero=\${String(zeros).padStart(4)} of \${N}\`);
}
console.log("max|w| =", Math.max(...w.map(Math.abs)).toFixed(4));
report("INT8 per-tensor", w, 8, N);
report("INT4 per-tensor", w, 4, N);
report("INT4 group=128", w, 4, 128);
report("INT4 group=32", w, 4, 32);

// One outlier weight (LLMs have them) stretches the scale for everything that shares it.
const wo = w.slice(); wo[100] = 0.8;
console.log("with one outlier (0.8) at index 100:");
report("INT8 per-tensor", wo, 8, N);
report("INT4 per-tensor", wo, 4, N);
report("INT4 group=32", wo, 4, 32);

// Weights only (KV cache and activations come on top). Decode reads every weight once per
// token, so tokens/s per sequence <= bandwidth / weight bytes (assumed 1000 GB/s GPU).
for (const P of [8e9, 70e9]) {
  console.log(\`weights only, \${(P / 1e9).toFixed(0)}B-parameter model:\`);
  for (const [fmt, bpw] of [["FP16/BF16", 16], ["INT8 (+scale/32)", 8.5], ["INT4 (+scale/32)", 4.5], ["INT4 (+scale/128)", 4.125]]) {
    const bytes = P * bpw / 8;
    console.log(\`  \${fmt.padEnd(18)} \${(bytes / 1e9).toFixed(1).padStart(6)} GB | fits 24 GB: \${bytes < 24e9 ? "yes" : "no "} | fits 80 GB: \${bytes < 80e9 ? "yes" : "no "} | decode ceiling ~\${Math.floor(1000e9 / bytes)} tokens/s\`);
  }
}

// KV cache for an assumed 8B shape (32 layers, 8 KV heads, head size 128): K and V per token per layer.
const kvPerToken = 2 * 32 * 8 * 128; // values per token
for (const ctx of [8192, 131072]) {
  const cells = [["FP16", 2], ["INT8", 1]].map(([n, b]) => \`\${n} \${(kvPerToken * b * ctx / 1e9).toFixed(1)} GB\`).join(" | ");
  console.log(\`KV cache, one sequence of \${ctx.toLocaleString("en-US")} tokens: \${cells}\`);
}` },
          { tech: "python", code: `# Weight quantization on a toy layer: absmax INT8 / INT4, per-tensor vs per-group,
# what one outlier does, and the memory and decode-speed arithmetic.
import math
seed = 2024
def rand():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647
def gauss():  # ~N(0, 0.02)
    s = 0
    for _ in range(12):
        s += rand()
    return (s - 6) * 0.02
N = 4096
w = [gauss() for _ in range(N)]  # one row of "FP16" weights
xs = [[rand() * 2 - 1 for _ in range(N)] for _ in range(64)]  # 64 activations
def sign(v): return (v > 0) - (v < 0)
def round_half_away(v): return sign(v) * math.floor(abs(v) + 0.5)  # same rule in both languages

# Symmetric absmax quantization: q = round(w / scale), scale = max|w| / qmax, w' = q * scale.
def quantize(weights, bits, group):
    qmax = 2 ** (bits - 1) - 1  # INT8 -> 127, INT4 -> 7
    out = [0.0] * len(weights)
    for g in range(0, len(weights), group):
        block = weights[g:g + group]
        scale = max(abs(v) for v in block) / qmax
        for i, v in enumerate(block):
            out[g + i] = max(-qmax, min(qmax, round_half_away(v / scale))) * scale
    return out
def dot(a, b):
    s = 0
    for i, v in enumerate(a):
        s += v * b[i]
    return s
def pct(v): return f"{100 * v:.2f}".rjust(6) + "%"
def report(name, weights, bits, group):
    q = quantize(weights, bits, group)
    dw = nw = dy = ny = 0
    for i, v in enumerate(weights):
        dw += (q[i] - v) ** 2
        nw += v * v
    for x in xs:
        e, a = dot(weights, x), dot(q, x)
        dy += (a - e) ** 2
        ny += e * e
    zeros = sum(1 for v in q if v == 0)
    bpw = bits + (16 / group if group < N else 0)  # plus one FP16 scale per group
    print(f"{name.ljust(16)} bits/weight={bpw:.3f} weight err={pct(math.sqrt(dw / nw))} "
          f"output err={pct(math.sqrt(dy / ny))} rounded to zero={str(zeros).rjust(4)} of {N}")
print("max|w| =", f"{max(abs(v) for v in w):.4f}")
report("INT8 per-tensor", w, 8, N)
report("INT4 per-tensor", w, 4, N)
report("INT4 group=128", w, 4, 128)
report("INT4 group=32", w, 4, 32)

# One outlier weight (LLMs have them) stretches the scale for everything that shares it.
wo = w[:]
wo[100] = 0.8
print("with one outlier (0.8) at index 100:")
report("INT8 per-tensor", wo, 8, N)
report("INT4 per-tensor", wo, 4, N)
report("INT4 group=32", wo, 4, 32)

# Weights only (KV cache and activations come on top). Decode reads every weight once per
# token, so tokens/s per sequence <= bandwidth / weight bytes (assumed 1000 GB/s GPU).
for P in [8e9, 70e9]:
    print(f"weights only, {P / 1e9:.0f}B-parameter model:")
    for fmt, bpw in [["FP16/BF16", 16], ["INT8 (+scale/32)", 8.5], ["INT4 (+scale/32)", 4.5], ["INT4 (+scale/128)", 4.125]]:
        size = P * bpw / 8
        print(f"  {fmt.ljust(18)} {f'{size / 1e9:.1f}'.rjust(6)} GB | fits 24 GB: {'yes' if size < 24e9 else 'no '} | "
              f"fits 80 GB: {'yes' if size < 80e9 else 'no '} | decode ceiling ~{math.floor(1000e9 / size)} tokens/s")

# KV cache for an assumed 8B shape (32 layers, 8 KV heads, head size 128): K and V per token per layer.
kv_per_token = 2 * 32 * 8 * 128  # values per token
for ctx in [8192, 131072]:
    cells = " | ".join(f"{n} {kv_per_token * b * ctx / 1e9:.1f} GB" for n, b in [["FP16", 2], ["INT8", 1]])
    print(f"KV cache, one sequence of {ctx:,} tokens: {cells}")` },
        ],
      },
    ],
  },
  {
    title: `Fine-tune vs RAG vs prompt engineering: how do you choose in 2025-26?`,
    difficulty: "hard",
    seoDescription: `A 2025-26 decision framework for prompting, RAG and fine-tuning: diagnose knowledge vs behaviour vs cost, then check freshness and break-even volume.`,
    description: `**Question presented to candidate:**
"You are building an LLM feature for our product and the team is split three ways: better prompts, RAG, or fine-tuning. It is 2026, context windows are huge and prompt caching is cheap. How do you decide, and what would make you change your mind?"

**What a strong answer should cover:**
- Diagnose the failure first: missing or changing **knowledge** points to retrieval (or, for a small static corpus, simply putting it in a long cached prompt); wrong **behaviour** (format, tone, a narrow task) that a good prompt cannot fix points to fine-tuning; **cost or latency** at high volume can justify fine-tuning a smaller model
- Order of moves: prompt engineering with an eval first, then RAG for knowledge, then LoRA fine-tuning for behaviour; production systems often combine them (RAG for facts, a tuned model for format)
- Freshness and governance: RAG updates when a document changes and can cite sources and enforce per-user access; fine-tuned knowledge is a snapshot that goes stale until retrained and cannot be deleted per document
- Worked cost arithmetic: tokens per request × volume × price, plus fixed costs (vector store, training and eval runs), and the break-even volume where a tuned small model beats a long prompt; prompt caching moves that break-even a lot
- What changed in 2025-26: long context and caching make "just put it in the prompt" viable for small corpora; fine-tuning availability depends on the provider (OpenAI's docs say its self-serve fine-tuning platform is winding down) while open-weight models plus LoRA remain fully under your control
- Every option is judged by the same eval on your own data, including the cost of maintaining it when the base model changes

**Clarifying questions expected:**
- What exactly fails today: wrong facts, wrong format or tone, or too slow and expensive?
- How big is the knowledge, how often does it change, and does it need citations or per-user access control?
- What volume do we expect, and do we have labelled examples and an eval set?

**Code / implementation expected:** Optional — a cost model with a break-even calculation, or a simulation of what happens to each approach when a fact changes, makes the reasoning concrete.`,
    answer: `**Target Audience:** Engineers and tech leads who must choose how to adapt an LLM for a real product, and want a decision process they can defend with numbers rather than opinions.
**Difficulty:** Hard
**Verified with:** Node 22.22.0 and Python 3.12.3 (a freshness simulation, a cost model with **assumed** prices, and a rule-based decision table; no model is called). Provider and paper facts are cited inline with the date they were checked (October 2026).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A new hire on your support team is smart but does not know your company. Three managers each have a fix.

- The first writes **a better onboarding brief**: how to answer, what tone, three example replies. Done in an afternoon.
- The second gives them **access to the internal wiki** and tells them to look things up before answering. Now they can answer questions about last week's policy change, and point to the page they used.
- The third sends them on **a two-week course** on how your company writes. Afterwards they write in the house style without being reminded, faster, with less to read each time. But the course was recorded last month, and it says nothing about yesterday's policy change.

All three helped, with different problems. Prompting is the brief, RAG is the wiki, fine-tuning is the course. The expensive mistake is sending someone on a course to teach them facts that change every week, or writing ever-longer briefs when the real problem is volume and cost. The mechanics of each lever are covered in [What is the difference between fine-tuning, LoRA and prompt engineering?](/interview-question/what-is-the-difference-between-fine-tuning-lora-and-prompt-engineering) and [What is RAG and why use it instead of fine-tuning for knowledge?](/interview-question/what-is-rag-and-why-use-it-instead-of-fine-tuning-for-knowledge); this doc is about **choosing**.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What fails today: wrong facts, wrong format or tone, or cost and latency? | Each failure points to a different lever; this is the whole decision |
| How big is the knowledge and how often does it change? | Small and static can go in a cached prompt; large or changing needs retrieval |
| Do answers need citations or per-user access control? | Only retrieval can show sources and filter by permissions at query time |
| What volume do we expect per month? | Decides whether a long prompt or a tuned small model is cheaper |
| Do we have labelled examples and an eval set? | No eval means no way to compare options; fine-tuning also needs clean examples |
| API-only model, or can we host open weights? | Fine-tuning options depend on the provider; with open weights you control them |

## 3. The Three Levers in One Table

📌 **Interview term: prompt engineering** — improving output by changing only the input: instructions, examples, format rules. No training.

📌 **Interview term: RAG (retrieval-augmented generation)** — at request time, search your own documents and put the most relevant passages in the prompt so the model answers from them.

📌 **Interview term: fine-tuning** — training the model further on your examples so behaviour is stored in the weights; usually LoRA rather than full fine-tuning today.

| | Prompt engineering | RAG | Fine-tuning (LoRA) |
| :--- | :--- | :--- | :--- |
| Fixes | Instructions, format, tone the model can already do | Missing, private or changing knowledge | Behaviour a prompt cannot reliably produce; cost at volume |
| Freshness | Instant (edit the prompt) | As fresh as your index | Snapshot at training time |
| Citations and access control | No | Yes, per document and per user | No |
| Upfront cost | Hours | Days to weeks (ingestion, chunking, search, evals) | Days to weeks (data, training, evals) |
| Per-request cost | Grows with prompt length | Extra retrieved tokens plus search | Shorter prompts, and can use a smaller model |
| Ongoing burden | Prompt versioning | Keeping the index fresh and retrieval good | Retraining on base-model upgrades and data changes |
| Main risk | Long, fragile prompts | Bad retrieval gives confident wrong answers | Stale facts, regressions, more hallucination if trained on new facts |

## 4. A Decision Path

<svg class="iq-diagram" width="100%" viewBox="0 0 800 400" role="img" aria-label="Decision path: if the task needs facts the model lacks, add RAG; if behaviour is still wrong after a good prompt, fine-tune with LoRA; otherwise stay with prompt engineering and an eval">
  <defs>
    <marker id="ai04q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="20" width="420" height="80" rx="10"/>
  <text class="d-text" x="240" y="54" text-anchor="middle">Needs facts the model lacks?</text>
  <text class="d-sub" x="240" y="80" text-anchor="middle">private, changing, must cite</text>
  <rect class="d-box-accent" x="570" y="20" width="200" height="80" rx="10"/>
  <text class="d-text" x="670" y="54" text-anchor="middle">add RAG</text>
  <text class="d-sub" x="670" y="80" text-anchor="middle">or a cached prompt</text>
  <rect class="d-box" x="30" y="160" width="420" height="80" rx="10"/>
  <text class="d-text" x="240" y="194" text-anchor="middle">Behaviour wrong after a good prompt?</text>
  <text class="d-sub" x="240" y="220" text-anchor="middle">format, tone, narrow task, cost at volume</text>
  <rect class="d-box-accent" x="570" y="160" width="200" height="80" rx="10"/>
  <text class="d-text" x="670" y="194" text-anchor="middle">LoRA fine-tune</text>
  <text class="d-sub" x="670" y="220" text-anchor="middle">on clean examples</text>
  <rect class="d-box-muted" x="30" y="300" width="420" height="80" rx="10"/>
  <text class="d-text" x="240" y="334" text-anchor="middle">prompt engineering</text>
  <text class="d-sub" x="240" y="360" text-anchor="middle">plus an eval, then stop</text>
  <path class="d-edge" d="M 454 60 L 564 60" marker-end="url(#ai04q4-arrow)"/>
  <text class="d-sub" x="508" y="46" text-anchor="middle">yes</text>
  <path class="d-edge" d="M 454 200 L 564 200" marker-end="url(#ai04q4-arrow)"/>
  <text class="d-sub" x="508" y="186" text-anchor="middle">yes</text>
  <path class="d-edge" d="M 240 104 L 240 154" marker-end="url(#ai04q4-arrow)"/>
  <text class="d-sub" x="266" y="134" text-anchor="middle">no</text>
  <path class="d-edge" d="M 240 244 L 240 294" marker-end="url(#ai04q4-arrow)"/>
  <text class="d-sub" x="266" y="274" text-anchor="middle">no</text>
</svg>

The questions are not exclusive: answer "yes" to both and you build both. Every arrow ends in the same place in practice, an eval run that proves the change helped.

📌 **Interview term: knowledge vs behaviour** — the single most useful distinction in this decision. Knowledge is *what* the model should say (facts, documents, numbers); behaviour is *how* it says it (format, tone, which task it is doing, how concise). Retrieval is the tool for the first; fine-tuning for the second.

📌 **Interview term: eval (evaluation set)** — a fixed set of realistic inputs with a way to score outputs, run against every option. Without it this whole decision is guesswork. See [What are evals and why does every LLM feature need them?](/interview-question/what-are-evals-and-why-does-every-llm-feature-need-them)

## 5. What Changed in 2025-26

Three shifts change the defaults compared with a couple of years ago.

**Long context plus prompt caching made "just put it in the prompt" a real option.** If your whole knowledge base is a few hundred pages and changes rarely, you can send it in every request and let the provider cache that prefix, paying a reduced rate for cached reads. That skips the retrieval pipeline entirely. It stops working when the corpus outgrows the window, when it needs per-user filtering, or when per-request cost and latency at volume dominate. See [context windows in 2025-26](/interview-question/context-windows-in-2025-26-how-do-you-use-128k-1m-tokens-without-drowning) and [prompt caching](/interview-question/prompt-caching-in-2025-how-do-you-cut-cost-with-anthropic-openai-caches).

📌 **Interview term: prompt caching** — the provider stores the processed form of a repeated prompt prefix, so later requests with the same prefix are cheaper and faster. Discounts and rules differ by provider; the cost model below uses an assumed 90% discount only for illustration.

**Fine-tuning availability became a provider decision.** OpenAI's own fine-tuning guide states (seen October 2026) that it is winding down its fine-tuning platform, that it is no longer accessible to new users, and that existing fine-tuned models remain available for inference until their base models are deprecated. Third-party write-ups give specific cut-off dates for new training jobs; treat those as unconfirmed until you read OpenAI's deprecation page. Cloud platforms still document supervised tuning for selected models (Google Vertex AI for some Gemini models, Amazon Bedrock for a list that includes Amazon Nova and Llama models, per their docs as seen in October 2026 search results); those lists change often. With an **open-weight model** and LoRA, you control the whole process yourself ([open-weight vs API models](/interview-question/how-do-you-choose-between-open-weight-models-and-proprietary-api-models)).

**Fine-tuning moved toward behaviour and reasoning, not knowledge.** Preference tuning and RL on checkable rewards are how models learn behaviours ([RLHF and DPO](/interview-question/what-are-rlhf-and-dpo-and-how-do-they-turn-a-base-model-into-an-assistant)). Research has also made the knowledge case weaker: Ovadia et al., "Fine-Tuning or Retrieval? Comparing Knowledge Injection in LLMs" (EMNLP 2024) found retrieval outperformed unsupervised fine-tuning for both previously seen and new knowledge, and Gekhman et al. (EMNLP 2024) found that once a model learns fine-tuning examples containing new facts, its tendency to hallucinate rises.

## 6. Freshness: What Happens When a Fact Changes

The example **"Prompt vs RAG vs fine-tune: freshness when a fact changes, monthly cost and break-even, and a decision table"** first simulates a refund policy changing from 30 to 14 days on day 10, and asks each system "what is the refund window?" every day for 35 days. The prompt is edited by hand a week late (day 17), the RAG index is rebuilt nightly, and the fine-tune was trained on day 0 and retrained on day 30.

~~~text
days 0-34 answering 'what is the refund window?':
  prompt (edited by hand on day 17)    wrong on  7 of 35 days
  RAG (re-indexed nightly)             wrong on  1 of 35 days
  fine-tune (retrained day 0, 30)      wrong on 20 of 35 days
~~~

The fine-tuned model was confidently wrong for 20 days, and nothing in its output signals that. The RAG system was wrong for one day, and it could have shown the user which document it used. The simulation stands for a document store and a scheduled re-index job; it leaves out retrieval failures, which are RAG's main risk ([common RAG failure modes](/interview-question/what-are-common-rag-failure-modes-and-how-do-you-debug-them)).

## 7. Cost: Do the Arithmetic

📌 **Interview term: break-even volume** — the request volume at which an option with a high fixed cost and low per-request cost (a fine-tuned small model) becomes cheaper than one with no fixed cost and a high per-request cost (a long prompt on a big model). Below it, the fixed cost dominates; above it, the per-request cost does.

**All prices are assumptions** for the arithmetic, not any vendor's price list: big model $3 per million input tokens and $15 per million output; small model $0.40 and $1.60; cached prompt reads at 10% of the input price; vector database $300 a month; a monthly retrain-plus-eval of $2,000. Every request outputs 300 tokens. The prompt-only design sends 6,000 tokens of instructions and examples; RAG sends 1,500 plus 2,000 retrieved; the tuned model needs only a 300-token prompt because the behaviour is in its weights.

~~~text
monthly cost by requests/month: 10,000 / 100,000 / 1,000,000 / 3,000,000
  prompt only, big model   per request $0.02250 |     $225   $2,250  $22,500  $67,500
  prompt only + cache      per request $0.00711 |      $71     $711   $7,110  $21,330
  RAG, big model           per request $0.01500 |     $450   $1,800  $15,300  $45,300
  fine-tuned small model   per request $0.00060 |   $2,006   $2,060   $2,600   $3,800
  fine-tuned small + RAG   per request $0.00140 |   $2,314   $2,440   $3,700   $6,500
fine-tuned small model beats "prompt only, big model" above 91,325 requests/month (if quality is equal)
fine-tuned small model beats "prompt only + cache" above 307,220 requests/month (if quality is equal)
~~~

How to read it in an interview:

- **At low volume the prompt wins easily.** At 10,000 requests a month the prompt costs $225 and the tuned model's fixed cost alone is $2,000.
- **Caching moves the break-even by more than 3x** (from about 91k to about 307k requests a month). If you compare against an uncached prompt, you will fine-tune too early.
- **At 3M requests a month the gap is large** ($21,330 cached prompt vs $3,800 tuned small model), which is exactly the case where fine-tuning a smaller model pays, *if* the eval says its quality is equal. That "if" is the expensive part to prove.
- The break-even formula is just fixed cost difference ÷ per-request cost difference: 2,000 ÷ (0.02250 − 0.00060) ≈ 91,325.

The broader cost toolkit is in [How do you estimate and control LLM costs in production?](/interview-question/how-do-you-estimate-and-control-llm-costs-in-production)

## 8. Turning Requirements Into Levers

The same program encodes the decision path as rules and runs it on six realistic scenarios:

~~~text
decision table:
  support bot over our help center           -> prompt engineering + RAG
  write release notes in house style         -> prompt engineering only
  same, but prompt fails the style eval      -> prompt engineering + fine-tune (LoRA)
  classify 5M tickets/month into 40 labels   -> prompt engineering + fine-tune (LoRA) + smaller model
  contract Q&A with clause citations         -> prompt engineering + RAG + fine-tune (LoRA)
  one-off internal summarizer                -> prompt engineering only
~~~

The rules are deliberately simple: changing or private facts and citations add RAG; a style requirement adds fine-tuning only once the prompt has **failed an eval**; a narrow high-volume task with at least 1,000 labelled examples adds a fine-tuned smaller model. Prompt engineering is in every answer, because a fine-tuned or RAG system still has a prompt.

~~~js
if (req.privateOrChangingFacts) levers.push("RAG");
if (req.strictFormatOrStyle && req.promptFailedEval) levers.push("fine-tune (LoRA)");
if (req.highVolume && req.narrowTask && req.labelledExamples >= 1000) { /* tuned smaller model */ }
~~~

📌 **Interview term: distillation** — training a smaller model on the outputs of a larger one so it copies the larger model's behaviour on one task. The "classify 5M tickets" row is the classic case: use the big prompted model to label data, then fine-tune a small one.

## 9. Combining Them

Most mature systems use all three:

- **RAG + prompt** is the default for anything knowledge-heavy: search supplies facts, the prompt supplies rules and format ([designing a production RAG pipeline](/interview-question/how-would-you-design-a-production-rag-pipeline-end-to-end-in-2025-26)).
- **RAG + fine-tuned model** when the answers need retrieved facts *and* a format or behaviour the base model will not hold, for example always citing clause numbers in a fixed structure. The tune teaches how to use retrieved context; it should not be expected to store the facts.
- **Fine-tuned small model behind a router**, with a big prompted model as fallback for inputs the small one is unsure about.

## 10. Verified: Running the Code

\`node main.js\` and \`python3.12 main.py\` both print exactly this (the two outputs were diffed and are identical):

~~~text
days 0-34 answering 'what is the refund window?':
  prompt (edited by hand on day 17)    wrong on  7 of 35 days
  RAG (re-indexed nightly)             wrong on  1 of 35 days
  fine-tune (retrained day 0, 30)      wrong on 20 of 35 days
monthly cost by requests/month: 10,000 / 100,000 / 1,000,000 / 3,000,000
  prompt only, big model   per request $0.02250 |     $225   $2,250  $22,500  $67,500
  prompt only + cache      per request $0.00711 |      $71     $711   $7,110  $21,330
  RAG, big model           per request $0.01500 |     $450   $1,800  $15,300  $45,300
  fine-tuned small model   per request $0.00060 |   $2,006   $2,060   $2,600   $3,800
  fine-tuned small + RAG   per request $0.00140 |   $2,314   $2,440   $3,700   $6,500
fine-tuned small model beats "prompt only, big model" above 91,325 requests/month (if quality is equal)
fine-tuned small model beats "prompt only + cache" above 307,220 requests/month (if quality is equal)
decision table:
  support bot over our help center           -> prompt engineering + RAG
  write release notes in house style         -> prompt engineering only
  same, but prompt fails the style eval      -> prompt engineering + fine-tune (LoRA)
  classify 5M tickets/month into 40 labels   -> prompt engineering + fine-tune (LoRA) + smaller model
  contract Q&A with clause citations         -> prompt engineering + RAG + fine-tune (LoRA)
  one-off internal summarizer                -> prompt engineering only
~~~

What the run proves rather than asserts:

- When a fact changes, a fine-tuned model is wrong until it is retrained, while RAG is wrong only until the next re-index.
- With the stated assumptions, the tuned small model beats a long prompt above about 91k requests a month, and prompt caching moves that to about 307k.
- Combining levers is the normal outcome once requirements are written down.

What it leaves out: answer quality (the cost table assumes it equal, which is precisely what an eval must establish), retrieval errors, engineering time, and real provider prices, which change and should be looked up on the day you decide.

## Edge Cases Worth Knowing

- **Tiny, static knowledge.** A 20-page policy document that changes twice a year can live in a cached system prompt; building a RAG pipeline for it is over-engineering.
- **Strict data rules.** If a user can ask for their data to be deleted, knowledge baked into weights is a problem; retrieval lets you delete one document.
- **Latency budgets.** RAG adds a search step and longer prompts; a tuned small model can be the only way to hit a tight latency target ([latency techniques](/interview-question/what-techniques-reduce-llm-latency-at-each-stage-of-a-request)).
- **Base-model upgrades.** Prompts and RAG usually carry over to a new model with re-testing; a fine-tune must be redone and re-evaluated.

## Common Pitfalls

- **Fine-tuning to add knowledge.** Stale, uncitable, hard to delete, and research links it to more hallucination. Retrieval first.
- **Comparing against a weak prompt baseline.** A fine-tune always beats a lazy prompt. Compare against the best prompt with few-shot examples you can write.
- **Ignoring caching in the cost model.** It shifted the break-even volume by more than 3x in the arithmetic above.
- **Choosing before measuring.** Without a golden eval set ([how to build one](/interview-question/how-do-you-build-a-golden-dataset-for-evaluating-an-llm-feature)), the decision is opinion.
- **Building on a provider feature without an exit plan.** Fine-tuning offerings change; keep the training data and evals as portable assets and a prompt-plus-RAG fallback working.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Diagnose first:</strong> <span style="color:#f0e2c8;">I ask what is actually failing. Missing or changing <strong style="color:#ffca28;">knowledge</strong> is a retrieval problem. Wrong <strong style="color:#ffca28;">behaviour</strong> that a good prompt cannot fix, like a strict format or a narrow task, is a fine-tuning problem. <strong style="color:#ffca28;">Cost or latency</strong> at high volume can justify fine-tuning a smaller model.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Order of moves:</strong> <span style="color:#f0e2c8;">Prompt engineering with an eval comes first because it is cheapest and fastest to change. Then RAG for knowledge. Then LoRA fine-tuning for behaviour. Real systems usually <strong style="color:#ffca28;">combine</strong> them: RAG for facts, a tuned model for format.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Freshness:</strong> <span style="color:#f0e2c8;">RAG updates when the document changes and can cite and enforce access. Fine-tuned knowledge is a snapshot. In my simulation, when a policy changed on day 10, nightly-indexed RAG was wrong for 1 day and a monthly-retrained fine-tune for 20 of 35 days.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">I do the arithmetic: tokens per request times volume times price, plus fixed costs. With assumed prices a tuned small model beat a 6,000-token prompt above about 91k requests a month, but prompt caching pushed that break-even to about 307k. The levers interact, so I compute it rather than guess.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. 2025-26 context:</strong> <span style="color:#f0e2c8;">Long context and caching make putting a small, static corpus in the prompt viable. Fine-tuning availability is a provider decision: OpenAI's docs say its self-serve fine-tuning platform is winding down, while open-weight models with LoRA stay under our control. Whatever I pick is judged by the same eval.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">With 1M-token context windows, do we still need RAG?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a small, stable corpus, often not: put it in the prompt and cache it. RAG still wins when the corpus is larger than the window, changes often, needs per-user permissions, or when cost and latency per call matter, because sending a million tokens every call is slow and expensive even when cached. And answer quality on very long prompts needs its own eval rather than being assumed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is fine-tuning clearly the right answer?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A narrow, high-volume task with plenty of labelled examples, such as classifying millions of tickets, where a small tuned model matches a big prompted one at a fraction of the cost. Or a format or style the big model keeps breaking despite a good prompt and examples, proven by an eval.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can we fine-tune on our docs and skip retrieval?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">I would not. Fine-tuning teaches style more reliably than facts, cannot cite, goes stale until retrained, and cannot forget one document on request. Research comparing the two, such as Ovadia et al. (EMNLP 2024), found retrieval beat fine-tuning for injecting knowledge.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you do if the provider stops offering fine-tuning?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That is a real 2026 risk. I keep the training data and evals as the durable asset, prefer methods that are portable (LoRA on an open-weight model I can host), and make sure the prompt plus RAG baseline still works as a fallback. Existing tuned models typically keep serving for some time, but I read the provider's deprecation terms.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make the comparison fair?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One golden eval set from real traffic, the same metrics for every option, and cost and latency measured at expected volume. The prompt baseline must be a genuinely good prompt with examples, otherwise the fine-tune looks better than it is.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Prompt engineering | Improving output by changing only the input |
| RAG | Retrieve relevant passages at request time and put them in the prompt |
| Fine-tuning | Further training so behaviour is stored in the weights, usually with LoRA |
| Knowledge vs behaviour | What the model says vs how it says it; retrieval vs fine-tuning |
| Eval (evaluation set) | Fixed realistic inputs and scoring, run against every option |
| Prompt caching | Provider reuses a processed prompt prefix at a lower price |
| Break-even volume | Requests per month at which a fixed-cost option becomes cheaper |
| Distillation | Training a small model on a large model's outputs for one task |

**Conclusion:** Choose by diagnosing the failure. Missing or changing knowledge is a retrieval problem — or, in 2025-26, sometimes just a long cached prompt for a small static corpus. Behaviour that a genuinely good prompt cannot fix is a fine-tuning problem, and so is cost at high volume, where a tuned small model can win once you pass the break-even point that you calculate rather than guess. Start with prompting and an eval, add RAG for facts, add LoRA for behaviour, and expect to combine them. Keep the training data and evals as the durable asset, because the models and the providers' fine-tuning offerings will keep changing underneath you.`,
    examples: [
      {
        label: `Prompt vs RAG vs fine-tune: freshness when a fact changes, monthly cost and break-even, and a decision table`,
        variants: [
          { tech: "node", code: `// Prompt vs RAG vs fine-tune, made concrete: (1) what happens when a fact changes,
// (2) monthly cost at different volumes, (3) a requirements -> lever decision table.
// All prices below are ASSUMPTIONS for the arithmetic, not any vendor price list.

// (1) Freshness. The refund window changes from 30 to 14 days on day 10.
const truth = (day) => (day < 10 ? 30 : 14);
const systems = {
  "prompt (edited by hand on day 17)": (day) => (day < 17 ? 30 : 14),
  "RAG (re-indexed nightly)": (day) => truth(day - 1), // sees yesterday's documents
  "fine-tune (retrained day 0, 30)": (day) => (day < 30 ? 30 : truth(30)),
};
console.log("days 0-34 answering 'what is the refund window?':");
for (const [name, answer] of Object.entries(systems)) {
  let stale = 0;
  for (let day = 0; day < 35; day++) if (answer(day) !== truth(day)) stale++;
  console.log(\`  \${name.padEnd(36)} wrong on \${String(stale).padStart(2)} of 35 days\`);
}

// (2) Monthly cost. Per request: input tokens, output tokens, price per 1M tokens; plus fixed costs.
const BIG = { in: 3.0, out: 15.0 }, SMALL = { in: 0.4, out: 1.6 }; // assumed $ per 1M tokens
const options = [
  { name: "prompt only, big model", price: BIG, inTok: 6000, outTok: 300, fixed: 0 },        // long instructions + 20 examples
  { name: "prompt only + cache", price: BIG, inTok: 300, cachedTok: 5700, outTok: 300, fixed: 0 }, // cached reads at 10% (assumed)
  { name: "RAG, big model", price: BIG, inTok: 1500 + 2000, outTok: 300, fixed: 300 },      // + 2k retrieved tokens, vector DB
  { name: "fine-tuned small model", price: SMALL, inTok: 300, outTok: 300, fixed: 2000 },  // retrain + eval each month
  { name: "fine-tuned small + RAG", price: SMALL, inTok: 2300, outTok: 300, fixed: 2300 },
];
const roundHalfAway = (v) => Math.sign(v) * Math.floor(Math.abs(v) + 0.5);
const usd = (v) => "$" + roundHalfAway(v).toLocaleString("en-US");
const perRequest = (o) => (o.inTok * o.price.in + (o.cachedTok || 0) * o.price.in * 0.1 + o.outTok * o.price.out) / 1e6;
const monthly = (o, n) => o.fixed + n * perRequest(o);
const volumes = [10000, 100000, 1000000, 3000000];
console.log("monthly cost by requests/month:", volumes.map((v) => v.toLocaleString("en-US")).join(" / "));
for (const o of options) {
  const cells = volumes.map((n) => usd(monthly(o, n)).padStart(8)).join(" ");
  console.log(\`  \${o.name.padEnd(24)} per request $\${perRequest(o).toFixed(5)} | \${cells}\`);
}
const [p, pc, , f] = options;
for (const base of [p, pc]) {
  const breakEven = (f.fixed - base.fixed) / (perRequest(base) - perRequest(f));
  console.log(\`fine-tuned small model beats "\${base.name}" above\`, Math.ceil(breakEven).toLocaleString("en-US"), "requests/month (if quality is equal)");
}

// (3) Decision rules: each requirement points at a lever; most real systems combine them.
function choose(req) {
  const levers = [];
  if (req.privateOrChangingFacts) levers.push("RAG");
  if (req.needsCitations && !levers.includes("RAG")) levers.push("RAG");
  if (req.strictFormatOrStyle && req.promptFailedEval) levers.push("fine-tune (LoRA)");
  if (req.highVolume && req.narrowTask && req.labelledExamples >= 1000) {
    if (!levers.includes("fine-tune (LoRA)")) levers.push("fine-tune (LoRA)");
    levers.push("smaller model");
  }
  if (!levers.length) levers.push("prompt engineering only");
  else levers.unshift("prompt engineering");
  return levers.join(" + ");
}
const scenarios = [
  ["support bot over our help center", { privateOrChangingFacts: true, needsCitations: true }],
  ["write release notes in house style", { strictFormatOrStyle: true, promptFailedEval: false }],
  ["same, but prompt fails the style eval", { strictFormatOrStyle: true, promptFailedEval: true, labelledExamples: 800 }],
  ["classify 5M tickets/month into 40 labels", { highVolume: true, narrowTask: true, labelledExamples: 20000 }],
  ["contract Q&A with clause citations", { privateOrChangingFacts: true, needsCitations: true, strictFormatOrStyle: true, promptFailedEval: true }],
  ["one-off internal summarizer", {}],
];
console.log("decision table:");
for (const [name, req] of scenarios) console.log(\`  \${name.padEnd(42)} -> \${choose(req)}\`);` },
          { tech: "python", code: `# Prompt vs RAG vs fine-tune, made concrete: (1) what happens when a fact changes,
# (2) monthly cost at different volumes, (3) a requirements -> lever decision table.
# All prices below are ASSUMPTIONS for the arithmetic, not any vendor price list.
import math

# (1) Freshness. The refund window changes from 30 to 14 days on day 10.
def truth(day): return 30 if day < 10 else 14
systems = {
    "prompt (edited by hand on day 17)": lambda day: 30 if day < 17 else 14,
    "RAG (re-indexed nightly)": lambda day: truth(day - 1),  # sees yesterday's documents
    "fine-tune (retrained day 0, 30)": lambda day: 30 if day < 30 else truth(30),
}
print("days 0-34 answering 'what is the refund window?':")
for name, answer in systems.items():
    stale = sum(1 for day in range(35) if answer(day) != truth(day))
    print(f"  {name.ljust(36)} wrong on {str(stale).rjust(2)} of 35 days")

# (2) Monthly cost. Per request: input tokens, output tokens, price per 1M tokens; plus fixed costs.
BIG, SMALL = {"in": 3.0, "out": 15.0}, {"in": 0.4, "out": 1.6}  # assumed $ per 1M tokens
options = [
    {"name": "prompt only, big model", "price": BIG, "inTok": 6000, "outTok": 300, "fixed": 0},  # long instructions + 20 examples
    {"name": "prompt only + cache", "price": BIG, "inTok": 300, "cachedTok": 5700, "outTok": 300, "fixed": 0},  # cached reads at 10% (assumed)
    {"name": "RAG, big model", "price": BIG, "inTok": 1500 + 2000, "outTok": 300, "fixed": 300},  # + 2k retrieved tokens, vector DB
    {"name": "fine-tuned small model", "price": SMALL, "inTok": 300, "outTok": 300, "fixed": 2000},  # retrain + eval each month
    {"name": "fine-tuned small + RAG", "price": SMALL, "inTok": 2300, "outTok": 300, "fixed": 2300},
]
def sign(v): return (v > 0) - (v < 0)
def round_half_away(v): return sign(v) * math.floor(abs(v) + 0.5)
def usd(v): return "$" + f"{round_half_away(v):,}"
def per_request(o): return (o["inTok"] * o["price"]["in"] + o.get("cachedTok", 0) * o["price"]["in"] * 0.1 + o["outTok"] * o["price"]["out"]) / 1e6
def monthly(o, n): return o["fixed"] + n * per_request(o)
volumes = [10000, 100000, 1000000, 3000000]
print("monthly cost by requests/month:", " / ".join(f"{v:,}" for v in volumes))
for o in options:
    cells = " ".join(usd(monthly(o, n)).rjust(8) for n in volumes)
    print(f"  {o['name'].ljust(24)} per request \${per_request(o):.5f} | {cells}")
p, pc, _, f, _ = options
for base in [p, pc]:
    break_even = (f["fixed"] - base["fixed"]) / (per_request(base) - per_request(f))
    print(f'fine-tuned small model beats "{base["name"]}" above', f"{math.ceil(break_even):,}", "requests/month (if quality is equal)")

# (3) Decision rules: each requirement points at a lever; most real systems combine them.
def choose(req):
    levers = []
    if req.get("privateOrChangingFacts"):
        levers.append("RAG")
    if req.get("needsCitations") and "RAG" not in levers:
        levers.append("RAG")
    if req.get("strictFormatOrStyle") and req.get("promptFailedEval"):
        levers.append("fine-tune (LoRA)")
    if req.get("highVolume") and req.get("narrowTask") and req.get("labelledExamples", 0) >= 1000:
        if "fine-tune (LoRA)" not in levers:
            levers.append("fine-tune (LoRA)")
        levers.append("smaller model")
    if not levers:
        levers.append("prompt engineering only")
    else:
        levers.insert(0, "prompt engineering")
    return " + ".join(levers)
scenarios = [
    ["support bot over our help center", {"privateOrChangingFacts": True, "needsCitations": True}],
    ["write release notes in house style", {"strictFormatOrStyle": True, "promptFailedEval": False}],
    ["same, but prompt fails the style eval", {"strictFormatOrStyle": True, "promptFailedEval": True, "labelledExamples": 800}],
    ["classify 5M tickets/month into 40 labels", {"highVolume": True, "narrowTask": True, "labelledExamples": 20000}],
    ["contract Q&A with clause citations", {"privateOrChangingFacts": True, "needsCitations": True, "strictFormatOrStyle": True, "promptFailedEval": True}],
    ["one-off internal summarizer", {}],
]
print("decision table:")
for name, req in scenarios:
    print(f"  {name.ljust(42)} -> {choose(req)}")` },
        ],
      },
    ],
  },
  {
    title: `What are hallucinations and what causes them?`,
    difficulty: "easy",
    seoDescription: `A hallucination is fluent, confident LLM output that is false or unsupported, caused by next-token training, rare facts and grading that rewards guessing.`,
    description: `**Question presented to candidate:**
"What do people mean when they say an LLM hallucinated, and why does it happen? Give me the actual causes, not just 'the model makes things up'."

**What a strong answer should cover:**
- Definition: fluent, confident output that is false or not supported by the given sources; the difference between factual errors (against the world) and faithfulness errors (against the provided context)
- The root cause: the model is trained to produce likely continuations, not verified facts, and it produces a fluent answer whether or not the fact was well represented in training; rare facts (seen once or never) are the most likely to be wrong
- Incentives: accuracy-only benchmarks and graders give guessing a higher expected score than saying "I don't know" (the argument of OpenAI's 2025 paper "Why Language Models Hallucinate")
- Other contributors: knowledge cutoff, false premises in the question, sycophancy from preference tuning, sampling randomness, errors compounding over long generations, bad or missing retrieved context, fine-tuning on facts the model did not know
- High-risk outputs: citations, URLs, IDs, numbers, package and API names; and the basic defences: grounding in retrieved sources, verification checks, allowing abstention

**Code / implementation expected:** Optional — a toy showing a confident answer for an unseen fact, the expected-score argument for abstaining, and a simple grounding check.`,
    answer: `**Target Audience:** Anyone new to building with LLMs who has seen a model state something false with total confidence and wants to understand why, in plain terms.
**Difficulty:** Easy
**Verified with:** Node 22.22.0 and Python 3.12.3 (a counting toy, an expected-score calculation and a string-matching grounding check; no model is called). Paper and case facts are cited inline with the date they were checked (October 2026).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Think of a quiz contestant who has never once said "pass". Ask them the capital of Australia and they say "Canberra". Ask them the birth year of someone they have never heard of and they say "1912" in exactly the same confident voice. They are not lying; they have simply learned that on this show, a guess sometimes scores and silence never does.

An LLM is that contestant. It produces fluent, confident text whether or not it actually knows the answer, and the text itself carries no signal about which case you are in. Engineers need to understand *why*, because the fix depends on the cause, and because the damage is real: in Mata v. Avianca (U.S. District Court, S.D.N.Y., June 2023), two lawyers and their firm were ordered to pay a $5,000 penalty after filing a brief citing court cases that ChatGPT had invented (as reported by LawSites and Bloomberg Government).

## 2. What a Hallucination Is

📌 **Interview term: hallucination** — model output that is fluent and confident but false, or not supported by the information the model was given. "Confident" matters: an answer that says "I am not sure, but possibly..." and is wrong is less dangerous than one that states the wrong thing flatly.

It helps to split the term in two, because the fixes differ:

📌 **Interview term: factuality error** — the output contradicts the real world ("Alan Turing was born in 1922"). The model's stored knowledge, or its use of it, was wrong.

📌 **Interview term: faithfulness error** — the output is not supported by, or contradicts, the context the model was given ("the document says refunds take 14 days" when it says 30, or adds a detail the document never mentions). This is the main failure of RAG systems.

| | Factuality error | Faithfulness error |
| :--- | :--- | :--- |
| Checked against | The world | The provided sources |
| Typical setting | Closed-book questions | RAG, summarisation, document Q&A |
| Main fix | Give it the facts (retrieval), let it abstain | Grounding checks, citations, better retrieval |

## 3. The Root Cause: Plausible, Not True

A language model is trained to predict the next token: to make text that looks like its training data ([how an LLM generates text](/interview-question/what-is-a-large-language-model-and-how-does-it-generate-text)). Nothing in that objective checks facts. When it has seen a fact many times, the most likely continuation *is* the fact. When it has seen a fact once, or never, the most likely continuation is something that **looks like** the right kind of answer.

<svg class="iq-diagram" width="100%" viewBox="0 0 800 280" role="img" aria-label="The same question leads to a recalled fact when the fact was seen often in training, and to a plausible guess when it was seen once or never">
  <defs>
    <marker id="ai04q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="100" width="170" height="80" rx="10"/>
  <text class="d-text" x="105" y="134" text-anchor="middle">question</text>
  <text class="d-sub" x="105" y="160" text-anchor="middle">X was born in</text>
  <rect class="d-box" x="260" y="100" width="190" height="80" rx="10"/>
  <text class="d-text" x="355" y="134" text-anchor="middle">model</text>
  <text class="d-sub" x="355" y="160" text-anchor="middle">most likely year</text>
  <rect class="d-box" x="540" y="20" width="240" height="80" rx="10"/>
  <text class="d-text" x="660" y="54" text-anchor="middle">fact seen often</text>
  <text class="d-sub" x="660" y="80" text-anchor="middle">recalled, correct</text>
  <rect class="d-box-accent" x="540" y="180" width="240" height="80" rx="10"/>
  <text class="d-text" x="660" y="214" text-anchor="middle">seen once or never</text>
  <text class="d-sub" x="660" y="240" text-anchor="middle">plausible guess</text>
  <path class="d-edge" d="M 194 140 L 254 140" marker-end="url(#ai04q5-arrow)"/>
  <path class="d-edge" d="M 454 125 L 534 65" marker-end="url(#ai04q5-arrow)"/>
  <path class="d-edge-accent" d="M 454 155 L 534 215" marker-end="url(#ai04q5-arrow)"/>
</svg>

Both branches produce the same kind of sentence in the same confident tone. Only the probabilities underneath differ, and the user never sees them.

The example's first experiment shows this with a counting model. It "trained" on birth years: Alan Turing ten times, Ada Lovelace ten times, an invented person "Dana Ruiz" once, and a second invented person "Zelda Quimby" never. Because a real model cannot store every fact exactly, the toy blends what it saw about each person with what birth years look like in general (a smoothing constant K = 5 stands in for limited capacity). Then it completes \`<person> was born in\`:

~~~text
(1) prompt: '<person> was born in'
  Alan Turing      seen 10x -> "Alan Turing was born in 1912." p=0.78 correct
  Ada Lovelace     seen 10x -> "Ada Lovelace was born in 1815." p=0.70 correct
  Dana Ruiz        seen  1x -> "Dana Ruiz was born in 1912." p=0.29 WRONG, truth 1958
  Zelda Quimby     seen  0x -> "Zelda Quimby was born in 1912." p=0.34 no answer in training: fabricated
~~~

The two last lines are hallucinations, and they read exactly like the first two. The singleton fact was overwhelmed by the general pattern, and the unknown person got the most "typical" year. The probability (0.29, 0.34) is lower, but it never appears in the generated sentence.

📌 **Interview term: singleton facts** — facts that appear only once in the training data. OpenAI's 2025 paper (Kalai, Nachum, Vempala and Zhang, "Why Language Models Hallucinate", arXiv 2509.04664) argues that errors on such rarely-seen, arbitrary facts are a statistical consequence of training, and that for a calibrated base model the fraction of such facts seen only once gives a rough lower bound on how often it will be wrong about them (the bound as described in the paper and in summaries of it; it covers arbitrary facts like birthdays, not patterns the model can learn).

📌 **Interview term: knowledge cutoff** — the date after which the training data stops. Anything later is unknown to the model, and it will answer about it from patterns, not facts, unless you give it the information.

## 4. The Incentive Problem: Guessing Scores Better

The same paper's second argument is about incentives. Most benchmarks and many graders score an answer as right (1) or wrong (0), and "I don't know" also scores 0. Under that rule a guess can only help, so training and model selection that chase those scores push models toward guessing.

📌 **Interview term: abstention** — the model declining to answer ("I don't know", "the documents do not say"). A calibrated model should abstain when its chance of being right is low.

📌 **Interview term: calibration** — how well a model's confidence matches its actual accuracy. A calibrated model that says it is 70% sure is right about 70% of the time.

The example computes expected scores on 20 questions where the model's chance of being right ranges from 0.95 down to 0.05:

~~~text
(2) expected results on 20 questions
  grading: accuracy only (wrong = 0)
    always guess            score= 10.35 expected wrong answers= 9.65 abstained= 0
    abstain when p < 0.5    score=  7.80 expected wrong answers= 2.20 abstained=10
  grading: wrong = -1, abstain = 0
    always guess            score=  0.70 expected wrong answers= 9.65 abstained= 0
    abstain when p < 0.5    score=  5.60 expected wrong answers= 2.20 abstained=10
~~~

Under accuracy-only grading the always-guessing model wins (10.35 vs 7.80) while making more than four times as many wrong answers (9.65 vs 2.20). Make a wrong answer cost a point and the ranking flips (0.70 vs 5.60). The paper's proposal follows directly: change mainstream evaluations so that confident errors are penalised more than abstentions. Your own product evals should do the same ([what are evals](/interview-question/what-are-evals-and-why-does-every-llm-feature-need-them)).

## 5. Other Causes Worth Naming

- **False premises.** "Why did Einstein win two Nobel prizes?" invites the model to explain a fact that is not true. Models trained to be helpful tend to go along with the premise.
- **Sycophancy.** Preference tuning learns from human ratings, and raters tend to prefer answers that agree with them. Sharma et al. (ICLR 2024) found that both people and preference models sometimes preferred convincing sycophantic answers over correct ones ([RLHF and DPO](/interview-question/what-are-rlhf-and-dpo-and-how-do-they-turn-a-base-model-into-an-assistant)).
- **Sampling randomness.** Higher temperature makes unlikely tokens more likely ([sampling parameters](/interview-question/how-do-temperature-top-p-and-other-sampling-parameters-affect-output)). Temperature 0 does not fix hallucination, though: the single most likely continuation can still be wrong, as the toy shows.
- **Compounding.** Each token is generated from the ones before it, so an early wrong step in a long answer or calculation is built upon, not corrected.
- **Bad context.** In RAG, retrieval can return the wrong passage or nothing useful, and the model answers anyway ([RAG failure modes](/interview-question/what-are-common-rag-failure-modes-and-how-do-you-debug-them)). Very long contexts can also make it miss what is there ([context windows](/interview-question/what-is-a-context-window-and-what-happens-when-you-exceed-it)).
- **Fine-tuning on new facts.** Gekhman et al., "Does Fine-Tuning LLMs on New Knowledge Encourage Hallucinations?" (EMNLP 2024) found that once a model learns fine-tuning examples containing facts it did not already know, its tendency to hallucinate increases.

## 6. Where It Bites Hardest

The riskiest outputs are ones whose **format** is easy to learn but whose **content** must be exact:

| Output | Why it is risky |
| :--- | :--- |
| Citations, case law, paper titles | The pattern (authors, year, title) is easy to produce; the specific item may not exist |
| URLs, IDs, phone numbers | Look valid, often point nowhere |
| Numbers and dates | One wrong digit reads exactly like a right one |
| Package names and API calls in code | A non-existent package or method looks like a real one |
| Facts about people and small organisations | Few mentions in training, so close to singleton facts |

On package names: research on "package hallucination" has measured how often code models suggest packages that do not exist. A 2026 follow-up paper (arXiv 2605.17062) summarises the original study by Spracklen et al. as 576,000 generated code samples from 16 models, with hallucinated-package rates of at least 5.2% for commercial models and 21.7% for open-source ones. That is a secondary summary; read the original before quoting the numbers. The security risk is that an attacker can register a commonly hallucinated name and wait for someone to install it.

## 7. A First Line of Defence: Check Claims Against the Source

The full mitigation playbook is its own question: [How do you reduce hallucinations in a production LLM application?](/interview-question/how-do-you-reduce-hallucinations-in-a-production-llm-application). The basic idea fits in a few lines: if the answer must come from a source, check that what it claims is in the source.

The example's third part takes a retrieved policy passage and three generated sentences, and flags any number or capitalised name in the answer that does not appear in the source:

~~~text
(3) grounding check against the retrieved source
  supported   Refunds are accepted within 14 days of delivery.
  UNSUPPORTED Refunds are processed by Stripe within 5 business days.  [not in source: Stripe, 5]
  supported   You can contact Support through the Help Center.
~~~

The second sentence is a classic faithfulness error: plausible, specific, and nowhere in the source.

📌 **Interview term: grounding** — tying every claim in an answer to provided evidence, and checking that link. Production systems do this with citation requirements and with a second model or an entailment check, not just string matching.

~~~js
const claims = (s) => s.match(/\\b(\\d+|[A-Z][a-z]+)\\b/g).filter((w, i) => i > 0 || /\\d/.test(w));
const missing = claims(sentence).filter((c) => !source.includes(c)); // any unsupported claim flags the sentence
~~~

String matching is crude: it misses a wrong claim made of words that do appear in the source ("refunds are accepted within 30 days" when the source says 14 days and mentions 30 elsewhere), and it flags harmless paraphrases. It shows the shape of the check, not a production-grade one.

## 8. Verified: Running the Code

The example **"Why models hallucinate: an unseen fact answered confidently, guessing vs abstaining under two grading rules, and a grounding check"** runs all three parts. \`node main.js\` and \`python3.12 main.py\` both print exactly this (the two outputs were diffed and are identical):

~~~text
(1) prompt: '<person> was born in'
  Alan Turing      seen 10x -> "Alan Turing was born in 1912." p=0.78 correct
  Ada Lovelace     seen 10x -> "Ada Lovelace was born in 1815." p=0.70 correct
  Dana Ruiz        seen  1x -> "Dana Ruiz was born in 1912." p=0.29 WRONG, truth 1958
  Zelda Quimby     seen  0x -> "Zelda Quimby was born in 1912." p=0.34 no answer in training: fabricated
(2) expected results on 20 questions
  grading: accuracy only (wrong = 0)
    always guess            score= 10.35 expected wrong answers= 9.65 abstained= 0
    abstain when p < 0.5    score=  7.80 expected wrong answers= 2.20 abstained=10
  grading: wrong = -1, abstain = 0
    always guess            score=  0.70 expected wrong answers= 9.65 abstained= 0
    abstain when p < 0.5    score=  5.60 expected wrong answers= 2.20 abstained=10
(3) grounding check against the retrieved source
  supported   Refunds are accepted within 14 days of delivery.
  UNSUPPORTED Refunds are processed by Stripe within 5 business days.  [not in source: Stripe, 5]
  supported   You can contact Support through the Help Center.
~~~

What the run proves rather than asserts:

- A model that picks the most likely answer produces a fluent, specific, wrong answer for facts it saw once or never, with no change in the output text.
- Under accuracy-only grading, always guessing has a higher expected score than abstaining; a penalty for wrong answers reverses that.
- A simple grounding check catches an unsupported specific claim.

What it leaves out: a real model's knowledge is spread over billions of weights rather than a table, its probabilities are over tokens rather than whole answers, and real grounding checks are semantic, not string matches.

## Edge Cases Worth Knowing

- **Creative tasks.** In fiction or brainstorming, "making things up" is the job. Hallucination only matters where truth or faithfulness to a source is expected.
- **Correct but unsupported.** In a RAG system, an answer can be true in the world but absent from the documents. For many products that still counts as a faithfulness failure, because nobody can verify it from the sources.
- **Reasoning models.** Spending more tokens thinking can reduce some errors, but the reasoning text itself can contain made-up steps ([reasoning models](/interview-question/what-are-reasoning-models-and-when-should-you-use-them)).

## Common Pitfalls

- **Treating it as lying or a rare bug.** It is a direct result of how the model is trained and evaluated; design for it.
- **Believing confidence.** Tone tells you nothing. The singleton and unknown answers in the toy read exactly like the correct ones.
- **Assuming temperature 0 or a "do not make things up" instruction fixes it.** Both help a little at best; neither gives the model knowledge it lacks.
- **Assuming RAG eliminates it.** RAG converts many factuality errors into faithfulness risks that you then have to check.
- **Grading with accuracy only.** Your own evals should reward abstention over confident wrong answers, or you will select for guessing.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A hallucination is output that is fluent and confident but <strong style="color:#ffca28;">false</strong>, or <strong style="color:#ffca28;">not supported</strong> by the sources the model was given. The first is a factuality error, the second a faithfulness error.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Root cause:</strong> <span style="color:#f0e2c8;">The model is trained to produce the most likely continuation, not to look facts up. It writes a fluent answer whether or not it actually learned the fact, and the text carries no warning. Facts it saw rarely or never are the ones it gets wrong.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Incentives:</strong> <span style="color:#f0e2c8;">Training and evaluation reward guessing. OpenAI's paper <em style="color:#f0e2c8;">Why Language Models Hallucinate</em> (2025) argues that accuracy-only grading gives a guess a better expected score than <strong style="color:#ffca28;">I don't know</strong>. In my toy, always guessing scored 10.35 against 7.80 under accuracy-only grading, but lost 0.70 to 5.60 once wrong answers cost a point.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Other causes:</strong> <span style="color:#f0e2c8;">Knowledge cutoff, false premises in the question, sycophancy learned from human preferences, sampling randomness, early errors compounding, and bad or missing retrieved context. Fine-tuning on facts the model did not know can increase it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Where it bites:</strong> <span style="color:#f0e2c8;">Citations, URLs, IDs, numbers, package and API names. Defences are grounding in sources, checking claims against them, letting the model abstain, and measuring it with evals; a single prompt line does not fix it.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a hallucination a bug that the next model will fix?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It gets rarer but it does not vanish, because the cause is built into how the model works: it generates plausible text and has no separate fact store to check. Better training and abstention reduce it; systems still need grounding and verification for anything that matters.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does temperature 0 stop hallucinations?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Temperature 0 picks the single most likely token, and the most likely continuation can still be wrong; in my toy the unseen person got the most likely year with nothing to do with the truth. Lower temperature mainly reduces random variation between runs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does RAG not remove hallucinations completely?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The model can still ignore or misread the retrieved text, blend it with what it remembers, or retrieval can return the wrong passage. Those are faithfulness errors. RAG lowers the rate and makes answers checkable, which is why a grounding check against the sources is the next step.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is a real example of the damage?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">In Mata v. Avianca (S.D.N.Y., 2023), lawyers filed a brief citing cases that ChatGPT had invented, and the judge imposed a $5,000 penalty. In code, models suggest package names that do not exist, and attackers can register those names.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you measure hallucination in our product?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Build an eval set of real questions with known answers and source documents, score each answer for correctness and for whether every claim is supported by the provided sources, track the abstention rate alongside, and sample production traffic for review. Covered in the evals and reducing-hallucinations docs.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Hallucination | Fluent, confident output that is false or unsupported by the given sources |
| Factuality error | Output contradicts the real world |
| Faithfulness error | Output is not supported by, or contradicts, the provided context |
| Singleton facts | Facts seen only once in training; the most likely to be wrong |
| Knowledge cutoff | Date after which the model has no training data |
| Abstention | The model declining to answer when it does not know |
| Calibration | How well stated confidence matches actual accuracy |
| Grounding | Tying each claim to provided evidence and checking it |

**Conclusion:** A hallucination is a fluent, confident answer that is false or not supported by the sources the model was given. It happens because a language model produces the most plausible continuation rather than a verified fact, so facts it saw rarely or never come out as confident guesses that read exactly like real answers; and because accuracy-only training and evaluation reward a guess over "I don't know". False premises, sycophancy, sampling, compounding errors, bad retrieved context and fine-tuning on new facts add to it. Know which kind you are facing — factuality or faithfulness — expect it most in citations, IDs, numbers and package names, and treat grounding, verification and permission to abstain as part of the system design.`,
    examples: [
      {
        label: `Why models hallucinate: an unseen fact answered confidently, guessing vs abstaining under two grading rules, and a grounding check`,
        variants: [
          { tech: "node", code: `// Why a next-token model hallucinates, in three small experiments:
// (1) it answers an unknown question with the same fluency as a known one,
// (2) accuracy-only grading rewards guessing over "I don't know",
// (3) a cheap grounding check catches claims the source does not support.

// (1) "Training data": birth years the model saw, and how often.
const training = [
  ["Ada Lovelace", 1815, 9], ["Ada Lovelace", 1816, 1],
  ["Alan Turing", 1912, 10],
  ["Grace Hopper", 1906, 7], ["Grace Hopper", 1907, 1],
  ["Dana Ruiz", 1958, 1], // an invented person, a "singleton": seen once in all of training
];
// A model has limited capacity, so it does not store each fact exactly: its belief for a
// person blends what it saw about them with what birth years look like in general (K = 5).
const K = 5;
const years = [...new Set(training.map((t) => t[1]))].sort((a, b) => a - b);
const all = training.reduce((s, t) => s + t[2], 0);
const prior = (y) => training.filter((t) => t[1] === y).reduce((s, t) => s + t[2], 0) / all;
function answer(person) {
  const seen = training.filter((t) => t[0] === person);
  const n = seen.reduce((s, t) => s + t[2], 0);
  let best = null;
  for (const y of years) {
    const c = seen.filter((t) => t[1] === y).reduce((s, t) => s + t[2], 0);
    const p = (c + K * prior(y)) / (n + K);
    if (!best || p > best.p) best = { year: y, p };
  }
  return { ...best, n };
}
console.log("(1) prompt: '<person> was born in'");
// Dana Ruiz and Zelda Quimby are invented names.
for (const person of ["Alan Turing", "Ada Lovelace", "Dana Ruiz", "Zelda Quimby"]) {
  const a = answer(person);
  const truth = training.filter((t) => t[0] === person).sort((x, y) => y[2] - x[2])[0];
  const verdict = !truth ? "no answer in training: fabricated" : truth[1] === a.year ? "correct" : \`WRONG, truth \${truth[1]}\`;
  console.log(\`  \${person.padEnd(16)} seen \${String(a.n).padStart(2)}x -> "\${person} was born in \${a.year}." p=\${a.p.toFixed(2)} \${verdict}\`);
}

// (2) 20 questions; the model's probability of being right on each.
const conf = [0.95, 0.9, 0.9, 0.85, 0.8, 0.8, 0.75, 0.7, 0.6, 0.55, 0.45, 0.4, 0.35, 0.3, 0.3, 0.25, 0.2, 0.15, 0.1, 0.05];
function expected(strategyThreshold, wrongPenalty) {
  let score = 0, wrong = 0, abstain = 0;
  for (const p of conf) {
    if (p < strategyThreshold) { abstain++; continue; } // says "I don't know": 0 points
    score += p * 1 - (1 - p) * wrongPenalty;
    wrong += 1 - p;
  }
  return \`score=\${score.toFixed(2).padStart(6)} expected wrong answers=\${wrong.toFixed(2).padStart(5)} abstained=\${String(abstain).padStart(2)}\`;
}
console.log("(2) expected results on 20 questions");
for (const [grading, penalty] of [["accuracy only (wrong = 0)", 0], ["wrong = -1, abstain = 0", 1]]) {
  console.log(\`  grading: \${grading}\`);
  console.log(\`    always guess            \${expected(0, penalty)}\`);
  console.log(\`    abstain when p < 0.5    \${expected(0.5, penalty)}\`);
}

// (3) Grounding check: every number and capitalised name in the answer must appear in the source.
const source = "Refunds are accepted within 14 days of delivery. Contact Support via the Help Center.";
const generated = [
  "Refunds are accepted within 14 days of delivery.",
  "Refunds are processed by Stripe within 5 business days.",
  "You can contact Support through the Help Center.",
];
const claims = (s) => s.match(/\\b(\\d+|[A-Z][a-z]+)\\b/g).filter((w, i) => i > 0 || /\\d/.test(w)); // skip sentence-initial word
console.log("(3) grounding check against the retrieved source");
for (const sentence of generated) {
  const missing = claims(sentence).filter((c) => !source.includes(c));
  console.log(\`  \${missing.length ? "UNSUPPORTED" : "supported  "} \${sentence}\${missing.length ? "  [not in source: " + missing.join(", ") + "]" : ""}\`);
}` },
          { tech: "python", code: `# Why a next-token model hallucinates, in three small experiments:
# (1) it answers an unknown question with the same fluency as a known one,
# (2) accuracy-only grading rewards guessing over "I don't know",
# (3) a cheap grounding check catches claims the source does not support.
import re

# (1) "Training data": birth years the model saw, and how often.
training = [
    ["Ada Lovelace", 1815, 9], ["Ada Lovelace", 1816, 1],
    ["Alan Turing", 1912, 10],
    ["Grace Hopper", 1906, 7], ["Grace Hopper", 1907, 1],
    ["Dana Ruiz", 1958, 1],  # an invented person, a "singleton": seen once in all of training
]
# A model has limited capacity, so it does not store each fact exactly: its belief for a
# person blends what it saw about them with what birth years look like in general (K = 5).
K = 5
years = sorted(set(t[1] for t in training))
total_all = sum(t[2] for t in training)
def prior(y): return sum(t[2] for t in training if t[1] == y) / total_all
def answer(person):
    seen = [t for t in training if t[0] == person]
    n = sum(t[2] for t in seen)
    best = None
    for y in years:
        c = sum(t[2] for t in seen if t[1] == y)
        p = (c + K * prior(y)) / (n + K)
        if best is None or p > best["p"]:
            best = {"year": y, "p": p}
    return {**best, "n": n}
print("(1) prompt: '<person> was born in'")
# Dana Ruiz and Zelda Quimby are invented names.
for person in ["Alan Turing", "Ada Lovelace", "Dana Ruiz", "Zelda Quimby"]:
    a = answer(person)
    rows = sorted([t for t in training if t[0] == person], key=lambda t: -t[2])
    truth = rows[0] if rows else None
    verdict = "no answer in training: fabricated" if not truth else "correct" if truth[1] == a["year"] else f"WRONG, truth {truth[1]}"
    print(f"  {person.ljust(16)} seen {str(a['n']).rjust(2)}x -> \\"{person} was born in {a['year']}.\\" p={a['p']:.2f} {verdict}")

# (2) 20 questions; the model's probability of being right on each.
conf = [0.95, 0.9, 0.9, 0.85, 0.8, 0.8, 0.75, 0.7, 0.6, 0.55, 0.45, 0.4, 0.35, 0.3, 0.3, 0.25, 0.2, 0.15, 0.1, 0.05]
def expected(strategy_threshold, wrong_penalty):
    score = wrong = 0
    abstain = 0
    for p in conf:
        if p < strategy_threshold:  # says "I don't know": 0 points
            abstain += 1
            continue
        score += p * 1 - (1 - p) * wrong_penalty
        wrong += 1 - p
    return f"score={f'{score:.2f}'.rjust(6)} expected wrong answers={f'{wrong:.2f}'.rjust(5)} abstained={str(abstain).rjust(2)}"
print("(2) expected results on 20 questions")
for grading, penalty in [["accuracy only (wrong = 0)", 0], ["wrong = -1, abstain = 0", 1]]:
    print(f"  grading: {grading}")
    print(f"    always guess            {expected(0, penalty)}")
    print(f"    abstain when p < 0.5    {expected(0.5, penalty)}")

# (3) Grounding check: every number and capitalised name in the answer must appear in the source.
source = "Refunds are accepted within 14 days of delivery. Contact Support via the Help Center."
generated = [
    "Refunds are accepted within 14 days of delivery.",
    "Refunds are processed by Stripe within 5 business days.",
    "You can contact Support through the Help Center.",
]
def claims(s):  # skip sentence-initial word
    words = re.findall(r"\\b(\\d+|[A-Z][a-z]+)\\b", s)
    return [w for i, w in enumerate(words) if i > 0 or re.search(r"\\d", w)]
print("(3) grounding check against the retrieved source")
for sentence in generated:
    missing = [c for c in claims(sentence) if c not in source]
    tail = "  [not in source: " + ", ".join(missing) + "]" if missing else ""
    print(f"  {'UNSUPPORTED' if missing else 'supported  '} {sentence}{tail}")` },
        ],
      },
    ],
  },
];

export default augments;
