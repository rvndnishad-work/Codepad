/**
 * AI ENGINEERING ULTRA — batch 11: caching, conversations and data (what prompt
 * caching is, Anthropic and OpenAI caches in practice, conversations that outgrow
 * the context window, reducing hallucinations in production, PII handling).
 * Every example was run by scripts/verify-variant-examples.ts (node, python);
 * quoted output is that run's output.
 */
import type { AiUltraAugment } from "./ai-augments.types";

const augments: AiUltraAugment[] = [
  {
    title: `What is prompt caching and how does it reduce cost and latency?`,
    difficulty: "medium",
    seoDescription: `Prompt caching explained from the KV cache up: why only an exact prefix can be reused, how it cuts input cost and time to first token, with a demo.`,
    description: `**Question presented to candidate:**
"Our assistant sends the same 8,000-token system prompt and tool list on every request, and the provider dashboard shows something called cached input tokens. Explain what prompt caching actually is, why it makes requests cheaper and faster, and what we would have to change to benefit from it."

**What a strong answer should cover:**
- The mechanism: before generating, the model runs a prefill pass that computes attention keys and values (the KV cache) for every input token; prompt caching keeps those keys and values for a prompt prefix so a later request that starts with the same tokens skips that work
- Why it is a prefix and must be exact: each token's keys and values depend on every token before it, so one changed token invalidates everything after it, and the same text at a different position is a different cache entry
- Cost: cached input tokens are billed at a fraction of the normal input price (Anthropic documents reads at 0.1x and writes at 1.25x or 2x; OpenAI caches automatically and has historically charged no write fee), so the saving depends on the hit rate and the write surcharge
- Latency: skipping prefill cuts time to first token for long prompts, but output generation (decode) is not faster, so short-prompt or long-answer requests gain little
- Prompt design: stable content first (tools, system prompt, examples, documents), per-request data last; no timestamps or IDs at the front; and it is not the same thing as semantic caching of answers

**Code / implementation expected:** Optional — a prompt layout with the stable prefix first, or a sketch of how a prefix match is computed and billed.`,
    answer: `**Target Audience:** Engineers who call an LLM API with long, repeated prompts (agents, chat assistants, RAG over a fixed corpus) and want to understand what the "cached tokens" line on their bill means.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (the prefix-cache simulation below). Provider behaviour and prices were checked against the Anthropic docs, OpenAI announcements and the other sources cited inline, in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

You hire a tutor to help with a 300-page law textbook. Every time you ask a question, the tutor first reads the whole book again from page one, then answers. Your first question takes an hour. So does your second, and your hundredth, even though the book never changed. You also pay by the hour.

A sensible tutor would read the book once, keep notes on what they understood, and when you come back with a new question, pick up from those notes and only read your new question. Same answers, a fraction of the time and the fee.

An LLM API without caching is the first tutor. Every request carries the full prompt (system prompt, tool definitions, examples, documents, the whole chat so far), and the model processes every token of it from scratch before it writes a word. **Prompt caching** turns it into the second tutor: the provider keeps the "notes" for the beginning of your prompt, and the next request that starts with exactly the same text skips straight to the new part.

The catch is in the word *exactly*. If you change one word on page one of the book, all the tutor's notes after that word are useless. That single rule explains almost every design decision in this doc.

## 2. What the Model Recomputes on Every Request

Generating a reply happens in two phases.

📌 **Interview term: prefill** — the first phase, where the model reads the entire input in one parallel pass and builds its internal state for every input token. Its cost grows with the number of input tokens.

📌 **Interview term: decode** — the second phase, where the model produces output one token at a time, each step looking back at everything before it. Its cost grows with the number of output tokens.

During prefill, every attention layer computes two vectors for each token, a **key** and a **value**. Later tokens look up these keys and values to decide what to pay attention to (the mechanism is covered in [How does the transformer architecture and attention work?](/interview-question/how-does-the-transformer-architecture-and-attention-work)). The model keeps them in memory while it decodes, so it does not recompute them for every new output token.

📌 **Interview term: KV cache** — the stored attention keys and values for all tokens processed so far. Inside one request it is what makes decoding fast; prompt caching is the idea of keeping it *between* requests.

📌 **Interview term: time to first token (TTFT)** — how long the user waits before the first output token arrives. For long prompts it is dominated by prefill, so it is exactly the number prompt caching improves.

## 3. Prompt Caching: Keep the Keys and Values for a Prefix

Prompt caching stores the KV cache for the beginning of a prompt after one request, and reuses it for a later request whose prompt begins with the identical tokens. Only the part after the match has to go through prefill.

📌 **Interview term: prompt caching (prefix caching)** — reusing the stored attention keys and values of an identical prompt prefix across requests, so that prefill only runs on the new tokens. Providers bill the reused tokens at a discount and report them in the response usage.

<svg class="iq-diagram" width="100%" viewBox="0 0 860 260" role="img" aria-label="Two requests share the same system prompt, tools and documents as a cached prefix and differ only in the user question at the end">
  <text class="d-text" x="20" y="72">request 1</text>
  <rect class="d-box-accent" x="130" y="40" width="190" height="56" rx="8"/>
  <text class="d-text" x="225" y="74" text-anchor="middle">system prompt</text>
  <rect class="d-box-accent" x="340" y="40" width="150" height="56" rx="8"/>
  <text class="d-text" x="415" y="74" text-anchor="middle">tools</text>
  <rect class="d-box-accent" x="510" y="40" width="150" height="56" rx="8"/>
  <text class="d-text" x="585" y="74" text-anchor="middle">documents</text>
  <rect class="d-box" x="680" y="40" width="160" height="56" rx="8"/>
  <text class="d-text" x="760" y="74" text-anchor="middle">question A</text>
  <text class="d-text" x="20" y="202">request 2</text>
  <rect class="d-box-muted" x="130" y="170" width="530" height="56" rx="8"/>
  <text class="d-text" x="395" y="204" text-anchor="middle">same tokens: read from cache</text>
  <rect class="d-box" x="680" y="170" width="160" height="56" rx="8"/>
  <text class="d-text" x="760" y="204" text-anchor="middle">question B</text>
  <path class="d-edge-dashed" d="M 395 100 L 395 166"/>
</svg>

Request 1 pays full prefill for everything and leaves the prefix in the cache. Request 2 only runs prefill on question B; the shaded prefix is read back instead of recomputed.

### Why it must be a prefix, and exact

A token's key and value are not a property of that token alone. In a decoder-only model, attention is **causal**: token 500 has already mixed in information from tokens 1 to 499 by the time its keys and values are computed in later layers. So the stored state for a block of text is only valid when everything before it is identical too.

That is why serving engines key the cache as a chain. The vLLM design docs describe identifying each cached block by a hash of its own tokens together with the tokens of the prefix before it (vLLM "Automatic Prefix Caching" design docs, checked October 2026). The example in this doc does the same with a parent hash, which gives this behaviour:

<svg class="iq-diagram" width="100%" viewBox="0 0 860 230" role="img" aria-label="Four chained cache blocks where block two has changed so block one hits and blocks two three and four all miss">
  <defs>
    <marker id="ai11q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="60" width="160" height="80" rx="10"/>
  <text class="d-text" x="100" y="95" text-anchor="middle">block 1</text>
  <text class="d-sub" x="100" y="120" text-anchor="middle">same: hit</text>
  <rect class="d-box" x="240" y="60" width="160" height="80" rx="10"/>
  <text class="d-text" x="320" y="95" text-anchor="middle">block 2</text>
  <text class="d-sub" x="320" y="120" text-anchor="middle">one word changed</text>
  <rect class="d-box-muted" x="460" y="60" width="160" height="80" rx="10"/>
  <text class="d-text" x="540" y="95" text-anchor="middle">block 3</text>
  <text class="d-sub" x="540" y="120" text-anchor="middle">same text: miss</text>
  <rect class="d-box-muted" x="680" y="60" width="160" height="80" rx="10"/>
  <text class="d-text" x="760" y="95" text-anchor="middle">block 4</text>
  <text class="d-sub" x="760" y="120" text-anchor="middle">same text: miss</text>
  <path class="d-edge" d="M 184 100 L 234 100" marker-end="url(#ai11q1-arrow)"/>
  <path class="d-edge-accent" d="M 404 100 L 454 100" marker-end="url(#ai11q1-arrow)"/>
  <path class="d-edge-accent" d="M 624 100 L 674 100" marker-end="url(#ai11q1-arrow)"/>
</svg>

Blocks 3 and 4 contain exactly the same words as last time, and they still miss, because their hash includes block 2. Every arrow carries the "everything before me" dependency forward.

📌 **Interview term: cache key (prefix match)** — what the provider compares to decide a hit. It is effectively the exact token sequence from the start of the prompt up to a point, not the meaning of the text and not one block on its own.

Three consequences follow, and interviewers ask about all three:

1. **Order is part of the key.** The same document after a different preamble is a different entry. Providers therefore document a fixed order: Anthropic says cache prefixes are built from \`tools\`, then \`system\`, then \`messages\` (Claude docs, "Prompt caching", checked October 2026).
2. **One volatile token at the front destroys everything.** A timestamp, a request ID or a user name in the first line of the system prompt makes every request a miss.
3. **It is not semantic caching.** Two questions that mean the same thing do not share a cache entry, and the model still generates a fresh answer. Reusing *answers* for *similar* questions is a different technique with different risks: [What is semantic caching and when is it safe to use?](/interview-question/what-is-semantic-caching-and-when-is-it-safe-to-use)

## 4. How It Reduces Cost

Providers pass part of the saved computation on as a price discount on the cached input tokens. The shape of the bill differs by provider, which is why the numbers in the example are parameters, not quotes:

| What | Anthropic (Claude docs, checked October 2026) | OpenAI (announcements, see the sibling doc) |
| :--- | :--- | :--- |
| How caching starts | You mark breakpoints with \`cache_control\`, or set one top-level \`cache_control\` and the API places it on the last cacheable block | Automatic for prompts of 1,024 tokens or more; no code change |
| Writing a new entry | 1.25x base input price (5-minute lifetime) or 2x (1-hour lifetime) | No write fee was charged under the October 2024 launch and the November 2025 GPT-5.1 announcement |
| Reading a cached token | 0.1x base input price on most models; the same page lists 0.05x and 0.025x for some newer models | 50% off at the October 2024 launch; "90% cheaper" in the GPT-5.1 announcement |
| How you see it | \`usage.cache_creation_input_tokens\` and \`usage.cache_read_input_tokens\` | \`usage.prompt_tokens_details.cached_tokens\` (Chat Completions) |

Because a write can cost more than a normal request, caching is a bet that the prefix will be reused before it expires. The break-even is plain arithmetic, and it is printed at the end of the example: with a 1.25x write and 0.1x reads, sending a prefix once costs 1.25 units cached against 1.00 uncached, but sending it twice costs 1.35 against 2.00. One reuse inside the lifetime pays for the write. Lifetimes, minimum sizes, the 1-hour option and how the two big providers differ in practice are the subject of the sibling question, [Prompt caching in 2025: how do you cut cost with Anthropic & OpenAI caches?](/interview-question/prompt-caching-in-2025-how-do-you-cut-cost-with-anthropic-openai-caches), which also simulates real traffic patterns.

## 5. How It Reduces Latency

Skipping prefill on the cached part shortens time to first token. Anthropic's launch announcement (August 14, 2024) claimed up to 90% lower cost and up to 85% lower latency for long prompts, and SD Times reported the announcement's example of chatting with a 100,000-token cached book: 2.4 seconds instead of 11.5 seconds (Anthropic news post "Prompt caching with Claude"; SD Times, August 2024). Those are the vendor's numbers on its own test setup, not a guarantee.

Two limits matter in practice:

- **Decode is not cached.** If a request has a 500-token prompt and a 2,000-token answer, almost all of its time is output generation, and caching the prompt changes little. The win is largest for *long prompt, short answer* traffic.
- **The new tail still needs prefill.** If each request appends 20,000 tokens of fresh documents after a 2,000-token cached prefix, most of the prefill still happens.

For where caching sits among other latency techniques (streaming, smaller models, parallel calls), see [What techniques reduce LLM latency at each stage of a request?](/interview-question/what-techniques-reduce-llm-latency-at-each-stage-of-a-request)

## 6. Where It Pays Off

| Workload | What repeats | Why caching helps |
| :--- | :--- | :--- |
| Agent loops | System prompt, tool definitions, and the growing transcript, resent on every tool step | The whole earlier transcript is an exact prefix of the next step |
| Multi-turn chat | Earlier turns | Appending a turn keeps everything before it identical, so history becomes a growing cached prefix |
| RAG over a fixed corpus or long document | The document block | Many questions against the same contract or manual share it |
| Few-shot classification at volume | Instructions and examples | Thousands of short inputs behind one long, fixed preamble |

The layout rule that makes all of these work is **stable first, volatile last**: tools and system prompt, then fixed examples and documents, then conversation history, and only then the new user message and anything per-request (time, user profile, retrieved chunks that change per query). [What belongs in the system prompt versus the user message?](/interview-question/what-belongs-in-the-system-prompt-versus-the-user-message) shows the same rule from the prompt-design side.

## 7. Verified: Running the Code

The example **"Toy prefix cache: hash-chained blocks, hits, misses and billed cost"** splits each prompt into 4-token blocks (real engines use larger blocks), keys each block by a SHA-256 hash of its tokens plus the previous block's hash, and walks from the start until the first unknown block. Matched blocks are billed at 0.1x and are cheap to "prefill"; new full blocks are written at 1.25x; a partial last block is never stored. Prefill milliseconds come from a fixed toy rate per token, so they show proportions, not real speeds. The heart of it:

~~~js
function blockHashes(tokens) {
  const out = [];
  let parent = "root";
  for (let i = 0; i + BLOCK <= tokens.length; i += BLOCK) {
    const h = sha256(parent + "|" + tokens.slice(i, i + BLOCK).join(" ")).slice(0, 8);
    out.push(h);
    parent = h;               // the next block's key depends on this one
  }
  return out;
}
~~~

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
block size 4 tokens; prefix = 41 tokens
A first question       tokens=48 cached= 0 computed=48 prefill=24.00ms cost_units=60.00
B same prefix          tokens=49 cached=40 computed= 9 prefill= 5.30ms cost_units=15.00
C same prefix again    tokens=49 cached=40 computed= 9 prefill= 5.30ms cost_units=15.00
D timestamp first      tokens=51 cached= 0 computed=51 prefill=25.50ms cost_units=63.00
E docs edited          tokens=45 cached=24 computed=21 prefill=10.98ms cost_units=28.40
total cost units: no cache 242.00, with cache 181.40 (25.0% lower)
per 1M requests of this mix at $3.00 per M input tokens: $145.20 vs $108.84
prefix sent 1x: cached 1.25 vs uncached 1.00 prefix-units -> cache loses
prefix sent 2x: cached 1.35 vs uncached 2.00 prefix-units -> cache wins
prefix sent 3x: cached 1.45 vs uncached 3.00 prefix-units -> cache wins
prefix sent 11x: cached 2.25 vs uncached 11.00 prefix-units -> cache wins
~~~

What the run shows:

- **A** is a cold start: every block is written, so it costs *more* than an uncached request (60 units for 48 tokens).
- **B and C** reuse 40 of 49 tokens. Prefill work drops from 24.5 to 5.3 toy milliseconds and cost from 49 to 15 units. Only the block containing the question is new.
- **D** puts \`Time : 10:42\` before an otherwise identical prompt. Zero tokens hit, because every block's hash now includes the timestamp. This is the most common real-world cache bug.
- **E** changes one number in the policy (30 days becomes 14). Everything before that block still hits (24 tokens); everything after it, including the unchanged shipping and warranty lines, misses.
- Over the five requests the cache saves 25% even with two bad requests in the mix; the break-even lines show the general rule for a 1.25x write: one reuse pays for it, and ten reuses bring the prefix to about a fifth of its uncached cost (2.25 against 11.00).

The simulation leaves out what a real provider adds: a minimum cacheable length, an expiry time, eviction under memory pressure, and routing (a request has to land on hardware that holds the entry). Those are where the sibling doc picks up.

## Edge Cases Worth Knowing

- **Below the minimum, nothing happens, silently.** Anthropic documents minimum cacheable lengths from 512 to 4,096 tokens depending on the model and says shorter prompts are not cached "even if marked with \`cache_control\`", with no error returned (Claude docs, October 2026). Check the usage fields, not your intentions.
- **Some parameter changes invalidate the cache.** Anthropic's invalidation table lists changing tool definitions (invalidates everything), and changing \`tool_choice\`, images, or thinking settings (invalidates the message blocks). A deploy that reorders tools is a cache flush.
- **Identical requests can still miss.** Caches live on specific hardware and expire; at OpenAI, requests are routed by a hash of the prompt start, and Azure's documentation of the same feature warns that very high request rates for one prefix can overflow to machines without the entry.
- **Privacy and side channels.** A hit is measurably faster. Gu et al., "Auditing Prompt Caching in Language Model APIs" (arXiv 2502.07776, ICML 2025), used timing to detect caching at API providers and reported cache sharing across users at seven of them when they tested. Anthropic's current docs say caches are isolated per organization and, on its API, per workspace. Keep per-user secrets out of any prefix that might be shared.
- **Data retention.** Anthropic's data-retention page says prompt caching holds KV cache representations and hashes in memory for the cache lifetime, not the prompt text, and lists the feature as eligible under zero data retention (checked October 2026).

## Common Pitfalls

- **Putting a timestamp, request ID or user name at the top of the system prompt.** It makes every request a cold write. Move per-request data to the end of the last user message.
- **Building prompts by iterating over an unordered structure.** Tools or documents in a different order each time are different prefixes. Sort deterministically and serialise JSON with stable key order.
- **Expecting a cache hit on "the same content" in a new position.** Inserting a retrieved chunk before the stable instructions moves everything after it. Volatile content goes after stable content, always.
- **Measuring savings from intentions instead of usage fields.** Log the cached-token fields per request and alert when the hit rate drops after a deploy.
- **Caching traffic that never repeats inside the lifetime.** With a write surcharge, a prefix used once per hour on a 5-minute cache costs more than no caching (the sibling doc shows +24.5% for that pattern).
- **Confusing it with response caching.** Prompt caching does not return stored answers; the model still runs decode and still costs output tokens.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Start from prefill:</strong> <span style="color:#f0e2c8;">Before a model writes anything it runs <strong style="color:#ffca28;">prefill</strong>: it computes attention keys and values for every input token. That is the expensive, input-proportional part, and on an agent that resends the same 10,000-token system prompt and tools, it is the same work every time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Define the cache:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Prompt caching</strong> keeps those keys and values for a prompt <strong style="color:#ffca28;">prefix</strong> on the provider side, so the next request that starts with the identical tokens skips recomputing them and only processes the new tail.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Explain why exact and prefix:</strong> <span style="color:#f0e2c8;">Each token's keys and values depend on all the tokens before it, so the cache is a chain: one changed token, or the same text at a different position, invalidates everything after it. In my toy run a timestamp at the front took the hit rate from 40 of 49 tokens to zero.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Give the economics:</strong> <span style="color:#f0e2c8;">Cached reads are billed at a fraction of input price; Anthropic documents 0.1x reads with a 1.25x or 2x write surcharge, OpenAI caches automatically and has historically charged no write fee. So caching pays once a prefix is reused inside the cache lifetime; with a 1.25x write, one reuse is enough.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close with design:</strong> <span style="color:#f0e2c8;">The engineering work is prompt layout: tools and system prompt first and byte-stable, examples and documents next, per-request data last, then watch <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache_read_input_tokens</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cached_tokens</code> in usage to confirm the hit rate. Latency drops for long prompts because prefill is skipped, but decode speed does not change.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is prompt caching the same as caching the answer?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Prompt caching reuses the <em style="color:#d8d8d8;">computation</em> for an identical prefix; the model still generates a fresh answer for the new tail. Caching whole answers for similar questions is <strong style="color:#ffca28;">semantic caching</strong>, a different technique with its own correctness risks.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does the same paragraph not hit the cache if I move it?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because attention is causal: a token's keys and values encode everything before it. The same words after a different preamble produce different internal state, so caches are keyed on the whole prefix up to that point, not on the text of one block.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does caching change what the model outputs?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It should not: the cached keys and values are the ones the model would have computed anyway, so the result is the same as an uncached run with the same sampling settings. What changes is cost, prefill time, and in some APIs the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">usage</code> breakdown.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When does caching not help?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Short prompts below the provider minimum (Anthropic documents 512 to 4,096 tokens depending on the model and silently skips caching below it), traffic too sparse for the cache lifetime, prompts whose front changes every request, and answers dominated by output tokens, since decode is not cached.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is there any security or privacy angle?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. A cache hit is faster, which is a timing signal. Gu et al., <em style="color:#d8d8d8;">Auditing Prompt Caching in Language Model APIs</em> (ICML 2025), measured response times and reported cache sharing across users at seven API providers when they tested. Current Anthropic docs say caches are isolated per organization and per workspace; check your provider, and keep secrets out of shared prefixes.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Prefill | The parallel pass over all input tokens before the first output token; cost grows with input length |
| Decode | Generating output one token at a time; not affected by prompt caching |
| KV cache | Stored attention keys and values for processed tokens |
| Time to first token (TTFT) | Wait before the first output token; dominated by prefill for long prompts |
| Prompt caching (prefix caching) | Reusing the KV cache of an identical prompt prefix across requests, billed at a discount |
| Cache key (prefix match) | The exact token sequence from the start of the prompt that must match for a hit |

**Conclusion:** Prompt caching is the provider keeping the attention keys and values it already computed for the start of your prompt, so the next request that begins with exactly the same tokens skips that part of prefill. Because each token's state depends on everything before it, only an exact prefix can be reused, which turns caching into a prompt-layout discipline: stable tools and instructions first, documents and history next, per-request data last. Done right, cached tokens are billed at a fraction of the input price and time to first token falls for long prompts; done wrong, one timestamp at the top makes every request a cold write that can cost more than no caching at all.`,
    examples: [
      {
        label: `Toy prefix cache: hash-chained blocks, hits, misses and billed cost`,
        variants: [
          { tech: "node", code: `// Toy prefix cache: the prompt is split into fixed-size blocks, and each block is keyed
// by a hash of its own tokens plus the hash of everything before it (a hash chain).
// A request reuses cached blocks from the start until the first block that differs.
const crypto = require("crypto");

const BLOCK = 4;                       // tokens per cache block (real engines use 16+)
const PRICE_IN = 3.0;                  // $ per million input tokens (illustrative)
const WRITE_X = 1.25, READ_X = 0.1;    // write surcharge and read discount (illustrative)
const MS_PER_UNCACHED = 0.5, MS_PER_CACHED = 0.02; // toy prefill cost per token

const cache = new Map();               // block hash -> true (stands for stored keys/values)

function blockHashes(tokens) {
  const out = [];
  let parent = "root";
  for (let i = 0; i + BLOCK <= tokens.length; i += BLOCK) {
    const h = crypto.createHash("sha256").update(parent + "|" + tokens.slice(i, i + BLOCK).join(" ")).digest("hex").slice(0, 8);
    out.push(h);
    parent = h;
  }
  return out;
}

function run(name, text) {
  const tokens = text.split(" ");
  const hashes = blockHashes(tokens);
  let hit = 0;
  while (hit < hashes.length && cache.has(hashes[hit])) hit++;
  const cached = hit * BLOCK;
  const written = (hashes.length - hit) * BLOCK;   // new full blocks get stored
  const tail = tokens.length - cached - written;   // partial last block, never stored
  for (const h of hashes) cache.set(h, true);
  const units = cached * READ_X + written * WRITE_X + tail;
  const ms = cached * MS_PER_CACHED + (written + tail) * MS_PER_UNCACHED;
  console.log(\`\${name.padEnd(22)} tokens=\${String(tokens.length).padStart(2)} cached=\${String(cached).padStart(2)} computed=\${String(written + tail).padStart(2)} prefill=\${ms.toFixed(2).padStart(5)}ms cost_units=\${units.toFixed(2)}\`);
  return { tokens: tokens.length, units };
}

const SYSTEM = "You are the support bot for Acme . Rules : never share internal prices . Tools : lookup_order refund_order escalate .";
const DOCS = "Policy : refunds within 30 days . Shipping : 5 business days . Warranty : 1 year on hardware .";

console.log("block size", BLOCK, "tokens; prefix =", SYSTEM.split(" ").length + DOCS.split(" ").length, "tokens");
const rows = [];
rows.push(run("A first question", \`\${SYSTEM} \${DOCS} User : where is order 1042 ?\`));
rows.push(run("B same prefix", \`\${SYSTEM} \${DOCS} User : can I return my headphones ?\`));
rows.push(run("C same prefix again", \`\${SYSTEM} \${DOCS} User : how long is the warranty ?\`));
rows.push(run("D timestamp first", \`Time : 10:42 \${SYSTEM} \${DOCS} User : where is order 1042 ?\`));
rows.push(run("E docs edited", \`\${SYSTEM} Policy : refunds within 14 days . Shipping : 5 business days . Warranty : 1 year on hardware . User : hi ?\`));

const noCache = rows.reduce((s, r) => s + r.tokens, 0);
const withCache = rows.reduce((s, r) => s + r.units, 0);
console.log(\`total cost units: no cache \${noCache.toFixed(2)}, with cache \${withCache.toFixed(2)} (\${(100 * (1 - withCache / noCache)).toFixed(1)}% lower)\`);
console.log(\`per 1M requests of this mix at $\${PRICE_IN.toFixed(2)} per M input tokens: $\${(noCache / rows.length * PRICE_IN).toFixed(2)} vs $\${(withCache / rows.length * PRICE_IN).toFixed(2)}\`);

// Break-even: one write then n reads, against n+1 uncached sends of the same prefix.
for (const n of [0, 1, 2, 10]) {
  const cachedCost = WRITE_X + n * READ_X, plain = n + 1;
  console.log(\`prefix sent \${n + 1}x: cached \${cachedCost.toFixed(2)} vs uncached \${plain.toFixed(2)} prefix-units -> \${cachedCost < plain ? "cache wins" : "cache loses"}\`);
}` },
          { tech: "python", code: `# Toy prefix cache: the prompt is split into fixed-size blocks, and each block is keyed
# by a hash of its own tokens plus the hash of everything before it (a hash chain).
# A request reuses cached blocks from the start until the first block that differs.
import hashlib

BLOCK = 4                        # tokens per cache block (real engines use 16+)
PRICE_IN = 3.0                   # $ per million input tokens (illustrative)
WRITE_X, READ_X = 1.25, 0.1      # write surcharge and read discount (illustrative)
MS_PER_UNCACHED, MS_PER_CACHED = 0.5, 0.02  # toy prefill cost per token

cache = {}                       # block hash -> True (stands for stored keys/values)


def block_hashes(tokens):
    out, parent = [], "root"
    for i in range(0, len(tokens) - BLOCK + 1, BLOCK):
        h = hashlib.sha256((parent + "|" + " ".join(tokens[i:i + BLOCK])).encode()).hexdigest()[:8]
        out.append(h)
        parent = h
    return out


def run(name, text):
    tokens = text.split(" ")
    hashes = block_hashes(tokens)
    hit = 0
    while hit < len(hashes) and hashes[hit] in cache:
        hit += 1
    cached = hit * BLOCK
    written = (len(hashes) - hit) * BLOCK   # new full blocks get stored
    tail = len(tokens) - cached - written   # partial last block, never stored
    for h in hashes:
        cache[h] = True
    units = cached * READ_X + written * WRITE_X + tail
    ms = cached * MS_PER_CACHED + (written + tail) * MS_PER_UNCACHED
    print(f"{name:<22} tokens={len(tokens):>2} cached={cached:>2} computed={written + tail:>2} prefill={ms:>5.2f}ms cost_units={units:.2f}")
    return {"tokens": len(tokens), "units": units}


SYSTEM = "You are the support bot for Acme . Rules : never share internal prices . Tools : lookup_order refund_order escalate ."
DOCS = "Policy : refunds within 30 days . Shipping : 5 business days . Warranty : 1 year on hardware ."

print("block size", BLOCK, "tokens; prefix =", len(SYSTEM.split(" ")) + len(DOCS.split(" ")), "tokens")
rows = []
rows.append(run("A first question", f"{SYSTEM} {DOCS} User : where is order 1042 ?"))
rows.append(run("B same prefix", f"{SYSTEM} {DOCS} User : can I return my headphones ?"))
rows.append(run("C same prefix again", f"{SYSTEM} {DOCS} User : how long is the warranty ?"))
rows.append(run("D timestamp first", f"Time : 10:42 {SYSTEM} {DOCS} User : where is order 1042 ?"))
rows.append(run("E docs edited", f"{SYSTEM} Policy : refunds within 14 days . Shipping : 5 business days . Warranty : 1 year on hardware . User : hi ?"))

no_cache = sum(r["tokens"] for r in rows)
with_cache = sum(r["units"] for r in rows)
print(f"total cost units: no cache {no_cache:.2f}, with cache {with_cache:.2f} ({100 * (1 - with_cache / no_cache):.1f}% lower)")
print(f"per 1M requests of this mix at \${PRICE_IN:.2f} per M input tokens: \${no_cache / len(rows) * PRICE_IN:.2f} vs \${with_cache / len(rows) * PRICE_IN:.2f}")

# Break-even: one write then n reads, against n+1 uncached sends of the same prefix.
for n in [0, 1, 2, 10]:
    cached_cost, plain = WRITE_X + n * READ_X, n + 1
    print(f"prefix sent {n + 1}x: cached {cached_cost:.2f} vs uncached {plain:.2f} prefix-units -> {'cache wins' if cached_cost < plain else 'cache loses'}")` },
        ],
      },
    ],
  },
  {
    title: `Prompt caching in 2025: how do you cut cost with Anthropic & OpenAI caches?`,
    difficulty: "medium",
    seoDescription: `Anthropic cache_control breakpoints vs OpenAI automatic caching: lifetimes, write fees, routing keys, break-even maths and a simulated traffic comparison.`,
    description: `**Question presented to candidate:**
"We run the same agent on Claude and on an OpenAI model. Each request carries about 10,000 tokens of tools, instructions and reference docs, and caching is barely showing up on either bill. How do the two providers' prompt caches actually work, and what would you change to cut the cost?"

**What a strong answer should cover:**
- The shared mechanism and the shared rule: both reuse an exact prompt prefix, so the prompt must be laid out stable-first (tools, system, documents, history) with per-request data last
- Anthropic specifics: explicit \`cache_control\` breakpoints (up to 4) or one automatic top-level \`cache_control\`, the tools-system-messages order, a 5-minute lifetime refreshed on each hit or a 1-hour option, writes billed at 1.25x or 2x and reads at a fraction of the input price, model-specific minimum lengths
- OpenAI specifics: automatic caching from 1,024 tokens in 128-token steps with no code change, routing by a hash of the prompt start plus an optional \`prompt_cache_key\`, in-memory versus extended (24-hour) retention, and the newer explicit-breakpoint mode on recent models
- Economics: a write surcharge means caching is a bet on reuse inside the lifetime; picking the lifetime from the traffic pattern (busy, sparse, bursty) and computing the break-even
- Measurement: reading \`cache_read_input_tokens\` / \`cache_creation_input_tokens\` or \`cached_tokens\` per request, tracking hit rate per prompt version, and catching the deploy that silently breaks the prefix

**Clarifying questions expected:**
- What does the traffic look like per prompt prefix: steady, bursty, or a few requests an hour?
- Which parts of the prompt change per tenant, per user and per request?
- Which exact models are in use (minimum cacheable length, discount and retention options are per model)?

**Code / implementation expected:** Optional — request shapes for both providers with the cache controls, plus the cost arithmetic for the chosen lifetime.`,
    answer: `**Target Audience:** Engineers who already know what prompt caching is and now have to make it pay on a real bill, on Anthropic, OpenAI or both.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (the cost simulator below). Provider behaviour was checked in October 2026 against the Anthropic docs, OpenAI announcements, and the Azure and third-party documentation cited inline where OpenAI's own guide could not be read directly.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

The title says 2025; the facts below are as of October 2026, and several changed during 2025 and 2026 (longer lifetimes, deeper discounts, explicit modes). The mechanism underneath, an exact-prefix reuse of the model's attention state, is explained in [What is prompt caching and how does it reduce cost and latency?](/interview-question/what-is-prompt-caching-and-how-does-it-reduce-cost-and-latency); this doc is about using the two big providers' caches well.

## 1. Why This Even Matters — A Story First

Two copy shops sit on the same street. Both will keep your 300-page master document on the counter so the next copy is cheap.

The first shop charges a small **shelving fee** each time it puts your document on the counter, and then charges very little for each copy. If nobody touches the document for five minutes, it goes back to the archive and the next visit pays the shelving fee again. You can pay double to have it kept for an hour instead.

The second shop puts documents on the counter for free and also charges little per copy, but it decides for itself which counter your document lands on, and if you send too many people at once, some of them go to a counter that does not have it.

Neither shop is "better". Which one costs you less depends on **how often you come back**. If you come every minute, both are cheap. If you come every eight minutes, the first shop's five-minute shelf is a trap: you pay the shelving fee on every visit and never get a cheap copy. Anthropic's cache works like the first shop and OpenAI's like the second, and a large part of the engineering is matching the cache settings to your traffic.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How many requests per minute share the same prefix, and how bursty is it? | Decides the lifetime: 5 minutes, 1 hour or 24 hours, and whether a write surcharge pays off at all |
| Which parts of the prompt are shared by all tenants, by one tenant, by one user? | Decides where the cache layers and breakpoints go |
| Which exact models? | Minimum cacheable length, discount and retention options are set per model |
| Are requests fanned out in parallel? | A new entry is not usable by concurrent requests until the first one starts responding (Anthropic docs) |
| Is zero data retention or a regional deployment required? | Retention options and eligibility differ by feature and platform |

## 3. The Rule Both Providers Share

Both caches reuse an **exact prefix**, so the first and biggest win is the same everywhere: lay the prompt out from most stable to least stable.

<svg class="iq-diagram" width="100%" viewBox="0 0 880 250" role="img" aria-label="Prompt layout from most stable to least stable with breakpoints after tools and system, after documents and after history">
  <rect class="d-box-accent" x="20" y="50" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="80" text-anchor="middle">tools</text>
  <text class="d-sub" x="95" y="104" text-anchor="middle">all tenants</text>
  <rect class="d-box-accent" x="190" y="50" width="150" height="70" rx="10"/>
  <text class="d-text" x="265" y="80" text-anchor="middle">system</text>
  <text class="d-sub" x="265" y="104" text-anchor="middle">all tenants</text>
  <rect class="d-box" x="380" y="50" width="150" height="70" rx="10"/>
  <text class="d-text" x="455" y="80" text-anchor="middle">documents</text>
  <text class="d-sub" x="455" y="104" text-anchor="middle">one tenant</text>
  <rect class="d-box" x="570" y="50" width="130" height="70" rx="10"/>
  <text class="d-text" x="635" y="80" text-anchor="middle">history</text>
  <text class="d-sub" x="635" y="104" text-anchor="middle">one chat</text>
  <rect class="d-box-muted" x="740" y="50" width="120" height="70" rx="10"/>
  <text class="d-text" x="800" y="80" text-anchor="middle">new turn</text>
  <text class="d-sub" x="800" y="104" text-anchor="middle">uncached</text>
  <path class="d-edge-accent" d="M 360 30 L 360 140"/>
  <path class="d-edge-accent" d="M 550 30 L 550 140"/>
  <path class="d-edge-accent" d="M 720 30 L 720 140"/>
  <text class="d-sub" x="360" y="180" text-anchor="middle">breakpoint 1</text>
  <text class="d-sub" x="550" y="210" text-anchor="middle">breakpoint 2</text>
  <text class="d-sub" x="720" y="180" text-anchor="middle">breakpoint 3</text>
</svg>

Each vertical line is a point where a cache entry can end. Everything left of a line must be byte-identical for that entry to hit, so the layers are ordered by how many requests share them. On Anthropic the lines are explicit \`cache_control\` markers; on OpenAI's automatic mode the cache simply finds the longest matching prefix, and the same ordering decides how long that match is.

📌 **Interview term: stable-first prompt layout** — ordering prompt content from what changes least (tools, rules) to what changes most (the new user message, per-request data), so the longest possible prefix is shared between requests.

## 4. Anthropic: Explicit Breakpoints and a Write Fee

Facts from the Claude docs page "Prompt caching" (checked October 2026) unless stated otherwise:

- **How you turn it on.** Either mark up to **4 breakpoints** with \`"cache_control": {"type": "ephemeral"}\` on content blocks, or add one **top-level** \`cache_control\`, which the API applies to the last cacheable block and "moves forward as conversations grow". The automatic form uses one of the four slots.
- **Order.** Prefixes are built from \`tools\`, then \`system\`, then \`messages\`. A change to tool definitions invalidates everything; changing \`tool_choice\`, adding or removing images, or changing thinking settings invalidates the message blocks.
- **Lookback.** For each breakpoint the system checks at most 20 block positions back for an existing entry. A breakpoint placed after more than 20 new blocks can miss an older entry that a nearer breakpoint would have hit.
- **Lifetime.** 5 minutes by default, "refreshed at no cost on each use", or 1 hour with \`"ttl": "1h"\`. Entries with the longer lifetime must come before shorter ones.
- **Price, relative to the base input price.** 5-minute writes 1.25x, 1-hour writes 2x, reads 0.1x. The same page lists cheaper reads on some newer models (0.05x on Claude Opus 5.5 and Sonnet 5.5, 0.025x on Claude Fable 5.1 and Mythos 5.1).
- **Minimum length.** 512 to 4,096 tokens depending on the model; below it nothing is cached and no error is returned.
- **Usage.** \`cache_creation_input_tokens\` (written), \`cache_read_input_tokens\` (read) and \`input_tokens\` (after the last breakpoint); their sum is the total input.
- **Concurrency.** "A cache entry only becomes available after the first response begins." Fire 20 parallel requests with a new prefix and all 20 pay the write.
- **Isolation.** Caches are isolated between organizations and, on the Claude API, per workspace.

History: Anthropic launched prompt caching in public beta on August 14, 2024, and made it generally available on December 17, 2024 (Anthropic news post "Prompt caching with Claude", with its update note).

A request with a long-lived shared prefix and a short-lived document layer (not run here; shape from the Claude docs, October 2026):

~~~python
import anthropic
client = anthropic.Anthropic()

resp = client.messages.create(
    model="<model id>",
    max_tokens=1024,
    tools=TOOLS,                                   # sorted, stable JSON
    system=[
        {"type": "text", "text": RULES,
         "cache_control": {"type": "ephemeral", "ttl": "1h"}},     # shared by every tenant
        {"type": "text", "text": tenant_docs(tenant_id),
         "cache_control": {"type": "ephemeral"}},                  # 5 minutes, per tenant
    ],
    messages=history + [{"role": "user", "content": question}],
)
u = resp.usage
print(u.cache_read_input_tokens, u.cache_creation_input_tokens, u.input_tokens)
~~~

📌 **Interview term: cache breakpoint** — a marked position in the prompt where a cache entry ends. Everything before it is the entry's key; Anthropic allows up to four per request.

📌 **Interview term: write premium** — the extra price charged when a request creates a cache entry. It is what turns caching into a bet: the entry must be read enough times before it expires to pay it back.

## 5. OpenAI: Automatic Caching and Routing

OpenAI's documentation site could not be fetched from this environment, so the facts below come from OpenAI's announcements plus Azure's and third-party docs of the same feature, and are worded accordingly.

- **Automatic since October 2024.** OpenAI's announcement "Prompt Caching in the API" (October 1, 2024) introduced automatic caching for prompts longer than 1,024 tokens, matching the longest previously computed prefix in 128-token increments, with no code change and a 50% discount on cached input at the time.
- **Bigger discount and longer retention since November 2025.** OpenAI's "GPT-5.1 for developers" post (November 13, 2025) introduced \`prompt_cache_retention: "24h"\`, describing cached input as 90% cheaper than uncached and "no additional charge for cache writes or storage". Simon Willison's write-up quotes an OpenAI engineer saying the extended mode offloads caches from GPU memory to GPU-local storage. Which models support it is per model; a community thread shows an error on unsupported ones.
- **In-memory default lifetime.** Azure's documentation says in-memory caches are typically cleared after 5 to 10 minutes of inactivity and always within an hour of last use. I could not read OpenAI's own wording for this.
- **Routing.** Requests are routed by a hash of the initial prompt tokens combined with the optional \`prompt_cache_key\`. OpenAI's guide, as quoted in search results and repeated in Azure's docs, advises keeping each prefix-and-key combination to roughly 15 requests per minute, because overflow can go to machines without the entry.
- **Usage.** \`usage.prompt_tokens_details.cached_tokens\` on Chat Completions (Azure docs and gateway docs); a miss shows 0.
- **Newer explicit mode.** For GPT-5.6 and later, Azure and AWS documentation describe a \`prompt_cache_breakpoint\` marker, a \`prompt_cache_options\` object with an explicit mode, and a minimum lifetime set as \`ttl: "30m"\`, with up to four writes per request. One third-party blog reports that writes in this mode are billed at 1.25x; I could not confirm that against OpenAI's pricing page, so treat it as unverified.

A request that routes one tenant's traffic consistently (not run here; parameter names from the November 2025 announcement and the docs summaries above):

~~~python
from openai import OpenAI
client = OpenAI()

resp = client.responses.create(
    model="<model id>",
    instructions=RULES,                 # stable, first
    input=[*history, {"role": "user", "content": question}],
    tools=TOOLS,
    prompt_cache_key=f"support-agent-v7:{tenant_id}",   # same key for the same prefix family
    prompt_cache_retention="24h",                       # only on models that support it
)
print(resp.usage.input_tokens_details.cached_tokens)
~~~

📌 **Interview term: cache routing key** — a value (\`prompt_cache_key\` at OpenAI) mixed into the hash that picks which machine serves a request, so requests sharing a prefix land where its cache lives.

📌 **Interview term: cache retention (lifetime, TTL)** — how long an unused cache entry is kept. A hit refreshes it; once it expires, the next request pays full price (and any write premium) again.

Google's Gemini API follows the same idea: it added **implicit** caching for Gemini 2.5 models on May 8, 2025, with a 75% discount on cached tokens, minimums of 1,024 (2.5 Flash) and 2,048 (2.5 Pro) tokens, and reporting in \`cached_content_token_count\`; explicit context caches remain available for guaranteed savings (Google Developers Blog, "Gemini 2.5 Models now support implicit caching").

## 6. Comparison

| | Anthropic | OpenAI |
| :--- | :--- | :--- |
| How it starts | \`cache_control\` breakpoints (up to 4) or one top-level automatic \`cache_control\` | Automatic from 1,024 tokens; explicit breakpoints on the newest models |
| Granularity | Up to the breakpoint, with a 20-block lookback | Longest prefix, in 128-token steps |
| Lifetime | 5 min (refreshed on hit) or 1 h | In-memory (minutes) or extended 24 h on supported models; 30 min minimum in the newer explicit mode |
| Write cost | 1.25x (5 min) or 2x (1 h) | None under the 2024 and 2025 announcements; a 1.25x write for the newer explicit mode is reported only by a third party |
| Read cost | 0.1x on most models, lower on some newer ones | 50% off at launch, 90% off per the GPT-5.1 announcement |
| Main miss cause besides prompt changes | Expiry, missing breakpoint, parallel fan-out | Routing overflow, expiry |
| Usage field | \`cache_read_input_tokens\`, \`cache_creation_input_tokens\` | \`cached_tokens\` |

## 7. Picking the Lifetime from the Traffic

A write premium means the right lifetime depends on the gaps between requests that share a prefix:

<svg class="iq-diagram" width="100%" viewBox="0 0 880 230" role="img" aria-label="Timeline with a request every eight minutes where each five minute cache window expires before the next request arrives">
  <path class="d-edge" d="M 40 120 L 840 120"/>
  <rect class="d-box-muted" x="60" y="70" width="100" height="36" rx="6"/>
  <rect class="d-box-muted" x="260" y="70" width="100" height="36" rx="6"/>
  <rect class="d-box-muted" x="460" y="70" width="100" height="36" rx="6"/>
  <rect class="d-box-muted" x="660" y="70" width="100" height="36" rx="6"/>
  <text class="d-sub" x="110" y="93" text-anchor="middle">5 min live</text>
  <text class="d-sub" x="310" y="93" text-anchor="middle">5 min live</text>
  <text class="d-sub" x="510" y="93" text-anchor="middle">5 min live</text>
  <text class="d-sub" x="710" y="93" text-anchor="middle">5 min live</text>
  <rect class="d-box-accent" x="50" y="135" width="20" height="30" rx="4"/>
  <rect class="d-box-accent" x="250" y="135" width="20" height="30" rx="4"/>
  <rect class="d-box-accent" x="450" y="135" width="20" height="30" rx="4"/>
  <rect class="d-box-accent" x="650" y="135" width="20" height="30" rx="4"/>
  <text class="d-text" x="60" y="195" text-anchor="middle">0</text>
  <text class="d-text" x="260" y="195" text-anchor="middle">8</text>
  <text class="d-text" x="460" y="195" text-anchor="middle">16</text>
  <text class="d-text" x="660" y="195" text-anchor="middle">24 min</text>
</svg>

Every request (the small blocks on the line) arrives after the previous 5-minute entry has expired, so every request is a write at 1.25x and none is a read. The arithmetic for when a write pays back is simple: a write costs \`w\` times the base price instead of 1, and every later read saves \`1 - r\`. So it pays off after \`ceil((w - 1) / (1 - r))\` reads: 1 read for a 1.25x write, 2 reads for a 2x write (with \`r = 0.1\`).

## 8. Verified: Running the Code

The example **"Cache policy cost simulator: write fee and lifetime vs traffic pattern"** replays three traffic patterns on a fake clock against five billing policies, for a 10,000-token shared prefix and a 200-token per-request tail at an illustrative $3 per million input tokens. The policies are billing *shapes*, not vendor quotes: "write 1.25x, 5m" and "write 2x, 1h" match Anthropic's documented multipliers; "free write, 5m" and "free write, 24h" match OpenAI's in-memory and extended retention as announced in 2024 and 2025, including the 128-step counting. A hit or a write refreshes the lifetime. Multipliers are integers in hundredths so both languages compute identical numbers.

~~~js
const hit = policy.ttl > 0 && t < expires;
if (hit) {
  const c = policy.steps128 ? steppedCachedTokens(PREFIX) : PREFIX;   // 9984 of 10000
  units += c * policy.read + (PREFIX - c) * 100;
} else {
  units += PREFIX * policy.write;                                      // miss: pay the write
}
if (policy.ttl > 0) expires = t + policy.ttl;                          // write or hit refreshes
~~~

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
prefix 10000 tokens, suffix 200, base $3.00/M; 128-step caches count 9984 of 10000 prefix tokens

busy: 1 req/min for 1h (60 requests)
  no cache           hits  0/60  $1.8360  +0.0% vs no cache
  write 1.25x, 5m    hits 59/60  $0.2505  -86.4% vs no cache
  write 2x, 1h       hits 59/60  $0.2730  -85.1% vs no cache
  free write, 5m     hits 59/60  $0.2455  -86.6% vs no cache
  free write, 24h    hits 59/60  $0.2455  -86.6% vs no cache

sparse: every 8 min for 2h (15 requests)
  no cache           hits  0/15  $0.4590  +0.0% vs no cache
  write 1.25x, 5m    hits  0/15  $0.5715  +24.5% vs no cache
  write 2x, 1h       hits 14/15  $0.1110  -75.8% vs no cache
  free write, 5m     hits  0/15  $0.4590  +0.0% vs no cache
  free write, 24h    hits 14/15  $0.0816  -82.2% vs no cache

bursts: 5 in a row every 30 min (20 requests)
  no cache           hits  0/20  $0.6120  +0.0% vs no cache
  write 1.25x, 5m    hits 16/20  $0.2100  -65.7% vs no cache
  write 2x, 1h       hits 19/20  $0.1290  -78.9% vs no cache
  free write, 5m     hits 16/20  $0.1807  -70.5% vs no cache
  free write, 24h    hits 19/20  $0.0998  -83.7% vs no cache

write 1.25x, 5m: pays off once a write is followed by 1 read(s) inside the TTL

write 2x, 1h: pays off once a write is followed by 2 read(s) inside the TTL
~~~

What the run shows:

- **Busy traffic** makes every policy look great (85% to 87% saved). This is the case most blog posts show, and it hides the next one.
- **Sparse traffic** (every 8 minutes) on a 5-minute cache with a write fee costs **24.5% more** than not caching: 15 writes, 0 reads. The free-write 5-minute cache saves nothing but costs nothing. The 1-hour cache and 24-hour retention turn the same traffic into 75.8% and 82.2% savings.
- **Bursty traffic** (5 requests in a row every 30 minutes) is the realistic middle: the 5-minute cache catches the 4 follow-ups in each burst; the 1-hour cache also bridges the 30-minute gaps and saves 78.9% instead of 65.7%.
- **The 128-token stepping** costs very little: 9,984 of 10,000 prefix tokens count as cached.
- **Break-even** matches the formula: 1 read pays for a 1.25x write, 2 reads for a 2x write.

What the simulation leaves out: minimum lengths, routing overflow, eviction under load, concurrency (parallel requests all paying the write), and output tokens, which caching never discounts.

## 9. A Practical Checklist

1. **Fix the layout first.** Sort tools, serialise JSON with stable key order, move dates, IDs and user names out of the system prompt to the end of the last user message.
2. **Layer by sharing.** Global rules, then per-tenant content, then per-conversation history, each with its own breakpoint on Anthropic or its own place in the order on OpenAI.
3. **Choose lifetimes from measured gaps.** Plot the time between requests per prefix. Mostly under 5 minutes: default lifetime. Typical gaps of 5 to 60 minutes: the 1-hour option on Claude, extended retention on OpenAI where supported.
4. **Warm before fanning out.** On Claude, send one request and wait for its response to begin before launching parallel requests that share a new prefix.
5. **Route deliberately on OpenAI.** One \`prompt_cache_key\` per prefix family (per tenant, per prompt version), split across several keys when one family exceeds the rate guidance.
6. **Measure.** Log the cache fields per request with the prompt version; dashboard the hit rate and cost per request; alert on a drop. The broader cost toolkit (model routing, batching, output limits) is in [How do you estimate and control LLM costs in production?](/interview-question/how-do-you-estimate-and-control-llm-costs-in-production) and [Cost optimization for LLM apps: how do you keep the bill predictable?](/interview-question/cost-optimization-for-llm-apps-how-do-you-keep-the-bill-predictable). Batch APIs are a separate discount for work that can wait: [When should you use batch APIs instead of real-time LLM calls?](/interview-question/when-should-you-use-batch-apis-instead-of-real-time-llm-calls)

## Common Pitfalls

- **Assuming caching always saves money.** With a write premium and gaps longer than the lifetime, it costs more. Compute it for your traffic before turning it on everywhere.
- **Breaking the prefix in a deploy.** Reordering tools, editing a word in the system prompt or changing \`tool_choice\` resets the cache; ship prompt changes knowing the first minutes after deploy are cold.
- **Fan-out with a cold prefix.** Twenty parallel sub-agent calls with a fresh shared prefix each pay a write on Claude; warm with one request first.
- **One routing key for everything on OpenAI.** Very high traffic on one key and prefix overflows to cold machines; no key at all lets unrelated prompts share routing. Use a key per prefix family and split hot ones.
- **Per-user data in the shared layer.** One user name in the "global" block makes it per-user, multiplying writes and leaking context across users if the layer is ever reused wrongly.
- **Reading the discount but not the field.** A prompt just under the minimum length is never cached and no error says so; only \`cache_read_input_tokens\` or \`cached_tokens\` tells you.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. One rule for both:</strong> <span style="color:#f0e2c8;">Both providers reuse an exact prompt prefix, so the first fix is layout: tools, system prompt, reference docs and history first and byte-stable, per-request data last. No provider setting rescues a prompt whose first line has a timestamp.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Anthropic in one breath:</strong> <span style="color:#f0e2c8;">On Claude I place up to four <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache_control</code> breakpoints, or one top-level <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache_control</code> that follows the conversation. Writes cost 1.25x for the 5-minute lifetime or 2x for 1 hour, reads a fraction of input price, and the minimum cacheable length depends on the model.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. OpenAI in one breath:</strong> <span style="color:#f0e2c8;">On OpenAI caching is automatic from 1,024 tokens in 128-token steps. I set a stable <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prompt_cache_key</code> per tenant or prompt family so requests route to the same cache, and use <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prompt_cache_retention: "24h"</code> where the model supports it. The newest models add an explicit breakpoint mode, so I check the docs for the exact model.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Choose the lifetime from traffic:</strong> <span style="color:#f0e2c8;">A write surcharge makes caching a bet on reuse. In my simulation, a request every 8 minutes on a 5-minute cache cost <strong style="color:#ffca28;">24.5% more</strong> than no caching, while the 1-hour cache cut it by 75.8%. The 2x write pays off after two reads inside the hour.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Prove it in production:</strong> <span style="color:#f0e2c8;">I log <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache_read_input_tokens</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cache_creation_input_tokens</code> on Claude and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">cached_tokens</code> on OpenAI per request, chart hit rate per prompt version, and alert when it drops after a deploy, because the usual regression is someone reordering tools or adding a date to the system prompt.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do you put the breakpoints on Claude?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">At the ends of the stable layers: after the tools and system prompt, after the large document block, and on the latest turn so history becomes a growing cached prefix. The API checks back up to 20 blocks before each breakpoint for an existing entry, so a breakpoint placed after a long run of new blocks can miss an older entry.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why would an identical prompt miss on OpenAI?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Routing. Requests go to a machine by a hash of the prompt start, combined with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">prompt_cache_key</code> if you send one. If one prefix and key get more than roughly 15 requests a minute, OpenAI's guidance (as Azure's docs of the same feature repeat) says the overflow can land on machines without the entry. Splitting high-volume traffic across a few keys fixes it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is the 1-hour cache always better?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. At 1 request a minute both lifetimes hit 59 of 60 in my run and the 1-hour write cost slightly more. It wins when gaps between requests exceed 5 minutes but stay under an hour, and it needs at least two reads per write to pay for the 2x price.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do multi-tenant prompts fit with caching?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Split the prompt into a shared block (tools, rules), a per-tenant block (their docs, settings), then the per-user and per-request parts. Each layer gets its own breakpoint or ordering slot, so tenants share the first entry and only pay a write for their own layer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you tell finance about the saving?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A computed number, not a promise: cached tokens times the price gap, minus write surcharges, from the usage fields. Then I explain that the saving moves with traffic shape: in my simulation the same prompt saved 86.4% when busy and lost money when sparse on the short lifetime.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Stable-first prompt layout | Ordering prompt content from least to most changing so the longest prefix is shared |
| Cache breakpoint | A marked position where a cache entry ends; up to four per request on Anthropic |
| Write premium | Extra price for creating a cache entry; repaid only by reads before expiry |
| Cache routing key | A value mixed into request routing so a prefix family lands where its cache lives |
| Cache retention (lifetime, TTL) | How long an unused entry is kept; hits refresh it |

**Conclusion:** Anthropic and OpenAI implement the same idea, reusing the computation for an exact prompt prefix, with different controls and different bills. On Claude you choose breakpoints and a 5-minute or 1-hour lifetime and pay a write premium, so the saving depends on reads per write; on OpenAI caching is automatic, writes have been free under the announced pricing, and the levers are routing with \`prompt_cache_key\` and longer retention on supported models. On both, the deciding factors are a stable-first prompt and traffic that comes back inside the lifetime: the same prompt saved 86% when busy and cost 24.5% extra when sparse on the wrong lifetime, so measure the gaps, pick the lifetime from them, and watch the cache fields on every request.`,
    examples: [
      {
        label: `Cache policy cost simulator: write fee and lifetime vs traffic pattern`,
        variants: [
          { tech: "node", code: `// Cost of one shared prompt prefix under four cache policies, replayed against three
// traffic patterns on a fake clock (minutes). Multipliers are relative to the base input
// price, in hundredths (100 = 1x), so all arithmetic stays in integers.
const PREFIX = 10000, SUFFIX = 200;     // tokens: shared prefix, per-request tail
const PRICE = 3.0;                       // $ per million input tokens (illustrative)

const POLICIES = [
  { name: "no cache", ttl: 0,    write: 100, read: 100, steps128: false },
  { name: "write 1.25x, 5m", ttl: 5,    write: 125, read: 10,  steps128: false },
  { name: "write 2x, 1h", ttl: 60,   write: 200, read: 10,  steps128: false },
  { name: "free write, 5m", ttl: 5,    write: 100, read: 10,  steps128: true },
  { name: "free write, 24h", ttl: 1440, write: 100, read: 10,  steps128: true },
];

// Caches that bill in steps count hits from 1,024 tokens in 128-token steps.
function steppedCachedTokens(prefix) {
  if (prefix < 1024) return 0;
  return 1024 + Math.floor((prefix - 1024) / 128) * 128;
}

function simulate(policy, times) {
  let expires = -1, hits = 0, units = 0;
  for (const t of times) {
    const hit = policy.ttl > 0 && t < expires;
    if (hit) {
      hits++;
      const c = policy.steps128 ? steppedCachedTokens(PREFIX) : PREFIX;
      units += c * policy.read + (PREFIX - c) * 100;
    } else {
      units += PREFIX * policy.write;
    }
    units += SUFFIX * 100;
    if (policy.ttl > 0) expires = t + policy.ttl;      // a write or a hit refreshes the TTL
  }
  return { hits, dollars: units / 100 * PRICE / 1e6 };
}

const range = (start, stop, step) => { const r = []; for (let t = start; t < stop; t += step) r.push(t); return r; };
const PATTERNS = {
  "busy: 1 req/min for 1h": range(0, 60, 1),
  "sparse: every 8 min for 2h": range(0, 120, 8),
  "bursts: 5 in a row every 30 min": range(0, 120, 30).flatMap(s => [s, s + 1, s + 2, s + 3, s + 4]),
};

console.log(\`prefix \${PREFIX} tokens, suffix \${SUFFIX}, base $\${PRICE.toFixed(2)}/M; 128-step caches count \${steppedCachedTokens(PREFIX)} of \${PREFIX} prefix tokens\`);
for (const [label, times] of Object.entries(PATTERNS)) {
  console.log(\`\\n\${label} (\${times.length} requests)\`);
  const base = simulate(POLICIES[0], times).dollars;
  for (const p of POLICIES) {
    const r = simulate(p, times);
    const delta = (100 * (r.dollars / base - 1)).toFixed(1);
    console.log(\`  \${p.name.padEnd(18)} hits \${String(r.hits).padStart(2)}/\${times.length}  $\${r.dollars.toFixed(4)}  \${(delta.startsWith("-") ? "" : "+") + delta}% vs no cache\`);
  }
}

// Break-even reads per write: extra write cost divided by saving per read.
for (const p of POLICIES.slice(1, 3)) {
  const reads = Math.ceil((p.write - 100) / (100 - p.read));
  console.log(\`\\n\${p.name}: pays off once a write is followed by \${reads} read(s) inside the TTL\`);
}` },
          { tech: "python", code: `# Cost of one shared prompt prefix under four cache policies, replayed against three
# traffic patterns on a fake clock (minutes). Multipliers are relative to the base input
# price, in hundredths (100 = 1x), so all arithmetic stays in integers.
import math

PREFIX, SUFFIX = 10000, 200      # tokens: shared prefix, per-request tail
PRICE = 3.0                      # $ per million input tokens (illustrative)

POLICIES = [
    {"name": "no cache",         "ttl": 0,    "write": 100, "read": 100, "steps128": False},
    {"name": "write 1.25x, 5m", "ttl": 5,    "write": 125, "read": 10,  "steps128": False},
    {"name": "write 2x, 1h", "ttl": 60,   "write": 200, "read": 10,  "steps128": False},
    {"name": "free write, 5m",    "ttl": 5,    "write": 100, "read": 10,  "steps128": True},
    {"name": "free write, 24h",   "ttl": 1440, "write": 100, "read": 10,  "steps128": True},
]


def stepped_cached_tokens(prefix):
    """Caches that bill in steps count hits from 1,024 tokens in 128-token steps."""
    if prefix < 1024:
        return 0
    return 1024 + (prefix - 1024) // 128 * 128


def simulate(policy, times):
    expires, hits, units = -1, 0, 0
    for t in times:
        hit = policy["ttl"] > 0 and t < expires
        if hit:
            hits += 1
            c = stepped_cached_tokens(PREFIX) if policy["steps128"] else PREFIX
            units += c * policy["read"] + (PREFIX - c) * 100
        else:
            units += PREFIX * policy["write"]
        units += SUFFIX * 100
        if policy["ttl"] > 0:
            expires = t + policy["ttl"]     # a write or a hit refreshes the TTL
    return {"hits": hits, "dollars": units / 100 * PRICE / 1e6}


PATTERNS = {
    "busy: 1 req/min for 1h": list(range(0, 60, 1)),
    "sparse: every 8 min for 2h": list(range(0, 120, 8)),
    "bursts: 5 in a row every 30 min": [s + k for s in range(0, 120, 30) for k in range(5)],
}

print(f"prefix {PREFIX} tokens, suffix {SUFFIX}, base \${PRICE:.2f}/M; 128-step caches count {stepped_cached_tokens(PREFIX)} of {PREFIX} prefix tokens")
for label, times in PATTERNS.items():
    print(f"\\n{label} ({len(times)} requests)")
    base = simulate(POLICIES[0], times)["dollars"]
    for p in POLICIES:
        r = simulate(p, times)
        delta = f"{100 * (r['dollars'] / base - 1):.1f}"
        sign = "" if delta.startswith("-") else "+"
        print(f"  {p['name']:<18} hits {r['hits']:>2}/{len(times)}  \${r['dollars']:.4f}  {sign}{delta}% vs no cache")

# Break-even reads per write: extra write cost divided by saving per read.
for p in POLICIES[1:3]:
    reads = math.ceil((p["write"] - 100) / (100 - p["read"]))
    print(f"\\n{p['name']}: pays off once a write is followed by {reads} read(s) inside the TTL")` },
        ],
      },
    ],
  },
  {
    title: `How do you manage conversations that outgrow the context window?`,
    difficulty: "medium",
    seoDescription: `Tiered conversation memory for LLM apps: facts block, rolling summary, recent turns, retrieval, compaction triggers and cache cost, with a verified replay.`,
    description: `**Question presented to candidate:**
"Our support assistant keeps the whole chat history in every request. Long sessions now hit the context limit, get slow and expensive, and the bot starts forgetting what the customer said at the start. How would you redesign how conversation history is managed?"

**What a strong answer should cover:**
- Why the naive fixes fail: a sliding window silently drops early facts (and must never drop the system prompt or split a tool call from its result); a single lossy summary keeps the gist and loses the specifics
- A tiered design: system prompt, a small facts or state block extracted from the conversation, a rolling summary of older turns, the most recent turns verbatim, and retrieval over the archived full history for anything else
- When and how to compact: a high-water mark with headroom for the reply, compacting down to a low-water mark so it does not run every turn, clearing old tool results before summarising, and a structured summary prompt that must keep IDs, decisions and open tasks
- Interplay with prompt caching and cost: an append-only history is a growing cached prefix, so every rewrite of earlier context is a cache miss; compaction should be infrequent and batched
- Provider options and evaluation: server-side compaction and context editing (Anthropic), compaction and truncation settings in OpenAI's Responses API, and testing that facts survive compaction with replayed long conversations

**Clarifying questions expected:**
- Is this plain chat, or an agent whose history is mostly tool calls and tool results?
- Do we need the exact transcript for audit or replay, or only for the model's context?
- How long do sessions run, and does the assistant need to remember across sessions as well?

**Code / implementation expected:** Optional — a context builder with a token budget, a compaction trigger and a facts block, or a sketch of the request layout.`,
    answer: `**Target Audience:** Engineers running a chat assistant or agent whose sessions get long, and who need a history strategy that is cheaper than "send everything" without making the bot forget.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (the conversation replay below). Provider compaction features were checked against the Anthropic docs and OpenAI documentation summaries cited inline, in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

What a context window is, what the API does on overflow, and the three basic ways to make a long history fit (cut the oldest, keep the system prompt, summarise) are covered in [What is a context window and what happens when you exceed it?](/interview-question/what-is-a-context-window-and-what-happens-when-you-exceed-it). This doc is the production design that comes after that: what to keep, when to compact, how it interacts with caching and cost, and how to check it works.

## 1. Why This Even Matters — A Story First

A good hotel concierge handles a guest who stays for three weeks. They do not memorise every word the guest has said. They keep three things:

- a **card in the guest's file** with the facts that must never be wrong: room 412, allergic to peanuts, prefers email, checking out on the 21st;
- a **short running note** of what has happened: "complained about noise on day 2, moved rooms, happy since";
- and a **clear memory of the last conversation**, word for word.

If the guest asks something about day 5, the concierge can open the **logbook** at the desk and look it up.

A chatbot that resends the full transcript on every turn is a concierge who re-reads three weeks of logbook before answering "what time is breakfast?". A bot that only keeps the last ten messages is a concierge with amnesia who has lost the allergy card. The design below is the concierge: a facts card, a running summary, the recent turns verbatim, and a logbook to search.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Plain chat, or an agent with tool calls? | Agents fill the context with tool results, which can be cleared long before turns need summarising |
| How long do sessions run, in turns and tokens? | Sets the budget, the compaction trigger and how often compaction runs |
| Is the exact transcript needed for audit or replay? | The model's context can be compacted; the stored transcript usually must not be |
| What facts must never be lost (IDs, amounts, consent, preferences)? | Defines the schema of the facts block |
| Does memory need to carry across sessions? | Turns this into long-term memory, a different design ([How do agents maintain memory across steps and sessions?](/interview-question/how-do-agents-maintain-memory-across-steps-and-sessions)) |

## 3. Why "Send Everything" Breaks Before the Limit

Long before a request is rejected for being too long, three costs grow with every turn:

- **Money.** Every input token is billed on every request, so a conversation of \`n\` turns costs roughly the sum of all its prefixes: growth with the *square* of its length, not linear.
- **Latency.** The whole prompt goes through prefill before the first output token.
- **Quality.** Models use information in the middle of a long context less reliably ("lost in the middle", covered in the context-window doc), and stale, irrelevant turns compete with the relevant ones. Anthropic's compaction overview states it directly: compaction "keeps the active context small, because response quality degrades as a conversation grows" (Claude docs, "Compaction overview", October 2026).

📌 **Interview term: context budget** — the number of input tokens you allow a request to use: the window minus the tokens reserved for the reply, often set lower on purpose for cost and quality.

## 4. The Tiered Design

Build each request from layers, each with a different job and a different rate of change:

<svg class="iq-diagram" width="100%" viewBox="0 0 880 330" role="img" aria-label="Request built from system prompt, facts block, rolling summary and recent turns, with an archive of the full transcript searched when needed">
  <defs>
    <marker id="ai11q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="30" width="520" height="50" rx="8"/>
  <text class="d-text" x="40" y="61">system prompt</text>
  <text class="d-sub" x="520" y="61" text-anchor="end">never compacted</text>
  <rect class="d-box-accent" x="20" y="95" width="520" height="50" rx="8"/>
  <text class="d-text" x="40" y="126">facts block</text>
  <text class="d-sub" x="520" y="126" text-anchor="end">exact values, small</text>
  <rect class="d-box" x="20" y="160" width="520" height="50" rx="8"/>
  <text class="d-text" x="40" y="191">rolling summary</text>
  <text class="d-sub" x="520" y="191" text-anchor="end">older turns, lossy</text>
  <rect class="d-box" x="20" y="225" width="520" height="50" rx="8"/>
  <text class="d-text" x="40" y="256">recent turns</text>
  <text class="d-sub" x="520" y="256" text-anchor="end">verbatim</text>
  <rect class="d-box-muted" x="640" y="130" width="220" height="90" rx="10"/>
  <text class="d-text" x="750" y="165" text-anchor="middle">archive</text>
  <text class="d-sub" x="750" y="192" text-anchor="middle">full transcript</text>
  <path class="d-edge-dashed" d="M 636 185 L 548 185" marker-end="url(#ai11q3-arrow)"/>
</svg>

The archive keeps every message; only what the model sees is curated. When the user refers to something only the archive has, a retrieval step pulls the relevant old turns back in (the same machinery as RAG, see [What is RAG and why use it instead of fine-tuning for knowledge?](/interview-question/what-is-rag-and-why-use-it-instead-of-fine-tuning-for-knowledge)).

📌 **Interview term: facts block (state, scratchpad, pinned memory)** — a small structured list of things the user established that must survive exactly: identifiers, amounts, preferences, decisions, open tasks. It is extracted from the conversation, not summarised.

📌 **Interview term: rolling summary** — a model-written summary of older turns, updated incrementally as more turns are folded in. It keeps the storyline cheaply and is allowed to lose detail, which is why the facts block exists next to it.

📌 **Interview term: recent-turn window** — the last few turns kept word for word, because the next answer usually depends on them and paraphrasing them loses tone and detail.

### What must never be split or dropped

- **The system prompt.** Cutting "oldest first" from the raw message list removes the rules (the context-window doc shows this bug).
- **Tool call and tool result pairs.** A result without its call, or a call without its result, is an invalid history for tool-calling APIs and confuses the model. Drop or clear them as a pair.
- **Whole turns.** In the run below, the sliding window's context starts with an assistant reply whose question had been dropped. Trim by user/assistant turn, not by message.

## 5. When and How to Compact

Compacting on every turn is expensive (a summary call each time) and breaks the cache every time. Compacting exactly at the limit leaves no room for the reply. The standard answer is two thresholds:

<svg class="iq-diagram" width="100%" viewBox="0 0 880 300" role="img" aria-label="Context tokens grow each turn up to a high water mark then compaction drops them to a low water mark in a sawtooth">
  <path class="d-edge" d="M 60 250 L 840 250"/>
  <path class="d-edge" d="M 60 250 L 60 30"/>
  <path class="d-edge-dashed" d="M 60 70 L 840 70"/>
  <path class="d-edge-dashed" d="M 60 150 L 840 150"/>
  <text class="d-sub" x="830" y="58" text-anchor="end">high water 85 percent</text>
  <text class="d-sub" x="830" y="138" text-anchor="end">low water 60 percent</text>
  <polyline class="d-edge-accent" fill="none" points="70,230 150,190 230,150 310,110 370,75 370,150 450,110 520,75 520,150 600,110 670,75 670,150 750,115"/>
  <text class="d-sub" x="370" y="185" text-anchor="middle">compact</text>
  <text class="d-sub" x="520" y="185" text-anchor="middle">compact</text>
  <text class="d-sub" x="670" y="185" text-anchor="middle">compact</text>
  <text class="d-sub" x="450" y="285" text-anchor="middle">turns</text>
</svg>

Tokens climb with each turn until the high-water mark, then one compaction brings them down to the low-water mark, so the next several turns run with no extra work.

📌 **Interview term: compaction** — rewriting the older part of the context into a smaller form (cleared tool results, a summary) when a threshold is reached, while keeping the full transcript elsewhere.

📌 **Interview term: high-water and low-water marks (hysteresis)** — compact when usage crosses the upper threshold, and compact far enough to land at the lower one, so compaction happens rarely and the reply always has room.

Inside one compaction, do the cheap, lossless things first:

1. **Clear old tool results** to a short placeholder ("cleared, re-run the tool if needed"). They are usually the biggest and stalest content, and the tool can be called again.
2. **Publish the facts block** from what the extractor has collected (see why in section 6).
3. **Fold the oldest turns into the rolling summary** until the low-water mark is reached, keeping the last few turns verbatim.

### Write the summary prompt as a template

"Summarise the conversation" produces a pleasant paragraph that drops the order number. A production summariser gets a structure and rules: *user goal; facts with exact values (copy identifiers exactly); decisions made; promises the assistant made; open questions*. It should merge into the previous summary rather than re-summarise a summary of a summary, which compounds loss. And it has to be tested (section 9).

## 6. Compaction and Prompt Caching

An **append-only** history is the best case for prompt caching: each request is the previous request plus new turns, so everything before the new turns is a cached prefix ([What is prompt caching and how does it reduce cost and latency?](/interview-question/what-is-prompt-caching-and-how-does-it-reduce-cost-and-latency)). Any change to *earlier* context (dropping an old message, rewriting the summary, editing the facts block) changes the prefix and turns the next request into a cache write.

So the design goal is: **change earlier context rarely and in one go.** Three consequences:

- A sliding window that drops one message per turn once full rewrites the prefix on every turn.
- A facts block that is updated on every turn and sits near the top breaks the cache on every turn. In the example, facts are *extracted* every turn but *published* into the prompt only at compaction. Nothing is lost by waiting, because until a turn is compacted, its facts are still in the verbatim history.
- After compaction, place a cache breakpoint at the end of the system prompt so it stays cached and only the new summary is written. Anthropic's docs recommend exactly this for its server-side compaction: with a breakpoint at the end of the system prompt, "The system prompt cache remains valid", and "Only the compaction summary needs to be written as a new cache entry" (Claude docs, "Compaction at a token threshold", October 2026). The same docs warn that clearing tool results invalidates cached prefixes and offer a \`clear_at_least\` setting so each clearing removes enough tokens to justify the new cache write.

## 7. What the Providers Offer

You can build all of this yourself, and you still need your own facts block, but both large providers now run parts of it server-side. These features are in beta or new, so check the current docs before relying on details.

**Anthropic** (Claude docs, checked October 2026):

- **Compaction at a token threshold**, beta header \`compact-2026-01-12\`: add \`{"type": "compact_20260112", "trigger": {"type": "input_tokens", "value": 150000}}\` to \`context_management.edits\`. The default trigger is 150,000 input tokens and the minimum is 50,000. When it fires, the response starts with a \`compaction\` block that you send back; the API ignores everything before it. An \`instructions\` field replaces the default summarisation prompt.
- **Compaction on demand**, beta header \`compact-2026-09-04\`, where your application decides when to compact, can keep recent turns verbatim, and can compact in the background.
- **Context editing**, beta header \`context-management-2025-06-27\`: \`clear_tool_uses_20250919\` clears the oldest tool results past a trigger (default 100,000 input tokens), keeping the last 3 tool uses by default, with \`exclude_tools\` for tools whose results must stay; \`clear_thinking_20251015\` manages old thinking blocks.

**OpenAI** (OpenAI's compaction guide as summarised in search results, October 2026; I could not open the page directly):

- **Server-side compaction** in the Responses API is enabled with \`context_management\` and a \`compact_threshold\`; the response then includes an encrypted compaction item. A standalone, stateless \`/responses/compact\` endpoint takes a full context and returns a compacted one, and the guide says not to prune its output.
- **Truncation.** The Responses API reference describes a \`truncation\` setting whose default, \`disabled\`, fails with a 400 when the input exceeds the window; \`auto\` drops input items instead. Copies of the documentation disagree on whether it drops from the beginning or the middle, which is one reason to control trimming yourself.
- **\`previous_response_id\`** chains turns on the server so you send only the new message, but it is a storage convenience, not a context policy: a third-party test report found it did not prevent overflow without compaction.

A request with threshold compaction on Claude looks like this (not run here; shape from the Claude docs, October 2026):

~~~python
resp = client.beta.messages.create(
    model="<model id>",
    max_tokens=2048,
    betas=["compact-2026-01-12"],
    system=[{"type": "text", "text": RULES, "cache_control": {"type": "ephemeral"}}],
    messages=messages,
    context_management={"edits": [{
        "type": "compact_20260112",
        "trigger": {"type": "input_tokens", "value": 120000},
        "instructions": SUMMARY_TEMPLATE,   # keep IDs, decisions, promises, open questions
    }]},
)
messages.append({"role": "assistant", "content": resp.content})   # includes any compaction block
~~~

## 8. Verified: Running the Code

The example **"Sliding window vs summarise-on-overflow vs tiered memory on one long chat"** replays the same 8-turn support conversation (with two tool calls) through three context strategies, under a 200-token budget, with tokens counted as words plus 4 per message. Three facts are given early: the order number (1042), the contact preference (email) and the new delivery city (Berlin). The last question needs all three. The "summary" is a deterministic stub that keeps the first four words of each user message, standing in for a short, lossy model summary. The facts extractor is three regular expressions, standing in for a cheap extraction call.

The tiered builder's compaction step:

~~~js
if (total(build()) > BUDGET * 0.85) {          // high-water mark
  for (let i = 0; i < history.length - 4; i++)  // 1) clear old tool results
    if (history[i].startsWith("tool_result")) history[i] = "tool_result: [cleared, re-run tool if needed]";
  published = [...ledger];                      // 2) publish the facts block
  while (total(build()) > BUDGET * 0.6 && history.length > 4) folded.push(history.shift());  // 3) fold old turns
}
~~~

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
sliding window         final 182 tokens, peak 199/200, prefix rewrites 3/8, facts in context 1/3 [1042]
summarise on overflow  final 186 tokens, peak 199/200, prefix rewrites 1/8, facts in context 1/3 [1042]
tiered memory          final 141 tokens, peak 149/200, prefix rewrites 3/8, facts in context 3/3 [1042, Berlin, email]
full history would be 334 tokens; tiered compactions: 3

final tiered context sent with the last question:
  system: You are a support agent for Acme. Never promise dates you cannot see.
  facts: order 1042; contact by email; ship to Berlin
  summary: earlier the user said: Hi my order 1042 | Please contact me by | Also I moved ...
  assistant: It left Leipzig this morning heading to the regional hub.
  user: OK and is there a refund if it is late
  assistant: If it is more than five days late you can claim a shipping refund.
  user: Fine. Which order are you tracking, which city will it go to and how will you con...
~~~

How to read it:

- **Sliding window** keeps only 1 of 3 facts, and that one by luck: the order number survives only because a recent tool call (\`depot_history 1042\`) repeats it. Its context also begins with an orphaned assistant reply. It runs at 199 of 200 tokens, leaving no headroom.
- **Summarise on overflow** rewrites the prefix only once, which is good for caching, but its lossy summary kept "Please contact me by" and "Also I moved last", the four-word stubs that lost both "email" and "Berlin". This is the realistic failure of a vague summary prompt.
- **Tiered memory** is the only strategy with all three facts, at the smallest final size (141 tokens) and a peak of 149, well below the limit. It rewrote earlier context exactly 3 times, once per compaction. The printed final context shows the layers: system, facts, summary, recent turns.
- The full history would be 334 tokens, so all three strategies are doing real work.

The simulation leaves out the real summariser and extractor (model calls with their own errors and cost), retrieval from the archive, and a real tokenizer.

## 9. How to Know It Works

- **Replay tests.** Keep a set of long real (or realistic) transcripts with a list of facts each must keep. Run them through the context builder, then ask about early facts after one, two and three compactions. Track the share answered correctly as a regression metric, the way any LLM feature is evaluated ([What are evals and why does every LLM feature need them?](/interview-question/what-are-evals-and-why-does-every-llm-feature-need-them)).
- **Production signals.** Input tokens per turn (should plateau, not climb), cache hit rate (dips only at compactions), compactions per session, and the rate of "as I said before" style user complaints.
- **Summary diffing.** Log each summary with the turns it replaced, so a lost fact can be traced to the compaction that lost it ([What should you log and trace in an LLM application?](/interview-question/what-should-you-log-and-trace-in-an-llm-application)).

## Edge Cases Worth Knowing

- **The user corrects a fact.** "Actually, ship to Hamburg" must overwrite the facts block, not add a second city. Facts need keys (\`ship_to\`), not just sentences.
- **Summaries can carry injected instructions.** If a user or a tool result contains "ignore your rules", a summariser can copy it into the summary, where it now looks like trusted context. Summarise as data and keep the system prompt outside the compacted region ([What is prompt injection and how do you defend against it?](/interview-question/what-is-prompt-injection-and-how-do-you-defend-against-it)).
- **Personal data spreads.** Facts blocks and summaries are new copies of personal data with their own retention; delete them with the conversation ([How do you handle PII and sensitive data when calling LLM APIs?](/interview-question/how-do-you-handle-pii-and-sensitive-data-when-calling-llm-apis)).
- **Compaction latency.** A summary call in the request path adds a model round trip. Compact in the background after a reply, or use a provider's background mode where offered.
- **Very large single messages.** One pasted 50-page document can exceed the budget on its own; that is a retrieval problem (chunk and search it), not a history problem.

## Common Pitfalls

- **Cutting the raw message list from the front.** It drops the system prompt, splits tool pairs, or leaves an orphaned assistant turn. Trim by turn, protect the system prompt.
- **One vague summary for everything.** "Summarise this" keeps the gist and loses the specifics; use a template and a separate facts block.
- **Compacting every turn.** A model call and a cache miss per turn; compact at a high-water mark down to a low-water mark.
- **Updating the top of the prompt every turn.** A facts block or timestamp that changes each turn near the top kills the cache; batch the changes into compactions.
- **Treating server-side state as memory.** Chaining responses on the server stores the transcript; it does not decide what the model should see.
- **No test for forgetting.** Without replayed long transcripts and fact checks, a summariser regression goes unnoticed until users complain.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name the failure:</strong> <span style="color:#f0e2c8;">Resending the whole history eventually overflows the window, and long before that it gets slow, expensive and less accurate. The two quick fixes fail differently: a <strong style="color:#ffca28;">sliding window</strong> silently drops early facts, a single <strong style="color:#ffca28;">lossy summary</strong> keeps the gist and drops the order number.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Give the tiered design:</strong> <span style="color:#f0e2c8;">I build each request from layers: the system prompt, a small <strong style="color:#ffca28;">facts block</strong> of things the user told us (IDs, preferences, decisions), a <strong style="color:#ffca28;">rolling summary</strong> of older turns, the last few turns verbatim, and retrieval over the archived transcript for anything else.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Explain compaction:</strong> <span style="color:#f0e2c8;">Compaction runs at a <strong style="color:#ffca28;">high-water mark</strong>, say 85% of the input budget, and compacts down to about 60%, so it is rare. It clears old tool results first, then folds the oldest turns into the summary, never splits a tool call from its result, and never touches the system prompt.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Connect it to cost:</strong> <span style="color:#f0e2c8;">An append-only history is a growing cached prefix, so every rewrite of earlier context is a cache miss. In my replay the tiered design rewrote the prefix only at its 3 compactions and was the only strategy that kept all 3 facts.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Close with verification:</strong> <span style="color:#f0e2c8;">I test it by replaying long conversations and asking about early facts after compaction, and I watch tokens per turn and cache hit rate in production. Where available I use the provider features, Anthropic compaction and context editing or OpenAI Responses compaction, but I still own the facts block.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use a model with a 1M-token window?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It delays the overflow, it does not fix cost or quality. Every turn still pays for the whole history, prefill gets slower, and models use information in the middle of long contexts less reliably. A smaller, curated context is usually both cheaper and more accurate.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What goes into the facts block, and who writes it?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Things that must survive verbatim: IDs, amounts, names the user gave, stated preferences, decisions and open tasks. A cheap extraction step runs on each user turn (a model call with a strict schema, or rules for simple patterns), and it is published into the prompt at compaction so it does not break the cache every turn.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you write the summarisation prompt?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As a structured template, not <em style="color:#d8d8d8;">summarise this</em>: sections for user goal, facts with exact values, decisions made, open questions, and what the assistant promised. Tell it to copy identifiers exactly, then test it: replay transcripts and check that a list of key facts is still present after compaction.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is an agent different from a chat here?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Most of an agent's context is tool results, which are big and go stale fast. So the first move is clearing old tool results to a placeholder that says the tool can be re-run, which Anthropic's context editing does server-side, keeping tool call and result pairs together, before any summarising.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When do you start a fresh conversation instead?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the topic has changed or the summary has been compacted several times and quality drops. Carry over the facts block and a short handover summary into a new session; across sessions this becomes long-term memory, which is its own design problem.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Context budget | Input tokens a request may use: window minus reply reserve, often set lower deliberately |
| Facts block (state, pinned memory) | Small structured list of exact facts the user established, extracted rather than summarised |
| Rolling summary | Incrementally updated model summary of older turns; cheap, lossy |
| Recent-turn window | The last few turns kept verbatim |
| Compaction | Rewriting older context into a smaller form when a threshold is reached |
| High-water and low-water marks (hysteresis) | Compact at the upper threshold down to the lower one, so it happens rarely |

**Conclusion:** A conversation that outgrows the window is not solved by a bigger window or by dropping old messages, but by deciding what each part of the history is for. Keep the system prompt fixed, pull exact facts into a small block, fold older turns into a structured rolling summary, keep the last turns verbatim, and search the archive when the user reaches further back. Compact rarely, at a high-water mark down to a low-water mark, clearing tool results first, so the prompt stays a cached prefix between compactions. Then prove it with replayed long conversations: in the run above only the tiered design kept the order number, the city and the contact preference while using the fewest tokens.`,
    examples: [
      {
        label: `Sliding window vs summarise-on-overflow vs tiered memory on one long chat`,
        variants: [
          { tech: "node", code: `// Three ways to keep a growing chat inside a small token budget, replayed on the same
// conversation. Tokens = words + 4 per message. The "summary" is a stub that keeps the
// first 4 words of each user message (a stand-in for a short, lossy model summary).
const BUDGET = 200;                       // window minus reserved output tokens
const SYSTEM = "system: You are a support agent for Acme. Never promise dates you cannot see.";
const TURNS = [
  ["user: Hi my order 1042 has not arrived and I am worried about it", "assistant: Sorry to hear that. Let me check order 1042 for you right away."],
  ["user: Please contact me by email only, I cannot take phone calls at work", "assistant: Noted, I will use email for any updates on this case."],
  ["user: Also I moved last week, please ship to Berlin instead of Munich", "assistant: Thanks, I will update the delivery city before anything is resent."],
  ["user: Can you look up where the parcel is right now", "tool_use: lookup_order 1042",
   "tool_result: status in_transit carrier DHL depot Leipzig last_scan 14 Oct 09:12 weight 1.2kg service standard attempts 0 notes none customs none signature not_required",
   "assistant: The parcel is at the Leipzig depot and moving again."],
  ["user: What does in transit mean for the delivery date", "assistant: It usually means delivery within two to three business days."],
  ["user: Can you check the depot history too", "tool_use: depot_history 1042",
   "tool_result: 12 Oct Hamburg sorted 13 Oct Hamburg departed 13 Oct Leipzig arrived 14 Oct Leipzig sorted 14 Oct Leipzig departed next regional hub expected",
   "assistant: It left Leipzig this morning heading to the regional hub."],
  ["user: OK and is there a refund if it is late", "assistant: If it is more than five days late you can claim a shipping refund."],
  ["user: Fine. Which order are you tracking, which city will it go to and how will you contact me?"],
];
const FACTS = ["1042", "Berlin", "email"];

const tok = m => m.split(" ").length + 4;
const total = msgs => msgs.reduce((s, m) => s + tok(m), 0);
const summarise = msgs => "summary: earlier the user said: " +
  msgs.filter(m => m.startsWith("user:")).map(m => m.split(" ").slice(1, 5).join(" ")).join(" | ");

function sliding(history, newMsgs) {               // drop oldest messages, keep tool pairs together
  while (total([SYSTEM, ...history]) > BUDGET) history.splice(0, history[0].startsWith("tool_use") ? 2 : 1);
  return [SYSTEM, ...history];
}

let summaryState = [];                    // messages already folded into the summary
function summariseAll(history, newMsgs) {          // on overflow, fold everything but the last 2
  if (total([SYSTEM, ...summaryState.length ? [summarise(summaryState)] : [], ...history]) > BUDGET) {
    summaryState.push(...history.splice(0, history.length - 2));
  }
  return [SYSTEM, ...(summaryState.length ? [summarise(summaryState)] : []), ...history];
}

const ledger = [];                        // facts pulled out of user turns as they arrive
let published = [], folded = [];          // the facts block changes only at compaction
function tiered(history, newMsgs) {
  for (const m of newMsgs) {
    let r;
    if ((r = m.match(/order (\\d+)/)) && !ledger.includes("order " + r[1])) ledger.push("order " + r[1]);
    if ((r = m.match(/ship to (\\w+)/))) ledger.push("ship to " + r[1]);
    if ((r = m.match(/contact me by (\\w+)/))) ledger.push("contact by " + r[1]);
  }
  const build = () => [SYSTEM, ...(published.length ? ["facts: " + published.join("; ")] : []),
    ...(folded.length ? [summarise(folded)] : []), ...history];
  if (total(build()) > BUDGET * 0.85) {   // high-water mark (85%) hit: compact down to 60%
    for (let i = 0; i < history.length - 4; i++)   // 1) clear old tool results first
      if (history[i].startsWith("tool_result")) history[i] = "tool_result: [cleared, re-run tool if needed]";
    published = [...ledger];              // 2) publish the facts, 3) fold old turns
    while (total(build()) > BUDGET * 0.6 && history.length > 4) folded.push(history.shift());
    tiered.compactions++;
  }
  return build();
}
tiered.compactions = 0;

let finalTiered = [];
for (const [name, fn] of [["sliding window", sliding], ["summarise on overflow", summariseAll], ["tiered memory", tiered]]) {
  const history = [];
  let prev = [], rewrites = 0, peak = 0, ctx = [];
  TURNS.forEach(turn => {
    history.push(turn[0]);                 // user message arrives, then the request is built
    ctx = fn(history, [turn[0]]);
    if (prev.some((m, i) => ctx[i] !== m)) rewrites++;   // earlier context changed: cache prefix broken
    peak = Math.max(peak, total(ctx));
    prev = ctx;
    history.push(...turn.slice(1));        // assistant reply and tool messages
  });
  const text = ctx.join(" ");
  if (fn === tiered) finalTiered = ctx;
  const kept = FACTS.filter(f => text.includes(f));
  console.log(\`\${name.padEnd(22)} final \${total(ctx)} tokens, peak \${peak}/\${BUDGET}, prefix rewrites \${rewrites}/\${TURNS.length}, facts in context \${kept.length}/3 [\${kept.join(", ")}]\`);
}
console.log(\`full history would be \${total([SYSTEM, ...TURNS.flat()])} tokens; tiered compactions: \${tiered.compactions}\`);
console.log("\\nfinal tiered context sent with the last question:");
finalTiered.forEach(m => console.log("  " + (m.length > 90 ? m.slice(0, 87) + "..." : m)));` },
          { tech: "python", code: `# Three ways to keep a growing chat inside a small token budget, replayed on the same
# conversation. Tokens = words + 4 per message. The "summary" is a stub that keeps the
# first 4 words of each user message (a stand-in for a short, lossy model summary).
import re

BUDGET = 200                     # window minus reserved output tokens
SYSTEM = "system: You are a support agent for Acme. Never promise dates you cannot see."
TURNS = [
    ["user: Hi my order 1042 has not arrived and I am worried about it", "assistant: Sorry to hear that. Let me check order 1042 for you right away."],
    ["user: Please contact me by email only, I cannot take phone calls at work", "assistant: Noted, I will use email for any updates on this case."],
    ["user: Also I moved last week, please ship to Berlin instead of Munich", "assistant: Thanks, I will update the delivery city before anything is resent."],
    ["user: Can you look up where the parcel is right now", "tool_use: lookup_order 1042",
     "tool_result: status in_transit carrier DHL depot Leipzig last_scan 14 Oct 09:12 weight 1.2kg service standard attempts 0 notes none customs none signature not_required",
     "assistant: The parcel is at the Leipzig depot and moving again."],
    ["user: What does in transit mean for the delivery date", "assistant: It usually means delivery within two to three business days."],
    ["user: Can you check the depot history too", "tool_use: depot_history 1042",
     "tool_result: 12 Oct Hamburg sorted 13 Oct Hamburg departed 13 Oct Leipzig arrived 14 Oct Leipzig sorted 14 Oct Leipzig departed next regional hub expected",
     "assistant: It left Leipzig this morning heading to the regional hub."],
    ["user: OK and is there a refund if it is late", "assistant: If it is more than five days late you can claim a shipping refund."],
    ["user: Fine. Which order are you tracking, which city will it go to and how will you contact me?"],
]
FACTS = ["1042", "Berlin", "email"]


def tok(m):
    return len(m.split(" ")) + 4


def total(msgs):
    return sum(tok(m) for m in msgs)


def summarise(msgs):
    return "summary: earlier the user said: " + " | ".join(
        " ".join(m.split(" ")[1:5]) for m in msgs if m.startswith("user:"))


def sliding(history, new):       # drop oldest messages, keep tool pairs together
    while total([SYSTEM, *history]) > BUDGET:
        del history[0:2 if history[0].startswith("tool_use") else 1]
    return [SYSTEM, *history]


summary_state = []               # messages already folded into the summary
def summarise_all(history, new):  # on overflow, fold everything but the last 2
    if total([SYSTEM, *([summarise(summary_state)] if summary_state else []), *history]) > BUDGET:
        summary_state.extend(history[:-2])
        del history[:-2]
    return [SYSTEM, *([summarise(summary_state)] if summary_state else []), *history]


ledger = []                      # facts pulled out of user turns as they arrive
state = {"published": [], "folded": [], "compactions": 0}   # facts block changes only at compaction
def tiered(history, new):
    for m in new:
        r = re.search(r"order (\\d+)", m)
        if r and "order " + r[1] not in ledger:
            ledger.append("order " + r[1])
        r = re.search(r"ship to (\\w+)", m)
        if r:
            ledger.append("ship to " + r[1])
        r = re.search(r"contact me by (\\w+)", m)
        if r:
            ledger.append("contact by " + r[1])

    def build():
        return [SYSTEM, *(["facts: " + "; ".join(state["published"])] if state["published"] else []),
                *([summarise(state["folded"])] if state["folded"] else []), *history]

    if total(build()) > BUDGET * 0.85:      # high-water mark (85%) hit: compact down to 60%
        for i in range(len(history) - 4):   # 1) clear old tool results first
            if history[i].startswith("tool_result"):
                history[i] = "tool_result: [cleared, re-run tool if needed]"
        state["published"] = list(ledger)   # 2) publish the facts, 3) fold old turns
        while total(build()) > BUDGET * 0.6 and len(history) > 4:
            state["folded"].append(history.pop(0))
        state["compactions"] += 1
    return build()


final_tiered = []
for name, fn in [("sliding window", sliding), ("summarise on overflow", summarise_all), ("tiered memory", tiered)]:
    history, prev, rewrites, peak, ctx = [], [], 0, 0, []
    for turn in TURNS:
        history.append(turn[0])              # user message arrives, then the request is built
        ctx = fn(history, [turn[0]])
        if any(i >= len(ctx) or ctx[i] != m for i, m in enumerate(prev)):
            rewrites += 1                    # earlier context changed: cache prefix broken
        peak = max(peak, total(ctx))
        prev = ctx
        history.extend(turn[1:])             # assistant reply and tool messages
    if fn is tiered:
        final_tiered = ctx
    text = " ".join(ctx)
    kept = [f for f in FACTS if f in text]
    print(f"{name:<22} final {total(ctx)} tokens, peak {peak}/{BUDGET}, prefix rewrites {rewrites}/{len(TURNS)}, facts in context {len(kept)}/3 [{', '.join(kept)}]")
print(f"full history would be {total([SYSTEM, *[m for t in TURNS for m in t]])} tokens; tiered compactions: {state['compactions']}")
print("\\nfinal tiered context sent with the last question:")
for m in final_tiered:
    print("  " + (m[:87] + "..." if len(m) > 90 else m))` },
        ],
      },
    ],
  },
  {
    title: `How do you reduce hallucinations in a production LLM application?`,
    difficulty: "medium",
    seoDescription: `Layered hallucination defences for production LLM apps: grounding, abstention, citations, claim verification and evals, with a 4-layer scoring run.`,
    description: `**Question presented to candidate:**
"Our customer-facing assistant answers questions about our policies, and every week someone screenshots it inventing a refund rule we do not have. You own fixing it. What do you put in place, and how do you show it worked?"

**What a strong answer should cover:**
- Grounding first: answer from retrieved sources or tool results instead of model memory, and make the source of truth (policy docs, databases) the only place facts come from
- Permission and machinery to abstain: a prompt and output schema that allow "I do not know", plus a gate on weak retrieval, with the trade-off that a stricter gate refuses answerable questions
- Constrained, checkable output: citations or quotes per claim, then a post-generation check that each claim is supported by its cited passage (lexical overlap is weak; entailment models or an LLM judge are stronger), removing or flagging unsupported claims
- Product and process: show sources to users, route high-stakes or low-confidence answers to a human, and know the legal precedent (a tribunal held Air Canada liable for its chatbot's invented policy in 2024)
- Measurement: a labelled test set with answerable and unanswerable questions, tracking correct, hallucinated and abstained separately, plus sampling production traffic, because a hallucination rate is only meaningful against a defined set

**Clarifying questions expected:**
- Is there a reliable source of truth for these answers, and is it complete?
- What does a wrong answer cost compared with a refusal (legal, money, a mildly annoyed user)?
- Which model and setup today: plain prompt, RAG, or tools?

**Code / implementation expected:** Optional — a pipeline sketch with retrieval, an abstain gate and a claim check, or an evaluation loop that scores hallucinations separately from refusals.`,
    answer: `**Target Audience:** Engineers who own an LLM feature that real users rely on (support bots, internal assistants, document Q&A) and need to make it stop inventing things, measurably.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (the four-layer scoring run below). Case law, papers and provider features were checked via the sources cited inline, in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

Why models hallucinate at all (next-token prediction rewards plausible text, and training rewards guessing over admitting uncertainty) is the subject of [What are hallucinations and what causes them?](/interview-question/what-are-hallucinations-and-what-causes-them). This doc assumes that and is about what you build around the model.

## 1. Why This Even Matters — A Story First

A new employee at a help desk is articulate, fast and eager to please. On day one a customer asks about the refund rule for a funeral flight. The employee has never read the policy, but "bereavement fares can be claimed back within 90 days" sounds exactly like the kind of thing an airline would say, so that is what they say. The customer books, applies for the refund, and is told no such rule exists.

You would not fix that employee by asking them to "please be more accurate". You would hand them the policy binder and tell them to answer only from it (**grounding**). You would make it acceptable to say "I need to check" (**abstention**). You would ask them to point at the page they are quoting (**citations**), have a supervisor spot-check answers (**verification**), and send anything involving money to a manager (**human review**). Finally you would count how often they still get it wrong (**evaluation**).

That help desk story is real. In *Moffatt v. Air Canada* (2024 BCCRT 149, decided February 14, 2024), British Columbia's Civil Resolution Tribunal held Air Canada responsible for its website chatbot's wrong description of the bereavement-fare policy, rejected the argument that the chatbot was a separate entity, and ordered about CAD 812 in damages, interest and fees (as reported by Mondaq and MobileSyrup). The amount was small; the precedent was not: the company owns what its bot says.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Is there a source of truth for the answers, and is it complete and current? | Grounding only works if the facts exist somewhere retrievable; gaps become abstentions or errors |
| What does a wrong answer cost, compared with a refusal? | Sets how strict the abstain gate and verification should be, and where humans review |
| What is the setup today: plain prompt, RAG, tools? | Tells you which layer is missing |
| Which questions are users actually asking? | The evaluation set must look like real traffic, including the unanswerable ones |

## 3. The Layered Defence

No single technique removes hallucinations, so production systems stack several, each catching some of what the previous one let through.

<svg class="iq-diagram" width="100%" viewBox="0 0 880 330" role="img" aria-label="Question flows through retrieval, an abstain gate, generation with citations and a claim check, ending in an answer, an abstention or human review">
  <defs>
    <marker id="ai11q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="130" height="70" rx="10"/>
  <text class="d-text" x="85" y="81" text-anchor="middle">question</text>
  <rect class="d-box" x="200" y="40" width="130" height="70" rx="10"/>
  <text class="d-text" x="265" y="72" text-anchor="middle">retrieve</text>
  <text class="d-sub" x="265" y="95" text-anchor="middle">sources</text>
  <rect class="d-box" x="380" y="40" width="130" height="70" rx="10"/>
  <text class="d-text" x="445" y="72" text-anchor="middle">gate</text>
  <text class="d-sub" x="445" y="95" text-anchor="middle">weak: abstain</text>
  <rect class="d-box" x="560" y="40" width="130" height="70" rx="10"/>
  <text class="d-text" x="625" y="72" text-anchor="middle">generate</text>
  <text class="d-sub" x="625" y="95" text-anchor="middle">with citations</text>
  <rect class="d-box-accent" x="740" y="40" width="120" height="70" rx="10"/>
  <text class="d-text" x="800" y="72" text-anchor="middle">verify</text>
  <text class="d-sub" x="800" y="95" text-anchor="middle">each claim</text>
  <rect class="d-box-accent" x="560" y="220" width="130" height="64" rx="10"/>
  <text class="d-text" x="625" y="257" text-anchor="middle">answer</text>
  <rect class="d-box-muted" x="740" y="220" width="120" height="64" rx="10"/>
  <text class="d-text" x="800" y="257" text-anchor="middle">human</text>
  <rect class="d-box-muted" x="380" y="220" width="130" height="64" rx="10"/>
  <text class="d-text" x="445" y="257" text-anchor="middle">abstain</text>
  <path class="d-edge" d="M 154 75 L 194 75" marker-end="url(#ai11q4-arrow)"/>
  <path class="d-edge" d="M 334 75 L 374 75" marker-end="url(#ai11q4-arrow)"/>
  <path class="d-edge" d="M 514 75 L 554 75" marker-end="url(#ai11q4-arrow)"/>
  <path class="d-edge" d="M 694 75 L 734 75" marker-end="url(#ai11q4-arrow)"/>
  <path class="d-edge-dashed" d="M 445 114 L 445 214" marker-end="url(#ai11q4-arrow)"/>
  <path class="d-edge-accent" d="M 780 114 L 650 214" marker-end="url(#ai11q4-arrow)"/>
  <path class="d-edge-dashed" d="M 815 114 L 815 214" marker-end="url(#ai11q4-arrow)"/>
</svg>

The top row is the happy path. The dashed exits are the safety valves: weak retrieval goes to an abstention before any text is generated, and claims the verifier cannot support, or high-stakes answers, go to a human or are removed.

## 4. Layer 1: Ground the Answer in Real Sources

The single biggest lever is to stop asking the model to *remember* facts and start asking it to *read* them. For documents, that is retrieval-augmented generation ([What is RAG and why use it instead of fine-tuning for knowledge?](/interview-question/what-is-rag-and-why-use-it-instead-of-fine-tuning-for-knowledge)). For live data such as order status or prices, it is a tool call to the system that owns the data ([How does function calling (tool use) work under the hood?](/interview-question/how-does-function-calling-tool-use-work-under-the-hood)).

📌 **Interview term: grounding** — making the model's answer depend on supplied evidence (retrieved passages, tool results) rather than on facts memorised in its weights, so that every claim has a source you can check.

📌 **Interview term: closed-book vs open-book answering** — closed-book means answering from the model's training alone; open-book means answering from documents given in the prompt. Closed-book answers about your own policies are guesses by construction, because your policies were not in the training data.

Grounding moves the failure, it does not remove it. Retrieval can bring back the wrong or outdated passage, and the model can blend two passages into a claim neither makes. [What are common RAG failure modes and how do you debug them?](/interview-question/what-are-common-rag-failure-modes-and-how-do-you-debug-them) covers those; for this doc, the consequence is that the later layers check against the *specific* passage a claim cites.

## 5. Layer 2: Make "I Do Not Know" Possible

A model asked a question with no answer in its context will usually still answer, because a plausible answer is what it was trained to produce. You have to build the way out:

- **In the instructions:** "If the documents do not contain the answer, say you could not find it in the policy." Plain, specific, and placed in the system prompt.
- **In the schema:** if the output is structured, the answer field must allow \`null\` or an \`unknown\` status. A schema that requires a value forces an invention ([How do you get reliable structured JSON output from an LLM?](/interview-question/how-do-you-get-reliable-structured-json-output-from-an-llm)).
- **In code, before generation:** if retrieval found nothing relevant enough, do not call the model at all. Return the abstention.

📌 **Interview term: abstention (refusal to answer)** — the system declining to answer because the evidence is insufficient. It is a correct outcome for an unanswerable question and a cost for an answerable one, so it is measured separately from errors.

📌 **Interview term: abstain gate (confidence threshold)** — a rule that turns low retrieval relevance, low verifier confidence or a high-risk topic into an abstention or a hand-off. Moving the threshold trades hallucinations against unnecessary refusals.

## 6. Layer 3: Require Citations, Then Check Each Claim

Ask the model to attach a source to every claim, ideally pointing at an exact passage. This does two things: it nudges the model to stay close to the text, and it gives you something mechanical to check.

Some providers build this in. Anthropic's Citations feature takes \`document\` content blocks with \`"citations": {"enabled": true}\` and returns answer text with citation objects holding the \`cited_text\` and its location; the docs say citations are "guaranteed to contain valid pointers to the provided documents" and that \`cited_text\` does not count toward output tokens. The same page notes citations cannot be combined with structured outputs (Claude docs, "Citations", checked October 2026). Anthropic's announcement reported internal tests in which built-in citations improved recall accuracy by up to 15% over custom implementations, a vendor-reported number.

A valid pointer is not a true claim, though: the cited passage may not say what the sentence says. So the next step is a **claim check** after generation:

| Check | How it works | Cost | Weakness |
| :--- | :--- | :--- | :--- |
| Lexical overlap | Share of the claim's content words that appear in the cited passage | Microseconds | Fooled by the same words with a different meaning |
| Entailment (NLI) model | A small classifier labels the claim as entailed, neutral or contradicted by the passage | Milliseconds, self-hostable | Struggles with long passages and numbers |
| LLM judge | A model is given the passage and the claim and asked whether the passage supports it | One model call | Its own errors and biases; must be calibrated against human labels ([What is LLM-as-judge and what are its known biases?](/interview-question/what-is-llm-as-judge-and-what-are-its-known-biases)) |
| Sampling consistency | Generate several answers; claims that vary between samples are likely invented (Manakul et al., "SelfCheckGPT", arXiv 2303.08896) | Several model calls | Consistent errors pass |
| Self-verification | The model drafts, writes verification questions, answers them independently, then revises (Dhuliawala et al., "Chain-of-Verification", arXiv 2309.11495) | Several model calls | Latency; same model, same blind spots |

📌 **Interview term: claim-level verification (groundedness check, faithfulness check)** — splitting an answer into individual claims and checking each one against its evidence, then removing, flagging or escalating claims that are not supported.

Unsupported claims are removed if the rest of the answer stands, or the whole answer becomes an abstention or a hand-off. For anything that moves money or makes a commitment, the last layer is a person ([How do you design human-in-the-loop approval for agent actions?](/interview-question/how-do-you-design-human-in-the-loop-approval-for-agent-actions)).

## 7. Things That Help Less Than People Expect

- **Lower temperature.** It makes the output more repeatable and removes some low-probability slips, but if the most likely answer is wrong, temperature 0 returns that wrong answer every time ([How do temperature, top-p and other sampling parameters affect output?](/interview-question/how-do-temperature-top-p-and-other-sampling-parameters-affect-output)).
- **"Do not hallucinate" in the prompt.** The model has no internal flag marking what it does not know. Permission to abstain helps; a prohibition alone does not create the ability.
- **A bigger model.** Usually better on average, still not grounded in *your* facts. It reduces, and does not replace, the layers above.
- **Fine-tuning on your documents.** It teaches style and format more reliably than it teaches retrievable facts, and it makes updating a policy a retraining job ([What is the difference between fine-tuning, LoRA and prompt engineering?](/interview-question/what-is-the-difference-between-fine-tuning-lora-and-prompt-engineering)).

## 8. Verified: Running the Code

The example **"Four layers against hallucination: closed book, retrieval, abstain gate, claim check"** scores eight questions against five policy sentences. Five questions are answerable from the documents; three are not (refund timing, shipping to Canada, warranty transfer). The "model" is a stub with canned answers: a closed-book answer and a grounded answer with a cited document per sentence. Every canned sentence carries a hidden true-or-false label that only the grader reads; the retriever and the verifier see only text, as real ones do. Retrieval scores a document by shared content words; the gate abstains below 2 shared words; the verifier keeps a sentence only if at least 60% of its content words appear in the cited document.

The verifier:

~~~js
function supported(sentence, doc) {
  if (!doc) return false;                          // no citation, no claim
  const sw = words(sentence), dw = new Set(words(DOCS[doc - 1]));
  return sw.filter(w => dw.has(w)).length / sw.length >= 0.6;
}
~~~

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
retrieval scores: Q1=2 Q2=2 Q3=2 Q4=2 Q5=4 Q6=2 Q7=0 Q8=2
layer                          correct  halluc  abstain_ok  abstain_miss
1 closed book                      1       7           0             0
2 + retrieval                      4       4           0             0
3 + abstain on weak retrieval      4       3           1             0
4 + verify each cited claim        5       1           2             0

layer 4, per question:
  Q1 correct      How long do I have to return an item?
  Q2 correct      How much is standard shipping?
  Q3 correct      How fast is express shipping?
  Q4 correct      What does the warranty cover?
  Q5 correct      Can a gift card be refunded for cash?
  Q6 hallucinated How many days after delivery is my refund paid?
  Q7 abstain_ok   Do you ship to Canada?
  Q8 abstain_ok   Is the hardware warranty transferable?

layer 4 abstain threshold sweep (minimum shared words):
  min 1: correct 5, hallucinated 1, abstain_ok 2, abstain_miss 0
  min 2: correct 5, hallucinated 1, abstain_ok 2, abstain_miss 0
  min 3: correct 1, hallucinated 0, abstain_ok 3, abstain_miss 4
~~~

What each layer bought:

- **Closed book**: 1 correct, 7 hallucinated. Without the documents, the model invents a 60-day return window, free shipping and accidental-damage cover, which is the Air Canada pattern.
- **+ retrieval**: 4 correct. The remaining 4 hallucinations are an invented extra sentence on a correct answer ("Orders over 50 euros ship free", citing the shipping document) and confident answers to all three unanswerable questions.
- **+ abstain gate**: Canada is refused before generation (no shared words with any document), which is the right outcome. The other unanswerable questions pass the gate because they share words with a real document.
- **+ claim check**: the free-shipping sentence is removed, so that answer becomes correct; the warranty-transfer claim fails the check and becomes an abstention. 5 correct, 2 correct abstentions, 1 hallucination.
- **The survivor** is Q6: "Refunds are paid within 30 days of delivery" cites the returns policy, which talks about 30 days of delivery but says nothing about when refunds are paid. Most words match, the meaning does not. That is precisely the weakness of lexical checks and the reason for entailment models or an LLM judge.
- **The threshold sweep** shows the trade-off: raising the gate to 3 shared words removes the last hallucination but refuses 4 answerable questions. On real data you pick the threshold from a curve like this, using the relative cost of a wrong answer and a refusal.

The run leaves out a real model, real retrieval (embeddings, reranking) and a real verifier. It does keep the property that matters for evaluation: the grader knows ground truth that the pipeline does not.

## 9. Measuring It

A hallucination rate is meaningless without a test set behind it. Build one that looks like your traffic ([How do you build a golden dataset for evaluating an LLM feature?](/interview-question/how-do-you-build-a-golden-dataset-for-evaluating-an-llm-feature)):

- **Include unanswerable questions** on purpose, otherwise a system that never abstains looks perfect.
- **Report four numbers, not one:** correct, hallucinated, correct abstentions, wrong abstentions. A single "accuracy" hides the trade-off the sweep showed.
- **Grade claims against sources**, with code where you can and calibrated model graders where you must ([When do you use code-based graders versus model-based graders?](/interview-question/when-do-you-use-code-based-graders-versus-model-based-graders)); for RAG specifically, faithfulness metrics such as those in Ragas measure the share of claims supported by the retrieved context ([Evaluating RAG with Ragas: faithfulness, answer relevancy, context precision?](/interview-question/evaluating-rag-with-ragas-faithfulness-answer-relevancy-context-precision)).
- **Sample production.** Run the claim check (or a judge) on a sample of live answers, track the unsupported-claim rate over time, and alert when it rises after a prompt or model change ([How do you monitor LLM quality drift in production?](/interview-question/how-do-you-monitor-llm-quality-drift-in-production)).

## Edge Cases Worth Knowing

- **Stale sources.** A perfectly grounded answer from last year's policy is still wrong. Version the documents, filter by effective date, and re-index on change.
- **Numbers and negation.** "within 30 days" versus "after 30 days", or "can" versus "cannot", share almost every word. Lexical and even some entailment checks miss these; test them explicitly.
- **Fabricated citations in free text.** If the model writes its own references ("see section 4.2"), they can be invented too. Use structured citations that point into documents you supplied, and validate the pointer. The lawyers in *Mata v. Avianca* were sanctioned $5,000 in June 2023 after filing a brief citing six court opinions ChatGPT had invented (Judge P. Kevin Castel, S.D.N.Y., as reported by Bloomberg Law).
- **Agents.** In multi-step agents an invented intermediate fact (a wrong ID) becomes the input of the next tool call. Validate tool arguments against real data rather than trusting recalled values ([How do you validate and repair structured LLM output at runtime?](/interview-question/how-do-you-validate-and-repair-structured-llm-output-at-runtime)).
- **Over-abstention drift.** Tightening every layer after an incident can turn a helpful assistant into one that refuses everything. Watch the wrong-abstention rate as closely as the hallucination rate.

## Common Pitfalls

- **Treating it as a prompt problem.** "Be accurate" in the system prompt is not a control; grounding, gates and checks are.
- **Measuring with answerable questions only.** The system that never abstains scores best and fails worst in production.
- **Trusting a citation because it exists.** A valid pointer to a real document can still support nothing; check the claim against the passage.
- **Using lexical overlap as the final check.** It catches invented extras, and misses the same words with a different meaning, as Q6 showed.
- **Forcing an answer through the schema.** A required field with no \`unknown\` option manufactures hallucinations.
- **No human path for high-stakes answers.** Refund rules, medical, legal and financial statements need a review or a hand-off, and the user needs to see the sources.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Reframe the goal:</strong> <span style="color:#f0e2c8;">Hallucinations cannot be switched off, because the model generates plausible text, not checked facts. So I treat it as a reliability problem: reduce how often it happens, catch it when it does, and limit the damage when it slips through, and I measure each step.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Ground it:</strong> <span style="color:#f0e2c8;">First, stop asking the model to remember: answer from <strong style="color:#ffca28;">retrieved documents</strong> or <strong style="color:#ffca28;">tool results</strong> from the real source of truth. In my eight-question run that alone took correct answers from 1 to 4 and hallucinations from 7 to 4.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Let it abstain:</strong> <span style="color:#f0e2c8;">Then give it a way out: a prompt and schema that allow <em style="color:#f0e2c8;">I do not know</em>, and a <strong style="color:#ffca28;">gate</strong> that refuses when retrieval is weak. The gate is a trade-off: in my sweep a stricter threshold removed the last hallucination but refused 4 answerable questions.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Verify claims:</strong> <span style="color:#f0e2c8;">Then require a <strong style="color:#ffca28;">citation per claim</strong> and check each claim against its cited passage after generation, dropping unsupported ones. A crude lexical check got me to 5 correct and 1 hallucination; the one it missed reused the passage words with a different meaning, which is why production uses entailment models or an LLM judge.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Measure and contain:</strong> <span style="color:#f0e2c8;">I track <strong style="color:#ffca28;">correct, hallucinated and abstained</strong> separately on a labelled set with unanswerable questions, sample production traffic, show sources in the UI, and send high-stakes answers to a human. Air Canada was held liable for its chatbot's invented refund policy in 2024, so for policy answers that last layer is not optional.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does lowering the temperature fix hallucinations?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only a little. Lower temperature makes output more repeatable and removes some low-probability slips, but if the model's most likely answer is wrong, temperature 0 gives you that wrong answer every time. Grounding and verification address the cause; temperature only reduces variance.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just tell the model not to make things up?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It helps somewhat, but an instruction is not a mechanism. The model has no internal flag for what it does not know. Allowing abstention in the instructions and the schema helps; checking the output against sources is what actually catches errors.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you check that a claim is supported?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Cheapest to strongest: lexical overlap with the cited passage, an entailment (NLI) model that classifies the claim as supported or not, an LLM judge with the passage and the claim, or for no-source settings, sampling several answers and checking consistency as SelfCheckGPT does. I pick by latency budget and calibrate against human labels.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can RAG itself cause hallucinations?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: retrieving the wrong or outdated passage gives a confident, cited, wrong answer, and a model can blend two passages into a claim neither makes. That is why I evaluate retrieval separately and why the claim check compares against the specific cited passage.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you show the user?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The answer with its sources, so they can check, and a clear <em style="color:#d8d8d8;">I could not find this in our policy</em> plus a route to a human when we abstain. Abstaining well is a product feature; a confident wrong answer is the expensive outcome.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Grounding | Making answers depend on supplied evidence (retrieved passages, tool results) rather than memory |
| Closed-book vs open-book answering | Answering from training alone versus from documents in the prompt |
| Abstention (refusal to answer) | Declining to answer when evidence is insufficient; measured separately from errors |
| Abstain gate (confidence threshold) | A rule turning weak evidence or high risk into an abstention or hand-off |
| Claim-level verification (groundedness check) | Checking each claim of an answer against its cited evidence and removing or flagging unsupported ones |

**Conclusion:** You do not remove hallucinations from a production LLM application; you engineer around them in layers. Ground answers in retrieved documents and tool results so facts come from the source of truth, make abstention possible in the prompt, the schema and the code, require citations and check each claim against the passage it cites, and route high-stakes answers to a person. Then measure correct answers, hallucinations and both kinds of abstention on a test set that includes unanswerable questions. In the run above each layer removed a different class of error, and the one that survived, the same words with a different meaning, shows exactly why the final check needs to understand meaning, not just match words.`,
    examples: [
      {
        label: `Four layers against hallucination: closed book, retrieval, abstain gate, claim check`,
        variants: [
          { tech: "node", code: `// Four layers against hallucination, scored on 8 questions. The "model" is a stub with
// canned answers; each canned sentence carries a hidden truth label that only the grader
// reads. The verifier in layer 4 sees only text, like a real one.
const DOCS = [
  "Returns are accepted within 30 days of delivery for unused items.",
  "Standard shipping takes 5 business days and costs 4.99 euros.",
  "Express shipping takes 2 business days and costs 12.99 euros.",
  "The warranty covers hardware defects for 1 year from purchase.",
  "Gift cards cannot be refunded or exchanged for cash.",
];
// [question, gold phrase or null if the docs do not answer it, closed-book answer, grounded answer]
// An answer is a list of [sentence, cited doc number or 0, true?]
const QS = [
  ["How long do I have to return an item?", "30 days",
    [["You can return items within 60 days.", 0, false]],
    [["Returns are accepted within 30 days of delivery for unused items.", 1, true]]],
  ["How much is standard shipping?", "4.99",
    [["Standard shipping is free on all orders.", 0, false]],
    [["Standard shipping costs 4.99 euros and takes 5 business days.", 2, true], ["Orders over 50 euros ship free.", 2, false]]],
  ["How fast is express shipping?", "2 business days",
    [["Express shipping takes 2 business days.", 0, true]],
    [["Express shipping takes 2 business days.", 3, true]]],
  ["What does the warranty cover?", "hardware defects",
    [["The warranty covers accidental damage for 2 years.", 0, false]],
    [["The warranty covers hardware defects for 1 year from purchase.", 4, true]]],
  ["Can a gift card be refunded for cash?", "cannot",
    [["Yes, gift cards can be refunded within 14 days.", 0, false]],
    [["Gift cards cannot be refunded or exchanged for cash.", 5, true]]],
  ["How many days after delivery is my refund paid?", null,
    [["Refunds are paid within 3 days.", 0, false]],
    [["Refunds are paid within 30 days of delivery.", 1, false]]],
  ["Do you ship to Canada?", null,
    [["Yes, we ship to Canada in 7 days.", 0, false]],
    [["Yes, standard shipping to Canada takes 5 business days.", 2, false]]],
  ["Is the hardware warranty transferable?", null,
    [["Yes, the warranty is transferable to a new owner.", 0, false]],
    [["Yes, the warranty is transferable to a new owner.", 4, false]]],
];

const STOP = new Set("a an the is are do does i my you we to of for and or be can how what much long many is in on after from have".split(" "));
const words = s => s.toLowerCase().replace(/[^a-z0-9. ]/g, " ").replace(/\\.(?!\\d)/g, " ").split(/\\s+/)
  .filter(w => w && !STOP.has(w)).map(w => w.replace(/s$/, ""));
function retrieve(q) {                         // best doc by shared content words
  let best = 0, score = -1;
  DOCS.forEach((d, i) => { const dw = new Set(words(d)); const s = words(q).filter(w => dw.has(w)).length; if (s > score) { score = s; best = i + 1; } });
  return { doc: best, score };
}
function supported(sentence, doc) {            // lexical check: 60% of content words appear in the cited doc
  if (!doc) return false;
  const sw = words(sentence), dw = new Set(words(DOCS[doc - 1]));
  return sw.filter(w => dw.has(w)).length / sw.length >= 0.6;
}

const ABSTAIN = [["I do not know based on our policy documents.", 0, true]];
const LAYERS = {
  "1 closed book": q => q[2],
  "2 + retrieval": q => q[3],
  "3 + abstain on weak retrieval": q => (retrieve(q[0]).score >= 2 ? q[3] : ABSTAIN),
  "4 + verify each cited claim": (q, min = 2) => {
    if (retrieve(q[0]).score < min) return ABSTAIN;
    const kept = q[3].filter(([s, doc]) => supported(s, doc));
    return kept.length ? kept : ABSTAIN;
  },
};

function grade(q, ans) {
  if (ans === ABSTAIN) return q[1] === null ? "abstain_ok" : "abstain_miss";
  if (ans.some(([, , ok]) => !ok)) return "hallucinated";
  return ans.map(a => a[0]).join(" ").includes(q[1]) ? "correct" : "wrong";
}

console.log("retrieval scores: " + QS.map((q, i) => \`Q\${i + 1}=\${retrieve(q[0]).score}\`).join(" "));
console.log("layer                          correct  halluc  abstain_ok  abstain_miss");
let last;
for (const [name, fn] of Object.entries(LAYERS)) {
  const res = QS.map(q => grade(q, fn(q)));
  const n = k => res.filter(r => r === k).length;
  console.log(\`\${name.padEnd(30)} \${String(n("correct")).padStart(5)}  \${String(n("hallucinated")).padStart(6)}  \${String(n("abstain_ok")).padStart(10)}  \${String(n("abstain_miss")).padStart(12)}\`);
  last = res;
}
console.log("\\nlayer 4, per question:");
QS.forEach((q, i) => console.log(\`  Q\${i + 1} \${last[i].padEnd(12)} \${q[0]}\`));
console.log("\\nlayer 4 abstain threshold sweep (minimum shared words):");
for (const min of [1, 2, 3]) {
  const res = QS.map(q => grade(q, LAYERS["4 + verify each cited claim"](q, min)));
  const n = k => res.filter(r => r === k).length;
  console.log(\`  min \${min}: correct \${n("correct")}, hallucinated \${n("hallucinated")}, abstain_ok \${n("abstain_ok")}, abstain_miss \${n("abstain_miss")}\`);
}` },
          { tech: "python", code: `# Four layers against hallucination, scored on 8 questions. The "model" is a stub with
# canned answers; each canned sentence carries a hidden truth label that only the grader
# reads. The verifier in layer 4 sees only text, like a real one.
import re

DOCS = [
  "Returns are accepted within 30 days of delivery for unused items.",
  "Standard shipping takes 5 business days and costs 4.99 euros.",
  "Express shipping takes 2 business days and costs 12.99 euros.",
  "The warranty covers hardware defects for 1 year from purchase.",
  "Gift cards cannot be refunded or exchanged for cash.",
]
# [question, gold phrase or None if the docs do not answer it, closed-book answer, grounded answer]
# An answer is a list of [sentence, cited doc number or 0, true?]
QS = [
  ["How long do I have to return an item?", "30 days",
    [["You can return items within 60 days.", 0, False]],
    [["Returns are accepted within 30 days of delivery for unused items.", 1, True]]],
  ["How much is standard shipping?", "4.99",
    [["Standard shipping is free on all orders.", 0, False]],
    [["Standard shipping costs 4.99 euros and takes 5 business days.", 2, True], ["Orders over 50 euros ship free.", 2, False]]],
  ["How fast is express shipping?", "2 business days",
    [["Express shipping takes 2 business days.", 0, True]],
    [["Express shipping takes 2 business days.", 3, True]]],
  ["What does the warranty cover?", "hardware defects",
    [["The warranty covers accidental damage for 2 years.", 0, False]],
    [["The warranty covers hardware defects for 1 year from purchase.", 4, True]]],
  ["Can a gift card be refunded for cash?", "cannot",
    [["Yes, gift cards can be refunded within 14 days.", 0, False]],
    [["Gift cards cannot be refunded or exchanged for cash.", 5, True]]],
  ["How many days after delivery is my refund paid?", None,
    [["Refunds are paid within 3 days.", 0, False]],
    [["Refunds are paid within 30 days of delivery.", 1, False]]],
  ["Do you ship to Canada?", None,
    [["Yes, we ship to Canada in 7 days.", 0, False]],
    [["Yes, standard shipping to Canada takes 5 business days.", 2, False]]],
  ["Is the hardware warranty transferable?", None,
    [["Yes, the warranty is transferable to a new owner.", 0, False]],
    [["Yes, the warranty is transferable to a new owner.", 4, False]]],
]


STOP = set("a an the is are do does i my you we to of for and or be can how what much long many is in on after from have".split(" "))


def words(s):
    s = re.sub(r"[^a-z0-9. ]", " ", s.lower())
    s = re.sub(r"\\.(?!\\d)", " ", s)
    return [re.sub(r"s$", "", w) for w in re.split(r"\\s+", s) if w and w not in STOP]


def retrieve(q):                 # best doc by shared content words
    best, score = 0, -1
    for i, d in enumerate(DOCS):
        dw = set(words(d))
        s = len([w for w in words(q) if w in dw])
        if s > score:
            score, best = s, i + 1
    return {"doc": best, "score": score}


def supported(sentence, doc):    # lexical check: 60% of content words appear in the cited doc
    if not doc:
        return False
    sw, dw = words(sentence), set(words(DOCS[doc - 1]))
    return len([w for w in sw if w in dw]) / len(sw) >= 0.6


ABSTAIN = [["I do not know based on our policy documents.", 0, True]]


def layer4(q, min_score=2):
    if retrieve(q[0])["score"] < min_score:
        return ABSTAIN
    kept = [a for a in q[3] if supported(a[0], a[1])]
    return kept if kept else ABSTAIN


LAYERS = {
    "1 closed book": lambda q: q[2],
    "2 + retrieval": lambda q: q[3],
    "3 + abstain on weak retrieval": lambda q: q[3] if retrieve(q[0])["score"] >= 2 else ABSTAIN,
    "4 + verify each cited claim": layer4,
}


def grade(q, ans):
    if ans is ABSTAIN:
        return "abstain_ok" if q[1] is None else "abstain_miss"
    if any(not ok for _, _, ok in ans):
        return "hallucinated"
    return "correct" if q[1] in " ".join(a[0] for a in ans) else "wrong"


print("retrieval scores: " + " ".join(f"Q{i + 1}={retrieve(q[0])['score']}" for i, q in enumerate(QS)))
print("layer                          correct  halluc  abstain_ok  abstain_miss")
last = None
for name, fn in LAYERS.items():
    res = [grade(q, fn(q)) for q in QS]
    n = res.count
    print(f"{name:<30} {n('correct'):>5}  {n('hallucinated'):>6}  {n('abstain_ok'):>10}  {n('abstain_miss'):>12}")
    last = res
print("\\nlayer 4, per question:")
for i, q in enumerate(QS):
    print(f"  Q{i + 1} {last[i]:<12} {q[0]}")
print("\\nlayer 4 abstain threshold sweep (minimum shared words):")
for m in [1, 2, 3]:
    res = [grade(q, layer4(q, m)) for q in QS]
    n = res.count
    print(f"  min {m}: correct {n('correct')}, hallucinated {n('hallucinated')}, abstain_ok {n('abstain_ok')}, abstain_miss {n('abstain_miss')}")` },
        ],
      },
    ],
  },
  {
    title: `How do you handle PII and sensitive data when calling LLM APIs?`,
    difficulty: "medium",
    seoDescription: `Handling PII with LLM APIs: minimise, detect and pseudonymise, rehydrate locally, provider retention controls, scrubbed logs, with a verified pipeline.`,
    description: `**Question presented to candidate:**
"We want to use a hosted LLM to draft replies to customer support tickets. The tickets contain names, emails, phone numbers and sometimes card numbers, and legal is nervous. How would you design the system so we can use the model without mishandling personal data?"

**What a strong answer should cover:**
- Data minimisation first: send only what the task needs, and map every place the data goes (the provider, your logs and traces, caches, vector stores, eval sets), not just the API call
- Detection and redaction before the call: regex with validation (such as the Luhn checksum for cards), named-entity recognition, known values from your own database, and typed placeholders the model can still reason about, with a local mapping to rehydrate the reply
- The limits of redaction: free-text names and context leak, detectors have false positives and negatives, and pseudonymised data is still personal data under GDPR
- Provider and contract controls: retention and training terms, zero data retention and abuse-monitoring options, BAAs for health data, regional processing, and which features (files, batches, stored responses) keep data longer
- Your own side and the output side: scrubbed logs with keyed tokens instead of raw values, retention and deletion across every copy, and checking model output before it reaches a user or a log

**Clarifying questions expected:**
- Which kinds of data and which jurisdictions (GDPR, HIPAA, PCI DSS for cards)?
- Does the task actually need the personal data, or only its type (that an email exists, not what it is)?
- Which provider, and what contract terms or retention arrangements are already in place?

**Code / implementation expected:** Optional — a redact, call, rehydrate pipeline with typed placeholders, or a data-flow diagram showing where personal data is stored.`,
    answer: `**Target Audience:** Engineers putting a hosted LLM behind a product that touches customer data (support, CRM, HR, health, finance) and who need a design legal and security can sign off.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (the redaction pipeline below). Provider retention terms were checked against the Anthropic docs and OpenAI's data-controls guide as summarised in search results, in October 2026. This is engineering guidance, not legal advice.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

You hire a brilliant freelance writer to draft replies to your customers' letters. You could hand them the original letters: names, home addresses, card numbers and all. Or you could hand them copies where a clerk has blacked out the sensitive parts and written labels in their place: "[customer name]", "[card]", "[email]". The writer can still draft "Dear [customer name], we have refunded the charge on [card] and will confirm at [email]". Your clerk fills the real values back in before the letter goes out. The writer never saw them.

Two things about the story matter. First, the clerk's work is not perfect: if a letter mentions "my neighbour Tom took the parcel", the clerk who only knows to look for the customer's name will miss Tom. Second, the freelancer is not the only risk. The copies you keep in the filing cabinet, the notes your staff scribble about each letter, the training folder of "good examples" you keep for new hires: all of those hold the same data, and they are all yours to protect.

That is the whole design. Minimise and label what goes to the model, put the real values back in yourself, choose a provider whose terms fit the data, and treat your own logs and stores as the bigger surface.

In April 2023 Samsung engineers pasted internal source code into ChatGPT; Samsung then restricted generative AI tools on company devices, citing data sent to external servers that is hard to retrieve or delete (Bloomberg, as reported by Bangkok Post and CSO Online, May 2023). Customer data is the same problem with a regulator attached.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What kinds of data: contact details, payment cards, health, government IDs, children? | Each class has its own rules (GDPR, PCI DSS for cards, HIPAA for US health data) and its own detector |
| Which jurisdictions and where must data be processed? | Decides regional deployment and the provider contract |
| Does the task need the values, or only their presence? | Drafting a reply needs "there is an email"; verifying an address needs the address |
| Which provider and what terms are in place (retention, training, zero data retention, BAA)? | Decides which features may be used and for which data |
| Who reads logs and traces today? | Usually the largest uncontrolled copy of prompts |

## 3. Where Personal Data Actually Goes

Personal data does not only travel to the provider. Every system that copies the prompt or the output keeps it too.

<svg class="iq-diagram" width="100%" viewBox="0 0 880 340" role="img" aria-label="Ticket passes through a redaction step with a local vault before going to the LLM provider while logs, caches, vector store and eval data sit on your side of the boundary">
  <defs>
    <marker id="ai11q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="130" height="70" rx="10"/>
  <text class="d-text" x="85" y="101" text-anchor="middle">ticket</text>
  <rect class="d-box-accent" x="200" y="60" width="150" height="70" rx="10"/>
  <text class="d-text" x="275" y="92" text-anchor="middle">redact</text>
  <text class="d-sub" x="275" y="115" text-anchor="middle">placeholders</text>
  <rect class="d-box" x="200" y="200" width="150" height="70" rx="10"/>
  <text class="d-text" x="275" y="232" text-anchor="middle">vault</text>
  <text class="d-sub" x="275" y="255" text-anchor="middle">stays local</text>
  <rect class="d-box" x="420" y="200" width="170" height="70" rx="10"/>
  <text class="d-text" x="505" y="232" text-anchor="middle">logs and traces</text>
  <text class="d-sub" x="505" y="255" text-anchor="middle">redacted only</text>
  <path class="d-edge-dashed" d="M 640 30 L 640 310"/>
  <rect class="d-box" x="690" y="60" width="170" height="70" rx="10"/>
  <text class="d-text" x="775" y="92" text-anchor="middle">LLM provider</text>
  <text class="d-sub" x="775" y="115" text-anchor="middle">retention terms</text>
  <path class="d-edge" d="M 154 95 L 194 95" marker-end="url(#ai11q5-arrow)"/>
  <path class="d-edge-accent" d="M 354 95 L 684 95" marker-end="url(#ai11q5-arrow)"/>
  <path class="d-edge" d="M 275 134 L 275 194" marker-end="url(#ai11q5-arrow)"/>
  <path class="d-edge" d="M 354 140 L 450 194" marker-end="url(#ai11q5-arrow)"/>
</svg>

The dashed line is the trust boundary. Only redacted text crosses it; the vault that maps placeholders to real values and the logs stay on your side, and the logs receive only redacted text.

The full list of copies to account for:

| Copy | Who holds it | Typical control |
| :--- | :--- | :--- |
| The request and response | The provider | Contract: training, retention, zero data retention, region |
| Provider-side stored features | The provider | Files, batch jobs, stored responses, vector stores often keep data longer than plain calls |
| Application logs, traces, analytics | You | Log redacted text and tokens, not raw prompts; short retention; access control ([What should you log and trace in an LLM application?](/interview-question/what-should-you-log-and-trace-in-an-llm-application)) |
| Vector store and retrieval index | You | Per-tenant scoping and deletion ([How do you scope retrieval with metadata filtering and multi-tenancy?](/interview-question/how-do-you-scope-retrieval-with-metadata-filtering-and-multi-tenancy)) |
| Conversation summaries and memory | You | Same retention and deletion as the transcript ([How do you manage conversations that outgrow the context window?](/interview-question/how-do-you-manage-conversations-that-outgrow-the-context-window)) |
| Eval and fine-tuning datasets | You | Built from redacted or synthetic data; anything fine-tuned in can be reproduced by the model |

📌 **Interview term: PII (personally identifiable information)** — information that identifies a person directly (name, email, phone, ID number) or in combination (birth date plus postcode). GDPR's broader term is **personal data**: any information relating to an identified or identifiable person.

📌 **Interview term: data minimisation** — collecting and sending only the personal data a purpose actually needs. For an LLM call, the first question is whether the model needs the value at all.

## 4. Detect, Then Pseudonymise

Detection is a combination of techniques, because each catches a different kind of data:

| Detector | Good at | Misses |
| :--- | :--- | :--- |
| Regex plus validation | Emails, phone numbers, IPs, card numbers (with a checksum), IBANs, national ID formats | Anything without a fixed format |
| Checksums (Luhn for cards, IBAN mod 97) | Cutting false positives on long digit strings | Random digit strings that happen to pass (Luhn accepts about 1 in 10) |
| Named-entity recognition (NER) | Person names, places, organisations in free text; Microsoft's open-source Presidio combines NER with pattern recognisers | Unusual names, lowercase text, names that are also words |
| Known values from your own database | The account holder's name, email and address, exactly | Third parties mentioned in the text |
| A local model as detector | Context ("my neighbour Tom") | Costs a model call; must not itself be a hosted model you are trying to keep data from |

Once found, a value is replaced, and *how* matters:

📌 **Interview term: redaction (masking)** — replacing a value with a fixed marker such as \`[REDACTED]\` or \`****1111\`. Irreversible; the model loses the information that something was there of a certain type, unless the marker says so.

📌 **Interview term: pseudonymisation with typed placeholders** — replacing each distinct value with a consistent, typed token (\`<EMAIL_1>\`, \`<PERSON_1>\`) and keeping the mapping in a local **vault**. The model can still refer to "the customer" and "their email", and the reply can be filled back in.

📌 **Interview term: rehydration** — replacing the placeholders in the model's output with the real values, locally, after the call, with rules per type (for example, a card number is never echoed in full).

📌 **Interview term: tokenisation (keyed pseudonyms)** — replacing a value with a stable token derived with a secret key (an HMAC), so the same email always maps to the same token across systems without storing the email. Linkable, so still personal data; not reversible without the key.

### Pseudonymised is not anonymous

Under GDPR, pseudonymised data that can be linked back to a person with additional information remains personal data (Recital 26); the EDPB's draft Guidelines 01/2025 on pseudonymisation take the same position, including when the additional information sits with a different party (EDPB consultation documents and IAPP coverage, January 2025). In practice: redaction before the LLM call reduces risk and exposure, and it does **not** remove your obligations for the request, the vault or the logs.

## 5. Provider and Contract Controls

Redaction never catches everything, so the provider's terms are the second layer. These are as published in October 2026; they change, so check yours:

- **Anthropic** (Claude docs, "API and data retention"): retained data "is never used for model training without your express permission"; conversation content is not retained by default except for some named models that require 30-day retention. **Zero data retention** is available per organization by arrangement and covers the Messages and token-counting APIs for eligible features; features such as batch processing (29-day retention), the Files API and code execution are listed as not eligible. With **HIPAA readiness** and a signed BAA, requests that use non-eligible features are rejected with a 400. The page also warns: "Do not include PHI in JSON schema definitions", because schemas compiled for structured outputs are cached separately without the same protections. For prompt caching, it says prompts and outputs are not stored, only KV cache representations and hashes held in memory for the cache lifetime.
- **OpenAI** (data-controls guide, as summarised in search results; I could not open it directly): abuse-monitoring logs are generated for API usage and kept "for up to 30 days" by default unless law or harm prevention requires longer. **Modified Abuse Monitoring** and **Zero Data Retention** require prior approval; under ZDR the \`store\` parameter of the Responses and Chat Completions endpoints is always treated as false, and endpoints marked not eligible may still store application state. Third-party guides state that OpenAI has not trained on API data by default since March 1, 2023.
- **Cloud platforms** (Amazon Bedrock, Google Cloud, Azure) act as the processor for the models they host, under their own retention terms and regions; Anthropic's page says so explicitly for Bedrock and Google Cloud.

📌 **Interview term: zero data retention (ZDR)** — a provider arrangement under which prompts and responses are not stored at rest after the response is returned, typically by contract, per organization, and only for eligible endpoints and features.

📌 **Interview term: BAA (business associate agreement)** — the US HIPAA contract that lets a vendor process protected health information on your behalf; without one, health data should not be sent.

## 6. Verified: Running the Code

The example **"Redact, call, rehydrate: typed placeholders, Luhn check and keyed log tokens"** runs a support ticket through four detectors (email; card number with a Luhn check; IPv4 with a range check; international phone number), then a known-names list standing in for both NER and a CRM lookup. Each distinct value gets one typed placeholder; the mapping stays in an in-process vault (standing in for an encrypted, access-controlled store). A stub model returns a reply that uses the placeholders and also invents one (\`<PHONE_2>\`), as real models occasionally do. The rehydrator fills values back in with a per-type rule for cards and removes unknown placeholders. Finally it derives keyed HMAC-SHA256 tokens for logging, with a fixed demo key (in production the key lives in a secrets manager and is rotated).

The detector table and the card rule:

~~~js
const DETECTORS = [                          // order matters: most specific first
  ["EMAIL", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}/g, v => true],
  ["CARD", /\\b(?:\\d[ -]?){12,18}\\d\\b/g, v => luhn(v.replace(/\\D/g, ""))],
  ["IP", /\\b\\d{1,3}(?:\\.\\d{1,3}){3}\\b/g, v => v.split(".").every(p => Number(p) <= 255)],
  ["PHONE", /\\+\\d{1,3}(?:[ -]?\\d{2,4}){2,4}/g, v => true],
];
// rehydrate: if (v.type === "CARD") return "card ending " + last4;   never echo a full card
~~~

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
sent to provider:
  Hi, this is <PERSON_1>. My card <CARD_1> was charged twice for order 1234 5678 9012 3456. Email me at <EMAIL_1> or call <PHONE_1>. My neighbour Tom Becker took the parcel in. Login came from <IP_1>.
vault (stays local): <EMAIL_1> <CARD_1> <IP_1> <PHONE_1> <PERSON_1>
order number kept: true (16 digits but fails the Luhn check)
PII that still left the boundary: Tom Becker

model reply (placeholders only):
  Hello <PERSON_1>, sorry about the double charge on <CARD_1>. We will refund it and confirm by email to <EMAIL_1>. We will not call <PHONE_2>.
rehydrated for the customer:
  Hello Maria Lopez, sorry about the double charge on card ending 1111. We will refund it and confirm by email to maria.lopez@example.com. We will not call [removed].
unknown placeholders from the model: <PHONE_2>

log tokens (keyed HMAC, linkable but not reversible without the key):
  maria.lopez@example.com  -> tok_eb904cb837
  Maria.Lopez@example.com  -> tok_eb904cb837
  tom@example.com          -> tok_63c43eb52c
~~~

What the run shows:

- **Typed placeholders keep the task workable.** The model wrote a sensible reply without seeing any value, and rehydration produced the customer-facing text.
- **Validation prevents over-redaction.** The 16-digit order number looks like a card but fails the Luhn check, so it stays readable for the model. The card pattern also matched the digits of the phone number (\`49 151 2345 6789\`), which failed Luhn too, so the phone detector caught it next. Luhn passes about one random digit string in ten, so on real traffic some order numbers *will* be masked as cards; that is the cheaper error.
- **Detectors miss free-text third parties.** "Tom Becker" left the boundary: the known-names list only knows the account holder. This is the residual risk that NER, a local detector model and the provider contract have to cover.
- **Model output needs validating too.** The invented \`<PHONE_2>\` had no vault entry and was removed instead of rendering as a broken token, and the reply shows only the last four card digits.
- **Keyed tokens make logs useful without raw values.** The two spellings of Maria's email normalise to the same token, so two tickets can be linked; a different email gives a different token; without the key nobody can test guesses against the tokens.

What the simulation leaves out: a real NER model, address and free-text ID detection, images and PDFs, and the provider call itself.

## 7. Options Compared

| Approach | Protects against | Cost | Leaves open |
| :--- | :--- | :--- | :--- |
| Minimise (do not send it) | Everything, for that field | Design work; some tasks need values | Nothing for that field |
| Pseudonymise with a local vault | Provider exposure for detected values | Detection latency, recall misses | Undetected values; your own vault and logs |
| Provider ZDR and contract terms | Retention at the provider | Negotiation; some features excluded | Your own copies; detection still advisable |
| Self-hosted or private-region model | Third-party exposure entirely | Hosting, quality and ops cost ([How do you choose between open-weight models and proprietary API models?](/interview-question/how-do-you-choose-between-open-weight-models-and-proprietary-api-models)) | Your own copies, same as before |
| Tool lookups instead of prompt data | The model never sees the value; a tool fetches it server-side when an action needs it | Tool design | Tool permissions ([How do you sandbox an agent and enforce least-privilege tool access?](/interview-question/how-do-you-sandbox-an-agent-and-enforce-least-privilege-tool-access)) |

## Edge Cases Worth Knowing

- **Attachments and images.** Screenshots of bank statements and scanned IDs carry PII that text detectors never see; run OCR-based detection or keep those inputs away from the model.
- **Retrieved documents.** RAG can put *other* people's data into a prompt: a ticket history or a CRM note about a different customer. Scope retrieval by tenant and user before the model sees anything.
- **Prompt injection as exfiltration.** Text in a document can instruct the model to repeat earlier context into a link or a tool call. Placeholders limit what can leak; output filtering and tool restrictions do the rest ([What is prompt injection and how do you defend against it?](/interview-question/what-is-prompt-injection-and-how-do-you-defend-against-it)).
- **Deletion requests.** A right-to-erasure request must reach the transcript, the vault, the logs, summaries, embeddings and eval sets. Design one deletion path keyed by user ID.
- **Card data.** Sending full card numbers to any third-party service brings it into PCI DSS scope; the simplest design is never to send them, as in the example.
- **Guardrail placement.** The PII filter is one of the input and output guardrails around the model; see [What are guardrails and how do you implement them around a model?](/interview-question/what-are-guardrails-and-how-do-you-implement-them-around-a-model) for the wider set.

## Common Pitfalls

- **Logging raw prompts "for debugging".** The log store becomes the largest copy of customer data, readable by far more people than the database. Log redacted text and keyed tokens.
- **Plain hashes as anonymisation.** A SHA-256 of an email can be reversed by hashing a list of likely emails. Use a keyed HMAC and still treat it as personal data.
- **Regex without validation.** Masking every long number destroys order IDs and confuses the model; validate (Luhn, IBAN checksum, ranges) before redacting.
- **Assuming the contract covers every feature.** Batch jobs, uploaded files and stored responses often have longer retention or are outside zero data retention; check per feature.
- **Echoing values in rehydration.** Putting the full card number or a government ID back into a reply recreates the exposure in the email you send; use per-type display rules.
- **Treating redaction as complete.** Measure detector recall on labelled real samples and plan for misses with the other layers.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Map the data first:</strong> <span style="color:#f0e2c8;">I start by listing every place personal data goes, not just the API call: the provider, our logs and traces, prompt caches, vector stores, eval datasets and the model output. Our own logs and traces are often a bigger exposure than the provider.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Minimise:</strong> <span style="color:#f0e2c8;">Then I send only what the task needs. Drafting a reply needs to know there is an email address, not what it is, so the default is to replace values with <strong style="color:#ffca28;">typed placeholders</strong> like <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;EMAIL_1&gt;</code> and keep the mapping in our own system.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Detect and pseudonymise:</strong> <span style="color:#f0e2c8;">Detection combines regexes with validation (a card number must pass the <strong style="color:#ffca28;">Luhn</strong> check), named-entity recognition such as Presidio for names and addresses, and known values from our own database. After the call I <strong style="color:#ffca28;">rehydrate</strong> the reply locally, with per-type rules: a card comes back as <em style="color:#f0e2c8;">card ending 1111</em>, never in full.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Be honest about limits:</strong> <span style="color:#f0e2c8;">Detectors miss things: in my run a third party name in free text went through untouched. And pseudonymised data is still personal data under GDPR. So redaction is one layer, combined with provider controls: no training on API data, retention and <strong style="color:#ffca28;">zero data retention</strong> terms, a BAA for health data, regional processing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Protect our side:</strong> <span style="color:#f0e2c8;">Logs get redacted text plus <strong style="color:#ffca28;">keyed HMAC tokens</strong>, so support can link two tickets from the same email without storing it. Every copy (logs, caches, embeddings, summaries) gets a retention period and is covered by deletion requests, and outputs are scanned before they are stored or shown.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just trust the provider contract?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Contracts cover the provider; most exposure is on our side, in logs, traces, analytics, vector stores and eval datasets that copy prompts. And contract terms vary by feature: Anthropic documents that batch processing keeps data 29 days and is outside zero data retention, even when messages are covered.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does redaction hurt answer quality?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Typed, consistent placeholders mostly do not: the model can still write <em style="color:#d8d8d8;">we will email &lt;EMAIL_1&gt;</em>. Quality drops when the task needs the value itself, such as checking an address. Then I let a tool look it up server-side instead of putting it in the prompt.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you detect names reliably?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You do not get perfect recall. NER models catch most person names, known values from the customer record catch the account holder exactly, and an allowlist removes false positives like product names. I measure recall on a labelled sample of real tickets and treat the misses as residual risk the other layers must cover.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is hashing an email enough to anonymise it?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. A plain hash of an email can be reversed by hashing candidate emails, and any stable token is still linkable, so under GDPR it is pseudonymised, not anonymous. A keyed HMAC with the key in a secrets manager stops the guessing attack; it is still personal data.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about health data?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">That needs a provider arrangement first: a BAA and a HIPAA-eligible configuration. Anthropic documents that with HIPAA readiness non-eligible features are blocked with a 400, and warns not to put PHI in JSON schema definitions because compiled schemas are cached separately without the same protections.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| PII (personal data) | Information that identifies a person directly or in combination; GDPR uses the broader term personal data |
| Data minimisation | Sending only the personal data the purpose needs |
| Redaction (masking) | Replacing a value with a fixed, irreversible marker |
| Pseudonymisation with typed placeholders | Consistent typed tokens per value, with the mapping kept in a local vault |
| Rehydration | Filling real values back into the model output locally, with per-type display rules |
| Tokenisation (keyed pseudonyms) | Stable tokens derived with a secret key, linkable but not reversible without it |
| Zero data retention (ZDR) | Provider arrangement where prompts and responses are not stored at rest after the response |
| BAA (business associate agreement) | US HIPAA contract required before a vendor processes protected health information |

**Conclusion:** Handling personal data with an LLM API is a data-flow problem first and a model problem second. Map every copy (provider, logs, caches, vector stores, summaries, eval sets), send only what the task needs, replace detected values with typed placeholders that keep the task workable, and rehydrate locally with rules that never echo a full card or ID. Detection is never complete, as the third-party name in the run showed, and pseudonymised data is still personal data, so pair it with provider terms that fit the data class (no training, retention or zero data retention, a BAA for health data) and with your own discipline: redacted logs, keyed tokens, retention limits and a single deletion path.`,
    examples: [
      {
        label: `Redact, call, rehydrate: typed placeholders, Luhn check and keyed log tokens`,
        variants: [
          { tech: "node", code: `// Redact PII before an LLM call, keep the mapping local, rehydrate the reply.
// Regex + checksum detectors, a known-names list standing in for NER, typed placeholders,
// keyed HMAC tokens for logs. The model is a stub; nothing leaves this process.
const crypto = require("crypto");

const TICKET = "Hi, this is Maria Lopez. My card 4111 1111 1111 1111 was charged twice for order " +
  "1234 5678 9012 3456. Email me at maria.lopez@example.com or call +49 151 2345 6789. " +
  "My neighbour Tom Becker took the parcel in. Login came from 203.0.113.42.";
const KNOWN_NAMES = ["Maria Lopez"];          // from the CRM record of this customer
const TRUTH = ["Maria Lopez", "4111 1111 1111 1111", "maria.lopez@example.com", "+49 151 2345 6789", "Tom Becker", "203.0.113.42"];
const LOG_KEY = "demo-key-rotate-me";         // in production: from a secrets manager

function luhn(digits) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

const DETECTORS = [                          // order matters: most specific first
  ["EMAIL", /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}/g, v => true],
  ["CARD", /\\b(?:\\d[ -]?){12,18}\\d\\b/g, v => luhn(v.replace(/\\D/g, ""))],
  ["IP", /\\b\\d{1,3}(?:\\.\\d{1,3}){3}\\b/g, v => v.split(".").every(p => Number(p) <= 255)],
  ["PHONE", /\\+\\d{1,3}(?:[ -]?\\d{2,4}){2,4}/g, v => true],
];

function redact(text) {
  const vault = new Map(), counts = {}, byValue = new Map();
  const place = (type, value) => {
    if (byValue.has(value)) return byValue.get(value);   // same value -> same placeholder
    counts[type] = (counts[type] || 0) + 1;
    const ph = \`<\${type}_\${counts[type]}>\`;
    vault.set(ph, { type, value }); byValue.set(value, ph);
    return ph;
  };
  for (const [type, re, valid] of DETECTORS) text = text.replace(re, m => (valid(m) ? place(type, m) : m));
  for (const name of KNOWN_NAMES) text = text.split(name).join(place("PERSON", name));
  return { text, vault };
}

function rehydrate(reply, vault) {
  const unknown = [];
  const out = reply.replace(/<([A-Z]+)_(\\d+)>/g, ph => {
    const v = vault.get(ph);
    if (!v) { unknown.push(ph); return "[removed]"; }
    if (v.type === "CARD") return "card ending " + v.value.replace(/\\D/g, "").slice(-4);  // never echo a full card
    return v.value;
  });
  return { out, unknown };
}

const logToken = v => "tok_" + crypto.createHmac("sha256", LOG_KEY).update(v.toLowerCase()).digest("hex").slice(0, 10);

function fakeModel(prompt) {                 // stands in for the provider call
  return "Hello <PERSON_1>, sorry about the double charge on <CARD_1>. We will refund it and confirm " +
    "by email to <EMAIL_1>. We will not call <PHONE_2>.";
}

const { text, vault } = redact(TICKET);
console.log("sent to provider:\\n  " + text);
console.log("vault (stays local): " + [...vault.keys()].join(" "));
console.log("order number kept: " + text.includes("1234 5678 9012 3456") + " (16 digits but fails the Luhn check)");
const missed = TRUTH.filter(t => text.includes(t));
console.log("PII that still left the boundary: " + (missed.length ? missed.join(", ") : "none"));

const reply = fakeModel(text);
const { out, unknown } = rehydrate(reply, vault);
console.log("\\nmodel reply (placeholders only):\\n  " + reply);
console.log("rehydrated for the customer:\\n  " + out);
console.log("unknown placeholders from the model: " + (unknown.join(", ") || "none"));

console.log("\\nlog tokens (keyed HMAC, linkable but not reversible without the key):");
for (const v of ["maria.lopez@example.com", "Maria.Lopez@example.com", "tom@example.com"])
  console.log(\`  \${v.padEnd(24)} -> \${logToken(v)}\`);` },
          { tech: "python", code: `# Redact PII before an LLM call, keep the mapping local, rehydrate the reply.
# Regex + checksum detectors, a known-names list standing in for NER, typed placeholders,
# keyed HMAC tokens for logs. The model is a stub; nothing leaves this process.
import hashlib
import hmac
import re

TICKET = ("Hi, this is Maria Lopez. My card 4111 1111 1111 1111 was charged twice for order "
          "1234 5678 9012 3456. Email me at maria.lopez@example.com or call +49 151 2345 6789. "
          "My neighbour Tom Becker took the parcel in. Login came from 203.0.113.42.")
KNOWN_NAMES = ["Maria Lopez"]    # from the CRM record of this customer
TRUTH = ["Maria Lopez", "4111 1111 1111 1111", "maria.lopez@example.com", "+49 151 2345 6789", "Tom Becker", "203.0.113.42"]
LOG_KEY = b"demo-key-rotate-me"  # in production: from a secrets manager


def luhn(digits):
    total = 0
    for i, ch in enumerate(reversed(digits)):
        d = int(ch)
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


DETECTORS = [                    # order matters: most specific first
    ("EMAIL", r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}", lambda v: True),
    ("CARD", r"\\b(?:\\d[ -]?){12,18}\\d\\b", lambda v: luhn(re.sub(r"\\D", "", v))),
    ("IP", r"\\b\\d{1,3}(?:\\.\\d{1,3}){3}\\b", lambda v: all(int(p) <= 255 for p in v.split("."))),
    ("PHONE", r"\\+\\d{1,3}(?:[ -]?\\d{2,4}){2,4}", lambda v: True),
]


def redact(text):
    vault, counts, by_value = {}, {}, {}

    def place(kind, value):
        if value in by_value:    # same value -> same placeholder
            return by_value[value]
        counts[kind] = counts.get(kind, 0) + 1
        ph = f"<{kind}_{counts[kind]}>"
        vault[ph] = {"type": kind, "value": value}
        by_value[value] = ph
        return ph

    for kind, pattern, valid in DETECTORS:
        text = re.sub(pattern, lambda m: place(kind, m.group(0)) if valid(m.group(0)) else m.group(0), text)
    for name in KNOWN_NAMES:
        text = place("PERSON", name).join(text.split(name))
    return text, vault


def rehydrate(reply, vault):
    unknown = []

    def sub(m):
        v = vault.get(m.group(0))
        if not v:
            unknown.append(m.group(0))
            return "[removed]"
        if v["type"] == "CARD":  # never echo a full card
            return "card ending " + re.sub(r"\\D", "", v["value"])[-4:]
        return v["value"]

    return re.sub(r"<([A-Z]+)_(\\d+)>", sub, reply), unknown


def log_token(v):
    return "tok_" + hmac.new(LOG_KEY, v.lower().encode(), hashlib.sha256).hexdigest()[:10]


def fake_model(prompt):          # stands in for the provider call
    return ("Hello <PERSON_1>, sorry about the double charge on <CARD_1>. We will refund it and confirm "
            "by email to <EMAIL_1>. We will not call <PHONE_2>.")


text, vault = redact(TICKET)
print("sent to provider:\\n  " + text)
print("vault (stays local): " + " ".join(vault.keys()))
print("order number kept: " + str("1234 5678 9012 3456" in text).lower() + " (16 digits but fails the Luhn check)")
missed = [t for t in TRUTH if t in text]
print("PII that still left the boundary: " + (", ".join(missed) if missed else "none"))

reply = fake_model(text)
out, unknown = rehydrate(reply, vault)
print("\\nmodel reply (placeholders only):\\n  " + reply)
print("rehydrated for the customer:\\n  " + out)
print("unknown placeholders from the model: " + (", ".join(unknown) or "none"))

print("\\nlog tokens (keyed HMAC, linkable but not reversible without the key):")
for v in ["maria.lopez@example.com", "Maria.Lopez@example.com", "tom@example.com"]:
    print(f"  {v:<24} -> {log_token(v)}")` },
        ],
      },
    ],
  },
];

export default augments;
