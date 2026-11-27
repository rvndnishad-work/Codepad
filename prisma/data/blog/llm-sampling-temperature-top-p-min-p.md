---
slug: llm-sampling-temperature-top-p-min-p
title: "Temperature, Top-k, Top-p and Min-p: What LLM Sampling Settings Actually Do"
excerpt: How a language model turns scores into one next token, what each sampling setting changes, and why the order they run in matters. Measured on a small model trained on this blog, plus what the current OpenAI and Anthropic SDKs say about these settings now.
tags: ["ai", "llm", "sampling", "prompt-engineering"]
cover: /blog-images/llm-sampling-temperature-top-p-min-p/cover.png
---

Every LLM API used to come with the same few knobs: `temperature`, `top_p`, sometimes `top_k`. Most teams set temperature to 0 for "deterministic" tasks, 0.7 for "creative" ones, and never touch the rest. That works until it does not: the model loops on the same phrase, a summary turns into word salad, or a request fails because a newer model no longer accepts the setting at all.

This post explains what each setting does to the model's output, using real numbers. To get real numbers without a GPU, I trained a tiny language model on the 17 posts on this blog and sampled from it 300 times with each setting. The model is far simpler than an LLM, but the sampling step is exactly the same, and you can see each setting's effect clearly.

## The words you need

- A **token** is the unit a model reads and writes: a word, part of a word, or a punctuation mark.
- At each step, the model outputs one score per token in its vocabulary. These raw scores are called **logits**. Higher means more likely.
- **Softmax** turns logits into probabilities that add up to 1: raise *e* to each logit, then divide each by the total.
- **Sampling** is picking the next token at random, weighted by those probabilities. **Greedy decoding** skips the randomness and always picks the most likely token.

Every setting in this post changes the probabilities before the random pick. None of them change the model.

## The test model

> A bigram model predicts the next word from only the previous word. Its logits are the log of how often each word followed the previous one.

I split the 17 posts on this blog into lowercase words and punctuation, with code blocks removed, giving 40,515 tokens. For every word, I counted which words came right after it. That is a **bigram model**. The log of each count works as a logit: softmax over log-counts gives back exactly the observed frequencies.

Two contexts show the two shapes a next-token distribution can have:

| Previous word | Candidates | Most likely next word | Shape |
|---|---:|---|---|
| "the" | 720 | "same", 7.3% | flat: many reasonable options |
| "event" | 13 | "loop", 55.8% | peaked: one clear answer |

Real LLM distributions have the same two shapes. After "The capital of France is", one token dominates. After "Once upon a", many continuations are fine. A good sampling setting should treat these two cases differently.

## Temperature: sharpen or flatten

> Temperature divides every logit by `t` before softmax. Below 1, the likely tokens get even more likely. Above 1, the probabilities even out. At 0, it becomes greedy decoding.

This runs the real counts for the words that followed "event" through softmax at three temperatures, then applies the three filters covered in the next sections:

```javascript-run
// How often each word followed "event" in the DevPrep blog posts.
// A bigram model turns these counts into logits: logit = log(count).
const counts = { loop: 24, handler: 5, ",": 2, with: 2, handlers: 2, listener: 1, short: 1,
  makes: 1, is: 1, emitters: 1, crashes: 1, and: 1, were: 1 };
const logits = Object.entries(counts).map(([token, n]) => ({ token, logit: Math.log(n) }));

// Softmax with temperature: divide every logit by t, then normalise.
function softmax(items, t) {
  const max = Math.max(...items.map((x) => x.logit));
  const weights = items.map((x) => Math.exp((x.logit - max) / t));
  const total = weights.reduce((a, b) => a + b, 0);
  return items.map((x, i) => ({ token: x.token, p: weights[i] / total })).sort((a, b) => b.p - a.p);
}

const pct = (p) => (100 * p).toFixed(1).padStart(5) + "%";
for (const t of [0.5, 1, 1.5]) {
  const probs = softmax(logits, t);
  const top3 = probs.slice(0, 3).map((x) => `${x.token} ${pct(x.p)}`).join("  ");
  console.log(`t=${t.toFixed(1)}: ${top3}`);
}

// The three filters, applied after temperature (t = 1 here).
const probs = softmax(logits, 1);
const topK = probs.slice(0, 5);
const topP = [];
for (let mass = 0, i = 0; mass < 0.9; i++) { topP.push(probs[i]); mass += probs[i].p; }
const minP = probs.filter((x) => x.p >= 0.1 * probs[0].p);
console.log(`top-k=5 keeps ${topK.length}: ${topK.map((x) => x.token).join(" ")}`);
console.log(`top-p=0.9 keeps ${topP.length}: ${topP.map((x) => x.token).join(" ")}`);
console.log(`min-p=0.1 keeps ${minP.length}: ${minP.map((x) => x.token).join(" ")}`);
```

Output:

```text
t=0.5: loop  92.8%  handler   4.0%  ,   0.6%
t=1.0: loop  55.8%  handler  11.6%  ,   4.7%
t=1.5: loop  34.7%  handler  12.2%  ,   6.6%
top-k=5 keeps 5: loop handler , with handlers
top-p=0.9 keeps 9: loop handler , with handlers listener short makes is
min-p=0.1 keeps 2: loop handler
```

![After "event", the word "loop" has 92.8% probability at temperature 0.5, 55.8% at 1.0 and 34.7% at 1.5, while the other words gain probability as temperature rises.](/blog-images/llm-sampling-temperature-top-p-min-p/temperature.svg)

At `t = 1` you get the model's own probabilities. At `t = 0.5`, "loop" goes from 56% to 93%: dividing by a number below 1 stretches the gaps between logits. At `t = 1.5`, it drops to 35% and every rare word gains probability, including "crashes" and "were", which make little sense after "event".

**Temperature 0 does not divide by zero.** Libraries treat it as "pick the highest logit", which is greedy decoding. This is where the first surprise comes from. Here is the first of 300 greedy continuations of "the" from the test model:

```text
the same code , and the same code , and the same code , and the
```

All 300 greedy runs were the same sentence, and every one repeated itself. Greedy decoding always takes the most likely next word, and the most likely path through a model can be a loop. LLMs avoid this far better than a bigram model, but repetitive output from greedy decoding has been documented for neural language models too. It was one of the motivations for nucleus sampling in ["The Curious Case of Neural Text Degeneration"](https://arxiv.org/abs/1904.09751). That is why "always use temperature 0" is not automatically the safe choice.

## Top-k: a fixed number of candidates

> Top-k keeps the `k` most likely tokens and drops the rest. The problem is that the right number depends on the context, and `k` does not.

On the flat distribution after "the", `top-k = 5` keeps only 15% of the probability mass and throws away hundreds of reasonable words. On the peaked distribution after "event", the same `k = 5` keeps "with" and "handlers", words that are unlikely in that position. One fixed `k` is too tight for one context and too loose for the other.

## Top-p (nucleus sampling): a fixed share of probability

> Top-p keeps the smallest set of top tokens whose probabilities add up to at least `p`. The set grows when the model is unsure and shrinks when it is confident.

OpenAI's Chat Completions documentation describes it this way: "the model considers the results of the tokens with top_p probability mass. So 0.1 means only the tokens comprising the top 10% probability mass are considered." (Quoted from the doc comments in the `openai` npm package, version 7.65.0.)

With `top_p = 0.9`, the test model kept **466** of 720 candidates after "the", and **9** of 13 after "event". That is the adaptive behaviour top-k lacks. But look at the "event" case again: to reach 90% of the mass, top-p had to include words with 2% probability each. When the top token is strong but the tail is long, top-p still lets the tail in.

## Min-p: a threshold relative to the top token

> Min-p keeps every token whose probability is at least `min_p` times the top token's probability. A confident model gets a strict filter, and an unsure model gets a loose one.

Min-p was proposed in the paper ["Turning Up the Heat: Min-p Sampling for Creative and Coherent LLM Outputs"](https://arxiv.org/abs/2407.01082) (Nguyen et al.). The abstract describes it as "a dynamic truncation method that adjusts the sampling threshold based on the model's confidence by using the top token's probability as a scaling factor."

The rule is one line. With `min_p = 0.1` and a top token at 55.8%, anything below 5.58% is dropped. After "event", that left only **2** words, "loop" and "handler". After "the", where the top word is only 7.3%, the threshold drops to 0.73% and **16** words survive.

![After "the", a flat distribution, top-k keeps 5 words, top-p keeps 466 and min-p keeps 16. After "event", a peaked distribution, top-k keeps 5, top-p keeps 9 and min-p keeps 2.](/blog-images/llm-sampling-temperature-top-p-min-p/filters.svg)

A word of caution about the large top-p counts. A bigram model trained on 40,000 words has a very long tail of words seen only once, so top-p keeps far more of them than it would with a real LLM. The direction of the effect is the point here, not the exact counts.

## The order matters

> In Hugging Face `transformers`, temperature is applied first, then top-k, then top-p, then min-p.

These settings interact, because temperature changes the probabilities that top-p and min-p then filter. I checked the order in `transformers` 5.24.1: its `generate` code adds `TemperatureLogitsWarper`, then `TopKLogitsWarper`, then `TopPLogitsWarper`, then `MinPLogitsWarper`, in that order. Its `MinPLogitsWarper` computes the threshold as `min_p` times the top token's probability, the same rule as above. The code in this post uses the same order.

![The sampling pipeline: logits, divide by temperature, softmax, top-k, top-p, min-p, then sample one token.](/blog-images/llm-sampling-temperature-top-p-min-p/pipeline.svg)

Because temperature runs first, raising it widens what top-p lets through. After "the", `top_p = 0.9` kept 466 words at `t = 1` and 578 at `t = 1.5`. Min-p reacts differently, because its threshold moves with the top token. That is the case its authors make for it: you can raise the temperature for more variety, and min-p still trims the tail.

Other inference servers may apply these settings in a different order, so check the documentation of whatever you run.

## Measured: 300 samples per setting

> Lower temperature and tighter filters give more likely but more repetitive text. Higher temperature gives variety, and min-p keeps more of the likelihood at a given level of variety.

For each setting, I generated 300 continuations of 15 tokens, each starting from "the", with the same random seed. Three measures:

- **Distinct-2**: the share of word pairs that are unique across all samples. Higher means more variety.
- **Repeats**: the share of samples that repeat a three-word sequence inside themselves.
- **Average log-probability**: how likely the model itself finds the generated words. Closer to zero means more typical text.

| Setting | Unique samples | Distinct-2 | Repeats | Avg log-prob |
|---|---:|---:|---:|---:|
| greedy (t = 0) | 1 / 300 | 0.001 | 100% | −2.36 |
| t = 0.5 | 300 / 300 | 0.313 | 12% | −2.85 |
| t = 1.0 | 300 / 300 | 0.750 | 0% | −3.41 |
| t = 1.5 | 300 / 300 | 0.840 | 0% | −3.53 |
| t = 1.0, top-k = 5 | 300 / 300 | 0.079 | 25% | −2.73 |
| t = 1.0, top-p = 0.9 | 300 / 300 | 0.702 | 1% | −3.36 |
| t = 1.0, min-p = 0.1 | 300 / 300 | 0.341 | 3% | −2.97 |
| t = 1.5, top-p = 0.9 | 300 / 300 | 0.812 | 0% | −3.53 |
| t = 1.5, min-p = 0.1 | 300 / 300 | 0.648 | 1% | −3.32 |

![Each setting plotted by variety against likelihood. Greedy is most likely and least varied, temperature 1.5 is the opposite, and min-p sits above top-p at similar variety.](/blog-images/llm-sampling-temperature-top-p-min-p/results.svg)

What the table shows:

- **Greedy** produced one sentence, 300 times, looping every time.
- **Top-k = 5** was almost as repetitive as `t = 0.5` (25% repeats, distinct-2 of 0.079). Cutting to five words after "the" removes most of the real choices.
- **Top-p = 0.9** at `t = 1` barely changed anything compared with plain `t = 1`. On this model's long tail, 90% of the mass still includes most words.
- **`t = 1.5` with min-p** had about the same variety as top-p at `t = 1` (0.648 vs 0.702) but more likely text (−3.32 vs −3.36), and it was clearly more likely than `t = 1.5` with top-p (−3.32 vs −3.53).

Here are the first samples from three of the settings:

```text
t=1.0, top-k=5     the code , the index . a code and a small samples per operation . .
t=1.5, top-p=0.9   the anomaly at medium in october to get code by pasting it works like the trade
t=1.5, min-p=0.1   the fix . for hnsw indexes insert anything from , in . if you're giving c
```

A bigram model produces nonsense whatever the setting. The sentences show the texture: top-k repeats "code" and ".", while high temperature pulls in rare words like "anomaly" and "october". Treat the table as a demonstration of how the settings behave, not a benchmark of LLM quality. The min-p paper reports its own experiments on real LLMs.

## What hosted APIs let you set now

> OpenAI's Chat Completions still documents `temperature` and `top_p`. Anthropic has deprecated `temperature`, `top_p` and `top_k` for its newest models.

Check the API you call before relying on any of these settings, because this has changed recently. I checked the doc comments in the current official TypeScript SDKs, which are generated from each provider's API specification:

- **OpenAI** (`openai` 7.65.0, Chat Completions): `temperature` is "What sampling temperature to use, between 0 and 2", and both `temperature` and `top_p` say "We generally recommend altering this or `top_p` but not both." There is no `top_k` or `min_p` parameter.
- **Anthropic** (`@anthropic-ai/sdk` 0.125.0): all three settings are marked deprecated. For `temperature`: "Models released after Claude Opus 4.6 do not support setting temperature. A value of 1.0 of will be accepted for backwards compatibility, all other values will be rejected with a 400 error." `top_p` accepts only values of 0.99 or more for backwards compatibility, and "any value will be rejected" for `top_k`. In the newer `@anthropic-ai/sdk` 1.14.0, the three parameters are no longer listed on the Messages create call at all.

So code that sends `temperature: 0` to every model can start failing with a 400 error when you switch to a newer model. On those models, the settings left to you are the prompt, structured output, and the model's own options such as extended thinking.

Min-p and top-k are mostly something you set when you run an open-weight model yourself. `transformers` 5.24.1, for example, has `top_k`, `top_p` and `min_p` in its `GenerationConfig`. Its documentation describes typical `min_p` values as "in the 0.01-0.2 range, comparably selective as setting `top_p` in the 0.99-0.8 range".

## Choosing settings

- **Extraction, classification, code edits:** use a low temperature where the API allows it, but do not rely on it for correctness. Use structured outputs or validation for that. If greedy output loops, a small temperature such as 0.2 to 0.3 is the usual fix.
- **Writing and brainstorming:** temperature around 1 is the model's own distribution. On self-hosted models, raise it and add `min_p` around 0.05 to 0.1 instead of reaching for top-k.
- **Change one setting at a time.** OpenAI's documentation recommends changing temperature or `top_p`, not both, and the interaction shown above is why.
- **Measure it.** Generate 20 to 50 outputs for a fixed prompt at each setting and compare them on your actual task. The [LLM evals post](/blog/llm-evals-without-fooling-yourself) covers how to do that without fooling yourself.

## Cheat sheet

| Setting | What it does | Weak spot | Measured here |
|---|---|---|---|
| temperature < 1 | sharpens toward the top token | repetition | t = 0.5: 12% of samples repeated |
| temperature 0 | greedy, always the top token | loops | 300 identical, looping samples |
| temperature > 1 | flattens, rare tokens gain | nonsense from the tail | t = 1.5: "crashes" and "were" gain after "event" |
| top-k | keeps k tokens | wrong k for most contexts | k = 5 kept 15% of the mass after "the" |
| top-p | keeps a share p of the mass | long tails get in | p = 0.9 kept 9 of 13 after "event" |
| min-p | keeps tokens above min_p times the top token's probability | needs self-hosting or a supporting API | kept 2 after "event", 16 after "the" |
| order (transformers) | temperature, top-k, top-p, min-p | other servers may differ | checked in transformers 5.24.1 |
| hosted APIs | OpenAI: temperature 0 to 2; Anthropic: deprecated on new models | 400 errors on unsupported values | checked in the current SDKs |
