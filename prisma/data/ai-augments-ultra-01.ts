/**
 * AI ENGINEERING ULTRA — batch 01: LLM fundamentals (what an LLM is, transformers
 * and attention, tokens, context windows, base vs instruction-tuned vs chat
 * models). Every example was run by scripts/verify-variant-examples.ts (node,
 * python); quoted output is that run's output.
 */
import type { AiUltraAugment } from "./ai-augments.types";

const augments: AiUltraAugment[] = [
  {
    title: `What is a Large Language Model and how does it generate text?`,
    difficulty: "easy",
    seoDescription: `An LLM is a transformer trained to predict the next token; it generates text by scoring every token, picking one, appending it and repeating.`,
    description: `**Question presented to candidate:**
"Explain to me, as if I were a new engineer on the team, what a large language model actually is. When I send it a prompt, what happens step by step until text comes back?"

**What a strong answer should cover:**
- An LLM is a neural network (almost always a decoder-only transformer) trained to predict the next token given all previous tokens; its knowledge lives in billions of learned weights, not in a database
- Generation is autoregressive: tokenize the prompt, run a forward pass, get logits over the whole vocabulary, turn them into probabilities with softmax, pick one token, append it, repeat until a stop token or a length limit
- The picking step is the decoding strategy: greedy, or sampling shaped by temperature and top-p; this is why the same prompt can give different answers
- Training stages: pretraining on a huge text corpus with a next-token (cross-entropy) loss, then post-training (instruction tuning, preference tuning) that turns a text continuer into an assistant
- Practical consequences: output tokens are produced one at a time (latency grows with output length), the model only sees what fits in its context window, and fluent output is not the same as correct output (hallucination)

**Code / implementation expected:** Optional — a toy next-token model and a generation loop are a strong way to show the mechanism; no real model call is needed.`,
    answer: `**Target Audience:** Beginners to AI engineering — you can write code and call an API, but you have never looked inside a language model.
**Difficulty:** Easy
**Verified with:** Node 22.22.0 and Python 3.12.3 (the toy model in the example; no real model is called). Product and paper facts are cited inline with the date they were checked (October 2026).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Think of the autocomplete on your phone keyboard. You type "see you" and it offers "tomorrow", "soon", "later". It has no idea what you are planning; it has simply seen a lot of messages and learned which word tends to come next.

A large language model is that same idea, scaled up until something surprising happens. Instead of looking at the last word or two, it looks at thousands (sometimes hundreds of thousands) of previous pieces of text. Instead of a small table of word pairs, it uses billions of learned numbers. Instead of training on your text messages, it trains on a large slice of the books, code and web pages people have written. Predicting the next piece of text *well* across all of that turns out to require modelling grammar, facts, styles of reasoning and the structure of code.

Why should an engineer care about the mechanism rather than just calling the API? Because almost every practical question in AI engineering falls out of it:

- **Cost and speed** are counted in tokens, and output is produced one token at a time.
- **Randomness** in answers comes from how the next token is picked.
- **Hallucinations** happen because the model is trained to produce *plausible* continuations, not to look facts up.
- **Context limits** exist because the model can only condition on a fixed amount of previous text.

## 2. The Core Idea: A Next-Token Predictor

An LLM takes a sequence of tokens and outputs, for **every** token in its vocabulary, how likely that token is to come next. That is all a single step does.

📌 **Interview term: token** — the unit of text a model reads and writes. Usually a word or a piece of a word, produced by a tokenizer. A full treatment is in [What are tokens and why do they matter for cost and limits?](/interview-question/what-are-tokens-and-why-do-they-matter-for-cost-and-limits)

📌 **Interview term: large language model (LLM)** — a neural network with a very large number of parameters, trained on a very large text corpus to predict the next token. "Large" refers to both: today that means billions of parameters and trillions of training tokens.

📌 **Interview term: parameters (weights)** — the learned numbers inside the network. They are fixed after training. The model's knowledge is spread across them; there is no separate table of facts to look up.

Under the hood, nearly every modern LLM is a **decoder-only transformer**: a stack of layers where each token can look at (attend to) the tokens before it. You do not need the details to use an LLM, but they are covered in [How does the transformer architecture and attention work?](/interview-question/how-does-the-transformer-architecture-and-attention-work). The transformer was introduced by Vaswani et al. in "Attention Is All You Need" (NeurIPS 2017, arXiv 1706.03762).

### From scores to probabilities

The last layer of the network produces one raw score per vocabulary entry.

📌 **Interview term: logits** — the raw, unnormalised scores the model outputs for each possible next token. Higher means more likely. They can be any real number.

📌 **Interview term: softmax** — the function that turns logits into a probability distribution: exponentiate each score, then divide by the sum so everything adds up to 1.

In the toy model in the example, the "logits" for what follows \`the\` are the log of how often each word followed \`the\` in its training text. Softmax turns them back into these probabilities:

~~~text
P(next | the)   T=1.0: bone=0.100 cat=0.300 dog=0.200 fish=0.100 mat=0.100 rug=0.200
~~~

A real model has a vocabulary of tens of thousands to a few hundred thousand tokens, and its logits come from the whole transformer rather than a count table, but the output has exactly this shape: one probability per token.

## 3. Generation Is a Loop

To produce a whole answer, the model is called again and again. Each call adds exactly one token.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Autoregressive loop: prompt tokens go into the transformer, which outputs a probability for every token; one token is chosen and appended to the input">
  <defs>
    <marker id="ai01q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="30" y="60" width="180" height="90" rx="10"/>
  <text class="d-text" x="120" y="98" text-anchor="middle">tokens so far</text>
  <text class="d-sub" x="120" y="124" text-anchor="middle">the dog ate the</text>
  <rect class="d-box-accent" x="290" y="50" width="190" height="110" rx="12"/>
  <text class="d-text" x="385" y="98" text-anchor="middle">transformer</text>
  <text class="d-sub" x="385" y="124" text-anchor="middle">one forward pass</text>
  <rect class="d-box" x="560" y="60" width="180" height="90" rx="10"/>
  <text class="d-text" x="650" y="98" text-anchor="middle">probabilities</text>
  <text class="d-sub" x="650" y="124" text-anchor="middle">cat 0.30, dog 0.20</text>
  <path class="d-edge" d="M 214 105 L 284 105" marker-end="url(#ai01q1-arrow)"/>
  <path class="d-edge" d="M 484 105 L 554 105" marker-end="url(#ai01q1-arrow)"/>
  <path class="d-edge-dashed" d="M 650 154 L 650 230 L 120 230 L 120 156" marker-end="url(#ai01q1-arrow)"/>
  <text class="d-accent" x="385" y="268" text-anchor="middle">pick one token, append, repeat</text>
</svg>

The chosen token becomes part of the input for the next step, which is why the model can "build on" what it has already written, and also why an early wrong token can derail the rest.

📌 **Interview term: autoregressive generation** — producing a sequence one element at a time, where each new element is predicted from all the previous ones, including the ones the model itself just produced.

📌 **Interview term: stop condition** — what ends the loop: the model emits a special end-of-sequence token, the output hits a stop sequence you configured, or it reaches the \`max_tokens\` limit you set.

Here is the greedy loop from the example, run on the prompt \`the dog\`. Each line is one full call to the model:

~~~text
greedy from 'the dog':
  step 1: context=[the dog] -> ate (p=0.500)
  step 2: context=[the dog ate] -> the (p=1.000)
  step 3: context=[the dog ate the] -> cat (p=0.300)
  step 4: context=[the dog ate the cat] -> sat (p=0.750)
  step 5: context=[the dog ate the cat sat] -> on (p=1.000)
  step 6: context=[the dog ate the cat sat on] -> the (p=0.750)
  step 7: context=[the dog ate the cat sat on the] -> cat (p=0.300)
  step 8: context=[the dog ate the cat sat on the cat] -> sat (p=0.750)
result: the dog ate the cat sat on the cat sat | log-prob of new tokens: -3.964
~~~

Two lessons hide in this output:

1. **Greedy decoding can loop.** Always taking the single most likely token led the toy model into "the cat sat on the cat sat". Real models are far better, but repetition under greedy decoding is a real, well-known failure mode.
2. **Every token has a probability.** The model can report how likely its own output was (the log-probability). Many APIs expose this as \`logprobs\`, which is useful for confidence scoring and classification.

The toy model only looks at the **last** token. A transformer looks at **all** previous tokens in its context window, which is why it can keep track of a topic across pages.

## 4. Picking the Token: Decoding Strategies

The model gives probabilities; something has to choose. That choice is not part of the network, it is a setting.

📌 **Interview term: decoding strategy** — the rule that turns a probability distribution into one chosen token. *Greedy* takes the most likely token. *Sampling* draws a token at random according to the probabilities.

📌 **Interview term: temperature** — a number that divides the logits before softmax. Below 1 it sharpens the distribution (more predictable); above 1 it flattens it (more varied). Temperature 0 is treated as greedy.

The example draws 1,000 next tokens after \`the\` at three temperatures, with a seeded random generator so the numbers are reproducible:

~~~text
T=0.5 1000 draws after 'the' -> bone:49 cat:462 dog:189 fish:50 mat:48 rug:202 | sentence: the rug .
T=1.0 1000 draws after 'the' -> bone:110 cat:288 dog:212 fish:90 mat:98 rug:202 | sentence: the rug .
T=2.0 1000 draws after 'the' -> bone:145 cat:216 dog:205 fish:120 mat:129 rug:185 | sentence: the rug .
~~~

At T=0.5 the favourite \`cat\` wins almost half the time (its probability rose from 0.300 to 0.450). At T=2.0 the rare words get picked much more often. The same model, the same prompt, a different setting. Top-p, top-k and the other knobs are covered in [How do temperature, top-p and other sampling parameters affect output?](/interview-question/how-do-temperature-top-p-and-other-sampling-parameters-affect-output)

## 5. Where the Probabilities Come From: Training

<svg class="iq-diagram" width="100%" viewBox="0 0 800 200" role="img" aria-label="Training pipeline: pretraining on raw text produces a base model; post-training on instructions and preferences produces an assistant model">
  <defs>
    <marker id="ai01q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="50" width="160" height="90" rx="10"/>
  <text class="d-text" x="100" y="88" text-anchor="middle">raw text</text>
  <text class="d-sub" x="100" y="114" text-anchor="middle">web, books, code</text>
  <rect class="d-box" x="230" y="50" width="160" height="90" rx="10"/>
  <text class="d-text" x="310" y="88" text-anchor="middle">pretraining</text>
  <text class="d-sub" x="310" y="114" text-anchor="middle">next-token loss</text>
  <rect class="d-box" x="440" y="50" width="160" height="90" rx="10"/>
  <text class="d-text" x="520" y="88" text-anchor="middle">post-training</text>
  <text class="d-sub" x="520" y="114" text-anchor="middle">SFT, preferences</text>
  <rect class="d-box-accent" x="650" y="50" width="130" height="90" rx="10"/>
  <text class="d-text" x="715" y="88" text-anchor="middle">assistant</text>
  <text class="d-sub" x="715" y="114" text-anchor="middle">chat model</text>
  <path class="d-edge" d="M 184 95 L 224 95" marker-end="url(#ai01q1-arrow2)"/>
  <path class="d-edge" d="M 394 95 L 434 95" marker-end="url(#ai01q1-arrow2)"/>
  <path class="d-edge" d="M 604 95 L 644 95" marker-end="url(#ai01q1-arrow2)"/>
</svg>

Pretraining produces most of the knowledge; post-training mostly changes the behaviour and format.

📌 **Interview term: pretraining** — the first and by far most expensive training stage: show the network huge amounts of text, ask it to predict each next token, and nudge every weight to make the right token more likely.

📌 **Interview term: cross-entropy loss** — the number training minimises: the negative log-probability the model gave to the token that actually came next. If the model said the true next token had probability 0.3, the loss for that position is about 1.2; a perfect prediction gives 0.

The toy model "trains" by counting, which is the exact maximum-likelihood answer for a model that only sees one previous word. A real LLM cannot count every possible context (there are far too many), so it learns a compressed function with gradient descent that generalises to text it has never seen.

📌 **Interview term: post-training** — everything after pretraining that turns a raw text continuer into a useful assistant: supervised fine-tuning on example conversations, then preference tuning such as RLHF or DPO. See [What is the difference between a base model, an instruction-tuned model and a chat model?](/interview-question/what-is-the-difference-between-a-base-model-an-instruction-tuned-model-and-a-cha) and [What are RLHF and DPO?](/interview-question/what-are-rlhf-and-dpo-and-how-do-they-turn-a-base-model-into-an-assistant)

## 6. What Happens When You Call an LLM API

Putting it together, one API request goes through these stages:

| Stage | What happens | What it means for you |
| :--- | :--- | :--- |
| Tokenize | Your messages are rendered into one string with a chat template and split into tokens | You pay for and are limited by tokens, not characters |
| Prefill | The whole prompt goes through the network in one parallel pass; the intermediate keys and values are kept in a **KV cache** | Long prompts add time before the first token |
| Decode | One forward pass per output token, each reusing the KV cache | Total time grows roughly linearly with output length |
| Sample | Each step picks a token with your temperature and top-p | Same prompt can give different output |
| Stop | End-of-sequence token, stop sequence or \`max_tokens\` | A cut-off answer usually means \`max_tokens\` was hit |
| Detokenize / stream | Tokens are turned back into text, often streamed as they are produced | See [How does streaming work in LLM APIs?](/interview-question/how-does-streaming-work-in-llm-apis-and-why-does-it-matter-for-ux) |

📌 **Interview term: prefill and decode** — the two phases of inference. Prefill processes all prompt tokens at once (fast per token, parallel). Decode produces output tokens one at a time (sequential). Time to first token is dominated by prefill; total time by decode.

📌 **Interview term: KV cache** — the stored attention keys and values for tokens already processed, so each decode step only computes the new token instead of re-reading the whole sequence. It is why the model does not get slower in a quadratic way with every token it writes, and it is what "prompt caching" features reuse across requests ([What is prompt caching?](/interview-question/what-is-prompt-caching-and-how-does-it-reduce-cost-and-latency)).

## 7. Verified: Running the Code

The example **"A toy next-token model: probabilities, temperature, greedy decoding and sampling"** is a word-level bigram model: it counts which word follows which in a 40-token corpus, uses the log-counts as logits, and generates with greedy decoding and with seeded sampling. It stands in for a real LLM in exactly one way (it outputs a probability for every next token, and generation is a loop around that); it leaves out everything that makes a real model good (long context, attention, learned weights). The key part of the loop:

~~~js
const dist = nextDistribution(out[out.length - 1], 1.0); // probabilities for every next token
let best = dist[0];
for (const d of dist) if (d[1] > best[1]) best = d;        // greedy: take the most likely
out.push(best[0]);                                          // append and go again
~~~

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
training tokens: 40 | vocabulary: 12
P(next | the)   T=1.0: bone=0.100 cat=0.300 dog=0.200 fish=0.100 mat=0.100 rug=0.200
P(next | the)   T=0.5: bone=0.050 cat=0.450 dog=0.200 fish=0.050 mat=0.050 rug=0.200
P(next | the)   T=2.0: bone=0.132 cat=0.229 dog=0.187 fish=0.132 mat=0.132 rug=0.187
greedy from 'the dog':
  step 1: context=[the dog] -> ate (p=0.500)
  step 2: context=[the dog ate] -> the (p=1.000)
  step 3: context=[the dog ate the] -> cat (p=0.300)
  step 4: context=[the dog ate the cat] -> sat (p=0.750)
  step 5: context=[the dog ate the cat sat] -> on (p=1.000)
  step 6: context=[the dog ate the cat sat on] -> the (p=0.750)
  step 7: context=[the dog ate the cat sat on the] -> cat (p=0.300)
  step 8: context=[the dog ate the cat sat on the cat] -> sat (p=0.750)
result: the dog ate the cat sat on the cat sat | log-prob of new tokens: -3.964
T=0.5 1000 draws after 'the' -> bone:49 cat:462 dog:189 fish:50 mat:48 rug:202 | sentence: the rug .
T=1.0 1000 draws after 'the' -> bone:110 cat:288 dog:212 fish:90 mat:98 rug:202 | sentence: the rug .
T=2.0 1000 draws after 'the' -> bone:145 cat:216 dog:205 fish:120 mat:129 rug:185 | sentence: the rug .
~~~

What the run proves rather than asserts:

- Temperature changes only the *distribution*, not the model: \`cat\` goes from 0.300 at T=1.0 to 0.450 at T=0.5 and 0.229 at T=2.0.
- Sampling frequencies follow the probabilities: 288 of 1,000 draws were \`cat\` at T=1.0, close to its 0.300 probability.
- Greedy decoding is deterministic and can get stuck in a loop.

## Edge Cases Worth Knowing

- **Temperature 0 is not a hard guarantee of identical output.** It makes the choice greedy, but batching and floating-point differences on the serving side can still change a near-tie between two tokens. Treat it as "very consistent", not "bit-for-bit reproducible", unless the provider documents otherwise.
- **The model does not "know" when it is wrong.** A high-probability token is a *plausible* continuation, not a verified fact. See [What are hallucinations and what causes them?](/interview-question/what-are-hallucinations-and-what-causes-them)
- **Knowledge has a cutoff.** The weights only contain what was in the training data up to some date; anything newer must be supplied in the prompt, for example by retrieval ([What is RAG?](/interview-question/what-is-rag-and-why-use-it-instead-of-fine-tuning-for-knowledge)).
- **Reasoning models still generate token by token.** They spend extra output tokens thinking before the answer; the mechanism is the same loop. See [What are reasoning models?](/interview-question/what-are-reasoning-models-and-when-should-you-use-them)

## Common Pitfalls

- **Describing the model as a database or search engine.** It stores no documents and looks nothing up unless your application gives it a tool or retrieved text. Say "it predicts tokens from learned weights".
- **Saying it predicts the next word.** It predicts the next *token*, which is often part of a word. The difference matters for cost, limits and odd behaviour with spelling or numbers.
- **Forgetting that output length drives latency.** Prefill is parallel, decode is sequential. Asking for a 2,000-token answer when 200 would do is the most common self-inflicted slowness.
- **Assuming the same prompt gives the same answer.** With sampling it will not; design tests and caches with that in mind.
- **Treating the system prompt as code the model executes.** It is just more tokens in the context that shift the probabilities. Strongly worded instructions make the desired behaviour more likely, not certain.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">A large language model is a neural network, almost always a decoder-only transformer, trained on a huge amount of text to do one thing: predict the <strong style="color:#ffca28;">next token</strong> given every token before it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. One step:</strong> <span style="color:#f0e2c8;">For a prompt, the model runs a forward pass and outputs a score, a <strong style="color:#ffca28;">logit</strong>, for every token in its vocabulary. Softmax turns those scores into a probability distribution.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The loop:</strong> <span style="color:#f0e2c8;">A decoding strategy picks one token, greedy or sampled with temperature and top-p, the token is appended and the model runs again. That is <strong style="color:#ffca28;">autoregressive</strong> generation, and it stops at a stop token or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_tokens</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. How it learned:</strong> <span style="color:#f0e2c8;">Pretraining minimises cross-entropy on next-token prediction over trillions of tokens; post-training (instruction tuning and preference tuning) turns that text continuer into an assistant.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Consequences:</strong> <span style="color:#f0e2c8;">Output arrives token by token, so latency grows with length; the model only sees its context window; and it optimises for <strong style="color:#ffca28;">plausible</strong> text, which is why it can hallucinate.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If it only predicts the next word, how can it reason or write code?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">To predict the next token well across trillions of tokens of code, maths and prose, the network has to build internal representations of syntax, facts and procedures. The objective is simple; what it takes to do it well is not. It still has no separate fact store, so its answers are only as reliable as those learned patterns.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why do I get a different answer each time I ask the same thing?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the last step usually <strong style="color:#ffca28;">samples</strong> from the probability distribution instead of always taking the top token. With temperature above 0 the toy model in this doc picked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cat</code> 288 times out of 1000 at T=1.0, not every time. Greedy decoding (temperature 0) is close to deterministic, though serving infrastructure can still add small variations.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between parameters and tokens?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Parameters are the learned weights inside the model, fixed after training. Tokens are the pieces of text that flow through it at run time. Model size is counted in parameters; cost, limits and speed are counted in tokens.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is generating 1,000 tokens slower than reading 1,000 tokens?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The prompt is processed in one parallel forward pass (<strong style="color:#ffca28;">prefill</strong>). Output needs one forward pass per new token because each token depends on the previous one (<strong style="color:#ffca28;">decode</strong>). A KV cache saves recomputing the prompt each step, but the steps themselves are still sequential.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the model look things up on the internet when it answers?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not by itself. A plain LLM only has its weights and the context you send. Fresh or private facts must be put into the prompt, for example with retrieval (RAG) or tool calls run by your application.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Token | The unit of text a model reads and writes, often part of a word |
| Large language model (LLM) | A very large neural network trained on a very large corpus to predict the next token |
| Parameters (weights) | The learned numbers inside the model; fixed after training |
| Logits | Raw scores the model outputs for every possible next token |
| Softmax | Turns logits into probabilities that sum to 1 |
| Autoregressive generation | Producing output one token at a time, each conditioned on everything before it |
| Stop condition | End-of-sequence token, stop sequence or \`max_tokens\` that ends generation |
| Decoding strategy | The rule that picks a token from the distribution: greedy or sampling |
| Temperature | Divides logits before softmax: below 1 sharper, above 1 flatter |
| Pretraining | Next-token training on a huge text corpus; where most knowledge comes from |
| Cross-entropy loss | Negative log-probability of the true next token; what training minimises |
| Post-training | Instruction tuning and preference tuning that turn a base model into an assistant |
| Prefill and decode | Parallel processing of the prompt, then sequential generation of output |
| KV cache | Stored attention keys and values so each new token does not reprocess the prompt |

**Conclusion:** An LLM is a next-token predictor: a transformer whose billions of learned weights map the tokens so far to a probability for every possible next token. Text comes out of a loop around that single step — tokenize, run a forward pass, pick a token with a decoding strategy, append it, repeat until a stop condition. Pretraining on a vast corpus gives it knowledge and fluency; post-training gives it the habit of answering. Almost every practical concern in AI engineering — per-token pricing, latency that grows with output length, randomness, context limits and hallucinations — follows directly from that loop, which is why explaining it clearly is the foundation answer for the whole topic.`,
    examples: [
      {
        label: `A toy next-token model: probabilities, temperature, greedy decoding and sampling`,
        variants: [
          { tech: "node", code: `// A toy language model: count which word follows which, turn counts into
// probabilities, then generate text one token at a time (autoregressive).
const corpus =
  "the cat sat on the mat . the dog sat on the rug . the cat ate the fish . " +
  "the dog ate the bone . a cat sat on a mat . the cat sat on the rug .";
const tokens = corpus.split(" ");

// "Training": count next-token frequencies for every token (a bigram model).
const counts = {};
for (let i = 0; i + 1 < tokens.length; i++) {
  const cur = tokens[i], nxt = tokens[i + 1];
  counts[cur] = counts[cur] || {};
  counts[cur][nxt] = (counts[cur][nxt] || 0) + 1;
}

// Logits are log-counts; softmax with a temperature turns them into probabilities.
function nextDistribution(prev, temperature) {
  const words = Object.keys(counts[prev]).sort();
  const logits = words.map((w) => Math.log(counts[prev][w]) / temperature);
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return words.map((w, i) => [w, exps[i] / sum]);
}

const fmt = (dist) => dist.map(([w, p]) => w + "=" + p.toFixed(3)).join(" ");
console.log("training tokens:", tokens.length, "| vocabulary:", new Set(tokens).size);
console.log("P(next | the)   T=1.0:", fmt(nextDistribution("the", 1.0)));
console.log("P(next | the)   T=0.5:", fmt(nextDistribution("the", 0.5)));
console.log("P(next | the)   T=2.0:", fmt(nextDistribution("the", 2.0)));

// Greedy decoding: always take the most likely token (ties -> alphabetical).
function greedy(prompt, maxNew) {
  const out = prompt.split(" ");
  let logProb = 0;
  for (let step = 1; step <= maxNew; step++) {
    const dist = nextDistribution(out[out.length - 1], 1.0);
    let best = dist[0];
    for (const d of dist) if (d[1] > best[1]) best = d;
    logProb += Math.log(best[1]);
    out.push(best[0]);
    console.log("  step " + step + ": context=[" + out.slice(0, -1).join(" ") + "] -> " + best[0] + " (p=" + best[1].toFixed(3) + ")");
    if (best[0] === ".") break;
  }
  return { text: out.join(" "), logProb };
}
console.log("greedy from 'the dog':");
const g = greedy("the dog", 8);
console.log("result:", g.text, "| log-prob of new tokens:", g.logProb.toFixed(3));

// Sampling: draw from the distribution with a seeded generator (Park-Miller).
let seed = 123456789;
const rand = () => { seed = (seed * 48271) % 2147483647; return seed / 2147483647; };
function sample(prompt, temperature, maxNew) {
  const out = prompt.split(" ");
  for (let step = 0; step < maxNew; step++) {
    const dist = nextDistribution(out[out.length - 1], temperature);
    const r = rand();
    let acc = 0, pick = dist[dist.length - 1][0];
    for (const [w, p] of dist) { acc += p; if (r < acc) { pick = w; break; } }
    out.push(pick);
    if (pick === ".") break;
  }
  return out.join(" ");
}
for (const t of [0.5, 1.0, 2.0]) {
  seed = 123456789;
  const tally = {};
  for (let i = 0; i < 1000; i++) { const w = sample("the", t, 1).split(" ")[1]; tally[w] = (tally[w] || 0) + 1; }
  const shares = Object.keys(tally).sort().map((w) => w + ":" + tally[w]).join(" ");
  console.log("T=" + t.toFixed(1) + " 1000 draws after 'the' -> " + shares + " | sentence: " + sample("the", t, 8));
}` },
          { tech: "python", code: `# A toy language model: count which word follows which, turn counts into
# probabilities, then generate text one token at a time (autoregressive).
import math

corpus = (
    "the cat sat on the mat . the dog sat on the rug . the cat ate the fish . "
    "the dog ate the bone . a cat sat on a mat . the cat sat on the rug ."
)
tokens = corpus.split(" ")

# "Training": count next-token frequencies for every token (a bigram model).
counts = {}
for cur, nxt in zip(tokens, tokens[1:]):
    counts.setdefault(cur, {})
    counts[cur][nxt] = counts[cur].get(nxt, 0) + 1


# Logits are log-counts; softmax with a temperature turns them into probabilities.
def next_distribution(prev, temperature):
    words = sorted(counts[prev])
    logits = [math.log(counts[prev][w]) / temperature for w in words]
    m = max(logits)
    exps = [math.exp(l - m) for l in logits]
    s = sum(exps)
    return [(w, e / s) for w, e in zip(words, exps)]


def fmt(dist):
    return " ".join(f"{w}={p:.3f}" for w, p in dist)


print("training tokens:", len(tokens), "| vocabulary:", len(set(tokens)))
print("P(next | the)   T=1.0:", fmt(next_distribution("the", 1.0)))
print("P(next | the)   T=0.5:", fmt(next_distribution("the", 0.5)))
print("P(next | the)   T=2.0:", fmt(next_distribution("the", 2.0)))


# Greedy decoding: always take the most likely token (ties -> alphabetical).
def greedy(prompt, max_new):
    out = prompt.split(" ")
    log_prob = 0.0
    for step in range(1, max_new + 1):
        dist = next_distribution(out[-1], 1.0)
        best = dist[0]
        for d in dist:
            if d[1] > best[1]:
                best = d
        log_prob += math.log(best[1])
        out.append(best[0])
        print(f"  step {step}: context=[{' '.join(out[:-1])}] -> {best[0]} (p={best[1]:.3f})")
        if best[0] == ".":
            break
    return " ".join(out), log_prob


print("greedy from 'the dog':")
text, lp = greedy("the dog", 8)
print("result:", text, "| log-prob of new tokens:", f"{lp:.3f}")

# Sampling: draw from the distribution with a seeded generator (Park-Miller).
seed = 123456789


def rand():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647


def sample(prompt, temperature, max_new):
    out = prompt.split(" ")
    for _ in range(max_new):
        dist = next_distribution(out[-1], temperature)
        r = rand()
        acc, pick = 0.0, dist[-1][0]
        for w, p in dist:
            acc += p
            if r < acc:
                pick = w
                break
        out.append(pick)
        if pick == ".":
            break
    return " ".join(out)


for t in (0.5, 1.0, 2.0):
    seed = 123456789
    tally = {}
    for _ in range(1000):
        w = sample("the", t, 1).split(" ")[1]
        tally[w] = tally.get(w, 0) + 1
    shares = " ".join(f"{w}:{tally[w]}" for w in sorted(tally))
    print(f"T={t:.1f} 1000 draws after 'the' -> {shares} | sentence: {sample('the', t, 8)}")` },
        ],
      },
    ],
  },
  {
    title: `How does the transformer architecture and attention work?`,
    difficulty: "medium",
    seoDescription: `A transformer stacks attention and feed-forward layers; attention scores every token against every other with softmax(QK^T/sqrt(d_k))V.`,
    description: `**Question presented to candidate:**
"Walk me through the transformer. What happens to a sentence from the moment it is tokenized until the model outputs the next token, and what exactly is attention computing?"

**What a strong answer should cover:**
- The pipeline: token embeddings plus position information, a stack of identical blocks (multi-head self-attention, then a feed-forward network, each wrapped in a residual connection and normalisation), then a projection to logits over the vocabulary
- Attention itself: each token produces a query, a key and a value; scores are query-key dot products scaled by the square root of the key size, softmax turns each row into weights, and the output is the weighted sum of values: softmax(QKᵀ/√d_k)V
- Why it works: every token can pull information from any other token in one step, and all positions are computed in parallel, unlike an RNN
- The causal mask in decoder-only (GPT-style) models, and the three families: encoder-only, encoder-decoder, decoder-only
- Multi-head attention, and why position must be injected (attention alone ignores order) with sinusoidal, learned or rotary (RoPE) encodings
- The cost: attention scores grow with the square of sequence length, which is what makes long context expensive and motivates the KV cache and efficient attention kernels

**Code / implementation expected:** Optional — computing attention for a few tokens by hand (or in a few lines of code) is the best proof of understanding.`,
    answer: `**Target Audience:** Engineers who know what an LLM does from the outside and want to understand the inside well enough to explain it on a whiteboard.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (attention computed by hand on 4 tokens; no real model). Paper facts are cited inline, checked October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All numbers in the worked example were produced by actually running the code; the **Verified** section quotes the run in full.

## 1. Why This Even Matters — A Story First

Read this sentence: *"The trophy did not fit in the suitcase because it was too big."* What is "it"? You knew instantly: the trophy. To work that out you jumped back from "it" to "trophy" and "suitcase", weighed which one makes sense with "too big", and pulled the meaning of the right one forward.

That jump is attention. Older neural networks for text (recurrent networks) read one word at a time and had to carry everything they had seen in a single running memory, so by the time they reached "it", "trophy" was a faded trace. The transformer's idea is blunt: let **every word look directly at every other word**, decide how relevant each one is, and mix in information from the relevant ones. Do that for all words at the same time, stack it many layers deep, and you have the architecture behind essentially every modern LLM. It was introduced in "Attention Is All You Need" (Vaswani et al., NeurIPS 2017, arXiv 1706.03762).

For an engineer the architecture explains very practical things: why long prompts get expensive, why models need position information, what the KV cache is and why "context window" is a hard limit.

## 2. The Big Picture: From Tokens to Logits

<svg class="iq-diagram" width="100%" viewBox="0 0 720 520" role="img" aria-label="Decoder-only transformer: tokens become embeddings plus positions, pass through N repeated blocks of attention and feed-forward layers, then become logits">
  <defs>
    <marker id="ai01q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="180" y="20" width="300" height="54" rx="10"/>
  <text class="d-text" x="330" y="53" text-anchor="middle">token ids: the cat sat</text>
  <rect class="d-box" x="180" y="120" width="300" height="54" rx="10"/>
  <text class="d-text" x="330" y="153" text-anchor="middle">embedding + position</text>
  <rect class="d-edge-dashed" x="150" y="205" width="360" height="200" rx="14" fill="none"/>
  <rect class="d-box-accent" x="180" y="225" width="300" height="54" rx="10"/>
  <text class="d-text" x="330" y="258" text-anchor="middle">masked self-attention</text>
  <rect class="d-box-accent" x="180" y="330" width="300" height="54" rx="10"/>
  <text class="d-text" x="330" y="363" text-anchor="middle">feed-forward network</text>
  <text class="d-sub" x="600" y="300" text-anchor="middle">repeat N layers</text>
  <text class="d-sub" x="600" y="324" text-anchor="middle">residual + norm</text>
  <rect class="d-box" x="180" y="445" width="300" height="54" rx="10"/>
  <text class="d-text" x="330" y="478" text-anchor="middle">logits for next token</text>
  <path class="d-edge" d="M 330 78 L 330 114" marker-end="url(#ai01q2-arrow)"/>
  <path class="d-edge" d="M 330 178 L 330 219" marker-end="url(#ai01q2-arrow)"/>
  <path class="d-edge" d="M 330 283 L 330 324" marker-end="url(#ai01q2-arrow)"/>
  <path class="d-edge" d="M 330 388 L 330 439" marker-end="url(#ai01q2-arrow)"/>
</svg>

A decoder-only transformer (the GPT-style design used by most chat LLMs) reads top to bottom: embed, run the same kind of block many times, then score the vocabulary.

Step by step:

1. **Embedding.** Each token id is looked up in a table and becomes a vector of numbers (in the original paper, 512 numbers per token).

📌 **Interview term: embedding** — a learned vector that represents a token. Tokens used in similar ways end up with similar vectors. (Embeddings used for search are a related but separate topic: [What are embeddings?](/interview-question/what-are-embeddings-and-what-are-they-used-for))

2. **Position.** A position signal is added or applied, because attention by itself cannot tell order (Section 5 proves this with numbers).
3. **Blocks.** The vectors pass through N identical blocks. Each block has two sub-layers: **self-attention** (tokens exchange information) and a **feed-forward network** (each token's vector is transformed on its own). The original paper's base model used 6 encoder and 6 decoder layers with model width 512 (arXiv 1706.03762); modern LLMs use dozens of layers and much wider vectors.
4. **Output.** The final vector at the last position is multiplied by a matrix with one row per vocabulary token, giving the logits that [the generation loop](/interview-question/what-is-a-large-language-model-and-how-does-it-generate-text) turns into the next token.

📌 **Interview term: residual connection** — each sub-layer adds its output to its input (\`x + sublayer(x)\`) instead of replacing it. Information and gradients can flow straight through a deep stack, which is what makes stacks of dozens of layers trainable.

📌 **Interview term: layer normalisation** — rescales each token's vector to a standard mean and spread before or after each sub-layer, keeping numbers in a stable range as they pass through many layers.

📌 **Interview term: feed-forward network (FFN / MLP)** — two linear layers with a non-linearity between them, applied to every position separately. Attention moves information between tokens; the FFN processes what each token now holds.

## 3. Attention, Built From Zero

Think of a library. You walk in with a **question** (query). Every book has a **label on its spine** (key) and **contents** (value). You compare your question with every label, decide how relevant each book is, and come away with a blend of the contents of the most relevant books.

Self-attention does exactly that, for every token at once:

- Each token's vector is multiplied by three learned matrices to get its **query** (what am I looking for?), **key** (what do I contain?) and **value** (what will I hand over if picked?).
- A token's query is compared with every token's key by a **dot product**: big when they point the same way.
- Scores are divided by \`sqrt(d_k)\` and passed through **softmax** so each row becomes weights that sum to 1.
- The token's new vector is the **weighted sum of the values**.

In one line, as written in the original paper:

~~~text
Attention(Q, K, V) = softmax( Q K^T / sqrt(d_k) ) V
~~~

📌 **Interview term: query, key, value (Q, K, V)** — three projections of each token's vector. Queries are matched against keys to decide *where* to look; values are *what* gets copied from there.

📌 **Interview term: scaled dot-product attention** — the formula above. The scaling by \`sqrt(d_k)\` (the size of a key vector) keeps the scores from growing with vector size; without it, softmax saturates to near one-hot and gradients become tiny, which is the reason given in the paper.

📌 **Interview term: self-attention** — attention where the queries, keys and values all come from the same sequence, so the sentence attends to itself. (In *cross-attention*, used by encoder-decoder models, queries come from one sequence and keys/values from another.)

### The numbers, for one token

The example uses 4 tokens, 4-number embeddings and 2-number queries and keys. Here is what \`sat\` (row 3) does:

<svg class="iq-diagram" width="100%" viewBox="0 0 780 320" role="img" aria-label="The query of sat is compared with the keys of the, cat and sat; softmax gives weights 0.108, 0.446 and 0.446; the output is the weighted sum of their values">
  <defs>
    <marker id="ai01q2-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="125" width="170" height="70" rx="10"/>
  <text class="d-text" x="105" y="155" text-anchor="middle">query of sat</text>
  <text class="d-sub" x="105" y="178" text-anchor="middle">[1, 1]</text>
  <rect class="d-box" x="300" y="20" width="190" height="70" rx="10"/>
  <text class="d-text" x="395" y="50" text-anchor="middle">key the</text>
  <text class="d-sub" x="395" y="73" text-anchor="middle">weight 0.108</text>
  <rect class="d-box" x="300" y="125" width="190" height="70" rx="10"/>
  <text class="d-text" x="395" y="155" text-anchor="middle">key cat</text>
  <text class="d-sub" x="395" y="178" text-anchor="middle">weight 0.446</text>
  <rect class="d-box" x="300" y="230" width="190" height="70" rx="10"/>
  <text class="d-text" x="395" y="260" text-anchor="middle">key sat</text>
  <text class="d-sub" x="395" y="283" text-anchor="middle">weight 0.446</text>
  <rect class="d-box-accent" x="590" y="125" width="170" height="70" rx="10"/>
  <text class="d-text" x="675" y="155" text-anchor="middle">new vector</text>
  <text class="d-sub" x="675" y="178" text-anchor="middle">[1.892, 1.337]</text>
  <path class="d-edge" d="M 194 150 L 294 60" marker-end="url(#ai01q2-arrow2)"/>
  <path class="d-edge" d="M 194 160 L 294 160" marker-end="url(#ai01q2-arrow2)"/>
  <path class="d-edge" d="M 194 170 L 294 262" marker-end="url(#ai01q2-arrow2)"/>
  <path class="d-edge-accent" d="M 494 60 L 584 150" marker-end="url(#ai01q2-arrow2)"/>
  <path class="d-edge-accent" d="M 494 160 L 584 160" marker-end="url(#ai01q2-arrow2)"/>
  <path class="d-edge-accent" d="M 494 262 L 584 170" marker-end="url(#ai01q2-arrow2)"/>
</svg>

The query of \`sat\` matches the keys of \`cat\` and \`sat\` equally well and \`the\` less, so the new vector for \`sat\` is mostly a blend of what \`cat\` and \`sat\` carry.

From the run, with \`d_k = 2\`:

~~~text
scores = Q * K^T / sqrt(2) with causal mask
  the    0.000   -inf   -inf   -inf
  cat    1.414  2.828   -inf   -inf
  sat    0.707  2.121  2.121   -inf
  down   0.000  1.414  0.707  0.000
weights = softmax(scores) per row (each row sums to 1)
  the    1.000  0.000  0.000  0.000
  cat    0.196  0.804  0.000  0.000
  sat    0.108  0.446  0.446  0.000
  down   0.123  0.505  0.249  0.123
~~~

Check row \`sat\` by hand: query \`[1, 1]\` dotted with key of \`cat\` \`[2, 1]\` is 3; divided by √2 ≈ 1.414 that is 2.121. Softmax of \`[0.707, 2.121, 2.121]\` is \`[0.108, 0.446, 0.446]\`.

## 4. The Causal Mask and the Three Families

Look at the \`-inf\` entries above the diagonal. They are the **causal mask**: a token is not allowed to look at tokens that come after it. \`exp(-inf) = 0\`, so those weights are exactly zero, and \`the\` (row 1) can only attend to itself.

📌 **Interview term: causal mask** — setting attention scores for future positions to minus infinity so each token only sees itself and earlier tokens. It is what makes a transformer a valid next-token predictor, and it lets training score every position of a sequence in one parallel pass without leaking the answer.

| Family | Attention | Typical use | Examples |
| :--- | :--- | :--- | :--- |
| Encoder-only | Bidirectional (no mask): every token sees every token | Understanding: classification, embeddings, reranking | BERT |
| Encoder-decoder | Encoder bidirectional; decoder causal plus cross-attention to the encoder | Input-to-output tasks such as translation | The original 2017 transformer, T5 |
| Decoder-only | Causal self-attention only | Text generation; nearly all chat LLMs | GPT family, Llama (most proprietary chat models are assumed to be decoder-only, but few publish details) |

📌 **Interview term: decoder-only transformer** — a transformer that is only the masked, generating half. Prompt and answer are one continuous token sequence, which is why "input" and "output" tokens share one context window.

## 5. Position: Attention Is Blind to Order

Attention is a weighted sum, and a sum does not care about order. The example proves it. Without any position signal, the token \`cat\` gets the identical output in two different word orders; add a position vector to each embedding and the outputs differ:

~~~text
no positions:   cat in [the cat sat] -> 1.926, 1.231 | in [sat cat the] -> 1.926, 1.231
with positions: cat in [the cat sat] -> 3.124, 2.902 | in [sat cat the] -> 2.702, 3.983
~~~

📌 **Interview term: positional encoding** — information about each token's position injected into the model. The original transformer added fixed sine/cosine patterns. Many current LLMs use **rotary position embedding (RoPE)**, introduced in RoFormer (Su et al., 2021, arXiv 2104.09864), which rotates queries and keys by an angle that depends on position so the dot product reflects relative distance.

The toy example uses a simple sine/cosine vector of its own (not the exact paper formula); the point is only that *some* position signal is required.

## 6. Multi-Head Attention

One attention computes one kind of relevance. Language needs many at once: which noun does this pronoun refer to, which verb goes with this subject, what was the previous line of code.

📌 **Interview term: multi-head attention** — running several attentions ("heads") in parallel, each with its own smaller Q, K, V matrices, then concatenating their outputs and mixing them with one more matrix. Different heads can specialise in different relationships for the same total cost as one wide head. The original base model used 8 heads.

## 7. Why Long Context Is Expensive

Every token scores every other token, so the score matrix has \`n x n\` entries for \`n\` tokens — per head, per layer. From the run:

~~~text
n=  1024 tokens -> 1,048,576 scores per head per layer
n=  8192 tokens -> 67,108,864 scores per head per layer
n=131072 tokens -> 17,179,869,184 scores per head per layer
~~~

Going from 8K to 128K tokens (16 times longer) makes the attention work 256 times larger. This quadratic term is the reason long contexts cost more and run slower, and why production systems lean on:

- **KV cache**: during generation, the keys and values of earlier tokens never change, so they are stored and only the new token's query is computed each step. Memory for the cache grows linearly with context length (times layers and heads), and is often the practical limit when serving long contexts.
- **Memory-efficient attention kernels** that compute exact attention in tiles without storing the whole \`n x n\` matrix.
- **Variants** that share keys and values across heads, or attend only to a window of nearby tokens, to cut cache size and compute.

What this means for your prompts is covered in [What is a context window and what happens when you exceed it?](/interview-question/what-is-a-context-window-and-what-happens-when-you-exceed-it)

📌 **Interview term: quadratic complexity** — cost that grows with the square of input size. Self-attention is O(n²) in sequence length for compute (and for memory, unless a tiled kernel avoids storing the matrix).

## 8. Verified: Running the Code

The example **"Scaled dot-product attention by hand: Q, K, V, causal mask, positions and the n-squared cost"** implements one attention head with plain arrays: matrix multiply, scale, mask, softmax, weighted sum. It stands for one head of one layer of a real model; it leaves out multiple heads, the feed-forward network, residuals, normalisation and training (the weight matrices are hand-picked, not learned). The core of it:

~~~js
const Q = matmul(X, Wq), K = matmul(X, Wk), V = matmul(X, Wv);
const scores = matmul(Q, T(K)).map((row) => row.map((s) => s / Math.sqrt(dk)));
if (causal) scores.forEach((row, i) => row.forEach((_, j) => { if (j > i) row[j] = -Infinity; }));
// softmax each row, then: out = matmul(weights, V)
~~~

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
Q = X * Wq
  the    1.000  0.000
  cat    1.000  2.000
  sat    1.000  1.000
  down   1.000  0.000
K = X * Wk
  the    0.000  1.000
  cat    2.000  1.000
  sat    1.000  2.000
  down   0.000  2.000
scores = Q * K^T / sqrt(2) with causal mask
  the    0.000   -inf   -inf   -inf
  cat    1.414  2.828   -inf   -inf
  sat    0.707  2.121  2.121   -inf
  down   0.000  1.414  0.707  0.000
weights = softmax(scores) per row (each row sums to 1)
  the    1.000  0.000  0.000  0.000
  cat    0.196  0.804  0.000  0.000
  sat    0.108  0.446  0.446  0.000
  down   0.123  0.505  0.249  0.123
output = weights * V
  the    1.000  0.000
  cat    1.804  1.609
  sat    1.892  1.337
  down   1.754  1.382
no positions:   cat in [the cat sat] -> 1.926, 1.231 | in [sat cat the] -> 1.926, 1.231
with positions: cat in [the cat sat] -> 3.124, 2.902 | in [sat cat the] -> 2.702, 3.983
n=  1024 tokens -> 1,048,576 scores per head per layer
n=  8192 tokens -> 67,108,864 scores per head per layer
n=131072 tokens -> 17,179,869,184 scores per head per layer
~~~

What to read from it:

- Each row of \`weights\` sums to 1 and is 0 above the diagonal (the mask).
- The output for \`the\` is just its own value \`[1, 0]\`, because it can only see itself.
- Order matters only once positions are added.
- The score count grows with the square of the sequence length.

## Edge Cases Worth Knowing

- **Softmax needs the max-subtraction trick.** Real implementations subtract the row maximum before \`exp\` to avoid overflow, exactly as the example does. A fully masked row (no allowed positions) would be all \`-inf\` and produce NaN; implementations guard against it.
- **Padding needs a mask too.** When sequences of different lengths are batched, padding tokens are masked out just like future tokens.
- **Attention weights are not explanations.** A high weight shows where information was read from in one head of one layer, not why the model produced an answer. Use them for intuition, not as proof.
- **Encoder-only models cannot generate fluently.** BERT-style models see both directions, so they are not trained to predict the next token; that is why they are used for embeddings and classification instead.

## Common Pitfalls

- **Forgetting the scaling factor or the mask** when writing attention on a whiteboard. Interviewers check both. Say "divide by root d_k" and "mask the future in a decoder".
- **Saying attention is O(n) because the model generates one token at a time.** Each new token attends to all previous ones; over a full sequence that is quadratic. The KV cache removes recomputation, not the n² nature of the scores.
- **Mixing up Q, K and V roles.** Query and key decide the weights; value is what gets mixed. The output dimension comes from V.
- **Claiming attention understands order.** It does not; positional encoding supplies it.
- **Treating "transformer" and "LLM" as synonyms.** The transformer is the architecture; LLMs are large decoder-only transformers trained on text. Vision, speech and embedding models are transformers too.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Pipeline:</strong> <span style="color:#f0e2c8;">Tokens become embedding vectors with position information added. They pass through a stack of identical blocks, each with <strong style="color:#ffca28;">self-attention</strong> and a <strong style="color:#ffca28;">feed-forward network</strong>, wrapped in residual connections and normalisation. The last vector is projected to logits over the vocabulary.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Attention:</strong> <span style="color:#f0e2c8;">Each token makes a query, a key and a value by multiplying its vector by three learned matrices. A token scores every other token with query dot key, divides by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sqrt(d_k)</code>, applies softmax, and takes the weighted sum of the values: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">softmax(QK^T / sqrt(d_k)) V</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it won:</strong> <span style="color:#f0e2c8;">Any token can read from any other token in one step, and all positions are computed in parallel on a GPU, which is what made training on huge corpora practical compared with RNNs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Variants:</strong> <span style="color:#f0e2c8;">Decoder-only models such as GPT use a <strong style="color:#ffca28;">causal mask</strong> so a token only sees earlier tokens; encoder-only models such as BERT see both directions; encoder-decoder models such as T5 do both. <strong style="color:#ffca28;">Multi-head</strong> attention runs several attentions in parallel.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost:</strong> <span style="color:#f0e2c8;">Attention alone ignores word order, so positions are injected, today often with RoPE. The score matrix is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">n x n</code>, so cost grows with the square of sequence length; that is the root of long-context cost and why the KV cache matters.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why divide by the square root of d_k?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Dot products of long vectors get large: with independent unit-variance components their variance is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d_k</code>. Large scores push softmax into a near one-hot region with tiny gradients. Dividing by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sqrt(d_k)</code> brings the variance back to about 1. This is the reason given in the original paper.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do the feed-forward layers do if attention does the mixing?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Attention moves information <strong style="color:#ffca28;">between</strong> positions; the feed-forward network transforms each position <strong style="color:#ffca28;">independently</strong> with a larger hidden layer. Interpretability research often describes them as key-value memories where much stored knowledge lives, while attention decides what to combine; treat that as an interpretation, not a settled fact.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the causal mask, and why is it needed?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It sets the scores for future positions to minus infinity before softmax, so their weights become exactly 0. During training the model predicts every position in parallel, and without the mask it could cheat by looking at the token it is supposed to predict.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does attention need positional encoding?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Attention is a weighted sum, which does not care about order. In the example, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cat</code> got the identical output <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1.926, 1.231</code> in <em style="color:#d8d8d8;">the cat sat</em> and <em style="color:#d8d8d8;">sat cat the</em> until position vectors were added. Positions are injected with sinusoids, learned vectors or rotations of Q and K (RoPE).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the KV cache relate to attention?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When generating, a new token needs the keys and values of all previous tokens. They do not change, so they are stored after the first pass and only the new token is computed each step. Memory for the cache grows linearly with context length, layers and heads, which is often the real limit on long-context serving.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Embedding | Learned vector representing a token |
| Residual connection | Adding a sub-layer output to its input so deep stacks train well |
| Layer normalisation | Rescaling each token vector to a stable range |
| Feed-forward network (FFN / MLP) | Per-position two-layer network inside each block |
| Query, key, value (Q, K, V) | Three projections: queries match keys to set weights; values are what gets mixed |
| Scaled dot-product attention | \`softmax(QK^T / sqrt(d_k)) V\` |
| Self-attention | Attention where Q, K and V come from the same sequence |
| Causal mask | Minus infinity on future positions so tokens only see the past |
| Decoder-only transformer | The generating, masked-attention design behind most chat LLMs |
| Positional encoding | Injected position information (sinusoidal, learned or RoPE) |
| Multi-head attention | Several attentions in parallel, concatenated |
| Quadratic complexity | Cost growing with n²; attention over sequence length |

**Conclusion:** A transformer turns tokens into vectors, adds position information, and runs them through a stack of blocks in which self-attention lets every token pull information from every other token and a feed-forward network processes each token on its own, with residual connections and normalisation keeping the deep stack trainable. Attention is three matrix products and a softmax — \`softmax(QKᵀ/√d_k)V\` — computed for all tokens in parallel, which is why transformers train so well on GPUs. Decoder-only LLMs add a causal mask so they can predict the next token, inject position because attention alone ignores order, and pay a cost that grows with the square of the context length, which is the thread that connects the architecture to KV caches, context limits and the price of long prompts.`,
    examples: [
      {
        label: `Scaled dot-product attention by hand: Q, K, V, causal mask, positions and the n-squared cost`,
        variants: [
          { tech: "node", code: `// Scaled dot-product attention, by hand, on a 4-token sentence.
// One head, d_model = 4, d_k = 2. Numbers are small so you can follow them.
const words = ["the", "cat", "sat", "down"];
const emb = {
  the: [1, 0, 0, 0], cat: [0, 1, 1, 0], sat: [0, 0, 1, 1], down: [1, 0, 0, 1],
};
// Learned projection matrices (4 x 2). In a real model these come from training.
const Wq = [[1, 0], [0, 1], [1, 1], [0, 0]];
const Wk = [[0, 1], [1, 0], [1, 1], [0, 1]];
const Wv = [[1, 0], [0, 2], [2, 0], [0, 1]];

const matmul = (A, B) => A.map((row) => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));
const T = (A) => A[0].map((_, j) => A.map((row) => row[j]));
const f3 = (x) => (Object.is(x, -0) ? 0 : x).toFixed(3);
const show = (name, M, labels) => {
  console.log(name);
  M.forEach((row, i) => console.log("  " + (labels ? labels[i].padEnd(5) : "") + row.map((x) => (x === -Infinity ? "-inf" : f3(x)).padStart(7)).join("")));
};

function attention(X, causal, labels, verbose) {
  const Q = matmul(X, Wq), K = matmul(X, Wk), V = matmul(X, Wv);
  const dk = Q[0].length;
  const scores = matmul(Q, T(K)).map((row) => row.map((s) => s / Math.sqrt(dk)));
  if (causal) scores.forEach((row, i) => row.forEach((_, j) => { if (j > i) row[j] = -Infinity; }));
  const weights = scores.map((row) => {
    const m = Math.max(...row);
    const e = row.map((s) => Math.exp(s - m));
    const z = e.reduce((a, b) => a + b, 0);
    return e.map((x) => x / z);
  });
  const out = matmul(weights, V);
  if (verbose) {
    show("Q = X * Wq", Q, labels);
    show("K = X * Wk", K, labels);
    show("scores = Q * K^T / sqrt(" + dk + ")" + (causal ? " with causal mask" : ""), scores, labels);
    show("weights = softmax(scores) per row (each row sums to 1)", weights, labels);
    show("output = weights * V", out, labels);
  }
  return out;
}

const X = words.map((w) => emb[w]);
attention(X, true, words, true);

// Without position information, attention cannot tell word order apart.
const a = ["the", "cat", "sat"], b = ["sat", "cat", "the"];
const outA = attention(a.map((w) => emb[w]), false, a, false);
const outB = attention(b.map((w) => emb[w]), false, b, false);
console.log("no positions:   cat in [" + a.join(" ") + "] -> " + outA[1].map(f3).join(", ") + " | in [" + b.join(" ") + "] -> " + outB[1].map(f3).join(", "));

// Add a simple position vector to each embedding and the outputs differ.
const pos = (i) => [Math.sin(i), Math.cos(i), Math.sin(i / 10), Math.cos(i / 10)];
const addPos = (seq) => seq.map((w, i) => emb[w].map((x, d) => x + pos(i)[d]));
const pA = attention(addPos(a), false, a, false), pB = attention(addPos(b), false, b, false);
console.log("with positions: cat in [" + a.join(" ") + "] -> " + pA[1].map(f3).join(", ") + " | in [" + b.join(" ") + "] -> " + pB[1].map(f3).join(", "));

// Cost: every token scores every other token, so the score matrix is n x n.
for (const n of [1024, 8192, 131072]) {
  console.log("n=" + String(n).padStart(6) + " tokens -> " + (n * n).toLocaleString("en-US") + " scores per head per layer");
}` },
          { tech: "python", code: `# Scaled dot-product attention, by hand, on a 4-token sentence.
# One head, d_model = 4, d_k = 2. Numbers are small so you can follow them.
import math

words = ["the", "cat", "sat", "down"]
emb = {"the": [1, 0, 0, 0], "cat": [0, 1, 1, 0], "sat": [0, 0, 1, 1], "down": [1, 0, 0, 1]}
# Learned projection matrices (4 x 2). In a real model these come from training.
Wq = [[1, 0], [0, 1], [1, 1], [0, 0]]
Wk = [[0, 1], [1, 0], [1, 1], [0, 1]]
Wv = [[1, 0], [0, 2], [2, 0], [0, 1]]


def matmul(A, B):
    return [[sum(row[k] * B[k][j] for k in range(len(B))) for j in range(len(B[0]))] for row in A]


def T(A):
    return [list(col) for col in zip(*A)]


def f3(x):
    s = f"{x:.3f}"
    return "0.000" if s == "-0.000" else s


def show(name, M, labels=None):
    print(name)
    for i, row in enumerate(M):
        cells = "".join(("-inf" if x == -math.inf else f3(x)).rjust(7) for x in row)
        print("  " + (labels[i].ljust(5) if labels else "") + cells)


def attention(X, causal, labels, verbose):
    Q, K, V = matmul(X, Wq), matmul(X, Wk), matmul(X, Wv)
    dk = len(Q[0])
    scores = [[s / math.sqrt(dk) for s in row] for row in matmul(Q, T(K))]
    if causal:
        for i, row in enumerate(scores):
            for j in range(len(row)):
                if j > i:
                    row[j] = -math.inf
    weights = []
    for row in scores:
        m = max(row)
        e = [math.exp(s - m) for s in row]
        z = sum(e)
        weights.append([x / z for x in e])
    out = matmul(weights, V)
    if verbose:
        show("Q = X * Wq", Q, labels)
        show("K = X * Wk", K, labels)
        show(f"scores = Q * K^T / sqrt({dk})" + (" with causal mask" if causal else ""), scores, labels)
        show("weights = softmax(scores) per row (each row sums to 1)", weights, labels)
        show("output = weights * V", out, labels)
    return out


X = [emb[w] for w in words]
attention(X, True, words, True)

# Without position information, attention cannot tell word order apart.
a, b = ["the", "cat", "sat"], ["sat", "cat", "the"]
outA = attention([emb[w] for w in a], False, a, False)
outB = attention([emb[w] for w in b], False, b, False)
print(f"no positions:   cat in [{' '.join(a)}] -> {', '.join(map(f3, outA[1]))} | in [{' '.join(b)}] -> {', '.join(map(f3, outB[1]))}")


# Add a simple position vector to each embedding and the outputs differ.
def pos(i):
    return [math.sin(i), math.cos(i), math.sin(i / 10), math.cos(i / 10)]


def add_pos(seq):
    return [[x + pos(i)[d] for d, x in enumerate(emb[w])] for i, w in enumerate(seq)]


pA = attention(add_pos(a), False, a, False)
pB = attention(add_pos(b), False, b, False)
print(f"with positions: cat in [{' '.join(a)}] -> {', '.join(map(f3, pA[1]))} | in [{' '.join(b)}] -> {', '.join(map(f3, pB[1]))}")

# Cost: every token scores every other token, so the score matrix is n x n.
for n in (1024, 8192, 131072):
    print(f"n={str(n).rjust(6)} tokens -> {n * n:,} scores per head per layer")` },
        ],
      },
    ],
  },
  {
    title: `What are tokens and why do they matter for cost and limits?`,
    difficulty: "easy",
    seoDescription: `Tokens are the subword pieces an LLM reads and writes; pricing, context limits, rate limits and latency are all counted in them, output dearest.`,
    description: `**Question presented to candidate:**
"Everything in LLM APIs is measured in tokens — the pricing page, the context limit, the rate limits. What is a token, how does text get split into them, and how do they affect what our feature costs and how fast it is?"

**What a strong answer should cover:**
- A token is the unit a model reads and writes: a word, part of a word, a punctuation mark or a byte sequence, produced by a tokenizer with a fixed vocabulary (tens of thousands to a few hundred thousand entries)
- How subword tokenizers such as BPE are built: start from characters or bytes, repeatedly merge the most frequent adjacent pair; common words become one token, rare words split into many pieces
- Rules of thumb and their limits: roughly 4 characters or three quarters of an English word per token (OpenAI), but code, numbers, rare words and many non-English languages take more tokens; counts differ between model families
- Cost: input and output tokens are priced separately and output is usually several times dearer; a worked monthly estimate from traffic, prompt size and answer size
- Limits and latency: the context window and rate limits are counted in tokens; each output token is one sequential decode step, so answer length drives response time
- Practical habits: count with the provider tokenizer or token-counting endpoint, cap \`max_tokens\`, shrink prompts, cache repeated prefixes

**Code / implementation expected:** Optional — a small tokenizer or a cost calculation from token counts is a good way to show the arithmetic.`,
    answer: `**Target Audience:** Beginners who are about to ship (or pay for) their first LLM feature and keep seeing "tokens" on every pricing and limits page.
**Difficulty:** Easy
**Verified with:** Node 22.22.0 and Python 3.12.3 (a tiny BPE tokenizer and the cost arithmetic; no real tokenizer or model is called). Product facts and prices are cited inline with the date they were checked (October 2026).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Imagine a taxi that charges by the kilometre, but the meter does not measure kilometres you can see. It measures "road segments", and the city decides where segments start and end: a straight motorway might be one long segment, while a twisty old-town street is chopped into dozens. Two trips of the same distance can cost very different amounts.

Tokens are those road segments. You send text, but the model, the bill, the size limit and the speed are all measured in tokens, and how many tokens a piece of text becomes depends on the tokenizer, the language and the kind of text. An engineer who thinks in characters or words will misjudge costs, hit limits they did not expect and blame the model for problems (like miscounting letters) that come from tokenization.

## 2. What a Token Is

📌 **Interview term: token** — the basic unit an LLM reads and writes. It can be a whole common word ("the"), a piece of a word ("est"), a punctuation mark, a space plus a word, or a sequence of raw bytes. The model never sees characters, only a list of token ids.

📌 **Interview term: tokenizer** — the fixed component that converts text to token ids and back. It is built once, before the model is trained, and the model can only ever use the tokens in its vocabulary.

📌 **Interview term: vocabulary** — the set of all tokens a tokenizer knows. OpenAI's published tokenizers give a sense of scale: GPT-2's has about 50K entries, \`cl100k_base\` (GPT-4) about 100K and \`o200k_base\` (GPT-4o) about 200K, as listed in the tiktoken documentation and the OpenAI Cookbook guide "How to count tokens with tiktoken" (checked October 2026).

OpenAI's help article "What are tokens and how to count them?" gives the rules of thumb most people quote for English text: **1 token ≈ 4 characters ≈ ¾ of a word**, so **100 tokens ≈ 75 words**. The same article stresses these are estimates and that counts vary by model.

## 3. How Subword Tokenizers Are Built: BPE

Most LLM tokenizers are some form of **byte-pair encoding**. The idea, adapted for language by Sennrich, Haddow and Birch ("Neural Machine Translation of Rare Words with Subword Units", ACL 2016), is simple:

1. Start with every word split into single characters (modern LLMs start from the 256 possible bytes, so any text, emoji or language is representable — a variant popularised by GPT-2).
2. Count every adjacent pair of symbols across the training text.
3. Merge the most frequent pair into a new symbol and add it to the vocabulary.
4. Repeat until the vocabulary reaches the target size.

📌 **Interview term: byte-pair encoding (BPE)** — a tokenizer-building algorithm that starts from characters or bytes and repeatedly merges the most frequent adjacent pair. The ordered list of merges *is* the tokenizer; encoding new text replays the merges in the same order.

📌 **Interview term: subword tokenization** — splitting text into units between characters and words. Frequent words become single tokens; rare words are built from several pieces, so nothing is ever "out of vocabulary".

The example trains BPE on six words (\`low\`×5, \`lower\`×2, \`newest\`×6, \`widest\`×3, \`new\`×4, \`wide\`×2), with \`_\` marking the end of a word. The first ten merges it learns:

~~~text
merge  1: e + w -> ew  (seen 10 times)
merge  2: n + ew -> new  (seen 10 times)
merge  3: e + s -> es  (seen 9 times)
merge  4: es + t -> est  (seen 9 times)
merge  5: est + _ -> est_  (seen 9 times)
merge  6: l + o -> lo  (seen 7 times)
merge  7: lo + w -> low  (seen 7 times)
merge  8: new + est_ -> newest_  (seen 6 times)
merge  9: i + d -> id  (seen 5 times)
merge 10: low + _ -> low_  (seen 5 times)
~~~

Then it tokenizes three phrases it has never seen as a whole:

~~~text
"newest lowest"  -> 3 tokens ["newest_","low","est_"]  chars/token=4.33
"wider widest"   -> 8 tokens ["w","id","e","r","_","w","id","est_"]  chars/token=1.50
"zebra quokka"   -> 13 tokens ["z","e","b","r","a","_","q","u","o","k","k","a","_"]  chars/token=0.92
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 780 240" role="img" aria-label="Two phrases split by the toy BPE tokenizer: newest lowest becomes 3 tokens, wider widest becomes 8 tokens">
  <text class="d-text" x="30" y="36">newest lowest: 3 tokens</text>
  <rect class="d-box-accent" x="30" y="56" width="128" height="50" rx="8"/>
  <text class="d-text" x="94" y="87" text-anchor="middle">newest_</text>
  <rect class="d-box-accent" x="178" y="56" width="72" height="50" rx="8"/>
  <text class="d-text" x="214" y="87" text-anchor="middle">low</text>
  <rect class="d-box-accent" x="270" y="56" width="86" height="50" rx="8"/>
  <text class="d-text" x="313" y="87" text-anchor="middle">est_</text>
  <text class="d-text" x="30" y="156">wider widest: 8 tokens</text>
  <rect class="d-box" x="30" y="176" width="60" height="50" rx="8"/>
  <text class="d-text" x="60" y="207" text-anchor="middle">w</text>
  <rect class="d-box" x="110" y="176" width="60" height="50" rx="8"/>
  <text class="d-text" x="140" y="207" text-anchor="middle">id</text>
  <rect class="d-box" x="190" y="176" width="60" height="50" rx="8"/>
  <text class="d-text" x="220" y="207" text-anchor="middle">e</text>
  <rect class="d-box" x="270" y="176" width="60" height="50" rx="8"/>
  <text class="d-text" x="300" y="207" text-anchor="middle">r</text>
  <rect class="d-box" x="350" y="176" width="60" height="50" rx="8"/>
  <text class="d-text" x="380" y="207" text-anchor="middle">_</text>
  <rect class="d-box" x="430" y="176" width="60" height="50" rx="8"/>
  <text class="d-text" x="460" y="207" text-anchor="middle">w</text>
  <rect class="d-box" x="510" y="176" width="60" height="50" rx="8"/>
  <text class="d-text" x="540" y="207" text-anchor="middle">id</text>
  <rect class="d-box" x="590" y="176" width="86" height="50" rx="8"/>
  <text class="d-text" x="633" y="207" text-anchor="middle">est_</text>
</svg>

Common words collapse into a few tokens while unfamiliar text falls apart into many small pieces.

The same thing happens in real tokenizers, only at the scale of a 100K-token vocabulary trained on terabytes of text. Text that looks like the training data (common English, popular code) is cheap; text that does not is expensive.

## 4. What Makes Token Counts Go Up

| Kind of text | Why it costs more tokens |
| :--- | :--- |
| Rare words, names, product codes | No merge covers them, so they split into pieces |
| Numbers | Long numbers are split into chunks of digits; arithmetic over them gets harder |
| Code | Indentation, symbols and identifiers; whitespace handling differs per tokenizer |
| JSON and markup | Every brace, quote and key name is tokens; verbose formats are expensive |
| Many non-English languages | Less of the tokenizer training data, fewer merges for them |

The language gap is large and measured. Petrov et al., "Language Model Tokenizers Introduce Unfairness Between Languages" (NeurIPS 2023), found that translations of the same text can differ in token count **by up to about 15 times** between languages, which means unequal cost, latency and usable context for users of those languages.

📌 **Interview term: tokenizer parity** — the idea, from that paper, that the same content should take a similar number of tokens in every language. Most tokenizers fall well short of it.

## 5. Why Tokens Drive Cost, Limits and Latency

**Cost.** API pricing is per token, with input and output priced separately, and output is usually several times dearer. Prices change often, so the example uses assumed prices of **$3 per million input tokens and $15 per million output tokens** — the Sonnet-tier list price reported for Anthropic models by several pricing trackers (for example MorphLLM and MetaCTO, checked October 2026). Treat them as inputs to the arithmetic, not as a quote; check the provider pricing page before budgeting.

📌 **Interview term: input tokens vs output tokens** — input (prompt) tokens are everything you send: system prompt, history, retrieved documents, tool definitions. Output (completion) tokens are what the model generates. They are counted and billed separately.

Assumptions for a support-bot feature: 10,000 requests a day, 1,500 input tokens and 400 output tokens per request, 30 days. From the run:

~~~text
month input tokens:  450,000,000 -> $1350.00
month output tokens: 120,000,000 -> $1800.00
total $3150.00 | output is 21.1% of tokens but 57.1% of cost
same prompts in a language that needs 2.5x the tokens: $7875.00
~~~

Two levers stand out: output length matters far more than its share of tokens suggests, and a language that tokenizes 2.5 times worse multiplies the whole bill by 2.5. Turning this into a budget and controls is covered in [How do you estimate and control LLM costs in production?](/interview-question/how-do-you-estimate-and-control-llm-costs-in-production)

**Limits.** The context window ([What is a context window?](/interview-question/what-is-a-context-window-and-what-happens-when-you-exceed-it)), \`max_tokens\` and most rate limits (tokens per minute) are all counted in tokens. A prompt that is "only 50 pages" can be far over a limit depending on its language and format.

📌 **Interview term: max_tokens** — the request parameter that caps how many output tokens the model may generate. Hitting it cuts the answer off mid-sentence; it is also your main guard against runaway cost.

**Latency.** Prompt tokens are processed in parallel; output tokens are generated one at a time. With an assumed decode speed of 50 tokens per second:

~~~text
decode time for 400 output tokens at 50 tok/s: 8.0 s
~~~

Halve the answer and you roughly halve that part of the wait. More on this in [What techniques reduce LLM latency at each stage of a request?](/interview-question/what-techniques-reduce-llm-latency-at-each-stage-of-a-request)

## 6. Counting Tokens in Practice

Never estimate a budget from character counts alone once real money is involved. Use the provider's own tokenizer (not run here):

~~~python
# OpenAI models: tiktoken (pip install tiktoken)
import tiktoken
enc = tiktoken.get_encoding("o200k_base")
print(len(enc.encode("How many tokens is this sentence?")))
~~~

~~~python
# Anthropic models: the token-counting endpoint (POST /v1/messages/count_tokens)
import anthropic
client = anthropic.Anthropic()
r = client.messages.count_tokens(
    model="<model id>",
    system="You are a helpful assistant.",
    messages=[{"role": "user", "content": "How many tokens is this?"}],
)
print(r.input_tokens)
~~~

The shapes follow the OpenAI Cookbook tiktoken guide and Anthropic's "Token counting" docs page, which shows \`POST /v1/messages/count_tokens\` returning an \`input_tokens\` field (both checked October 2026). The Anthropic endpoint takes the same body as a Messages request, so it includes the system prompt, tools and images, which a plain text tokenizer would miss.

Every response also reports usage (input and output token counts). Log those per request — they are the ground truth for cost tracking ([What should you log and trace in an LLM application?](/interview-question/what-should-you-log-and-trace-in-an-llm-application)).

## 7. Verified: Running the Code

The example **"Train a tiny BPE tokenizer, count tokens and work out a monthly bill"** learns 10 BPE merges from a six-word corpus, tokenizes three phrases by replaying the merges, and then runs the cost and latency arithmetic. It stands for a real tokenizer in mechanism only: real ones start from bytes, learn tens of thousands of merges from huge corpora and handle spaces and punctuation with extra rules. The prices, traffic and decode speed are stated assumptions. The core of the training loop:

~~~js
// count adjacent pairs across the corpus, weighted by word frequency
for (const { syms, n } of vocabWords)
  for (let i = 0; i + 1 < syms.length; i++) pairs[syms[i] + " " + syms[i + 1]] = (pairs[syms[i] + " " + syms[i + 1]] || 0) + n;
// merge the most frequent pair everywhere, remember it, repeat
~~~

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
merge  1: e + w -> ew  (seen 10 times)
merge  2: n + ew -> new  (seen 10 times)
merge  3: e + s -> es  (seen 9 times)
merge  4: es + t -> est  (seen 9 times)
merge  5: est + _ -> est_  (seen 9 times)
merge  6: l + o -> lo  (seen 7 times)
merge  7: lo + w -> low  (seen 7 times)
merge  8: new + est_ -> newest_  (seen 6 times)
merge  9: i + d -> id  (seen 5 times)
merge 10: low + _ -> low_  (seen 5 times)
"newest lowest"  -> 3 tokens ["newest_","low","est_"]  chars/token=4.33
"wider widest"   -> 8 tokens ["w","id","e","r","_","w","id","est_"]  chars/token=1.50
"zebra quokka"   -> 13 tokens ["z","e","b","r","a","_","q","u","o","k","k","a","_"]  chars/token=0.92
month input tokens:  450,000,000 -> $1350.00
month output tokens: 120,000,000 -> $1800.00
total $3150.00 | output is 21.1% of tokens but 57.1% of cost
same prompts in a language that needs 2.5x the tokens: $7875.00
decode time for 400 output tokens at 50 tok/s: 8.0 s
~~~

What the run proves:

- The merge list is learned from frequency: \`ew\` and \`new\` come first because \`new\` appears in 10 word occurrences.
- Seen patterns are cheap (4.33 characters per token), unseen ones expensive (0.92 characters per token — more tokens than letters once the end-of-word markers are counted).
- With these assumptions output tokens are 21.1% of volume but 57.1% of cost.

## Edge Cases Worth Knowing

- **Hidden tokens count.** Chat templates add special tokens around every message, tool definitions are serialised into the prompt, and images are converted to tokens too. The "user message" is rarely the whole bill.
- **Reasoning tokens are output tokens.** Models that think before answering bill those thinking tokens as output, even when you do not see them ([What are reasoning models?](/interview-question/what-are-reasoning-models-and-when-should-you-use-them)).
- **Cached input is cheaper.** Repeated prompt prefixes can be billed at a discount with prompt caching ([What is prompt caching?](/interview-question/what-is-prompt-caching-and-how-does-it-reduce-cost-and-latency)).
- **Token boundaries leak into behaviour.** Letter counting, reversing strings and exact arithmetic on long numbers are harder because the model sees chunks, not characters.

## Common Pitfalls

- **Estimating cost from words or characters for non-English or code-heavy traffic.** The 4-characters rule is for English prose; measure your real traffic with the real tokenizer.
- **Ignoring output pricing.** Teams shrink prompts but leave answers verbose; with typical pricing a long answer costs more than a long prompt.
- **Not setting \`max_tokens\`.** One runaway generation, or a loop in an agent, can cost more than thousands of normal calls.
- **Comparing models on price per million tokens alone.** Different tokenizers produce different counts for the same text; compare cost per completed task.
- **Counting only the latest user message against the limit.** The whole conversation, system prompt and tool schemas are resent on every call.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">A token is the unit an LLM actually reads and writes: a whole common word, a piece of a rarer word, punctuation or raw bytes. A tokenizer with a fixed vocabulary maps text to token ids before the model sees anything.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it is built:</strong> <span style="color:#f0e2c8;">Most LLMs use subword tokenizers such as <strong style="color:#ffca28;">byte-pair encoding</strong>: start from characters or bytes and repeatedly merge the most frequent adjacent pair. Frequent words end up as one token; rare words, code and many non-English languages split into several.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Rule of thumb:</strong> <span style="color:#f0e2c8;">For English, about 4 characters or three quarters of a word per token, per OpenAI help docs. It is only an estimate: each model family has its own tokenizer, so count with the real one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Cost:</strong> <span style="color:#f0e2c8;">APIs bill input and output tokens separately, and output is usually several times dearer. With 10,000 requests a day, 1,500 input and 400 output tokens, and assumed prices of $3 and $15 per million, output is <strong style="color:#ffca28;">21% of the tokens but 57% of the $3,150 monthly bill</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Limits and speed:</strong> <span style="color:#f0e2c8;">The context window, rate limits and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_tokens</code> are all in tokens, and every output token is one sequential decode step. So I measure tokens per request, cap output, trim prompts and cache repeated prefixes.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use whole words or single characters as tokens?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Whole words need a huge vocabulary and still fail on new words, names and typos. Characters make sequences very long, which is expensive because attention cost grows with length. Subwords are the compromise: a vocabulary of tens of thousands to a few hundred thousand entries, with any string still representable from smaller pieces or bytes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why are output tokens more expensive than input tokens?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Input tokens are processed in one parallel prefill pass. Output tokens are generated one forward pass at a time, keeping the GPU and its KV cache memory busy for the whole response, so each one costs the provider more. The exact ratio is a pricing decision and varies by provider and model.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why can a model struggle to count the letters in a word?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It never sees letters, only token ids. A word like <em style="color:#d8d8d8;">strawberry</em> may be one or a few tokens, so the letter count is not directly in its input. It has to have learned the spelling of each token, which is less reliable.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you count tokens before sending a request?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use the provider tokenizer: OpenAI publishes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tiktoken</code>, and Anthropic offers a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">count_tokens</code> endpoint that takes the same body as a Messages request. Remember that the chat template, system prompt, tool definitions and images also count.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the same text cost the same on every model?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Each model family has its own tokenizer, so the same text can give different counts, and prices per token differ too. Compare on cost per task, measured with real prompts, not on price per million tokens alone.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Token | The unit of text a model reads and writes; often part of a word |
| Tokenizer | Fixed component mapping text to token ids and back |
| Vocabulary | All tokens a tokenizer knows; tens to hundreds of thousands |
| Byte-pair encoding (BPE) | Builds a vocabulary by repeatedly merging the most frequent adjacent pair |
| Subword tokenization | Splitting text into pieces between characters and words |
| Tokenizer parity | Same content taking a similar token count in every language |
| Input vs output tokens | What you send vs what the model generates; billed separately |
| max_tokens | Request cap on output tokens |

**Conclusion:** Tokens are the subword pieces a model actually reads and writes, produced by a tokenizer such as BPE that merges frequent character or byte pairs into a fixed vocabulary. Because the model, the bill, the context window, the rate limits and the response time are all measured in tokens, they are the unit an AI engineer budgets in: about four English characters each, but more for rare words, code, numbers and many other languages. The practical habits follow directly — count with the provider's tokenizer, price input and output separately (output usually dominates), cap \`max_tokens\`, keep prompts lean and cache what repeats.`,
    examples: [
      {
        label: `Train a tiny BPE tokenizer, count tokens and work out a monthly bill`,
        variants: [
          { tech: "node", code: `// Train a tiny byte-pair-encoding (BPE) tokenizer, tokenize text with it,
// then do the token arithmetic that drives cost, limits and latency.
const trainingWords = { low: 5, lower: 2, newest: 6, widest: 3, new: 4, wide: 2 };

// Every word starts as characters plus an end-of-word marker "_".
let vocabWords = Object.keys(trainingWords).map((w) => ({ syms: [...w, "_"], n: trainingWords[w] }));
const merges = [];
for (let step = 1; step <= 10; step++) {
  const pairs = {};
  for (const { syms, n } of vocabWords)
    for (let i = 0; i + 1 < syms.length; i++) {
      const key = syms[i] + " " + syms[i + 1];
      pairs[key] = (pairs[key] || 0) + n;
    }
  // Most frequent pair wins; ties go to the alphabetically smallest pair.
  const best = Object.keys(pairs).sort().reduce((a, b) => (pairs[b] > pairs[a] ? b : a));
  const [l, r] = best.split(" ");
  merges.push([l, r]);
  console.log("merge " + String(step).padStart(2) + ": " + l + " + " + r + " -> " + l + r + "  (seen " + pairs[best] + " times)");
  vocabWords = vocabWords.map(({ syms, n }) => {
    const out = [];
    for (let i = 0; i < syms.length; i++) {
      if (i + 1 < syms.length && syms[i] === l && syms[i + 1] === r) { out.push(l + r); i++; } else out.push(syms[i]);
    }
    return { syms: out, n };
  });
}

// Encoding new text = apply the learned merges, in the order they were learned.
function encodeWord(word) {
  let syms = [...word, "_"];
  for (const [l, r] of merges) {
    const out = [];
    for (let i = 0; i < syms.length; i++) {
      if (i + 1 < syms.length && syms[i] === l && syms[i + 1] === r) { out.push(l + r); i++; } else out.push(syms[i]);
    }
    syms = out;
  }
  return syms;
}
for (const text of ["newest lowest", "wider widest", "zebra quokka"]) {
  const toks = text.split(" ").flatMap(encodeWord);
  console.log(JSON.stringify(text).padEnd(16) + " -> " + toks.length + " tokens " + JSON.stringify(toks) + "  chars/token=" + (text.length / toks.length).toFixed(2));
}

// Cost arithmetic. Prices and traffic are ASSUMPTIONS for the exercise.
const priceIn = 3.0, priceOut = 15.0; // USD per 1M tokens
const reqPerDay = 10000, inTok = 1500, outTok = 400, days = 30;
const monthIn = reqPerDay * inTok * days, monthOut = reqPerDay * outTok * days;
const costIn = (monthIn / 1e6) * priceIn, costOut = (monthOut / 1e6) * priceOut;
console.log("month input tokens:  " + monthIn.toLocaleString("en-US") + " -> $" + costIn.toFixed(2));
console.log("month output tokens: " + monthOut.toLocaleString("en-US") + " -> $" + costOut.toFixed(2));
console.log("total $" + (costIn + costOut).toFixed(2) + " | output is " + ((100 * monthOut) / (monthIn + monthOut)).toFixed(1) + "% of tokens but " + ((100 * costOut) / (costIn + costOut)).toFixed(1) + "% of cost");
console.log("same prompts in a language that needs 2.5x the tokens: $" + (costIn * 2.5 + costOut * 2.5).toFixed(2));
const tokPerSec = 50; // assumed decode speed
console.log("decode time for " + outTok + " output tokens at " + tokPerSec + " tok/s: " + (outTok / tokPerSec).toFixed(1) + " s");` },
          { tech: "python", code: `# Train a tiny byte-pair-encoding (BPE) tokenizer, tokenize text with it,
# then do the token arithmetic that drives cost, limits and latency.
import json

training_words = {"low": 5, "lower": 2, "newest": 6, "widest": 3, "new": 4, "wide": 2}

# Every word starts as characters plus an end-of-word marker "_".
vocab_words = [(list(w) + ["_"], n) for w, n in training_words.items()]
merges = []


def apply_merge(syms, l, r):
    out, i = [], 0
    while i < len(syms):
        if i + 1 < len(syms) and syms[i] == l and syms[i + 1] == r:
            out.append(l + r)
            i += 2
        else:
            out.append(syms[i])
            i += 1
    return out


for step in range(1, 11):
    pairs = {}
    for syms, n in vocab_words:
        for i in range(len(syms) - 1):
            key = syms[i] + " " + syms[i + 1]
            pairs[key] = pairs.get(key, 0) + n
    # Most frequent pair wins; ties go to the alphabetically smallest pair.
    keys = sorted(pairs)
    best = keys[0]
    for k in keys[1:]:
        if pairs[k] > pairs[best]:
            best = k
    l, r = best.split(" ")
    merges.append((l, r))
    print(f"merge {str(step).rjust(2)}: {l} + {r} -> {l + r}  (seen {pairs[best]} times)")
    vocab_words = [(apply_merge(syms, l, r), n) for syms, n in vocab_words]


# Encoding new text = apply the learned merges, in the order they were learned.
def encode_word(word):
    syms = list(word) + ["_"]
    for l, r in merges:
        syms = apply_merge(syms, l, r)
    return syms


for text in ["newest lowest", "wider widest", "zebra quokka"]:
    toks = [t for w in text.split(" ") for t in encode_word(w)]
    print(json.dumps(text).ljust(16) + f" -> {len(toks)} tokens " + json.dumps(toks, separators=(",", ":")) + f"  chars/token={len(text) / len(toks):.2f}")

# Cost arithmetic. Prices and traffic are ASSUMPTIONS for the exercise.
price_in, price_out = 3.0, 15.0  # USD per 1M tokens
req_per_day, in_tok, out_tok, days = 10000, 1500, 400, 30
month_in, month_out = req_per_day * in_tok * days, req_per_day * out_tok * days
cost_in, cost_out = month_in / 1e6 * price_in, month_out / 1e6 * price_out
print(f"month input tokens:  {month_in:,} -> \${cost_in:.2f}")
print(f"month output tokens: {month_out:,} -> \${cost_out:.2f}")
print(f"total \${cost_in + cost_out:.2f} | output is {100 * month_out / (month_in + month_out):.1f}% of tokens but {100 * cost_out / (cost_in + cost_out):.1f}% of cost")
print(f"same prompts in a language that needs 2.5x the tokens: \${cost_in * 2.5 + cost_out * 2.5:.2f}")
tok_per_sec = 50  # assumed decode speed
print(f"decode time for {out_tok} output tokens at {tok_per_sec} tok/s: {out_tok / tok_per_sec:.1f} s")` },
        ],
      },
    ],
  },
  {
    title: `What is a context window and what happens when you exceed it?`,
    difficulty: "easy",
    seoDescription: `The context window is the token budget for one request, input and output together; exceed it and the API rejects the call, so the app must trim.`,
    description: `**Question presented to candidate:**
"Our chat assistant works fine in short sessions, but long conversations start failing or the bot forgets what the user said at the start. What is a context window, what exactly happens when we go over it, and how should the app handle it?"

**What a strong answer should cover:**
- The context window is the maximum number of tokens the model can attend to in one request, and it is shared: system prompt, tool definitions, the whole message history, retrieved documents, images, and the output (including any reasoning tokens) all count
- The model is stateless: chat APIs resend the full conversation on every call, so the history grows every turn until it no longer fits
- What happens on overflow: hosted APIs reject the request with a 400-style error rather than silently cutting it; truncation, if any, happens in your code or a framework, and naive truncation from the front drops the system prompt
- Handling strategies: reserve room for the output, keep the system prompt pinned, drop or summarise old turns, retrieve only the relevant documents, and count tokens before sending
- Even within the limit, long contexts cost more, add latency and recall less reliably (information in the middle is used worse — "lost in the middle")

**Clarifying questions expected:**
- Which model and context size are we on, and what \`max_tokens\` do we request?
- What must never be lost (system rules, user identifiers, earlier decisions), and can older turns be summarised?

**Code / implementation expected:** Optional — a token budget check with a trimming strategy, or pseudocode for it.`,
    answer: `**Target Audience:** Beginners building chat features, RAG or agents who have hit (or will hit) "context too long" errors.
**Difficulty:** Easy
**Verified with:** Node 22.22.0 and Python 3.12.3 (a simulated provider with a 200-token window; no real model is called). Provider behaviour is cited inline from documentation and forum reports, checked October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Picture a desk with room for exactly one stack of paper. Each time you ask your assistant a question, you have to hand over the *entire* file — the rules of the job, every earlier email, the documents they need — plus leave space on the desk for the reply they will write. They read only what is on the desk. When the file grows taller than the desk, you cannot just pile it higher: something has to come off, and you have to decide what.

That desk is the context window. The model has no memory between requests; whatever is not on the desk this time does not exist for it. Most "the bot forgot what I said" bugs and most "request failed after a long chat" bugs come from not managing that desk deliberately.

## 2. What the Context Window Is

📌 **Interview term: context window (context length)** — the maximum number of tokens a model can take into account in a single request. It is a property of the model, set by how it was trained and served.

It is **one budget shared by everything**. Anthropic's "Context windows" documentation (platform.claude.com, checked October 2026) lists what counts: the system prompt, every message (including tool results, images and documents), tool definitions, and the output generated for the turn, including extended thinking. The same page says windows are "up to 1M tokens, depending on the model". Exact sizes per model change with each release, so read them from the provider's models page rather than memorising them.

<svg class="iq-diagram" width="100%" viewBox="0 0 800 250" role="img" aria-label="A context window as one bar holding the system prompt, conversation history, retrieved documents and space reserved for the output; a new turn does not fit past the limit">
  <text class="d-sub" x="670" y="30" text-anchor="middle">window limit</text>
  <rect class="d-box-muted" x="20" y="60" width="650" height="80" rx="10"/>
  <rect class="d-box-accent" x="32" y="72" width="110" height="56" rx="8"/>
  <text class="d-text" x="87" y="97" text-anchor="middle">system</text>
  <text class="d-sub" x="87" y="117" text-anchor="middle">rules, tools</text>
  <rect class="d-box" x="160" y="72" width="200" height="56" rx="8"/>
  <text class="d-text" x="260" y="97" text-anchor="middle">history</text>
  <text class="d-sub" x="260" y="117" text-anchor="middle">every earlier turn</text>
  <rect class="d-box" x="378" y="72" width="150" height="56" rx="8"/>
  <text class="d-text" x="453" y="97" text-anchor="middle">documents</text>
  <text class="d-sub" x="453" y="117" text-anchor="middle">retrieved text</text>
  <rect class="d-box-accent" x="546" y="72" width="112" height="56" rx="8"/>
  <text class="d-text" x="602" y="97" text-anchor="middle">output</text>
  <text class="d-sub" x="602" y="117" text-anchor="middle">max_tokens</text>
  <path class="d-edge-dashed" d="M 670 42 L 670 160"/>
  <rect class="d-box-muted" x="690" y="80" width="95" height="44" rx="8"/>
  <text class="d-text" x="737" y="107" text-anchor="middle">new turn</text>
  <text class="d-sub" x="345" y="200" text-anchor="middle">input tokens + reserved output tokens</text>
  <path class="d-edge" d="M 20 175 L 670 175"/>
</svg>

The answer is written into the same window as the prompt, so the space you reserve with \`max_tokens\` is space the history can no longer use.

📌 **Interview term: stateless API** — the model keeps nothing between calls. A chat "session" is an illusion your application creates by resending the full history every time. That is why the input grows each turn — and why each turn costs more than the one before.

## 3. What Happens When You Exceed It

The model itself never sees an over-long request. The serving layer checks the token count first:

- **OpenAI** returns HTTP 400 with the code \`context_length_exceeded\` and a message stating the model's maximum and your request's size; forum reports show the requested completion tokens count toward the total (OpenAI developer community threads "Error 400: Maximum context length exceeded", checked October 2026).
- **Anthropic** returns a 400 \`invalid_request_error\` reading "prompt is too long: N tokens > M maximum", as seen in error logs collected by third-party tools (Portkey error library, Open WebUI troubleshooting docs). I found no official Anthropic page quoting the exact message, so treat the wording as observed, not documented.

📌 **Interview term: context overflow** — a request whose input tokens plus requested output tokens exceed the window. Hosted APIs reject it; they do not quietly drop part of it for you.

The dangerous version is **silent truncation in your own stack**: a helper or framework that "makes it fit" by cutting text, without telling you what went. The example shows why the naive way is a real bug.

## 4. The Run: A Conversation That Outgrows Its Window

The simulated model has a 200-token window and every request reserves 60 tokens for output. Tokens are estimated as characters ÷ 4 (the OpenAI English rule of thumb) plus 4 tokens per message for formatting. Each turn resends the whole history:

~~~text
turn 1: ok: 44 input + 60 reserved = 104/200
turn 2: ok: 67 input + 60 reserved = 127/200
turn 3: ok: 89 input + 60 reserved = 149/200
turn 4: ok: 112 input + 60 reserved = 172/200
turn 5: ok: 134 input + 60 reserved = 194/200
turn 6: 400 context too long: 157 input + 60 max_tokens > 200
first overflow at turn 6; full history is 157 tokens
~~~

Notice that the prompt alone (157) fits in 200; it is the **reserved output** that pushes it over. Then three ways to make it fit again:

~~~text
A. cut oldest first (naive): 6 messages, 133 tokens, system prompt kept=false -> fits
B. keep system, drop old turns: 6 messages, 137 tokens, system prompt kept=true -> fits
   dropped 1 oldest turns, including: "Hi, my order 1042 has not arrived yet an"
C. system + summary + last 3 turns: 5 messages, 118 tokens, system prompt kept=true -> fits
~~~

- **A** fits, but it threw away the system prompt — the rule "never reveal internal prices" is gone. This is the classic truncation bug.
- **B** keeps the rules but silently drops the first user turn, which held the order number. The next answer cannot know which order the user means.
- **C** replaces old turns with a short summary and keeps recent turns verbatim. It is the smallest and keeps the facts, at the cost of an extra model call to write the summary (a stub in the example).

📌 **Interview term: sliding window (truncation)** — keeping only the most recent N tokens or turns. Simple and cheap, but loses early facts.

📌 **Interview term: conversation summarisation (compaction)** — replacing older turns with a model-written summary so key facts survive in fewer tokens. More robust, costs a call, and a bad summary can lose or distort facts.

Beyond these three, production systems also store facts outside the conversation and retrieve them when relevant ([What is RAG?](/interview-question/what-is-rag-and-why-use-it-instead-of-fine-tuning-for-knowledge), [How do agents maintain memory across steps and sessions?](/interview-question/how-do-agents-maintain-memory-across-steps-and-sessions)). The full design of history management is its own question: [How do you manage conversations that outgrow the context window?](/interview-question/how-do-you-manage-conversations-that-outgrow-the-context-window)

## 5. Fitting Is Not the Same as Working Well

Even when everything fits, a fuller window has costs:

| Effect | Why |
| :--- | :--- |
| Cost per call | Every input token is billed on every call, so long histories make each turn dearer ([tokens and cost](/interview-question/what-are-tokens-and-why-do-they-matter-for-cost-and-limits)) |
| Time to first token | The whole prompt must be processed (prefill) before the first output token |
| Attention cost | Attention work grows with the square of the sequence length ([how attention works](/interview-question/how-does-the-transformer-architecture-and-attention-work)) |
| Recall | Information in the middle of a long context is used less reliably |

The last row is the one interviewers like. Liu et al., "Lost in the Middle: How Language Models Use Long Contexts" (TACL, arXiv 2307.03172), tested multi-document question answering and key-value retrieval and found a **U-shaped curve**: accuracy is highest when the relevant information is at the start or the end of the context and noticeably lower when it is in the middle, and it falls as the context grows, even for models built for long inputs.

📌 **Interview term: lost in the middle** — the measured tendency of models to use information at the beginning and end of a long context better than information in the middle. The practical response: put instructions and the most relevant material at the edges, and send less rather than more.

How to work with today's very large windows without drowning in them is covered in [Context windows in 2025-26: how do you use 128k-1M tokens without drowning?](/interview-question/context-windows-in-2025-26-how-do-you-use-128k-1m-tokens-without-drowning)

## 6. A Budget Check in Real Code

The core of the example is a budget check before every call. Against a real provider, use its token counter rather than characters ÷ 4 (not run here; endpoint shape from Anthropic's "Token counting" docs, checked October 2026):

~~~python
import anthropic
client = anthropic.Anthropic()
WINDOW, MAX_TOKENS = 200_000, 4_000   # read the window size from the provider docs for your model

def fits(system, messages):
    n = client.messages.count_tokens(model="<model id>", system=system, messages=messages).input_tokens
    return n + MAX_TOKENS <= WINDOW

while not fits(system, messages):
    messages = messages[2:]   # drop the oldest user/assistant pair; never the system prompt
~~~

For OpenAI models the same check uses \`tiktoken\` to count locally. Either way, also read the \`usage\` block of each response and track how full typical requests are.

## 7. Verified: Running the Code

The example **"A token budget: when a growing chat overflows, and three ways to make it fit"** simulates a provider in-process: a function that adds up estimated tokens and returns a 400-style error when input plus \`max_tokens\` exceeds a 200-token window. It stands for the API's server-side length check; it leaves out the real tokenizer (characters ÷ 4 is a heuristic), real window sizes and the model call itself. The summary in strategy C is a fixed string standing in for a model-written one. The key check:

~~~js
function callModel(msgs) {
  const input = total(msgs);
  if (input + MAX_TOKENS > WINDOW)
    return { ok: false, error: "400 context too long: " + input + " input + " + MAX_TOKENS + " max_tokens > " + WINDOW };
  return { ok: true, info: "ok: " + input + " input + " + MAX_TOKENS + " reserved = " + (input + MAX_TOKENS) + "/" + WINDOW };
}
~~~

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
turn 1: ok: 44 input + 60 reserved = 104/200
turn 2: ok: 67 input + 60 reserved = 127/200
turn 3: ok: 89 input + 60 reserved = 149/200
turn 4: ok: 112 input + 60 reserved = 172/200
turn 5: ok: 134 input + 60 reserved = 194/200
turn 6: 400 context too long: 157 input + 60 max_tokens > 200
first overflow at turn 6; full history is 157 tokens
A. cut oldest first (naive): 6 messages, 133 tokens, system prompt kept=false -> fits
B. keep system, drop old turns: 6 messages, 137 tokens, system prompt kept=true -> fits
   dropped 1 oldest turns, including: "Hi, my order 1042 has not arrived yet an"
C. system + summary + last 3 turns: 5 messages, 118 tokens, system prompt kept=true -> fits
~~~

## Edge Cases Worth Knowing

- **The output can be cut short without any error.** If the request fits but the answer needs more than \`max_tokens\`, generation stops at the cap. Check the stop reason (\`length\` / \`max_tokens\`) instead of assuming the answer is complete.
- **Tool results and images are large.** One tool call that returns a big JSON blob, or a few images, can eat most of a window in a single turn. Trim tool output before putting it back in context.
- **Agents grow faster than chats.** Every tool call and result is appended to the history, so an agent loop can hit the window within one task.
- **Prompt caching does not enlarge the window.** Cached tokens are cheaper and faster, but they still count toward the limit, per Anthropic's context-window docs.

## Common Pitfalls

- **Truncating from the front of the whole message list.** It deletes the system prompt first. Always pin system instructions and trim only history.
- **Forgetting to reserve output space.** Checking only the prompt size leads to errors exactly when users write long messages.
- **Assuming the model remembers earlier sessions.** It does not; anything it needs must be in the request.
- **Filling a big window because it is there.** Larger context means higher cost and latency per call and weaker recall of the middle; retrieval or summarisation usually gives better answers.
- **Estimating with characters ÷ 4 in production.** Fine for a toy, wrong for code, JSON and many languages; use the provider counter near the limit.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">The context window is the maximum number of tokens a model can take into account in one request. It is one shared budget: system prompt, tool definitions, the full message history, retrieved documents and the <strong style="color:#ffca28;">output</strong> all have to fit.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Stateless:</strong> <span style="color:#f0e2c8;">The model remembers nothing between calls; the app resends the whole conversation each time. So the input grows every turn until input plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_tokens</code> no longer fits.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. On overflow:</strong> <span style="color:#f0e2c8;">Hosted APIs reject the request with a 400-style error, such as OpenAI's <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">context_length_exceeded</code>. Nothing is silently cut by the model; if anything is cut, it is my code or a framework doing it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Handling:</strong> <span style="color:#f0e2c8;">I count tokens before sending, reserve room for the answer, pin the system prompt, then drop or <strong style="color:#ffca28;">summarise</strong> the oldest turns and retrieve only the relevant documents. Naive front truncation is a bug: it deletes the system prompt first.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Even if it fits:</strong> <span style="color:#f0e2c8;">Long contexts cost more, add time to first token and are used less reliably: models recall facts at the start and end of the context better than in the middle, the <em style="color:#f0e2c8;">lost in the middle</em> effect.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does max_tokens count against the context window?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. The output is generated into the same window, so input plus the requested output must fit. Raising <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_tokens</code> can make a request fail even though the prompt alone fits. Anthropic docs also count extended thinking output toward the window.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If a model has a 1M-token window, why not just send everything?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Cost and latency scale with input tokens on every single call, and quality degrades: relevant facts buried in the middle of a huge context are used less reliably. Retrieval or summarisation that sends 5,000 good tokens usually beats 500,000 mixed ones.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why did the bot forget the order number the user gave at the start?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Most likely the app dropped the oldest turns to fit the budget. In this doc, keeping the system prompt and dropping old turns fitted the request but removed the turn with order <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1042</code>. A summary or extracted facts kept outside the history would have preserved it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the context window the same as the model memory?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Weights hold what the model learned in training; the context window is working memory for one request. Long-term memory across sessions is something the application builds, for example by storing facts and retrieving them into the context.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know how close you are to the limit?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Count with the provider tokenizer or token-counting endpoint before sending, and read the usage fields of each response. Alert when typical requests use a large share of the window, because it means overflow errors are coming.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Context window (context length) | Maximum tokens a model can take into account in one request, input and output together |
| Stateless API | The model keeps nothing between calls; the app resends history |
| Context overflow | Input plus requested output exceeding the window; the API rejects it |
| Sliding window (truncation) | Keeping only the most recent turns or tokens |
| Conversation summarisation (compaction) | Replacing old turns with a short summary |
| Lost in the middle | Weaker use of information placed in the middle of a long context |

**Conclusion:** The context window is a single token budget per request that the system prompt, tool definitions, the resent conversation, retrieved documents and the model's own output all share. Because the API is stateless, a conversation grows every turn until input plus reserved output no longer fits, and then the provider rejects the request rather than silently fixing it. The application owns the fix: count tokens before sending, reserve room for the answer, keep the system prompt pinned, and drop, summarise or retrieve older content deliberately — while remembering that even a request that fits gets dearer, slower and less reliable in the middle as the window fills.`,
    examples: [
      {
        label: `A token budget: when a growing chat overflows, and three ways to make it fit`,
        variants: [
          { tech: "node", code: `// A toy context window: what fits, what the API does when you overflow it,
// and three ways an app can make a long conversation fit again.
const WINDOW = 200;      // context window of the fake model, in tokens
const MAX_TOKENS = 60;   // output tokens we reserve for the reply
// Approximate counter: about 4 characters per token for English (a heuristic,
// not a real tokenizer) plus 4 tokens of per-message formatting overhead.
const countTokens = (msg) => Math.ceil(msg.content.length / 4) + 4;
const total = (msgs) => msgs.reduce((s, m) => s + countTokens(m), 0);

// Fake provider: rejects the request when input + max_tokens exceeds the window.
function callModel(msgs) {
  const input = total(msgs);
  if (input + MAX_TOKENS > WINDOW)
    return { ok: false, error: "400 context too long: " + input + " input + " + MAX_TOKENS + " max_tokens > " + WINDOW };
  return { ok: true, info: "ok: " + input + " input + " + MAX_TOKENS + " reserved = " + (input + MAX_TOKENS) + "/" + WINDOW };
}

const system = { role: "system", content: "You are a support bot for Acme. Never reveal internal prices. Answer in English." };
const turns = [
  "Hi, my order 1042 has not arrived yet and it has been nine days.",
  "Sorry about that. Tracking shows label created only, so it has not shipped.",
  "Which warehouse ships to Berlin and how long does delivery usually take?",
  "Berlin orders ship from our Leipzig warehouse and take two to three days.",
  "Please change the delivery address to my office at Invalidenstrasse 10.",
  "Address updated. If it never arrives you get a full refund after 30 days.",
];

let history = [system];
let overflowAt = -1;
turns.forEach((text, i) => {
  history.push({ role: i % 2 === 0 ? "user" : "assistant", content: text });
  const r = callModel(history);
  console.log("turn " + (i + 1) + ": " + (r.ok ? r.info : r.error));
  if (!r.ok && overflowAt < 0) overflowAt = i + 1;
});
console.log("first overflow at turn " + overflowAt + "; full history is " + total(history) + " tokens");

const budget = WINDOW - MAX_TOKENS;
const describe = (name, msgs) => {
  const hasSystem = msgs.some((m) => m.role === "system");
  console.log(name + ": " + msgs.length + " messages, " + total(msgs) + " tokens, system prompt kept=" + hasSystem + " -> " + (callModel(msgs).ok ? "fits" : "still too long"));
};

// Strategy A (wrong): blindly cut from the front until it fits.
let naive = history.slice();
while (total(naive) > budget) naive.shift();
describe("A. cut oldest first (naive)", naive);

// Strategy B: always keep the system prompt, drop the oldest turns.
let keep = history.slice(1);
while (total([system, ...keep]) > budget) keep.shift();
describe("B. keep system, drop old turns", [system, ...keep]);
console.log("   dropped " + (history.length - 1 - keep.length) + " oldest turns, including: " + JSON.stringify(history[1].content.slice(0, 40)));

// Strategy C: replace the oldest turns with a short summary (a stub here; a
// real app would ask a model to write it) and keep the recent turns verbatim.
const recent = history.slice(-3);
const summary = { role: "system", content: "Summary: order 1042 is late and not shipped; user asked which warehouse serves Berlin." };
describe("C. system + summary + last 3 turns", [system, summary, ...recent]);` },
          { tech: "python", code: `# A toy context window: what fits, what the API does when you overflow it,
# and three ways an app can make a long conversation fit again.
import json
import math

WINDOW = 200      # context window of the fake model, in tokens
MAX_TOKENS = 60   # output tokens we reserve for the reply


# Approximate counter: about 4 characters per token for English (a heuristic,
# not a real tokenizer) plus 4 tokens of per-message formatting overhead.
def count_tokens(msg):
    return math.ceil(len(msg["content"]) / 4) + 4


def total(msgs):
    return sum(count_tokens(m) for m in msgs)


# Fake provider: rejects the request when input + max_tokens exceeds the window.
def call_model(msgs):
    inp = total(msgs)
    if inp + MAX_TOKENS > WINDOW:
        return {"ok": False, "error": f"400 context too long: {inp} input + {MAX_TOKENS} max_tokens > {WINDOW}"}
    return {"ok": True, "info": f"ok: {inp} input + {MAX_TOKENS} reserved = {inp + MAX_TOKENS}/{WINDOW}"}


system = {"role": "system", "content": "You are a support bot for Acme. Never reveal internal prices. Answer in English."}
turns = [
    "Hi, my order 1042 has not arrived yet and it has been nine days.",
    "Sorry about that. Tracking shows label created only, so it has not shipped.",
    "Which warehouse ships to Berlin and how long does delivery usually take?",
    "Berlin orders ship from our Leipzig warehouse and take two to three days.",
    "Please change the delivery address to my office at Invalidenstrasse 10.",
    "Address updated. If it never arrives you get a full refund after 30 days.",
]

history = [system]
overflow_at = -1
for i, text in enumerate(turns):
    history.append({"role": "user" if i % 2 == 0 else "assistant", "content": text})
    r = call_model(history)
    print(f"turn {i + 1}: " + (r["info"] if r["ok"] else r["error"]))
    if not r["ok"] and overflow_at < 0:
        overflow_at = i + 1
print(f"first overflow at turn {overflow_at}; full history is {total(history)} tokens")

budget = WINDOW - MAX_TOKENS


def describe(name, msgs):
    has_system = "true" if any(m["role"] == "system" for m in msgs) else "false"
    fits = "fits" if call_model(msgs)["ok"] else "still too long"
    print(f"{name}: {len(msgs)} messages, {total(msgs)} tokens, system prompt kept={has_system} -> {fits}")


# Strategy A (wrong): blindly cut from the front until it fits.
naive = history[:]
while total(naive) > budget:
    naive.pop(0)
describe("A. cut oldest first (naive)", naive)

# Strategy B: always keep the system prompt, drop the oldest turns.
keep = history[1:]
while total([system] + keep) > budget:
    keep.pop(0)
describe("B. keep system, drop old turns", [system] + keep)
print(f"   dropped {len(history) - 1 - len(keep)} oldest turns, including: {json.dumps(history[1]['content'][:40])}")

# Strategy C: replace the oldest turns with a short summary (a stub here; a
# real app would ask a model to write it) and keep the recent turns verbatim.
recent = history[-3:]
summary = {"role": "system", "content": "Summary: order 1042 is late and not shipped; user asked which warehouse serves Berlin."}
describe("C. system + summary + last 3 turns", [system, summary] + recent)` },
        ],
      },
    ],
  },
  {
    title: `What is the difference between a base model, an instruction-tuned model and a chat model?`,
    difficulty: "medium",
    seoDescription: `A base model continues text; instruction tuning teaches it to follow requests and stop; a chat model adds roles and a chat template for multi-turn use.`,
    description: `**Question presented to candidate:**
"Model hubs list the same model as a base version and an instruct or chat version. What is actually different between a base model, an instruction-tuned model and a chat model, and which one would you pick for a product feature?"

**What a strong answer should cover:**
- A base model is the output of pretraining: a next-token predictor that continues documents; it does not reliably answer, follow instructions or stop
- An instruction-tuned model is the same network after supervised fine-tuning on (instruction, response) examples, usually followed by preference tuning (RLHF or DPO); it learns the habit of answering, a format and when to stop
- A chat model is instruction-tuned on multi-turn conversations with roles (system, user, assistant) encoded by a chat template with special tokens; the serving stack or \`apply_chat_template\` must reproduce that exact format
- Post-training changes behaviour more than knowledge: InstructGPT showed human raters preferred a 1.3B instruction-tuned model over the 175B GPT-3 base model
- When to use which: chat or instruct models for almost all product work; base models for further fine-tuning, pure completion tasks, few-shot pattern continuation and research
- In practice the names blur: most open-weight "Instruct" releases are chat models with a template, and hosted APIs serve only post-trained chat models

**Code / implementation expected:** Optional — showing how a chat template turns messages into one token string, or how a base model continues a prompt instead of answering it.`,
    answer: `**Target Audience:** Engineers choosing models from a hub or an API who see "base", "instruct" and "chat" variants and want to know what actually differs.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (a back-off n-gram model trained on raw text, then on templated conversations; no real model is called). Paper and documentation facts are cited inline, checked October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Imagine someone who has read every book in a huge library but never had a conversation. Hand them a page that says "What is the capital of Spain?" and ask them to carry on writing. They might write the next line of the quiz book: "What is the capital of Italy?" That is a perfectly good continuation of the page. It is just not an answer.

Now coach that same reader for a few weeks with examples of questions followed by good answers, and with feedback on which answers people liked. They know no more facts than before, but now they *respond*: they answer, in a sensible format, and stop when they are done. Finally, teach them the etiquette of a meeting transcript — who is speaking, where each turn ends, that a moderator's instructions come first — and they can hold a conversation.

Those are the three stages: **base model**, **instruction-tuned model**, **chat model**. Picking the wrong one for a job, or talking to a chat model in the wrong format, produces the most baffling LLM bugs.

## 2. The Three Stages

<svg class="iq-diagram" width="100%" viewBox="0 0 800 330" role="img" aria-label="Three stages: a base model from pretraining continues text, an instruction-tuned model answers requests, and a chat model handles multi-turn conversations with roles">
  <defs>
    <marker id="ai01q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="200" height="90" rx="10"/>
  <text class="d-text" x="120" y="66" text-anchor="middle">base model</text>
  <text class="d-sub" x="120" y="92" text-anchor="middle">pretraining on raw text</text>
  <rect class="d-box" x="300" y="30" width="200" height="90" rx="10"/>
  <text class="d-text" x="400" y="66" text-anchor="middle">instruction-tuned</text>
  <text class="d-sub" x="400" y="92" text-anchor="middle">+ SFT, preferences</text>
  <rect class="d-box-accent" x="580" y="30" width="200" height="90" rx="10"/>
  <text class="d-text" x="680" y="66" text-anchor="middle">chat model</text>
  <text class="d-sub" x="680" y="92" text-anchor="middle">+ roles, chat template</text>
  <path class="d-edge" d="M 224 75 L 294 75" marker-end="url(#ai01q5-arrow)"/>
  <path class="d-edge" d="M 504 75 L 574 75" marker-end="url(#ai01q5-arrow)"/>
  <rect class="d-box-muted" x="20" y="190" width="200" height="110" rx="10"/>
  <text class="d-sub" x="120" y="226" text-anchor="middle">continues the page</text>
  <text class="d-text" x="120" y="256" text-anchor="middle">what is the capital</text>
  <text class="d-text" x="120" y="280" text-anchor="middle">of italy ?</text>
  <rect class="d-box-muted" x="300" y="190" width="200" height="110" rx="10"/>
  <text class="d-sub" x="400" y="226" text-anchor="middle">answers, then stops</text>
  <text class="d-text" x="400" y="256" text-anchor="middle">Madrid is the</text>
  <text class="d-text" x="400" y="280" text-anchor="middle">capital of Spain.</text>
  <rect class="d-box-muted" x="580" y="190" width="200" height="110" rx="10"/>
  <text class="d-sub" x="680" y="226" text-anchor="middle">knows whose turn it is</text>
  <text class="d-text" x="680" y="256" text-anchor="middle">system, user,</text>
  <text class="d-text" x="680" y="280" text-anchor="middle">assistant turns</text>
  <path class="d-edge-dashed" d="M 120 124 L 120 184" marker-end="url(#ai01q5-arrow)"/>
  <path class="d-edge-dashed" d="M 400 124 L 400 184" marker-end="url(#ai01q5-arrow)"/>
  <path class="d-edge-dashed" d="M 680 124 L 680 184" marker-end="url(#ai01q5-arrow)"/>
</svg>

Each stage is the same network trained further; what changes is how it behaves when given a prompt.

### Base model

📌 **Interview term: base model (pretrained model, foundation model)** — the network as it comes out of pretraining on a huge text corpus. It predicts the next token of a document. It has knowledge and fluency, but no notion of "a request" or "an answer", and no habit of stopping. The mechanism is in [What is a Large Language Model and how does it generate text?](/interview-question/what-is-a-large-language-model-and-how-does-it-generate-text)

### Instruction-tuned model

📌 **Interview term: instruction tuning (supervised fine-tuning, SFT)** — continuing to train the base model on curated examples of an instruction followed by a good response. The loss is still next-token prediction; only the data changes. The model learns the *pattern* "request, then helpful answer, then end".

📌 **Interview term: preference tuning** — a further stage that learns from comparisons (answer A was better than answer B) rather than from single demonstrations, using methods such as RLHF or DPO. It shapes helpfulness, tone, refusals and safety. The details are in [What are RLHF and DPO, and how do they turn a base model into an assistant?](/interview-question/what-are-rlhf-and-dpo-and-how-do-they-turn-a-base-model-into-an-assistant)

The landmark result is InstructGPT (Ouyang et al., "Training language models to follow instructions with human feedback", NeurIPS 2022, arXiv 2203.02155): human raters **preferred outputs from a 1.3B-parameter instruction-tuned model over the 175B-parameter GPT-3 base model**, despite more than 100 times fewer parameters. Post-training changes how usable a model is far more than its size does.

### Chat model

📌 **Interview term: chat model** — an instruction-tuned model trained specifically on multi-turn conversations with roles: a system message, then alternating user and assistant turns. It learns to track who said what, to give the system message priority, and to end each of its turns cleanly.

📌 **Interview term: chat template** — the exact text format that turns a list of messages into the single token sequence the model was trained on, using special tokens to mark roles and turn boundaries. ChatML, for example, wraps each message in \`<|im_start|>role ... <|im_end|>\`. Hugging Face Transformers stores the template with the tokenizer and applies it with \`apply_chat_template\`; its \`add_generation_prompt=True\` option appends the opening of an assistant turn, and the docs warn that without it the model may continue the user's message instead of replying (Transformers "Chat templates" docs, checked October 2026).

📌 **Interview term: special tokens** — vocabulary entries that never appear in normal text, such as turn markers and the end-of-sequence token. They give the model unambiguous structure; a chat model's "stop" is simply generating its end-of-turn token.

## 3. The Same Question, Three Ways (Run)

The example trains one tiny "model" — a back-off n-gram that predicts the next token from the longest context it has seen — twice. First only on web-style text (the base model). Then on the same text plus two conversations rendered with a ChatML-style template, repeated for three epochs (the chat model). This is what one training conversation looks like to the model:

~~~text
one training conversation as the model sees it:
  <|im_start|> user what is the capital of spain ? <|im_end|> <|im_start|> assistant madrid is the capital of spain . <|im_end|>
~~~

Ask both the same question:

~~~text
BASE, raw prompt   -> what is the capital of italy ? quiz books list questions like these .   [hit max 14 tokens]
chat prompt string -> <|im_start|> user what is the capital of spain ? <|im_end|> <|im_start|> assistant
BASE, chat prompt  -> (nothing)   [no known context]
CHAT, chat prompt  -> madrid is the capital of spain .   [stop token <|im_end|>]
~~~

Three behaviours a real base and chat model show too:

1. **The base model continues the document.** In its training text a question is followed by another question, so that is what it writes — until it hits the length limit.
2. **The base model does not understand the template.** It never saw the special tokens, so the toy has nothing to go on. A real base model would produce something odd instead of an answer.
3. **The chat model answers and stops.** It emits the end-of-turn token, which the serving code treats as the stop signal.

The reason is visible in the counts. After the words \`is the capital of spain .\`, the base model only ever saw the text carry on to the next sentence; fine-tuning added three examples where the turn ends there:

~~~text
after 'is the capital of spain .'  base counts: rome:1 | chat counts: <|im_end|>:3 rome:1
~~~

Fine-tuning did not add new facts about Spain — the base text already contained "madrid is the capital of spain". It changed the *behaviour around* the facts: when to answer and when to stop. Honest caveat: the toy memorises its two conversations, while a real chat model generalises the answering behaviour to questions it never saw in fine-tuning. That generalisation is the part a counting model cannot show.

## 4. Side by Side

| | Base model | Instruction-tuned model | Chat model |
| :--- | :--- | :--- | :--- |
| Training | Pretraining only | + SFT on instruction/response pairs, usually + preference tuning | + multi-turn conversations with roles and a template |
| Given "What is X?" | Continues the text, may ask more questions | Answers | Answers, aware of earlier turns and the system message |
| Stops by itself | Rarely; needs stop sequences or \`max_tokens\` | Yes, end-of-sequence token | Yes, end-of-turn token |
| Prompt format | Plain text, ideally a pattern to continue | An instruction, often in a template | Must use its exact chat template |
| Typical use | Fine-tuning starting point, completion, research | Single-turn tasks | Products, assistants, agents |
| Where you meet it | Open-weight releases (for example Meta's Llama 3 shipped base and instruction-tuned variants of each size, Hugging Face launch post, April 2024) | Mostly older or specialised releases | Every hosted chat API; most open-weight "-Instruct" releases |

In practice the line between the last two columns has blurred: a model named "Instruct" today is almost always chat-tuned and ships a chat template. The meaningful split in an interview is **base vs post-trained**, plus knowing that the chat format is part of the model.

📌 **Interview term: post-training** — every training stage after pretraining (SFT, preference tuning, safety training). It mostly changes behaviour, format and alignment, while knowledge mostly comes from pretraining.

## 5. Choosing Which One to Use

- **Building a product feature:** a chat model. Hosted APIs (OpenAI, Anthropic, Google) only serve post-trained chat models, and you talk to them through a messages API that applies the template for you.
- **Self-hosting an open-weight model for chat:** the instruct/chat variant, and you must apply its chat template exactly (via \`apply_chat_template\` or your inference server). A wrong template is a silent quality bug, not an error. More in [How do you choose between open-weight models and proprietary API models?](/interview-question/how-do-you-choose-between-open-weight-models-and-proprietary-api-models)
- **Fine-tuning your own behaviour:** usually start from the instruct model to keep its instruction following; start from the base model when you want full control of format and style, or the assistant habits get in the way. See [What is the difference between fine-tuning, LoRA and prompt engineering?](/interview-question/what-is-the-difference-between-fine-tuning-lora-and-prompt-engineering)
- **Pure continuation or pattern tasks** (autocomplete, generating text in the style of a corpus, few-shot formats): a base model can be better, because it has no assistant voice and is not biased toward refusing or chatting. Few-shot prompting is covered in [What is the difference between zero-shot, one-shot and few-shot prompting?](/interview-question/what-is-the-difference-between-zero-shot-one-shot-and-few-shot-prompting)

### What the template looks like in real code (not run here)

~~~python
# Hugging Face Transformers: render messages with the model's own chat template
from transformers import AutoTokenizer
tok = AutoTokenizer.from_pretrained("<instruct model id>")
messages = [
    {"role": "system", "content": "You are a concise assistant."},
    {"role": "user", "content": "What is the capital of Spain?"},
]
prompt = tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
print(prompt)   # the exact string, special tokens included, the model was tuned on
~~~

The Transformers docs also warn that if you render with \`tokenize=False\` and tokenize later, you should pass \`add_special_tokens=False\` so special tokens are not added twice.

## 6. Verified: Running the Code

The example **"Base vs chat in miniature: the same n-gram model before and after training on templated conversations"** builds a back-off n-gram (up to 6 tokens of context) as the stand-in for a language model, a ChatML-style \`render()\` function as the chat template, and greedy generation that stops at \`<|im_end|>\`. It stands for the mechanism of fine-tuning on templated data; it leaves out real neural networks, generalisation and preference tuning. The template function:

~~~js
const render = (messages, addGenerationPrompt) =>
  messages.map((m) => "<|im_start|> " + m.role + " " + m.content + " <|im_end|>").join(" ") +
  (addGenerationPrompt ? " <|im_start|> assistant" : "");
~~~

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
one training conversation as the model sees it:
  <|im_start|> user what is the capital of spain ? <|im_end|> <|im_start|> assistant madrid is the capital of spain . <|im_end|>
BASE, raw prompt   -> what is the capital of italy ? quiz books list questions like these .   [hit max 14 tokens]
chat prompt string -> <|im_start|> user what is the capital of spain ? <|im_end|> <|im_start|> assistant
BASE, chat prompt  -> (nothing)   [no known context]
CHAT, chat prompt  -> madrid is the capital of spain .   [stop token <|im_end|>]
after 'is the capital of spain .'  base counts: rome:1 | chat counts: <|im_end|>:3 rome:1
~~~

## Edge Cases Worth Knowing

- **Template mismatches fail silently.** A missing newline, a wrong role name or a doubled beginning-of-sequence token still runs; answers just get worse. Compare your rendered prompt with the model card's.
- **Multiple stop tokens.** Some models end a turn with one special token and the whole sequence with another; the inference server must treat both as stops or output runs on.
- **Fine-tuning a chat model with the wrong template** teaches it a new format and can damage its existing chat behaviour. Train with the same template you will serve with.
- **System prompt support varies.** Some open-weight templates have no system role and fold it into the first user message; check before relying on it ([What belongs in the system prompt versus the user message?](/interview-question/what-belongs-in-the-system-prompt-versus-the-user-message)).

## Common Pitfalls

- **Saying instruction tuning adds knowledge.** It mainly changes behaviour; to add knowledge, use retrieval or much larger training runs ([What is RAG?](/interview-question/what-is-rag-and-why-use-it-instead-of-fine-tuning-for-knowledge)).
- **Prompting a base model with a bare instruction** and concluding it is "dumb". It is continuing a document; give it a pattern to continue.
- **Building prompt strings by hand for a self-hosted chat model.** Use the tokenizer's chat template; hand-written formats drift from what the model was trained on.
- **Equating "chat model" with "RLHF model".** Chat format comes from SFT on conversations; preference tuning is a separate stage that most chat models also have.
- **Forgetting the difference when evaluating.** Benchmarks run on base models with few-shot prompts are not comparable to chat-model scores with instructions.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Base model:</strong> <span style="color:#f0e2c8;">A base model is what pretraining produces: a next-token predictor over a huge corpus. Given a question it <strong style="color:#ffca28;">continues the document</strong>, which may mean writing more questions, and it has no habit of stopping.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Instruction-tuned:</strong> <span style="color:#f0e2c8;">Instruction tuning is supervised fine-tuning of that same network on (instruction, response) pairs, usually followed by preference tuning such as RLHF or DPO. It teaches behaviour: answer the request, in a format, then emit an end token.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Chat model:</strong> <span style="color:#f0e2c8;">A chat model is instruction-tuned on <strong style="color:#ffca28;">multi-turn conversations</strong> with roles. Each turn is wrapped in special tokens by a <strong style="color:#ffca28;">chat template</strong>, for example ChatML <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;|im_start|&gt;</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;|im_end|&gt;</code>, and the prompt must use that exact template.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Knowledge vs behaviour:</strong> <span style="color:#f0e2c8;">Post-training changes behaviour far more than knowledge. In InstructGPT, raters preferred the 1.3B instruction-tuned model over the 175B GPT-3 base model. Facts still come mostly from pretraining.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Which to use:</strong> <span style="color:#f0e2c8;">For products I use a chat or instruct model; hosted APIs only serve those. I would pick a <strong style="color:#ffca28;">base</strong> model to fine-tune my own behaviour on top, for pure completion or few-shot pattern tasks, or for research.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What goes wrong if you send a chat model a prompt without its chat template?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It sees text in a format it was not tuned on, so it may continue the user message, answer in the wrong voice, or not stop. The Hugging Face docs warn that without the generation prompt the model may continue the user message instead of replying. Use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">apply_chat_template</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">add_generation_prompt=True</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you get a base model to answer questions?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, by making the answer the natural continuation: a few-shot prompt such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Q: ... A: ...</code> repeated a few times, then your question and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">A:</code>. It works because the model continues the pattern, not because it follows instructions, so you also need a stop sequence.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is instruction tuning the same as RLHF?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Instruction tuning usually means supervised fine-tuning on demonstrations. RLHF and DPO are a later preference stage that learns from comparisons of good and bad answers. Most assistants use both, SFT first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why would anyone fine-tune from a base model rather than the chat model?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The base model has no assistant habits to fight, so a narrow format, style or domain behaviour can be taught cleanly. Starting from the chat model keeps its instruction following and safety training, which is usually what product teams want, at the cost of some flexibility.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the system prompt exist inside the model?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It is just another message rendered into the token sequence by the chat template, usually with its own role marker. Models are trained to give it weight, which is why it steers behaviour, but it is not a separate channel or a guarantee.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Base model (pretrained / foundation model) | The pretrained next-token predictor; continues documents |
| Instruction tuning (SFT) | Fine-tuning on instruction/response examples so the model answers |
| Preference tuning | Learning from comparisons of answers (RLHF, DPO) |
| Chat model | Instruction-tuned on multi-turn, role-tagged conversations |
| Chat template | The exact format that renders messages into one token sequence |
| Special tokens | Reserved tokens marking roles, turn ends and sequence ends |
| Post-training | All training after pretraining; mostly changes behaviour |

**Conclusion:** All three are the same kind of network at different points in its training. A base model is the pretrained next-token predictor: knowledgeable, fluent, and inclined to continue whatever document it is given. Instruction tuning, usually followed by preference tuning, teaches it to answer and stop, and a chat model is that behaviour learned over multi-turn, role-tagged conversations, rendered by a chat template whose special tokens are part of the model's contract. For product work you use a post-trained chat model through its exact template; you reach for a base model when you want to fine-tune your own behaviour on top or need pure continuation — and in every case, remember that post-training mostly changes behaviour, while the knowledge came from pretraining.`,
    examples: [
      {
        label: `Base vs chat in miniature: the same n-gram model before and after training on templated conversations`,
        variants: [
          { tech: "node", code: `// Base model vs chat model, in miniature. The "model" is a back-off n-gram
// (it predicts the next token from the longest context it has seen), so the
// same code shows how pretraining data and fine-tuning data change behaviour.
const MAX_CTX = 6;

function train(texts) {
  const table = {};
  for (const text of texts) {
    const t = text.split(" ");
    for (let i = 1; i < t.length; i++)
      for (let k = 1; k <= Math.min(MAX_CTX, i); k++) {
        const ctx = t.slice(i - k, i).join(" ");
        table[ctx] = table[ctx] || {};
        table[ctx][t[i]] = (table[ctx][t[i]] || 0) + 1;
      }
  }
  return table;
}

function generate(table, prompt, maxNew, stop) {
  const out = prompt.split(" ");
  for (let n = 0; n < maxNew; n++) {
    let counts = null;
    for (let k = Math.min(MAX_CTX, out.length); k >= 1 && !counts; k--) counts = table[out.slice(-k).join(" ")] || null;
    if (!counts) return { text: out.slice(prompt.split(" ").length).join(" ") || "(nothing)", why: "no known context" };
    const next = Object.keys(counts).sort().reduce((a, b) => (counts[b] > counts[a] ? b : a));
    if (next === stop) return { text: out.slice(prompt.split(" ").length).join(" "), why: "stop token " + stop };
    out.push(next);
  }
  return { text: out.slice(prompt.split(" ").length).join(" "), why: "hit max " + maxNew + " tokens" };
}

// Stage 1, pretraining: raw web-style text. Nobody is "answering" anything.
const webText = [
  "what is the capital of france ? what is the capital of spain ? what is the capital of italy ? " +
  "quiz books list questions like these . paris is the capital of france . " +
  "madrid is the capital of spain . rome is the capital of italy .",
];

// Stage 2, instruction tuning: conversations rendered with a chat template.
// Special tokens mark who is speaking and where a turn ends.
const render = (messages, addGenerationPrompt) =>
  messages.map((m) => "<|im_start|> " + m.role + " " + m.content + " <|im_end|>").join(" ") +
  (addGenerationPrompt ? " <|im_start|> assistant" : "");
const sftPairs = [
  ["what is the capital of france ?", "paris is the capital of france ."],
  ["what is the capital of spain ?", "madrid is the capital of spain ."],
];
const sftTexts = sftPairs.map(([q, a]) => render([{ role: "user", content: q }, { role: "assistant", content: a }], false));
const EPOCHS = 3; // fine-tuning repeats the small dataset, shifting the counts

const base = train(webText);
const chat = train([...webText, ...Array(EPOCHS).fill(sftTexts).flat()]);
console.log("one training conversation as the model sees it:");
console.log("  " + sftTexts[1]);

const question = "what is the capital of spain ?";
let r = generate(base, question, 14, "<|im_end|>");
console.log("BASE, raw prompt   -> " + r.text + "   [" + r.why + "]");

const prompt = render([{ role: "user", content: question }], true);
console.log("chat prompt string -> " + prompt);
r = generate(base, prompt, 14, "<|im_end|>");
console.log("BASE, chat prompt  -> " + r.text + "   [" + r.why + "]");
r = generate(chat, prompt, 14, "<|im_end|>");
console.log("CHAT, chat prompt  -> " + r.text + "   [" + r.why + "]");

const ctx = "is the capital of spain .";
const show = (t) => Object.keys(t[ctx]).sort().map((w) => w + ":" + t[ctx][w]).join(" ");
console.log("after '" + ctx + "'  base counts: " + show(base) + " | chat counts: " + show(chat));` },
          { tech: "python", code: `# Base model vs chat model, in miniature. The "model" is a back-off n-gram
# (it predicts the next token from the longest context it has seen), so the
# same code shows how pretraining data and fine-tuning data change behaviour.
MAX_CTX = 6


def train(texts):
    table = {}
    for text in texts:
        t = text.split(" ")
        for i in range(1, len(t)):
            for k in range(1, min(MAX_CTX, i) + 1):
                ctx = " ".join(t[i - k:i])
                table.setdefault(ctx, {})
                table[ctx][t[i]] = table[ctx].get(t[i], 0) + 1
    return table


def generate(table, prompt, max_new, stop):
    out = prompt.split(" ")
    start = len(out)
    for _ in range(max_new):
        counts = None
        k = min(MAX_CTX, len(out))
        while k >= 1 and counts is None:
            counts = table.get(" ".join(out[-k:]))
            k -= 1
        if counts is None:
            return " ".join(out[start:]) or "(nothing)", "no known context"
        keys = sorted(counts)
        nxt = keys[0]
        for w in keys[1:]:
            if counts[w] > counts[nxt]:
                nxt = w
        if nxt == stop:
            return " ".join(out[start:]), "stop token " + stop
        out.append(nxt)
    return " ".join(out[start:]), f"hit max {max_new} tokens"


# Stage 1, pretraining: raw web-style text. Nobody is "answering" anything.
web_text = [
    "what is the capital of france ? what is the capital of spain ? what is the capital of italy ? "
    "quiz books list questions like these . paris is the capital of france . "
    "madrid is the capital of spain . rome is the capital of italy ."
]


# Stage 2, instruction tuning: conversations rendered with a chat template.
# Special tokens mark who is speaking and where a turn ends.
def render(messages, add_generation_prompt):
    s = " ".join("<|im_start|> " + m["role"] + " " + m["content"] + " <|im_end|>" for m in messages)
    return s + (" <|im_start|> assistant" if add_generation_prompt else "")


sft_pairs = [
    ("what is the capital of france ?", "paris is the capital of france ."),
    ("what is the capital of spain ?", "madrid is the capital of spain ."),
]
sft_texts = [render([{"role": "user", "content": q}, {"role": "assistant", "content": a}], False) for q, a in sft_pairs]
EPOCHS = 3  # fine-tuning repeats the small dataset, shifting the counts

base = train(web_text)
chat = train(web_text + sft_texts * EPOCHS)
print("one training conversation as the model sees it:")
print("  " + sft_texts[1])

question = "what is the capital of spain ?"
text, why = generate(base, question, 14, "<|im_end|>")
print(f"BASE, raw prompt   -> {text}   [{why}]")

prompt = render([{"role": "user", "content": question}], True)
print("chat prompt string -> " + prompt)
text, why = generate(base, prompt, 14, "<|im_end|>")
print(f"BASE, chat prompt  -> {text}   [{why}]")
text, why = generate(chat, prompt, 14, "<|im_end|>")
print(f"CHAT, chat prompt  -> {text}   [{why}]")

ctx = "is the capital of spain ."


def show(t):
    return " ".join(f"{w}:{t[ctx][w]}" for w in sorted(t[ctx]))


print(f"after '{ctx}'  base counts: {show(base)} | chat counts: {show(chat)}")` },
        ],
      },
    ],
  },
];

export default augments;
