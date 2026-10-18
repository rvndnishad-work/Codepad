/**
 * AI ENGINEERING ULTRA — batch 07: RAG II, quality and design (reranking and
 * cross-encoders, metadata filtering and multi-tenancy, an end-to-end production
 * RAG pipeline, RAG failure modes and how to debug them).
 * Every example was run by scripts/verify-variant-examples.ts (node, python);
 * quoted output is that run's output.
 */
import type { AiUltraAugment } from "./ai-augments.types";

const augments: AiUltraAugment[] = [
  {
    title: `What is reranking and why add it after retrieval?`,
    difficulty: "medium",
    seoDescription: `Reranking rescores a retrieved shortlist with a cross-encoder that reads query and document together, so the right chunks reach the prompt first.`,
    description: `**Question presented to candidate:**
"Our RAG feature already does vector search. Someone proposed adding a reranker after retrieval. What is a reranker, how is it different from the search we already do, and why would putting one in front of the model help?"

**What a strong answer should cover:**
- Retrieval is two jobs: recall (do not miss the right chunk among millions) and precision (put the best few first); a reranker is a second, slower and more accurate scorer that only reorders the shortlist the first stage returns
- Vector search is a bi-encoder: query and document are each turned into one vector separately and only meet in a dot product; a cross-encoder reranker reads the query and the document together in one model pass, so it can see word order, negation and which part of the chunk actually answers
- Cost is why it comes second: one model pass per (query, document) pair is fine for 20 to 200 candidates and impossible for a whole corpus
- What it buys in RAG: the answer chunk moves into the few slots you send to the model, fewer distractors in the prompt, and a relevance score you can threshold so off-topic questions get no context and an honest "I do not know"
- Kinds of reranker: cross-encoder models (hosted APIs or open models), an LLM asked to rank, late-interaction models, plus business rules such as recency boosts; and a reranker cannot rescue a chunk the first stage never returned

**Code / implementation expected:** Optional — sketching retrieve-then-rerank (top 50 in, top 5 out, with a score floor) or calling a rerank API is enough.`,
    answer: `**Target Audience:** Engineers who have a working vector search or RAG prototype and keep hearing that "adding a reranker" is the cheapest quality win, and want to know what that actually means.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (the two-stage retrieval demo below). The reranker in the demo is a hand-written pair scorer standing in for a model, so it shows the *shape* of reranking, not the quality of a real cross-encoder. Product facts are cited inline with the date checked (October 2026).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A company hiring for one job gets 5,000 CVs. Nobody reads 5,000 CVs carefully. First, a recruiter skims each one for ten seconds and keeps 50 that look roughly right: the right job title, the right keywords. Then the hiring manager reads those 50 properly, asking the question that matters ("has this person actually done what *we* need?"), and picks the five to interview.

The skim is fast and forgiving; its only job is not to throw away the right candidate. The careful read is slow and sharp; its job is to put the best five on top. Nobody would ask the hiring manager to read all 5,000, and nobody would hire straight from the skim.

RAG retrieval works the same way. Vector search is the ten-second skim over millions of chunks. A **reranker** is the hiring manager: a slower, more accurate model that reads only the shortlist and reorders it, so the few chunks you actually paste into the prompt are the right ones.

## 2. Two Jobs Hiding Inside "Retrieval"

📌 **Interview term: recall** — of the chunks that would answer the question, the fraction your retriever returned at all. If the right chunk is not in the candidate list, nothing later can fix it.

📌 **Interview term: precision at k** — of the top k results, the fraction that are actually relevant. In RAG, k is small (often 3 to 10) because those chunks go into the prompt.

Both matter, and they pull in opposite directions. Returning more candidates raises recall but buries the answer among distractors. A model that judges relevance really well is slow. The standard design splits the work:

📌 **Interview term: two-stage retrieval (retrieve then rerank)** — a cheap first stage (vector search, keyword search, or both) returns a generous shortlist, say the top 50; a second, expensive stage scores only those 50 and keeps the best few.

<svg class="iq-diagram" width="100%" viewBox="0 0 820 230" role="img" aria-label="Two-stage retrieval: millions of chunks go through fast search to a top 50 shortlist, then a reranker keeps the top 5 for the prompt">
  <defs>
    <marker id="ai07q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="150" height="100" rx="10"/>
  <text class="d-text" x="95" y="102" text-anchor="middle">corpus</text>
  <text class="d-sub" x="95" y="128" text-anchor="middle">millions of chunks</text>
  <rect class="d-box" x="240" y="60" width="150" height="100" rx="10"/>
  <text class="d-text" x="315" y="102" text-anchor="middle">stage 1</text>
  <text class="d-sub" x="315" y="128" text-anchor="middle">fast search</text>
  <rect class="d-box" x="460" y="60" width="130" height="100" rx="10"/>
  <text class="d-text" x="525" y="102" text-anchor="middle">top 50</text>
  <text class="d-sub" x="525" y="128" text-anchor="middle">for recall</text>
  <rect class="d-box-accent" x="660" y="60" width="140" height="100" rx="10"/>
  <text class="d-text" x="730" y="102" text-anchor="middle">rerank</text>
  <text class="d-sub" x="730" y="128" text-anchor="middle">keep top 5</text>
  <path class="d-edge" d="M 174 110 L 234 110" marker-end="url(#ai07q1-arrow)"/>
  <path class="d-edge" d="M 394 110 L 454 110" marker-end="url(#ai07q1-arrow)"/>
  <path class="d-edge-accent" d="M 594 110 L 654 110" marker-end="url(#ai07q1-arrow)"/>
</svg>

The first stage is tuned to not miss; the reranker is tuned to order. Each is good at exactly the job the other is bad at.

## 3. Why the First Stage Is Blurry: Bi-Encoders

Vector search uses an [embedding model](/interview-question/what-are-embeddings-and-what-are-they-used-for). It reads the document *on its own* at index time and squeezes it into one fixed list of numbers. At query time it reads the question *on its own* and squeezes that too. The two only meet in a single multiplication.

📌 **Interview term: bi-encoder** — a model that encodes the query and the document separately into one vector each, and scores relevance by comparing the vectors (cosine or dot product). Documents can be encoded once in advance, which is what makes search over millions fast.

The price is that everything about the document must survive being compressed into one vector *before the model knows what will be asked*. Details that matter for one question and not another get averaged away: whether a sentence says "available" or "not available", whether "after 30 days" or "within 30 days", which of five topics in a long chunk is the main one.

## 4. Why the Reranker Is Sharp: Cross-Encoders

📌 **Interview term: cross-encoder** — a model that takes the query and one document *together* as a single input, lets every query word attend to every document word, and outputs one relevance score for that pair. Nothing is precomputed; each pair costs a full model pass.

<svg class="iq-diagram" width="100%" viewBox="0 0 820 300" role="img" aria-label="Bi-encoder: query and document go through separate encoders into two vectors compared by a dot product. Cross-encoder: query and document enter one model together and produce one score">
  <defs>
    <marker id="ai07q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="190" y="30" text-anchor="middle">bi-encoder</text>
  <rect class="d-box-muted" x="30" y="60" width="120" height="50" rx="8"/>
  <text class="d-sub" x="90" y="90" text-anchor="middle">query</text>
  <rect class="d-box-muted" x="230" y="60" width="120" height="50" rx="8"/>
  <text class="d-sub" x="290" y="90" text-anchor="middle">document</text>
  <rect class="d-box" x="30" y="150" width="120" height="50" rx="8"/>
  <text class="d-sub" x="90" y="180" text-anchor="middle">vector</text>
  <rect class="d-box" x="230" y="150" width="120" height="50" rx="8"/>
  <text class="d-sub" x="290" y="180" text-anchor="middle">vector</text>
  <rect class="d-box-accent" x="130" y="240" width="120" height="44" rx="8"/>
  <text class="d-sub" x="190" y="267" text-anchor="middle">dot product</text>
  <path class="d-edge" d="M 90 114 L 90 144" marker-end="url(#ai07q1-arrow2)"/>
  <path class="d-edge" d="M 290 114 L 290 144" marker-end="url(#ai07q1-arrow2)"/>
  <path class="d-edge" d="M 110 204 L 160 236" marker-end="url(#ai07q1-arrow2)"/>
  <path class="d-edge" d="M 270 204 L 222 236" marker-end="url(#ai07q1-arrow2)"/>
  <text class="d-text" x="620" y="30" text-anchor="middle">cross-encoder</text>
  <rect class="d-box-muted" x="490" y="60" width="260" height="50" rx="8"/>
  <text class="d-sub" x="620" y="90" text-anchor="middle">query plus document</text>
  <rect class="d-box" x="490" y="150" width="260" height="50" rx="8"/>
  <text class="d-sub" x="620" y="180" text-anchor="middle">one model reads both</text>
  <rect class="d-box-accent" x="560" y="240" width="120" height="44" rx="8"/>
  <text class="d-sub" x="620" y="267" text-anchor="middle">score</text>
  <path class="d-edge" d="M 620 114 L 620 144" marker-end="url(#ai07q1-arrow2)"/>
  <path class="d-edge" d="M 620 204 L 620 234" marker-end="url(#ai07q1-arrow2)"/>
</svg>

On the left, the document vector was fixed before the question existed. On the right, the model sees the question while it reads the document, so it can check the exact thing being asked.

The trade is plain arithmetic. A bi-encoder computes document vectors once, so a query costs one encoding plus cheap vector maths. A cross-encoder costs one model pass per pair, so scoring a whole corpus per query is out of the question. The demo assumes 2 ms of model time per pair (an assumption for illustration; measure your own model and hardware):

~~~text
3) why not rerank everything (assume 2 ms of model time per pair)
         50 pairs  100 ms
        200 pairs  400 ms
   10000000 pairs  5.6 hours
~~~

Fifty pairs fit in a request; ten million do not. That single line is the whole reason reranking is a *second* stage.

## 5. Watching It Work

The example **"Two-stage retrieval: a lossy first stage, then a pair scorer"** has eight short policy snippets. Stage 1 squeezes each one into 12 numbers on its own (a hashing trick standing in for an embedding model, deliberately lossy). Stage 2 is a hand-written function that reads the query and the document *together* and rewards matching phrases in order ("after 30", "30 days") and a direct yes/no statement. A real cross-encoder learns such signals instead of having them written by hand.

For "Can I get a refund after 30 days?" the snippet that actually answers it is doc 4: *"After 30 days a refund is not possible, but you can get store credit."*

~~~text
  stage 1 (bi-encoder, top 5 of 8)
    1. doc 6  cos 0.906
    2. doc 3  cos 0.816
    3. doc 7  cos 0.792
    4. doc 0  cos 0.775
    5. doc 4  cos 0.775  <- answers it
  stage 2 (pair scorer on 5 pairs, keep 3, floor 1.000)
    1. doc 4  score 5.500  <- answers it
    2. doc 7  score 3.500
    3. doc 0  score 2.500
~~~

Stage 1 did its job: the answer is in the shortlist (recall). It did not do the reranker job: the answer was fifth, and if you had sent the top 3 straight to the model it would have read about price matching (doc 6), refund processing time (doc 3) and manager approvals (doc 7), none of which answers the question. After reranking, the answer is first.

📌 **Interview term: reciprocal rank (MRR)** — 1 divided by the position of the first relevant result; averaged over many queries it is called mean reciprocal rank. Here it went from 0.200 to 1.000.

### The score floor: sending nothing on purpose

Vector search always returns *something*: the nearest vectors exist even when nothing is relevant. Reranker scores are more meaningful in absolute terms, so you can set a minimum.

📌 **Interview term: relevance threshold (score floor)** — a minimum reranker score below which a chunk is dropped, even if it is in the top k. When every candidate is below it, the application sends no context and the model says it does not know.

~~~text
2) an off-topic question: the floor sends nothing
query: "What is the capital of France?"
  stage 1 (bi-encoder, top 3 of 8)
    1. doc 5  cos 0.365
    2. doc 3  cos 0.335
    3. doc 1  cos 0.298
  stage 2 (pair scorer on 3 pairs, keep 3, floor 1.000)
    1. doc 5  score 0.500  below floor, dropped
    2. doc 1  score 0.000  below floor, dropped
    3. doc 3  score 0.000  below floor, dropped
  sent to the model: nothing (say I do not know)
~~~

Without the floor, the model would have received three refund-policy snippets for a geography question, which is exactly the setup in which models invent an answer (see [What are hallucinations and what causes them?](/interview-question/what-are-hallucinations-and-what-causes-them)). The right floor value depends on the reranker and must be picked from labelled examples; scores from different models are not on the same scale.

## 6. What Reranking Buys in a RAG System

- **The right chunk lands in the few slots you can afford.** Prompts hold a handful of chunks; position 5 of 50 is useless if you send 3.
- **Fewer distractors.** Models are measurably worse at using information placed in the middle of a long context: Liu et al., *Lost in the Middle* (TACL 2024, arXiv 2307.03172), found accuracy highest when the relevant passage is at the start or end of the input. Sending fewer, better-ordered chunks avoids that.
- **Smaller prompts.** Keeping 5 reranked chunks instead of 20 raw ones cuts input tokens and latency.
- **An honest "no answer".** The floor turns "nearest neighbours of nonsense" into "nothing relevant found".

A published data point: Anthropic's engineering post *Contextual Retrieval* (checked October 2026) reports a top-20 retrieval failure rate falling from 5.7% to 2.9% with contextual embeddings plus contextual BM25, and to 1.9% when reranking was added on top, on their own benchmark. Treat it as one vendor's measurement on their data, not a number your system will reproduce.

## 7. Kinds of Reranker

| Kind | How it scores | Typical use | Trade-off |
| :--- | :--- | :--- | :--- |
| Cross-encoder model (hosted) | One pass per pair through a model built for relevance | Most production RAG | Per-call cost, network hop, data leaves your network |
| Cross-encoder model (self-hosted) | Same, on your own CPU or GPU | Data residency, high volume | You run and scale the model |
| LLM as reranker | Ask a general LLM to score or order the candidates | Small candidate sets, complex relevance rules | Slowest and priciest per candidate; output must be parsed |
| Late interaction (ColBERT style) | Keeps one vector per token and matches token by token | Between bi- and cross-encoder in cost and quality | Much larger index |
| Rules and business signals | Recency, source authority, user permissions, popularity | Combined with any of the above | Hand-tuned, can fight the model |

Concrete products, as documented (checked October 2026): Cohere documents a Rerank endpoint with a model named \`rerank-v3.5\`; Voyage AI announced instruction-following \`rerank-2.5\` models (from its launch post, a vendor source); open cross-encoders include BAAI \`bge-reranker-v2-m3\` and the sentence-transformers \`cross-encoder/ms-marco-MiniLM-L6-v2\` model. Names and versions change quickly; what does not change is the shape: a query plus candidate texts in, one score per candidate out. How to choose one, how deep to rerank and how to fit it into a latency budget is in [Reranking in RAG: when and how to add a cross-encoder?](/interview-question/reranking-in-rag-when-and-how-to-add-a-cross-encoder)

The call itself is small. A shape sketch with the sentence-transformers library (not run here; method names checked against the sbert.net documentation, October 2026):

~~~python
# not run here: needs the sentence-transformers package and a model download
from sentence_transformers import CrossEncoder

model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L6-v2")
candidates = vector_search(query, k=50)          # your first stage
scores = model.predict([(query, c.text) for c in candidates])
ranked = sorted(zip(scores, candidates), key=lambda p: -p[0])
context = [c for s, c in ranked[:5] if s >= FLOOR]
~~~

## 8. Verified: Running the Code

The example **"Two-stage retrieval: a lossy first stage, then a pair scorer"** runs everything in memory: eight documents, a 12-number hashing embedding for stage 1, the pair scorer for stage 2, and the cost arithmetic. It makes no model calls; the pair scorer stands for a real cross-encoder and leaves out everything a trained model learns beyond phrase overlap and negation.

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
1) the gold document is recalled but ranked low, then promoted
query: "Can I get a refund after 30 days?"
  stage 1 (bi-encoder, top 5 of 8)
    1. doc 6  cos 0.906
    2. doc 3  cos 0.816
    3. doc 7  cos 0.792
    4. doc 0  cos 0.775
    5. doc 4  cos 0.775  <- answers it
  stage 2 (pair scorer on 5 pairs, keep 3, floor 1.000)
    1. doc 4  score 5.500  <- answers it
    2. doc 7  score 3.500
    3. doc 0  score 2.500
  sent to the model: doc 4, doc 7, doc 0
  gold rank: 5 -> 1   reciprocal rank: 0.200 -> 1.000

2) an off-topic question: the floor sends nothing
query: "What is the capital of France?"
  stage 1 (bi-encoder, top 3 of 8)
    1. doc 5  cos 0.365
    2. doc 3  cos 0.335
    3. doc 1  cos 0.298
  stage 2 (pair scorer on 3 pairs, keep 3, floor 1.000)
    1. doc 5  score 0.500  below floor, dropped
    2. doc 1  score 0.000  below floor, dropped
    3. doc 3  score 0.000  below floor, dropped
  sent to the model: nothing (say I do not know)

3) why not rerank everything (assume 2 ms of model time per pair)
         50 pairs  100 ms
        200 pairs  400 ms
   10000000 pairs  5.6 hours
~~~

What the run shows:

- The first stage recalled the answer but ranked it fifth; reranking the five candidates moved it to first (reciprocal rank 0.200 to 1.000).
- The top 3 from stage 1 alone contained no answer at all.
- A score floor turned an off-topic question into "send nothing" instead of three irrelevant chunks.
- Scoring 50 pairs is a request-sized cost; scoring a 10-million-chunk corpus per query is hours.

## Edge Cases Worth Knowing

- **The reranker can only reorder what it is given.** If the answer is not in the first-stage shortlist, reranking cannot help; that is a recall problem (better chunking, [hybrid search](/interview-question/what-is-hybrid-search-and-why-combine-bm25-with-vector-search), a deeper shortlist).
- **Long chunks get truncated.** Cross-encoders have an input limit per pair; Cohere, for example, documents a \`max_tokens_per_doc\` setting for Rerank v2. Text past the limit is not scored, so very long chunks can be misjudged.
- **Scores are model-specific.** A floor tuned for one reranker is meaningless for another, and some return raw logits rather than 0-to-1 values.
- **Ties and duplicates.** Near-duplicate chunks get near-identical scores and can fill all top slots with the same fact; deduplicate before or after reranking.
- **Language and domain.** An English-only reranker can score other languages badly; legal or medical text may need a domain-tuned model. Check on your own labelled queries.

## Common Pitfalls

- **Expecting reranking to fix missing results.** It fixes order, not recall. Measure whether the answer is in the shortlist before adding a reranker.
- **Reranking too few candidates.** Reranking the top 5 into a different top 5 does little; the gain comes from looking deeper (20 to 100) than you can send.
- **Skipping the score floor.** Without one, every question gets context, including the ones your documents cannot answer.
- **Using the vector similarity as a confidence score.** Cosine values are relative; the nearest neighbour of an irrelevant question can still score high.
- **Adding latency without measuring the gain.** A reranker is a model call on the critical path; check on labelled queries that answer quality actually improved.
- **Ranking on chunk text the model never sees.** Rerank the same text you will put in the prompt, including any title or context header, so the score matches what the model reads.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Two jobs:</strong> <span style="color:#f0e2c8;">Retrieval has to do two things: not miss the right chunk among millions, which is <strong style="color:#ffca28;">recall</strong>, and put the best few on top, which is <strong style="color:#ffca28;">precision</strong>. One model cannot do both cheaply, so production systems split it into two stages.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Stage one is a bi-encoder:</strong> <span style="color:#f0e2c8;">Vector search encodes each document on its own, ahead of time, into one vector, and the query separately. That is what makes it fast over millions of chunks, and it is also why it is blurry: details like <em style="color:#f0e2c8;">not available</em> versus <em style="color:#f0e2c8;">available</em> get averaged away.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Stage two is a cross-encoder:</strong> <span style="color:#f0e2c8;">A reranker reads the query and one candidate together in a single model pass and outputs a relevance score. It sees word order, negation and which part of the chunk answers. It costs one pass per pair, so it only runs on a shortlist of maybe 20 to 100.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What it buys:</strong> <span style="color:#f0e2c8;">The right chunk moves into the few slots I can put in the prompt. In my demo the answer went from rank 5 to rank 1, and the top 3 before reranking had no answer at all. Fewer distractors also means smaller prompts and less of the lost-in-the-middle effect.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The score floor and the limit:</strong> <span style="color:#f0e2c8;">Reranker scores can be thresholded, so an off-topic question gets no context and the model says it does not know. And the limit: a reranker only reorders what stage one found, so if the answer is not in the shortlist, it is a recall problem, not a ranking one.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use the cross-encoder for everything?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Cost. Nothing can be precomputed, because the score depends on the question. At an assumed 2 ms per pair, 50 candidates is 100 ms, but a 10-million-chunk corpus is about 5.6 hours per query. The first stage exists to make the shortlist small enough.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is a cross-encoder more accurate than embeddings?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the document is read while the model knows the question. With a bi-encoder, the document vector was fixed before any question existed and has to serve every possible question. The cross-encoder can attend from each query word to each document word and check the exact thing being asked.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many candidates should you rerank and how many keep?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rerank deeper than you send: typically 20 to 100 in and 3 to 10 out. Reranking the top 5 into a different top 5 gains little. The right numbers come from an eval set: check that the answer is in the shortlist and that quality stops improving past some depth.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can an LLM be the reranker?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, you can ask a general model to score or order candidates, and it can follow complex relevance rules. It is usually the slowest and most expensive option per candidate and its output has to be parsed, so it fits small shortlists or offline jobs better than every request.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you pick the score floor?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From labelled data. Run questions that the documents can and cannot answer, look at the reranker scores, and pick the value that drops most irrelevant chunks while keeping the answers. Scores are specific to one reranker, so retune when you switch model.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Recall | Fraction of the relevant chunks the retriever returned at all |
| Precision at k | Fraction of the top k results that are relevant |
| Two-stage retrieval | Fast, generous first stage, then an expensive reranker on the shortlist |
| Bi-encoder | Encodes query and document separately into vectors, compared by dot product |
| Cross-encoder | Reads query and document together and outputs one relevance score |
| Reciprocal rank (MRR) | 1 / position of the first relevant result, averaged over queries |
| Relevance threshold (score floor) | Minimum reranker score for a chunk to be sent to the model |

**Conclusion:** A reranker is the careful second read in a two-stage retrieval system. The first stage, usually a bi-encoder vector search plus keywords, is fast enough for millions of chunks because each text was encoded alone, and that is also why it is blurry. A cross-encoder reranker reads the question and each candidate together, so it catches word order, negation and what the chunk is really about, at the cost of one model pass per pair, which is affordable only for a shortlist. In the run, the answer moved from fifth to first and an off-topic question got no context at all thanks to a score floor. Add a reranker when the answer is usually in your shortlist but not at the top, look deeper than you send, threshold its scores, and remember that it can only reorder what retrieval found.`,
    examples: [
      {
        label: `Two-stage retrieval: a lossy first stage, then a pair scorer`,
        variants: [
          { tech: "node", code: `// Two-stage retrieval: a lossy bi-encoder recalls candidates, a pair scorer reranks them.
const DOCS = [
  "Refunds are available within 30 days of purchase.",
  "Join today and get 30 days of free shipping on every order.",
  "You can change your delivery address after ordering, within 2 days.",
  "Refund processing takes 5 to 10 business days after we receive the item.",
  "After 30 days a refund is not possible, but you can get store credit.",
  "Gift cards can not be refunded or exchanged for cash.",
  "We match competitor prices for 30 days after purchase.",
  "Returns after 30 days need a manager to approve store credit.",
];
const STOP = new Set(["a", "an", "the", "i", "can", "you", "of", "on", "or", "to", "for", "we", "and", "is", "be", "get", "your", "my", "but", "it", "are", "every", "need"]);
const words = (t) => t.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(" ").filter((w) => w);
const stem = (w) => (w.endsWith("s") && w.length > 3 ? w.slice(0, -1) : w).replace(/ed$/, "");
const terms = (t) => words(t).map(stem).filter((w) => !STOP.has(w));

// Stage 1 stand-in: each text is squeezed into 12 numbers on its own (hashing trick).
const DIM = 12;
function bucket(w) { let h = 0; for (const c of w) h = (h * 31 + c.charCodeAt(0)) % 1000003; return h % DIM; }
function embed(t) {
  const v = new Array(DIM).fill(0);
  for (const w of terms(t)) v[bucket(w)] += 1;
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

// Stage 2 stand-in: reads query and document together and scores the pair.
function pairScore(q, d) {
  const qt = terms(q), dt = new Set(terms(d)), dw = words(d).map(stem);
  const cover = qt.filter((w) => dt.has(w)).length / qt.length;
  const qw = words(q).map(stem);
  let bigrams = 0;
  for (let i = 0; i + 1 < qw.length; i++) {
    for (let j = 0; j + 1 < dw.length; j++) if (qw[i] === dw[j] && qw[i + 1] === dw[j + 1]) { bigrams++; break; }
  }
  const neg = dw.includes("not") ? 0.5 : 0; // a direct yes/no answer to a "can I" question
  return Math.floor((2 * cover + bigrams + neg) * 1000 + 0.5) / 1000;
}
const f3 = (x) => (Math.floor(x * 1000 + 0.5) / 1000).toFixed(3);

function run(query, k, keep, floor, gold) {
  const qv = embed(query);
  const docVecs = DOCS.map(embed); // computed once at index time in a real system
  const stage1 = DOCS.map((d, i) => ({ i, s: dot(qv, docVecs[i]) })).sort((a, b) => b.s - a.s || a.i - b.i).slice(0, k);
  console.log(\`query: "\${query}"\`);
  console.log(\`  stage 1 (bi-encoder, top \${k} of \${DOCS.length})\`);
  stage1.forEach((c, r) => console.log(\`    \${r + 1}. doc \${c.i}  cos \${f3(c.s)}\${c.i === gold ? "  <- answers it" : ""}\`));
  const reranked = stage1.map((c) => ({ i: c.i, s: pairScore(query, DOCS[c.i]) })).sort((a, b) => b.s - a.s || a.i - b.i);
  console.log(\`  stage 2 (pair scorer on \${k} pairs, keep \${keep}, floor \${f3(floor)})\`);
  reranked.slice(0, keep).forEach((c, r) => console.log(\`    \${r + 1}. doc \${c.i}  score \${f3(c.s)}\${c.s < floor ? "  below floor, dropped" : ""}\${c.i === gold ? "  <- answers it" : ""}\`));
  const sent = reranked.slice(0, keep).filter((c) => c.s >= floor);
  console.log(\`  sent to the model: \${sent.length ? sent.map((c) => "doc " + c.i).join(", ") : "nothing (say I do not know)"}\`);
  return { stage1, sent };
}

console.log("1) the gold document is recalled but ranked low, then promoted");
const a = run("Can I get a refund after 30 days?", 5, 3, 1.0, 4);
const r1 = a.stage1.findIndex((c) => c.i === 4) + 1;
const r2 = a.sent.findIndex((c) => c.i === 4) + 1;
console.log(\`  gold rank: \${r1} -> \${r2}   reciprocal rank: \${f3(1 / r1)} -> \${f3(1 / r2)}\`);
console.log("");
console.log("2) an off-topic question: the floor sends nothing");
run("What is the capital of France?", 3, 3, 1.0, -1);
console.log("");
console.log("3) why not rerank everything (assume 2 ms of model time per pair)");
for (const n of [50, 200, 10000000]) {
  const ms = n * 2;
  const shown = ms < 60000 ? \`\${ms} ms\` : \`\${(ms / 3600000).toFixed(1)} hours\`;
  console.log(\`  \${String(n).padStart(9)} pairs  \${shown}\`);
}` },
          { tech: "python", code: `# Two-stage retrieval: a lossy bi-encoder recalls candidates, a pair scorer reranks them.
import math
import re

DOCS = [
    "Refunds are available within 30 days of purchase.",
    "Join today and get 30 days of free shipping on every order.",
    "You can change your delivery address after ordering, within 2 days.",
    "Refund processing takes 5 to 10 business days after we receive the item.",
    "After 30 days a refund is not possible, but you can get store credit.",
    "Gift cards can not be refunded or exchanged for cash.",
    "We match competitor prices for 30 days after purchase.",
    "Returns after 30 days need a manager to approve store credit.",
]
STOP = {"a", "an", "the", "i", "can", "you", "of", "on", "or", "to", "for", "we", "and", "is", "be", "get", "your", "my", "but", "it", "are", "every", "need"}


def words(t):
    return [w for w in re.sub(r"[^a-z0-9 ]", " ", t.lower()).split(" ") if w]


def stem(w):
    w = w[:-1] if w.endswith("s") and len(w) > 3 else w
    return re.sub(r"ed$", "", w)


def terms(t):
    return [w for w in map(stem, words(t)) if w not in STOP]


# Stage 1 stand-in: each text is squeezed into 12 numbers on its own (hashing trick).
DIM = 12


def bucket(w):
    h = 0
    for c in w:
        h = (h * 31 + ord(c)) % 1000003
    return h % DIM


def embed(t):
    v = [0.0] * DIM
    for w in terms(t):
        v[bucket(w)] += 1
    n = math.sqrt(sum(x * x for x in v)) or 1
    return [x / n for x in v]


def dot(a, b):
    s = 0
    for i, x in enumerate(a):
        s += x * b[i]
    return s


# Stage 2 stand-in: reads query and document together and scores the pair.
def pair_score(q, d):
    qt, dt, dw = terms(q), set(terms(d)), [stem(w) for w in words(d)]
    cover = len([w for w in qt if w in dt]) / len(qt)
    qw = [stem(w) for w in words(q)]
    bigrams = 0
    for i in range(len(qw) - 1):
        for j in range(len(dw) - 1):
            if qw[i] == dw[j] and qw[i + 1] == dw[j + 1]:
                bigrams += 1
                break
    neg = 0.5 if "not" in dw else 0  # a direct yes/no answer to a "can I" question
    return math.floor((2 * cover + bigrams + neg) * 1000 + 0.5) / 1000


def f3(x):
    return f"{math.floor(x * 1000 + 0.5) / 1000:.3f}"


def run(query, k, keep, floor, gold):
    qv = embed(query)
    doc_vecs = [embed(d) for d in DOCS]  # computed once at index time in a real system
    stage1 = sorted(({"i": i, "s": dot(qv, doc_vecs[i])} for i in range(len(DOCS))), key=lambda c: (-c["s"], c["i"]))[:k]
    print(f'query: "{query}"')
    print(f"  stage 1 (bi-encoder, top {k} of {len(DOCS)})")
    for r, c in enumerate(stage1):
        print(f"    {r + 1}. doc {c['i']}  cos {f3(c['s'])}{'  <- answers it' if c['i'] == gold else ''}")
    reranked = sorted(({"i": c["i"], "s": pair_score(query, DOCS[c["i"]])} for c in stage1), key=lambda c: (-c["s"], c["i"]))
    print(f"  stage 2 (pair scorer on {k} pairs, keep {keep}, floor {f3(floor)})")
    for r, c in enumerate(reranked[:keep]):
        low = "  below floor, dropped" if c["s"] < floor else ""
        print(f"    {r + 1}. doc {c['i']}  score {f3(c['s'])}{low}{'  <- answers it' if c['i'] == gold else ''}")
    sent = [c for c in reranked[:keep] if c["s"] >= floor]
    shown = ", ".join("doc " + str(c["i"]) for c in sent) if sent else "nothing (say I do not know)"
    print(f"  sent to the model: {shown}")
    return stage1, sent


print("1) the gold document is recalled but ranked low, then promoted")
stage1, sent = run("Can I get a refund after 30 days?", 5, 3, 1.0, 4)
r1 = [c["i"] for c in stage1].index(4) + 1
r2 = [c["i"] for c in sent].index(4) + 1
print(f"  gold rank: {r1} -> {r2}   reciprocal rank: {f3(1 / r1)} -> {f3(1 / r2)}")
print("")
print("2) an off-topic question: the floor sends nothing")
run("What is the capital of France?", 3, 3, 1.0, -1)
print("")
print("3) why not rerank everything (assume 2 ms of model time per pair)")
for n in [50, 200, 10000000]:
    ms = n * 2
    shown = f"{ms} ms" if ms < 60000 else f"{ms / 3600000:.1f} hours"
    print(f"  {str(n).rjust(9)} pairs  {shown}")` },
        ],
      },
    ],
  },
  {
    title: `Reranking in RAG: when and how to add a cross-encoder?`,
    difficulty: "medium",
    seoDescription: `When a cross-encoder reranker helps RAG, how to choose its depth from an eval sweep, pick a model, and keep it inside a latency budget with a fallback.`,
    description: `**Question presented to candidate:**
"You own a RAG search feature with hybrid retrieval. Product says answers are often close but not quite right. How would you decide whether a cross-encoder reranker is the fix, and if it is, how would you add one: which model, how many candidates, and what happens to latency?"

**What a strong answer should cover:**
- Diagnose first with a labelled eval set: if the answer chunk is usually in the top 50 to 100 but not in the top few you send, a reranker helps; if it is not in the shortlist at all, reranking cannot fix it and the work is in recall
- Pick the rerank depth by measurement: a sweep of candidate depth against recall at that depth, nDCG or MRR after reranking, and reranker latency; quality flattens while latency grows linearly with pairs
- Choosing the model: hosted rerank API versus self-hosted open cross-encoder, trading cost per call, network hop and data residency against running GPUs or CPUs yourself; check language coverage and the per-document token limit
- Production wiring: batch the pairs in one call, rerank the same text that goes in the prompt (title plus chunk), set a time budget with a fallback to first-stage order, and threshold scores so low-relevance chunks are dropped
- Keep evaluating after launch: log scores and positions, re-tune the floor and depth when the model, the corpus or the chunking changes

**Clarifying questions expected:**
- What is the latency budget for the whole request, and how much is already spent before generation?
- How large and how multilingual is the corpus, and can data leave our network for a hosted API?
- Do we have labelled queries, or do we need to build a small eval set first?

**Code / implementation expected:** Optional — a retrieve-then-rerank function with a timeout fallback and a score floor, or the measurement plan for choosing depth.`,
    answer: `**Target Audience:** Engineers who already understand what a reranker is and now have to decide whether to put one into a real RAG system, which one, how deep, and inside what latency budget.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (the depth sweep and timeout simulation below). The relevance scores are simulated with a seeded generator and the reranker latency comes from a stated cost model, so the numbers show the *method*, not a benchmark of any product. Vendor API facts are cited inline with the date checked (October 2026).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A restaurant kitchen keeps getting complaints that dishes are "almost right". The head chef could hire a second, very good chef to taste and correct every plate before it leaves. That works, if the problem is seasoning. If the problem is that the wrong ingredients were delivered, the tasting chef can only send back bad plates faster. And each tasting takes time: fine on a quiet Tuesday, a queue of cold food on a Saturday night.

A cross-encoder reranker is the tasting chef. Before hiring one, check that the right ingredient (the answer chunk) is actually reaching the kitchen. After hiring one, decide how many plates they taste, what happens when they fall behind, and whether the food actually got better.

What a reranker *is*, and why reading query and document together beats comparing two vectors, is covered in [What is reranking and why add it after retrieval?](/interview-question/what-is-reranking-and-why-add-it-after-retrieval). This page is about the engineering decision.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What is the end-to-end latency budget, and how much does retrieval use today? | A reranker adds tens to hundreds of milliseconds on the critical path; the budget decides the depth |
| How big is the corpus, and how many languages? | Decides whether an English-only open model is enough or you need a multilingual one |
| Can documents leave our network? | Rules a hosted rerank API in or out |
| Do we have labelled queries with known answer chunks? | Without them you cannot tell if the reranker helps; building 50 to 200 is step one |
| What does "almost right" look like in the logs? | Answer chunk ranked low versus missing entirely are different problems |

## 3. Step One: Is Ranking Actually the Problem?

📌 **Interview term: gold chunk** — for a labelled question, the chunk that contains the answer. An eval set is a list of questions with their gold chunks (and optionally graded partial matches).

Log the first-stage ranking for each eval question and ask two things: *is the gold chunk in the top N at all*, and *is it in the top k that you send*? Three outcomes:

| Gold chunk position | Diagnosis | Fix |
| :--- | :--- | :--- |
| Usually in the top k sent | Ranking is fine; look at generation | Prompting, context order, citation rules |
| In the top 50 to 100, often not in the top k | **Ranking problem** | A reranker is the textbook fix |
| Often not in the top 100 | **Recall problem** | Chunking, [hybrid search](/interview-question/hybrid-search-why-combine-bm25-with-vectors-and-how-does-rrf-work), query rewriting, a better embedding model |

📌 **Interview term: recall ceiling** — the best quality any reranker could reach, set by how often the gold chunk is in the candidates it is given. A reranker over the top 10 can never beat "gold in top 10".

<svg class="iq-diagram" width="100%" viewBox="0 0 820 260" role="img" aria-label="Decision: is the gold chunk in the top 100? If no, fix recall. If yes, is it in the top k sent? If no, add a reranker. If yes, look at generation">
  <defs>
    <marker id="ai07q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="90" width="190" height="80" rx="10"/>
  <text class="d-text" x="115" y="124" text-anchor="middle">gold in top 100</text>
  <text class="d-sub" x="115" y="148" text-anchor="middle">of stage 1</text>
  <rect class="d-box-muted" x="300" y="10" width="190" height="64" rx="10"/>
  <text class="d-text" x="395" y="48" text-anchor="middle">fix recall</text>
  <rect class="d-box-accent" x="300" y="150" width="190" height="80" rx="10"/>
  <text class="d-text" x="395" y="184" text-anchor="middle">gold in top k</text>
  <text class="d-sub" x="395" y="208" text-anchor="middle">that you send</text>
  <rect class="d-box" x="600" y="90" width="200" height="64" rx="10"/>
  <text class="d-text" x="700" y="128" text-anchor="middle">add a reranker</text>
  <rect class="d-box-muted" x="600" y="190" width="200" height="64" rx="10"/>
  <text class="d-text" x="700" y="228" text-anchor="middle">look at generation</text>
  <path class="d-edge-dashed" d="M 214 110 L 294 52" marker-end="url(#ai07q2-arrow)"/>
  <text class="d-sub" x="240" y="66" text-anchor="middle">no</text>
  <path class="d-edge" d="M 214 150 L 294 186" marker-end="url(#ai07q2-arrow)"/>
  <text class="d-sub" x="240" y="196" text-anchor="middle">yes</text>
  <path class="d-edge" d="M 494 172 L 594 128" marker-end="url(#ai07q2-arrow)"/>
  <text class="d-sub" x="540" y="112" text-anchor="middle">no</text>
  <path class="d-edge-dashed" d="M 494 212 L 594 220" marker-end="url(#ai07q2-arrow)"/>
  <text class="d-sub" x="545" y="240" text-anchor="middle">yes</text>
</svg>

Only the middle branch is a reranker problem. Teams that skip this check often add a reranker to a system whose real bug is that a PDF was never indexed; see [What are common RAG failure modes and how do you debug them?](/interview-question/what-are-common-rag-failure-modes-and-how-do-you-debug-them)

## 4. Step Two: Choose the Depth by Sweeping It

📌 **Interview term: rerank depth (candidate count)** — how many first-stage results you pass to the reranker. Separate from **k**, the number you finally send to the model.

📌 **Interview term: nDCG@k** — normalized discounted cumulative gain: rewards relevant results more the higher they appear, supports graded relevance (2 = answers it, 1 = partly), and is scaled so a perfect ranking scores 1.0.

The example **"Rerank depth sweep with a recall ceiling, a latency model and a timeout fallback"** simulates 40 labelled queries with 400 candidates each: one grade-2 chunk and two grade-1 chunks per query. The first-stage score is a weak, noisy signal of relevance; the reranker score is a stronger, less noisy one (both generated from a fixed seed). Reranker latency follows an **assumed** cost model of 20 ms fixed plus 1.5 ms per pair, a stand-in for a small self-hosted cross-encoder; measure yours.

~~~text
1) depth sweep over 40 labelled queries
   depth  gold@depth  recall@depth  nDCG@5 no rerank  nDCG@5 reranked  rerank ms
       5       0.725         0.408             0.562            0.604       27.5
      10       0.750         0.442             0.562            0.632         35
      25       0.875         0.575             0.562            0.747       57.5
      50       0.950         0.667             0.562            0.808         95
     100       1.000         0.800             0.562            0.878        170
     200       1.000         0.917             0.562            0.889        320
~~~

How to read it:

- **gold@depth** is the recall ceiling for the most important chunk. At depth 5 it is 0.725: in 27.5% of queries the reranker never even sees the answer.
- **Reranking only the top 5 or 10 barely helps** (0.562 to 0.604 or 0.632). You are reshuffling the same few results.
- **The gain comes from depth.** At 50 candidates nDCG@5 is 0.808, at 100 it is 0.878.
- **Then it flattens.** Going from 100 to 200 adds 0.011 while latency nearly doubles from 170 to 320 ms. Deeper also means more near-miss distractors for the reranker to get wrong.

With these numbers and a 120 ms reranking budget, depth 50 is the deepest that fits; with a 200 ms budget, 100. That is the decision an interviewer wants to hear you make *from a table like this*, not from a rule of thumb.

## 5. Step Three: Choose the Model

| Option | Pros | Cons |
| :--- | :--- | :--- |
| Hosted rerank API | No infrastructure, strong multilingual models, scales on demand | Per-call cost, a network hop, documents leave your network, vendor rate limits |
| Self-hosted open cross-encoder | Data stays inside, predictable cost at high volume, can fine-tune on your data | GPUs or CPUs to run, batching and autoscaling are your job |
| LLM as reranker | Follows complex relevance instructions | Slowest and most expensive per candidate; parse and validate output |
| No reranker, better first stage | No extra latency | Ceiling stays where the bi-encoder puts it |

Checks that decide between models: language coverage, the **per-pair input limit** (anything past it is not scored), latency at your depth with real chunk lengths, and quality on *your* eval set, not a public leaderboard.

Vendor facts as documented (checked October 2026; verify before relying on them): Cohere's Rerank v2 API takes a required \`model\` such as \`rerank-v3.5\`, a \`query\`, a list of \`documents\` as strings and an optional \`top_n\`, truncates each document at \`max_tokens_per_doc\` (default 4096 per the v2 changelog), recommends no more than 1,000 documents per request, and bills in search units of up to 100 documents. Voyage AI's launch post for \`rerank-2.5\` describes instruction-following and a 32K-token context per pair; that is a vendor announcement, not independently checked. Open options include \`BAAI/bge-reranker-v2-m3\` (an XLM-RoBERTa-based multilingual cross-encoder per its model card) and sentence-transformers \`cross-encoder/ms-marco-*\` models.

A hosted call is a few lines (not run here; parameter names checked against Cohere documentation, October 2026):

~~~python
# not run here: needs the cohere package and an API key
import cohere

co = cohere.ClientV2()
resp = co.rerank(
    model="rerank-v3.5",
    query=question,
    documents=[c.title + "\\n" + c.text for c in candidates],  # same text the prompt will get
    top_n=8,
)
kept = [candidates[r.index] for r in resp.results if r.relevance_score >= FLOOR]
~~~

The \`index\` in each result points back into the list you sent, which is why the candidate list must not be reordered between building the request and reading the response.

## 6. Step Four: Wire It In Without Breaking Latency

📌 **Interview term: latency budget** — the share of the end-to-end response time each stage is allowed to use. A reranker sits on the critical path *before* the first generated token, so it directly delays time to first token.

📌 **Interview term: graceful degradation (fallback)** — when the reranker is slow or down, the request still succeeds using the first-stage order, instead of failing or waiting.

The second part of the example gives ten requests different slowdown factors (a busy GPU, a cold start) and abandons any rerank that would exceed 120 ms:

~~~text
2) budget 120 ms for reranking, depth 50, with a timeout fallback
   req  1  rerank  95.000 ms  reranked                gold: rank 2, sent
   req  2  rerank 104.500 ms  reranked                gold: rank 1, sent
   req  3  rerank  85.500 ms  reranked                gold: rank 1, sent
   req  4  rerank 120.000 ms  timeout, stage 1 order  gold: rank 1, sent
   req  5  rerank  95.000 ms  reranked                gold: rank 1, sent
   req  6  rerank 120.000 ms  timeout, stage 1 order  gold: rank 1, sent
   req  7  rerank  95.000 ms  reranked                gold: rank 1, sent
   req  8  rerank 114.000 ms  reranked                gold: rank 1, sent
   req  9  rerank  90.250 ms  reranked                gold: rank 1, sent
   req 10  rerank 120.000 ms  timeout, stage 1 order  gold: rank 26, cut
   fallbacks: 3 of 10; every request still answered
~~~

Every request finished within the budget. Two fallbacks cost nothing (stage 1 already had the answer first); request 10 lost its answer because stage 1 had it at rank 26. That is the honest cost of a fallback, and why you **count fallbacks** as a metric: a fallback rate of 30% means the reranker you are paying for is not doing its job.

The key part of the logic (from the example):

~~~js
const need = rerankMs(DEPTH) * load;
const ok = need <= BUDGET;
const top = ok ? [...cand].sort(byCross) : cand; // fallback: keep stage 1 order
~~~

In real code that is a timeout on the call (an \`AbortController\` deadline in Node, a client timeout in Python), not a computed number. More wiring rules:

- **One batched call per query**, not one call per candidate.
- **Rerank the prompt text.** Include the title or contextual header you will show the model, truncated the same way.
- **Apply access filters before reranking**, so you never send another tenant's text to a hosted reranker; see [How do you scope retrieval with metadata filtering and multi-tenancy?](/interview-question/how-do-you-scope-retrieval-with-metadata-filtering-and-multi-tenancy)
- **Cache by (query, candidate set) hash** for repeated questions, if your traffic has many repeats.
- **Log** the depth, the scores, the final positions, the reranker latency and whether the fallback fired.

## 7. Step Five: Keep Measuring

The depth and the floor are tuned for one reranker, one embedding model and one chunking scheme. Re-run the sweep when any of them changes. In production, track reranker p95 latency, fallback rate, the share of queries where every candidate falls below the floor (a spike means a new topic your documents do not cover, or a broken index), and answer-level quality; [How do you evaluate a RAG pipeline end to end?](/interview-question/how-do-you-evaluate-a-rag-pipeline-end-to-end) covers the full eval loop.

## 8. Verified: Running the Code

The example **"Rerank depth sweep with a recall ceiling, a latency model and a timeout fallback"** generates all relevance scores from a Park-Miller generator with a fixed seed and uses sums of uniform random numbers as noise, so Node and Python produce identical output. The reranker latency is the assumed formula 20 ms + 1.5 ms per pair, and the slowdowns in part 2 are a fixed list. It leaves out real model behaviour, network variance and batching effects.

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
1) depth sweep over 40 labelled queries
   depth  gold@depth  recall@depth  nDCG@5 no rerank  nDCG@5 reranked  rerank ms
       5       0.725         0.408             0.562            0.604       27.5
      10       0.750         0.442             0.562            0.632         35
      25       0.875         0.575             0.562            0.747       57.5
      50       0.950         0.667             0.562            0.808         95
     100       1.000         0.800             0.562            0.878        170
     200       1.000         0.917             0.562            0.889        320

2) budget 120 ms for reranking, depth 50, with a timeout fallback
   req  1  rerank  95.000 ms  reranked                gold: rank 2, sent
   req  2  rerank 104.500 ms  reranked                gold: rank 1, sent
   req  3  rerank  85.500 ms  reranked                gold: rank 1, sent
   req  4  rerank 120.000 ms  timeout, stage 1 order  gold: rank 1, sent
   req  5  rerank  95.000 ms  reranked                gold: rank 1, sent
   req  6  rerank 120.000 ms  timeout, stage 1 order  gold: rank 1, sent
   req  7  rerank  95.000 ms  reranked                gold: rank 1, sent
   req  8  rerank 114.000 ms  reranked                gold: rank 1, sent
   req  9  rerank  90.250 ms  reranked                gold: rank 1, sent
   req 10  rerank 120.000 ms  timeout, stage 1 order  gold: rank 26, cut
   fallbacks: 3 of 10; every request still answered
~~~

What the run shows:

- A reranker's ceiling is the first stage's recall at the chosen depth (gold@5 was only 0.725).
- Reranking a deep shortlist (50 to 100) is where the quality comes from; reranking the top 5 is not.
- Quality flattens while latency keeps growing, so the depth is picked from the budget and the curve.
- A timeout with a first-stage fallback keeps every request within budget, at a measurable quality cost.

## Edge Cases Worth Knowing

- **Long chunks.** If chunks are longer than the reranker input limit, the tail is not scored. Either chunk smaller or rerank a relevant window of the chunk.
- **Many near-duplicates.** The reranker may fill all top slots with copies of one fact. Deduplicate or diversify (for example, at most two chunks per document).
- **Multi-part questions.** "Compare plan A and plan B" needs chunks about both; a reranker scoring each chunk against the full question can favour one side. Decompose the query or keep the best chunk per sub-question.
- **Freshness.** A reranker ignores dates unless they are in the text. Add recency as a separate signal if newer documents should win.
- **Cold starts.** Self-hosted models take seconds to load; keep warm replicas or the first requests after a deploy all fall back.

## Common Pitfalls

- **Adding a reranker to a recall problem.** If the gold chunk is not in the top 100, no reranker helps; check gold@depth first.
- **Reranking only what you send.** Depth equal to k gives almost no gain, as the sweep showed.
- **No timeout.** A slow reranker silently becomes the slowest part of every request; give it a budget and a fallback.
- **Reranking different text than the prompt.** Scores computed on bare chunk text do not match what the model reads with headers and titles.
- **Sending unfiltered candidates to a hosted API.** Apply tenant and permission filters first.
- **Tuning once.** A new embedding model or chunking scheme changes the candidate list; re-run the depth sweep and re-pick the floor.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Diagnose first:</strong> <span style="color:#f0e2c8;">I would label 50 to 200 real questions with their answer chunks and log where the answer lands in first-stage results. If it is in the top 50 to 100 but not in the few I send, that is a ranking problem and a reranker fixes it. If it is not in the top 100, it is recall, and no reranker can help.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Choose depth by sweeping:</strong> <span style="color:#f0e2c8;">Rerank depth is how many candidates go in, separate from k that goes to the model. I sweep it against <strong style="color:#ffca28;">nDCG@5</strong> and latency. In my simulation, reranking only the top 5 moved nDCG@5 from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.562</code> to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.604</code>; reranking 50 got <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.808</code>, 100 got <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.878</code>, and 200 only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.889</code> at almost double the latency.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Choose the model:</strong> <span style="color:#f0e2c8;">Hosted rerank API if data can leave and volume is moderate; a self-hosted open cross-encoder if data must stay or volume is high. I check language coverage, the per-pair token limit, and quality on <em style="color:#f0e2c8;">our</em> eval set, not a leaderboard.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Wire it in safely:</strong> <span style="color:#f0e2c8;">One batched call per query, over the same text the prompt will see, after tenant and permission filters. A hard time budget with a fallback to first-stage order, so a slow reranker degrades quality instead of failing the request. Then a <strong style="color:#ffca28;">score floor</strong> so weak chunks are dropped.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Keep measuring:</strong> <span style="color:#f0e2c8;">Log scores, final positions, reranker latency and the fallback rate. The depth and the floor are tied to one reranker, one embedding model and one chunking scheme, so I re-run the sweep whenever any of them change.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many candidates would you rerank by default?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">I would start the sweep around 50 and test 25, 100 and 200, because the right number depends on how good the first stage is and on the budget. The pattern to look for is where quality flattens while latency keeps growing linearly with pairs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if the reranker is down?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The request should still succeed using first-stage order, which is graceful degradation. In my simulation 3 of 10 requests fell back; two lost nothing because the answer was already first, and one lost its answer because stage 1 had it at rank 26. The fallback rate is a metric to alert on.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Hosted API or self-hosted model?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It comes down to data rules, volume and team. Hosted is quickest and scales on demand but costs per call, adds a network hop and sends text outside. Self-hosted keeps data inside and is cheaper at high volume, but batching, GPUs and autoscaling become my job.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know the reranker actually helped?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compare on the same labelled queries: nDCG or MRR of the final top k, and answer-level quality, with and without the reranker. Then watch it in production with an A/B split or by logging how often reranking changed the top result and whether those answers got better ratings.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does reranking change how you chunk?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It can. Cross-encoders have a per-pair input limit, so very long chunks get truncated and misjudged. And because the reranker is good at picking the precise passage, smaller chunks with a short contextual header often work well, as long as recall at depth stays high.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Gold chunk | The chunk that holds the answer to a labelled question |
| Recall ceiling | Best possible reranked quality, limited by whether gold is in the candidates |
| Rerank depth (candidate count) | How many first-stage results go to the reranker |
| nDCG@k | Graded ranking quality of the top k, 1.0 = perfect order |
| Latency budget | Time each stage may use within the end-to-end target |
| Graceful degradation (fallback) | Answering with first-stage order when the reranker is slow or down |

**Conclusion:** Add a cross-encoder when the eval set says the answer is usually in your shortlist but not at the top; if it is missing from the shortlist, the fix is recall, not reranking. Then pick the depth from a sweep: in the simulation, reranking only the top 5 moved nDCG@5 from 0.562 to 0.604, reranking 50 moved it to 0.808 and 100 to 0.878, after which quality flattened while the assumed latency kept growing. Choose hosted or self-hosted by data rules, volume and language, batch the pairs in one call over the same text the prompt will see, put the call under a time budget with a first-stage fallback, threshold the scores, and re-run the measurement whenever the retrieval stack changes.`,
    examples: [
      {
        label: `Rerank depth sweep with a recall ceiling, a latency model and a timeout fallback`,
        variants: [
          { tech: "node", code: `// Choosing rerank depth with an eval set: recall ceiling, nDCG@5, latency budget, timeout fallback.
let seed = 20251;
function rand() { seed = (seed * 48271) % 2147483647; return seed / 2147483647; }
const noise = () => rand() + rand() + rand(); // 0..3, bell-shaped, no Math.log needed
const f3 = (x) => (Math.floor(x * 1000 + 0.5) / 1000).toFixed(3);

// 40 eval queries, 400 candidate chunks each. Grade 2 = answers it, 1 = partly, 0 = not.
const QUERIES = [];
for (let q = 0; q < 40; q++) {
  const docs = [];
  for (let d = 0; d < 400; d++) {
    const grade = d === 0 ? 2 : d < 3 ? 1 : 0;
    const vector = 0.75 * grade + noise();       // stage 1: one vector per side, lossy
    const cross = 1.2 * grade + 0.9 * noise();  // stage 2: reads the pair, sharper
    docs.push({ d, grade, vector, cross });
  }
  QUERIES.push(docs);
}
const byVector = (a, b) => b.vector - a.vector || a.d - b.d;
const byCross = (a, b) => b.cross - a.cross || a.d - b.d;
function dcg(list) { let s = 0; list.forEach((x, i) => { s += (2 ** x.grade - 1) / Math.log2(i + 2); }); return s; }
const IDEAL = dcg([{ grade: 2 }, { grade: 1 }, { grade: 1 }]);
const ndcg5 = (list) => dcg(list.slice(0, 5)) / IDEAL;
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

// Assumed cost model for a self-hosted cross-encoder: 20 ms fixed + 1.5 ms per pair.
const rerankMs = (n) => 20 + 1.5 * n;

console.log("1) depth sweep over 40 labelled queries");
console.log("   depth  gold@depth  recall@depth  nDCG@5 no rerank  nDCG@5 reranked  rerank ms");
const base = mean(QUERIES.map((docs) => ndcg5([...docs].sort(byVector))));
for (const depth of [5, 10, 25, 50, 100, 200]) {
  const gold = [], recall = [], nd = [];
  for (const docs of QUERIES) {
    const cand = [...docs].sort(byVector).slice(0, depth);
    gold.push(cand.some((x) => x.grade === 2) ? 1 : 0);
    recall.push(cand.filter((x) => x.grade > 0).length / 3);
    nd.push(ndcg5([...cand].sort(byCross)));
  }
  console.log(\`   \${String(depth).padStart(5)}  \${f3(mean(gold)).padStart(10)}  \${f3(mean(recall)).padStart(12)}  \${f3(base).padStart(16)}  \${f3(mean(nd)).padStart(15)}  \${String(rerankMs(depth)).padStart(9)}\`);
}

console.log("");
console.log("2) budget 120 ms for reranking, depth 50, with a timeout fallback");
const DEPTH = 50, BUDGET = 120;
const loads = [1.0, 1.1, 0.9, 1.3, 1.0, 2.4, 1.0, 1.2, 0.95, 3.0]; // slowdown factor per request
let fellBack = 0;
loads.forEach((load, i) => {
  const need = rerankMs(DEPTH) * load;
  const ok = need <= BUDGET;
  const ms = ok ? need : BUDGET; // the call is abandoned at the budget
  if (!ok) fellBack++;
  const docs = QUERIES[i];
  const cand = [...docs].sort(byVector).slice(0, DEPTH);
  const top = ok ? [...cand].sort(byCross) : cand; // fallback: keep stage 1 order
  const pos = top.findIndex((x) => x.grade === 2);
  const where = pos < 0 ? "not in top 50" : pos < 5 ? \`rank \${pos + 1}, sent\` : \`rank \${pos + 1}, cut\`;
  console.log(\`   req \${String(i + 1).padStart(2)}  rerank \${f3(ms).padStart(7)} ms  \${ok ? "reranked              " : "timeout, stage 1 order"}  gold: \${where}\`);
});
console.log(\`   fallbacks: \${fellBack} of \${loads.length}; every request still answered\`);` },
          { tech: "python", code: `# Choosing rerank depth with an eval set: recall ceiling, nDCG@5, latency budget, timeout fallback.
import math

seed = 20251


def rand():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647


def noise():
    return rand() + rand() + rand()  # 0..3, bell-shaped, no log needed


def f3(x):
    return f"{math.floor(x * 1000 + 0.5) / 1000:.3f}"


def fnum(x):  # print like JavaScript: 35 not 35.0
    return str(int(x)) if x == int(x) else str(x)


# 40 eval queries, 400 candidate chunks each. Grade 2 = answers it, 1 = partly, 0 = not.
QUERIES = []
for q in range(40):
    docs = []
    for d in range(400):
        grade = 2 if d == 0 else 1 if d < 3 else 0
        vector = 0.75 * grade + noise()  # stage 1: one vector per side, lossy
        cross = 1.2 * grade + 0.9 * noise()  # stage 2: reads the pair, sharper
        docs.append({"d": d, "grade": grade, "vector": vector, "cross": cross})
    QUERIES.append(docs)


def by_vector(xs):
    return sorted(xs, key=lambda x: (-x["vector"], x["d"]))


def by_cross(xs):
    return sorted(xs, key=lambda x: (-x["cross"], x["d"]))


def dcg(lst):
    s = 0
    for i, x in enumerate(lst):
        s += (2 ** x["grade"] - 1) / math.log2(i + 2)
    return s


IDEAL = dcg([{"grade": 2}, {"grade": 1}, {"grade": 1}])


def ndcg5(lst):
    return dcg(lst[:5]) / IDEAL


def mean(xs):
    s = 0
    for x in xs:
        s += x
    return s / len(xs)


# Assumed cost model for a self-hosted cross-encoder: 20 ms fixed + 1.5 ms per pair.
def rerank_ms(n):
    return 20 + 1.5 * n


print("1) depth sweep over 40 labelled queries")
print("   depth  gold@depth  recall@depth  nDCG@5 no rerank  nDCG@5 reranked  rerank ms")
base = mean([ndcg5(by_vector(docs)) for docs in QUERIES])
for depth in [5, 10, 25, 50, 100, 200]:
    gold, recall, nd = [], [], []
    for docs in QUERIES:
        cand = by_vector(docs)[:depth]
        gold.append(1 if any(x["grade"] == 2 for x in cand) else 0)
        recall.append(len([x for x in cand if x["grade"] > 0]) / 3)
        nd.append(ndcg5(by_cross(cand)))
    print(f"   {str(depth).rjust(5)}  {f3(mean(gold)).rjust(10)}  {f3(mean(recall)).rjust(12)}  {f3(base).rjust(16)}  {f3(mean(nd)).rjust(15)}  {fnum(rerank_ms(depth)).rjust(9)}")

print("")
print("2) budget 120 ms for reranking, depth 50, with a timeout fallback")
DEPTH, BUDGET = 50, 120
loads = [1.0, 1.1, 0.9, 1.3, 1.0, 2.4, 1.0, 1.2, 0.95, 3.0]  # slowdown factor per request
fell_back = 0
for i, load in enumerate(loads):
    need = rerank_ms(DEPTH) * load
    ok = need <= BUDGET
    ms = need if ok else BUDGET  # the call is abandoned at the budget
    if not ok:
        fell_back += 1
    cand = by_vector(QUERIES[i])[:DEPTH]
    top = by_cross(cand) if ok else cand  # fallback: keep stage 1 order
    pos = next((p for p, x in enumerate(top) if x["grade"] == 2), -1)
    where = "not in top 50" if pos < 0 else f"rank {pos + 1}, sent" if pos < 5 else f"rank {pos + 1}, cut"
    label = "reranked              " if ok else "timeout, stage 1 order"
    print(f"   req {str(i + 1).rjust(2)}  rerank {f3(ms).rjust(7)} ms  {label}  gold: {where}")
print(f"   fallbacks: {fell_back} of {len(loads)}; every request still answered")` },
        ],
      },
    ],
  },
  {
    title: `How do you scope retrieval with metadata filtering and multi-tenancy?`,
    difficulty: "medium",
    seoDescription: `Scope RAG retrieval per tenant and user: session-built metadata filters, why post-filtering fails small tenants, iterative scans and isolation models.`,
    description: `**Question presented to candidate:**
"We are turning our RAG assistant into a B2B product: many customer companies, and inside each one, documents only some employees may see. How do you make sure retrieval only ever returns chunks the current user is allowed to see, and stays fast for both our biggest and our smallest customers?"

**What a strong answer should cover:**
- Store tenant ID, access groups and useful attributes (document type, language, date) as metadata on every chunk, and apply them as a filter inside the retrieval query; the model can only leak what retrieval puts in its context, so the prompt is never the security boundary
- Post-filtering an approximate nearest-neighbour result (fetch top k, then drop rows) can return few or zero results for a small tenant; pre-filtering, filter-aware index search or an iterative scan (pgvector 0.8.0 added \`hnsw.iterative_scan\`) fix it, and very small filtered sets can simply be scanned exactly
- Isolation models and their trade-offs: one shared index with a tenant filter, a partition or namespace per tenant, or a separate index or database per tenant; isolation strength, operations overhead, noisy neighbours, offboarding deletes and cross-tenant queries
- The filter is built on the server from the authenticated session, never from request fields or model output; missing permission metadata means deny; permission changes must reach the index, ideally checked again against the source of truth before use
- Everything downstream inherits the scope: caches keyed per tenant, rerankers and logs receiving only filtered text, and tests that try to read another tenant's data

**Clarifying questions expected:**
- How many tenants, and how uneven are they in size?
- Is per-document access control needed inside a tenant, or only tenant-level separation?
- Are there contractual or regulatory isolation requirements, such as data residency or separate encryption keys per customer?

**Code / implementation expected:** Optional — a filtered vector query (SQL with a tenant predicate, or a vector DB filter) built from the session, plus an explanation of post- versus pre-filtering.`,
    answer: `**Target Audience:** Engineers putting RAG into a multi-customer (B2B) product, or into a company where not every employee may read every document.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (the filtered-search and authorization simulation below). Vector database behaviour is cited from vendor documentation with the date checked (October 2026); the SQL snippets are labelled "not run here".

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A shared office building has one mail room for forty companies. The clerk is fast and helpful: ask for "the latest contract" and you get it in seconds. The question is *whose* latest contract. If the clerk grabs the nearest matching envelope from the whole room and only then checks the company name, two things go wrong. Sometimes the right envelope for a small company is not among the handful grabbed, so you get nothing. And on a bad day, the check gets skipped and you walk off with a competitor's contract.

A RAG system over many customers' documents is that mail room. Vector search finds the most similar chunks *in the whole index* unless you tell it otherwise. Scoping retrieval means telling it otherwise, correctly, every time, in a way that cannot be talked around.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How many tenants, and how uneven are they? | A few huge tenants and thousands of tiny ones break naive filtered search in opposite ways |
| Tenant-level only, or per-document permissions inside a tenant? | Decides whether you need ACL metadata and permission sync, not just a tenant ID |
| Any contractual isolation (separate keys, regions, deletion deadlines)? | May force a partition, index or database per tenant |
| Do any features search across tenants? | Cross-tenant search rules out some isolation models |
| How fast must a permission change take effect? | Sets how tight the sync between the source of truth and the index must be |

## 3. The Rule That Everything Else Follows From

📌 **Interview term: retrieval-time authorization** — enforcing who may see what at the moment chunks are fetched, so unauthorized text never enters the model context. The model can only repeat what it was given; if retrieval never returns it, the model cannot leak it.

The opposite, telling the model "do not reveal other customers' data" in the system prompt, is not a control. Prompts can be overridden by the user or by text inside retrieved documents (see [What is prompt injection and how do you defend against it?](/interview-question/what-is-prompt-injection-and-how-do-you-defend-against-it)). Authorization belongs in code that the model cannot influence.

📌 **Interview term: metadata (payload) filter** — conditions on fields stored with each vector, applied as part of the search: \`tenant_id = 'acme'\`, \`groups contains 'hr'\`, \`language = 'de'\`, \`updated_at > 2025-01-01\`. The same mechanism serves security (tenant, permissions) and relevance (only the current product version, only this language).

<svg class="iq-diagram" width="100%" viewBox="0 0 820 240" role="img" aria-label="Request flow: the session gives tenant and groups, the server builds the filter, the vector search applies it, and only authorized chunks reach the model">
  <defs>
    <marker id="ai07q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="70" width="140" height="90" rx="10"/>
  <text class="d-text" x="90" y="108" text-anchor="middle">session</text>
  <text class="d-sub" x="90" y="134" text-anchor="middle">tenant, groups</text>
  <rect class="d-box-accent" x="220" y="70" width="160" height="90" rx="10"/>
  <text class="d-text" x="300" y="108" text-anchor="middle">server builds</text>
  <text class="d-sub" x="300" y="134" text-anchor="middle">the filter</text>
  <rect class="d-box" x="440" y="70" width="160" height="90" rx="10"/>
  <text class="d-text" x="520" y="108" text-anchor="middle">filtered search</text>
  <text class="d-sub" x="520" y="134" text-anchor="middle">inside the index</text>
  <rect class="d-box-muted" x="660" y="70" width="140" height="90" rx="10"/>
  <text class="d-text" x="730" y="108" text-anchor="middle">model</text>
  <text class="d-sub" x="730" y="134" text-anchor="middle">allowed chunks</text>
  <path class="d-edge" d="M 164 115 L 214 115" marker-end="url(#ai07q3-arrow)"/>
  <path class="d-edge" d="M 384 115 L 434 115" marker-end="url(#ai07q3-arrow)"/>
  <path class="d-edge" d="M 604 115 L 654 115" marker-end="url(#ai07q3-arrow)"/>
</svg>

The request body, the user question and the model output have no arrow into the filter. Only the authenticated session does.

## 4. Why Filtering a Vector Search Is Harder Than a WHERE Clause

In a normal database, \`WHERE tenant_id = 'tiny'\` uses an index on \`tenant_id\` and returns every matching row. A vector index is different: it is built to walk towards the nearest vectors *in the whole collection*, and an approximate index such as HNSW visits only a limited number of candidates (see [How does similarity search work — cosine, dot product and Euclidean?](/interview-question/how-does-similarity-search-work-cosine-dot-product-and-euclidean)).

📌 **Interview term: post-filtering** — run the nearest-neighbour search first, then drop results that fail the filter. Simple, and broken for selective filters: if the tenant owns 0.4% of the data, the top 40 neighbours probably contain none of its chunks.

📌 **Interview term: pre-filtering** — restrict the search to rows that pass the filter *before or during* the nearest-neighbour search. Correct by construction; the engineering question is how to do it fast.

📌 **Interview term: filter selectivity** — the fraction of the collection that passes the filter. High-selectivity filters (a tiny tenant, a rare permission group) are the ones that break post-filtering.

📌 **Interview term: iterative index scan** — keep pulling more candidates from the vector index until enough of them pass the filter, up to a cap. pgvector added this in version 0.8.0 as \`hnsw.iterative_scan\` (with \`strict_order\` and \`relaxed_order\` modes) and \`ivfflat.iterative_scan\`, capped by settings such as \`hnsw.max_scan_tuples\` (pgvector 0.8.0 release announcement on postgresql.org and AWS database blog, checked October 2026).

The example **"Post-filter vs pre-filter vs iterative scan, and a filter built from the session"** puts 2,000 chunks from four tenants of very different size into one shared index. The "index" is a list of candidates in similarity order, handed out in pages of 40 (standing in for an HNSW search with \`ef_search = 40\`):

~~~text
1) top 5 for each tenant (index page ef = 40, iterative cap = 400)
   tenant    chunks  share   post-filter  pre-filter (scanned)  iterative (scanned)
   acme        1417  70.8%      5 found     5 found (1417)     5 found (  40)  same as exact
   globex       467  23.4%      5 found     5 found ( 467)     5 found (  40)  same as exact
   initech      108   5.4%      0 found     5 found ( 108)     5 found ( 120)  same as exact
   tiny           8   0.4%      0 found     5 found (   8)     1 found ( 400)
~~~

- **Post-filtering works for big tenants and returns nothing for small ones.** Initech (5.4% of the data) and tiny (0.4%) got zero results. The model would then answer from no context, or the app would say "no documents found" to a paying customer who has documents.
- **Exact pre-filtering is always correct**, but for acme it compared against 1,417 vectors; at real scale that is a full scan of a big tenant.
- **The iterative scan is cheap for big tenants** (40 candidates) and recovers initech after 120, but for the tiny tenant it hit the cap of 400 and found only 1 of 5.

So no single strategy wins. The pragmatic rule is to route by size:

~~~text
3) routing rule: exact scan when the filtered set is small, index otherwise
   acme  1417 chunks -> iterative index scan: 5 found, 40 scanned, ids 1579, 1633, 881, 1893, 182
   tiny     8 chunks -> exact scan: 5 found, 8 scanned, ids 54, 212, 1412, 1743, 831
~~~

An exact scan over 8 (or 8,000) vectors is fast and perfectly accurate; the index is for the big sets. Many engines make this choice for you. Qdrant, for example, documents payload indexes for filtered search and a per-tenant HNSW layout for multitenant collections (Qdrant multitenancy guide, checked October 2026). With pgvector, a B-tree index on \`tenant_id\` lets the Postgres planner choose an exact scan of a small tenant over the vector index; check with \`EXPLAIN ANALYZE\`, because the planner decides.

A pgvector query with an iterative scan looks like this (not run here; settings names from the pgvector 0.8.0 documentation):

~~~sql
-- not run here: needs Postgres with pgvector 0.8.0 or later
SET hnsw.iterative_scan = relaxed_order;
SELECT id, body
FROM chunks
WHERE tenant_id = $1 AND groups && $2      -- both from the session, never from the request
ORDER BY embedding <=> $3
LIMIT 5;
~~~

## 5. Choosing an Isolation Model

📌 **Interview term: multi-tenancy** — one system serving many customers (tenants) whose data must stay separate.

| Model | How | Isolation | Good when | Costs |
| :--- | :--- | :--- | :--- | :--- |
| Shared index + tenant filter | One collection, \`tenant_id\` on every chunk | Logical: one missing filter leaks | Many small tenants, cross-tenant features | Filter must never be forgotten; selective-filter performance |
| Partition / namespace per tenant | Engine-level partitions in one index or table | Stronger: queries target one partition | Most B2B products | Per-partition overhead; many tiny partitions |
| Index or collection per tenant | Separate index per customer | Strong | Few large tenants, contractual isolation | Operations multiply with tenant count |
| Database or cluster per tenant | Fully separate deployment | Strongest, separate keys and regions | Regulated or very large customers | Highest cost and operational load |

Vendor guidance, as documented (checked October 2026): Pinecone recommends one namespace per tenant in a serverless index and notes that deleting a namespace offboards a tenant; Qdrant documents a keyword payload index with \`is_tenant: true\` (added in 1.11) that co-locates each tenant's vectors on disk. Third-party writeups stress that Qdrant's tenant flag is a storage and speed hint, not an authorization rule; that is a secondary source, but it matches the general principle: **performance features do not replace the filter.**

Postgres gives a second line of defence: row-level security makes the database itself add the tenant predicate (not run here):

~~~sql
-- not run here
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_only ON chunks
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
-- per request, inside the transaction:
SET LOCAL app.tenant_id = '6f1c...';
~~~

With \`current_setting(..., true)\` an unset tenant yields NULL and the policy matches nothing, so a forgotten setting fails closed. Table owners bypass RLS unless it is forced, and the application should not connect as the owner.

## 6. Where the Filter Comes From

The second part of the example has a user \`u1\` from acme whose request body carries \`filter: { tenant: "globex" }\`, the way a modified client or a confused agent might send it:

~~~text
2) where the filter comes from (user u1 belongs to acme, groups: all)
   filter from request body: ids 1668, 1754, 311, 1836, 1550  tenants globex  <- leak
   filter from session:      ids 1579, 1893, 182, 1343, 729  tenants acme
   acme chunks: 1417  visible to u1: 920  hidden by ACL: 347  no ACL, denied by default: 150
   if a missing ACL meant allow, u1 could retrieve 1070 chunks (150 never cleared for u1)
~~~

The key part of the safe builder:

~~~js
function fromSession(req) {
  const s = SESSIONS[req.token];
  if (!s) throw new Error("no session");
  return (c) => c.tenant === s.tenant && c.groups !== null && c.groups.some((g) => s.groups.includes(g));
}
~~~

📌 **Interview term: deny by default (fail closed)** — a chunk with no permission metadata is treated as visible to nobody. 150 acme chunks had no ACL; with "missing means allow", they would all have been searchable by every acme user.

📌 **Interview term: ACL (access control list)** — the list of users or groups allowed to read a document, copied onto each of its chunks at indexing time.

Rules that follow:

- **Tenant and groups come from the authenticated session** on the server. Not from request JSON, not from a tool argument the model filled in, not from the question text.
- **Agents use the same path.** A retrieval tool exposed to an agent takes the query only; the tool implementation adds the scope. See [How do you sandbox an agent and enforce least-privilege tool access?](/interview-question/how-do-you-sandbox-an-agent-and-enforce-least-privilege-tool-access)
- **Permissions change.** When someone is removed from a group or a document is restricted, the chunk metadata must be updated; until then the index is stale. For sensitive data, re-check the final few chunks against the source of truth just before building the prompt; the sync risk is shown in [What is a vector database and when do you actually need one?](/interview-question/what-is-a-vector-database-and-when-do-you-actually-need-one)

## 7. Everything Downstream Inherits the Scope

- **Caches.** A [semantic cache](/interview-question/what-is-semantic-caching-and-when-is-it-safe-to-use) keyed only on the question text will hand acme answer text to globex. Include tenant and permission scope in every cache key.
- **Rerankers and hosted models.** Filter *before* sending candidates to a hosted reranker, so another tenant's text never leaves your system attached to this request.
- **Logs and traces.** Retrieved text in logs is customer data; store it with the tenant and apply the same access rules.
- **Hybrid search.** The keyword (BM25) side needs the same filter as the vector side; it is easy to scope one and forget the other.
- **Tests.** Keep an automated test that logs in as tenant A, asks for content only tenant B has, and asserts zero results.

## 8. Verified: Running the Code

The example **"Post-filter vs pre-filter vs iterative scan, and a filter built from the session"** builds 2,000 chunks with seeded random 16-dimension vectors, a tenant drawn with fixed shares, and an ACL that is missing for about 10% of chunks. The "index" is an exact similarity ordering handed out in pages of 40, so the iterative scan here returns exact results; a real HNSW index is approximate and can miss neighbours even when the filter is generous. Sessions are an in-memory map standing in for your authentication layer.

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
1) top 5 for each tenant (index page ef = 40, iterative cap = 400)
   tenant    chunks  share   post-filter  pre-filter (scanned)  iterative (scanned)
   acme        1417  70.8%      5 found     5 found (1417)     5 found (  40)  same as exact
   globex       467  23.4%      5 found     5 found ( 467)     5 found (  40)  same as exact
   initech      108   5.4%      0 found     5 found ( 108)     5 found ( 120)  same as exact
   tiny           8   0.4%      0 found     5 found (   8)     1 found ( 400)

2) where the filter comes from (user u1 belongs to acme, groups: all)
   filter from request body: ids 1668, 1754, 311, 1836, 1550  tenants globex  <- leak
   filter from session:      ids 1579, 1893, 182, 1343, 729  tenants acme
   acme chunks: 1417  visible to u1: 920  hidden by ACL: 347  no ACL, denied by default: 150
   if a missing ACL meant allow, u1 could retrieve 1070 chunks (150 never cleared for u1)

3) routing rule: exact scan when the filtered set is small, index otherwise
   acme  1417 chunks -> iterative index scan: 5 found, 40 scanned, ids 1579, 1633, 881, 1893, 182
   tiny     8 chunks -> exact scan: 5 found, 8 scanned, ids 54, 212, 1412, 1743, 831
~~~

What the run shows:

- Post-filtering returned zero results for the two smallest tenants.
- An iterative scan fixed the mid-size tenant but hit its cap for the tiny one; an exact scan of the small set fixed that.
- A filter taken from the request body returned another tenant's chunks; the session-built filter did not.
- Deny by default kept 150 unlabelled chunks out of reach.

## Edge Cases Worth Knowing

- **Shared documents.** A document shared between two tenants should be indexed twice (once per tenant) or carry a list of tenants; never relax the tenant filter to make sharing work.
- **Tenant deletion.** Offboarding means deleting vectors, cached answers and logged chunks. A partition or namespace per tenant makes this one operation.
- **Noisy neighbours.** One huge tenant re-indexing can slow queries for everyone in a shared index; partitioning or separate indexes contain it.
- **Combined filters.** Tenant plus group plus date can be far more selective than any one of them; test selectivity on real combinations.
- **Admin and support access.** Cross-tenant access for staff must be an explicit, audited path, not a missing filter.

## Common Pitfalls

- **Putting access rules in the prompt.** The model is not a security boundary; enforce scope in retrieval code.
- **Post-filtering an ANN result.** Small tenants get empty or thin results, which looks like a quality bug rather than a filtering bug.
- **Trusting client- or model-supplied filters.** Build the filter from the authenticated session on the server.
- **Treating missing ACLs as public.** Fail closed: no permission data means no access.
- **Forgetting the side doors.** Caches, the keyword index, rerank calls and logs all need the same scope.
- **Never updating permissions in the index.** A user removed from a group can still retrieve what the stale metadata allows.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The rule:</strong> <span style="color:#f0e2c8;">The model can only leak what retrieval puts in its context, so authorization happens at retrieval time, in code. Every chunk carries <strong style="color:#ffca28;">tenant ID</strong> and <strong style="color:#ffca28;">ACL</strong> metadata, and every search applies a filter on them. A system prompt saying <em style="color:#f0e2c8;">do not reveal other customers</em> is not a control.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Where the filter comes from:</strong> <span style="color:#f0e2c8;">The server builds it from the authenticated session, never from request fields, tool arguments the model filled in, or the question. In my demo a filter taken from the request body returned another tenant's chunks; the session-built one could not. Chunks with no ACL are denied by default.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why vector filtering is tricky:</strong> <span style="color:#f0e2c8;">An approximate index walks towards the nearest vectors in the whole collection. <strong style="color:#ffca28;">Post-filtering</strong> the top 40 returned zero results for tenants owning 5.4% and 0.4% of the data. The fix is pre-filtering: filter-aware search, an iterative scan like pgvector 0.8.0 <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hnsw.iterative_scan</code>, or simply an exact scan when the filtered set is small.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Isolation model:</strong> <span style="color:#f0e2c8;">Shared index with a tenant filter for many small tenants; a partition or namespace per tenant for most B2B, which also makes offboarding one delete; a separate index or database for big or regulated customers. Postgres row-level security can add the tenant predicate as a second line of defence.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Side doors:</strong> <span style="color:#f0e2c8;">Caches keyed by tenant, the BM25 side of hybrid search filtered the same way, filtering before any hosted reranker, logs treated as customer data, permission changes synced to the index, and an automated test that tries to read another tenant's data.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Post-filtering is simpler. Why not just ask for more results?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Asking for more helps until the filter is selective enough. A tenant with 0.4% of the data needs, on average, 250 neighbours to find one chunk, and the right number changes per tenant and per query. An iterative scan does this asking-for-more properly with a cap, and an exact scan is better still for tiny sets.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">One index for all tenants or one per tenant?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It depends on tenant count, size skew and contracts. Thousands of small tenants fit a shared index or partitions; a handful of huge or regulated customers justify their own index. Mixed fleets often do both: partitions for the long tail and dedicated indexes for the largest.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle permission changes?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Permission metadata is copied onto chunks, so a change must flow to the index through the same reliable sync as content changes, an outbox or change data capture. For sensitive data I also re-check the final few chunks against the source of truth before building the prompt, which closes the window while sync lags.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about an agent that calls the search tool?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The tool takes the query only. Tenant and groups are bound in the tool implementation from the session of the user the agent acts for, so the model has no argument it could change to widen the scope.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you test tenant isolation?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Seed two tenants with distinctive documents, log in as one and run queries that only the other could answer, and assert zero results from the other tenant. Run it against every retrieval path: vector, keyword, cache, and any agent tools, and keep it in CI.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Retrieval-time authorization | Enforcing access when chunks are fetched, so forbidden text never reaches the model |
| Metadata (payload) filter | Conditions on stored fields applied as part of the vector search |
| Post-filtering | Search first, then drop non-matching results |
| Pre-filtering | Restrict to matching rows before or during the search |
| Filter selectivity | Fraction of the collection that passes the filter |
| Iterative index scan | Keep pulling index candidates until enough pass the filter, up to a cap |
| Multi-tenancy | One system serving many customers with separated data |
| Deny by default (fail closed) | Missing permission data means no access |
| ACL (access control list) | Users or groups allowed to read a document, stored on its chunks |

**Conclusion:** Scoping retrieval is an authorization problem first and a performance problem second. Put tenant and permission metadata on every chunk, build the filter on the server from the authenticated session, deny anything without permission data, and apply the filter inside the search so forbidden text never reaches the model. Then make it fast for every tenant size: post-filtering returned nothing for the two smallest tenants in the simulation, an iterative scan rescued the mid-size one, and an exact scan handled the tiny one. Pick an isolation model (shared with filter, partition or namespace per tenant, or separate indexes) from tenant count, size skew and contractual needs, and carry the same scope into caches, rerankers, keyword search and logs.`,
    examples: [
      {
        label: `Post-filter vs pre-filter vs iterative scan, and a filter built from the session`,
        variants: [
          { tech: "node", code: `// Scoped retrieval: post-filter vs pre-filter vs iterative scan, and where the filter comes from.
let seed = 7;
function rand() { seed = (seed * 48271) % 2147483647; return seed / 2147483647; }
const DIM = 16;
const vec = () => Array.from({ length: DIM }, () => rand() * 2 - 1);
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

// 2,000 chunks shared by four tenants of very different size, each with an ACL.
const CHUNKS = [];
for (let id = 0; id < 2000; id++) {
  const r = rand();
  const tenant = r < 0.7 ? "acme" : r < 0.95 ? "globex" : r < 0.995 ? "initech" : "tiny";
  const g = rand();
  const groups = g < 0.1 ? null : g < 0.75 ? ["all"] : g < 0.9 ? ["hr"] : ["finance", "hr"];
  CHUNKS.push({ id, tenant, groups, v: vec() });
}
const query = vec();
// Stand-in for an ANN index: candidates come out in global similarity order, in pages.
const ORDER = CHUNKS.map((c) => ({ c, s: dot(query, c.v) })).sort((a, b) => b.s - a.s || a.c.id - b.c.id).map((x) => x.c);
const K = 5, EF = 40, MAX_SCAN = 400;

function postFilter(ok) { const page = ORDER.slice(0, EF); return { hits: page.filter(ok).slice(0, K), scanned: EF }; }
function preFilter(ok) { const subset = CHUNKS.filter(ok); const hits = subset.map((c) => ({ c, s: dot(query, c.v) })).sort((a, b) => b.s - a.s || a.c.id - b.c.id).slice(0, K).map((x) => x.c); return { hits, scanned: subset.length }; }
function iterative(ok) {
  const hits = []; let scanned = 0;
  while (hits.length < K && scanned < MAX_SCAN && scanned < ORDER.length) {
    for (const c of ORDER.slice(scanned, scanned + EF)) if (ok(c) && hits.length < K) hits.push(c);
    scanned += EF;
  }
  return { hits, scanned };
}

console.log(\`1) top \${K} for each tenant (index page ef = \${EF}, iterative cap = \${MAX_SCAN})\`);
console.log("   tenant    chunks  share   post-filter  pre-filter (scanned)  iterative (scanned)");
for (const t of ["acme", "globex", "initech", "tiny"]) {
  const ok = (c) => c.tenant === t;
  const n = CHUNKS.filter(ok).length;
  const a = postFilter(ok), b = preFilter(ok), c = iterative(ok);
  const same = b.hits.map((x) => x.id).join() === c.hits.map((x) => x.id).join();
  console.log(\`   \${t.padEnd(8)}  \${String(n).padStart(6)}  \${(n / 20).toFixed(1).padStart(4)}%  \${String(a.hits.length).padStart(5)} found  \${String(b.hits.length).padStart(4)} found (\${String(b.scanned).padStart(4)})  \${String(c.hits.length).padStart(4)} found (\${String(c.scanned).padStart(4)})\${same ? "  same as exact" : ""}\`);
}

console.log("");
console.log("2) where the filter comes from (user u1 belongs to acme, groups: all)");
const SESSIONS = { tok_u1: { user: "u1", tenant: "acme", groups: ["all"] } };
const request = { token: "tok_u1", question: "salary bands", filter: { tenant: "globex" } };
const fromBody = (req) => (c) => c.tenant === req.filter.tenant;
function fromSession(req) {
  const s = SESSIONS[req.token];
  if (!s) throw new Error("no session");
  return (c) => c.tenant === s.tenant && c.groups !== null && c.groups.some((g) => s.groups.includes(g));
}
const unsafe = iterative(fromBody(request)).hits;
const safe = iterative(fromSession(request)).hits;
console.log(\`   filter from request body: ids \${unsafe.map((c) => c.id).join(", ")}  tenants \${[...new Set(unsafe.map((c) => c.tenant))].join(", ")}  <- leak\`);
console.log(\`   filter from session:      ids \${safe.map((c) => c.id).join(", ")}  tenants \${[...new Set(safe.map((c) => c.tenant))].join(", ")}\`);
const acme = CHUNKS.filter((c) => c.tenant === "acme");
const untagged = acme.filter((c) => c.groups === null).length;
const restricted = acme.filter((c) => c.groups !== null && !c.groups.includes("all")).length;
const visible = acme.filter(fromSession(request)).length;
console.log(\`   acme chunks: \${acme.length}  visible to u1: \${visible}  hidden by ACL: \${restricted}  no ACL, denied by default: \${untagged}\`);
const allowIfMissing = acme.filter((c) => c.groups === null || c.groups.includes("all")).length;
console.log(\`   if a missing ACL meant allow, u1 could retrieve \${allowIfMissing} chunks (\${allowIfMissing - visible} never cleared for u1)\`);

console.log("");
console.log("3) routing rule: exact scan when the filtered set is small, index otherwise");
for (const t of ["acme", "tiny"]) {
  const ok = (c) => c.tenant === t;
  const n = CHUNKS.filter(ok).length;
  const r = n < 1000 ? preFilter(ok) : iterative(ok);
  console.log(\`   \${t.padEnd(5)} \${String(n).padStart(4)} chunks -> \${n < 1000 ? "exact scan" : "iterative index scan"}: \${r.hits.length} found, \${r.scanned} scanned, ids \${r.hits.map((c) => c.id).join(", ")}\`);
}` },
          { tech: "python", code: `# Scoped retrieval: post-filter vs pre-filter vs iterative scan, and where the filter comes from.
seed = 7


def rand():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647


DIM = 16


def vec():
    return [rand() * 2 - 1 for _ in range(DIM)]


def dot(a, b):
    s = 0
    for i, x in enumerate(a):
        s += x * b[i]
    return s


# 2,000 chunks shared by four tenants of very different size, each with an ACL.
CHUNKS = []
for cid in range(2000):
    r = rand()
    tenant = "acme" if r < 0.7 else "globex" if r < 0.95 else "initech" if r < 0.995 else "tiny"
    g = rand()
    groups = None if g < 0.1 else ["all"] if g < 0.75 else ["hr"] if g < 0.9 else ["finance", "hr"]
    CHUNKS.append({"id": cid, "tenant": tenant, "groups": groups, "v": vec()})
query = vec()
# Stand-in for an ANN index: candidates come out in global similarity order, in pages.
ORDER = [c for c in sorted(CHUNKS, key=lambda c: (-dot(query, c["v"]), c["id"]))]
K, EF, MAX_SCAN = 5, 40, 400


def post_filter(ok):
    return {"hits": [c for c in ORDER[:EF] if ok(c)][:K], "scanned": EF}


def pre_filter(ok):
    subset = [c for c in CHUNKS if ok(c)]
    hits = sorted(subset, key=lambda c: (-dot(query, c["v"]), c["id"]))[:K]
    return {"hits": hits, "scanned": len(subset)}


def iterative(ok):
    hits, scanned = [], 0
    while len(hits) < K and scanned < MAX_SCAN and scanned < len(ORDER):
        for c in ORDER[scanned:scanned + EF]:
            if ok(c) and len(hits) < K:
                hits.append(c)
        scanned += EF
    return {"hits": hits, "scanned": scanned}


def ids(hits):
    return ", ".join(str(c["id"]) for c in hits)


def tenants(hits):
    seen = []
    for c in hits:
        if c["tenant"] not in seen:
            seen.append(c["tenant"])
    return ", ".join(seen)


print(f"1) top {K} for each tenant (index page ef = {EF}, iterative cap = {MAX_SCAN})")
print("   tenant    chunks  share   post-filter  pre-filter (scanned)  iterative (scanned)")
for t in ["acme", "globex", "initech", "tiny"]:
    ok = lambda c, t=t: c["tenant"] == t
    n = len([c for c in CHUNKS if ok(c)])
    a, b, c = post_filter(ok), pre_filter(ok), iterative(ok)
    same = "  same as exact" if ids(b["hits"]) == ids(c["hits"]) else ""
    print(f"   {t.ljust(8)}  {str(n).rjust(6)}  {f'{n / 20:.1f}'.rjust(4)}%  {str(len(a['hits'])).rjust(5)} found  {str(len(b['hits'])).rjust(4)} found ({str(b['scanned']).rjust(4)})  {str(len(c['hits'])).rjust(4)} found ({str(c['scanned']).rjust(4)}){same}")

print("")
print("2) where the filter comes from (user u1 belongs to acme, groups: all)")
SESSIONS = {"tok_u1": {"user": "u1", "tenant": "acme", "groups": ["all"]}}
request = {"token": "tok_u1", "question": "salary bands", "filter": {"tenant": "globex"}}


def from_body(req):
    return lambda c: c["tenant"] == req["filter"]["tenant"]


def from_session(req):
    s = SESSIONS.get(req["token"])
    if s is None:
        raise ValueError("no session")
    return lambda c: c["tenant"] == s["tenant"] and c["groups"] is not None and any(g in s["groups"] for g in c["groups"])


unsafe = iterative(from_body(request))["hits"]
safe = iterative(from_session(request))["hits"]
print(f"   filter from request body: ids {ids(unsafe)}  tenants {tenants(unsafe)}  <- leak")
print(f"   filter from session:      ids {ids(safe)}  tenants {tenants(safe)}")
acme = [c for c in CHUNKS if c["tenant"] == "acme"]
untagged = len([c for c in acme if c["groups"] is None])
restricted = len([c for c in acme if c["groups"] is not None and "all" not in c["groups"]])
visible = len([c for c in acme if from_session(request)(c)])
print(f"   acme chunks: {len(acme)}  visible to u1: {visible}  hidden by ACL: {restricted}  no ACL, denied by default: {untagged}")
allow_if_missing = len([c for c in acme if c["groups"] is None or "all" in c["groups"]])
print(f"   if a missing ACL meant allow, u1 could retrieve {allow_if_missing} chunks ({allow_if_missing - visible} never cleared for u1)")

print("")
print("3) routing rule: exact scan when the filtered set is small, index otherwise")
for t in ["acme", "tiny"]:
    ok = lambda c, t=t: c["tenant"] == t
    n = len([c for c in CHUNKS if ok(c)])
    r = pre_filter(ok) if n < 1000 else iterative(ok)
    how = "exact scan" if n < 1000 else "iterative index scan"
    print(f"   {t.ljust(5)} {str(n).rjust(4)} chunks -> {how}: {len(r['hits'])} found, {r['scanned']} scanned, ids {ids(r['hits'])}")` },
        ],
      },
    ],
  },
  {
    title: `How would you design a production RAG pipeline end-to-end in 2025-26?`,
    difficulty: "hard",
    seoDescription: `Design a production RAG system: ingestion with hashes and versioned indexes, scoped hybrid search, reranking, cited answers, sizing, latency and evals.`,
    description: `**Question presented to candidate:**
"Design the retrieval-augmented question answering system for our product: about two hundred thousand help-centre articles, contracts and internal docs, used by customers and support agents. Walk me from raw documents to a cited answer on screen, and tell me how you would know it is working."

**What a strong answer should cover:**
- Two paths: an offline ingestion path (connectors, parsing, chunking with context, embedding, metadata and permissions, incremental updates by content hash, deletes, versioned indexes with blue-green re-indexing) and an online query path (query rewrite and routing, scoped hybrid retrieval with fusion, reranking, context packing under a token budget, generation with citations, abstain when nothing is relevant)
- Back-of-envelope numbers stated as assumptions: chunk count, vector memory, embedding cost for a full build and daily changes, queries per second at peak, prompt tokens and generation cost per query, and a per-stage latency budget with streaming
- Security and scope: tenant and permission filters built from the session, retrieved text treated as untrusted (prompt injection), caches and logs scoped the same way
- Quality loop: a labelled eval set with retrieval metrics and answer-level checks (faithfulness, citation validity), traces of every stage per request, and regression runs before changing models, chunking or prompts
- Current practice and its limits: hybrid search plus a reranker as the default retriever, contextual chunk headers, agentic or multi-step retrieval for hard questions, and long context windows as a complement to retrieval rather than a replacement

**Clarifying questions expected:**
- Who are the users, what are the latency and freshness requirements, and how often do documents change?
- Are there per-customer or per-document permissions, and can data be sent to external model APIs?
- What does a good answer look like: short factual replies with citations, or long synthesized reports?

**Code / implementation expected:** Optional — an architecture diagram with numbers is the core; a sketch of incremental ingestion or the query pipeline is a strong addition.`,
    answer: `**Target Audience:** Engineers preparing for an AI or backend system design round who can explain RAG in one sentence and now need to design the whole thing: ingestion, retrieval, generation, numbers, operations and evaluation.
**Difficulty:** Hard
**Verified with:** Node 22.22.0 and Python 3.12.3 (the miniature pipeline and the sizing arithmetic below). Every input to the sizing is a stated assumption, and the prices in it are illustrative placeholders, not a vendor price list. Product facts are cited inline with the date checked (October 2026).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A good reference librarian does two very different jobs. Before the library opens, they catalogue: every new book gets labelled, shelved in the right place, its old edition removed, its restricted volumes put behind the desk. When a visitor arrives, they interview: "what exactly are you trying to find?", go to the right shelves, pull a dozen candidates, skim them, hand over the best three with page numbers, and say "we do not have that" when they do not.

Most RAG demos are only the second job, done once, on ten PDFs. A production system is both jobs, every day, on documents that change, for users who may not see each other's books, with a bill and a latency target. The interview question is whether you can design both halves and say how you would know the answers are right.

The basic idea of RAG and why it beats fine-tuning for knowledge is in [What is RAG and why use it instead of fine-tuning for knowledge?](/interview-question/what-is-rag-and-why-use-it-instead-of-fine-tuning-for-knowledge); this page assumes it.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Who asks, and what does a good answer look like? | Customers want short cited answers; analysts may want long syntheses that need multi-step retrieval |
| How many documents, what formats, how often do they change? | Sizes the index and the ingestion pipeline; scanned PDFs and tables need real parsing |
| Are there tenants or per-document permissions? | Decides metadata, filters and isolation model |
| Latency target, and is streaming acceptable? | Sets the budget for retrieval and reranking before the first token |
| Can data go to an external model API? | Hosted versus self-hosted embedding, reranking and generation |
| How fresh must answers be after a document changes? | Minutes means event-driven ingestion; a day allows a nightly batch |

For the rest of this page, assume: 200,000 documents averaging 2,500 tokens, 1% changing per day, 30,000 questions per day with a 5x peak, per-customer permissions, answers streamed with citations.

## 3. The Shape: Two Paths That Share an Index

📌 **Interview term: ingestion (indexing) pipeline** — the offline path that turns source documents into searchable chunks: fetch, parse, chunk, enrich, embed, store with metadata, and keep it in sync with the sources.

📌 **Interview term: query (serving) pipeline** — the online path that turns a user question into a cited answer: understand the query, retrieve, rerank, assemble context, generate, check.

<svg class="iq-diagram" width="100%" viewBox="0 0 820 200" role="img" aria-label="Ingestion path: sources, parse, chunk and enrich, embed, versioned index">
  <defs>
    <marker id="ai07q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="10" y="50" width="130" height="90" rx="10"/>
  <text class="d-text" x="75" y="88" text-anchor="middle">sources</text>
  <text class="d-sub" x="75" y="114" text-anchor="middle">change events</text>
  <rect class="d-box" x="180" y="50" width="130" height="90" rx="10"/>
  <text class="d-text" x="245" y="88" text-anchor="middle">parse</text>
  <text class="d-sub" x="245" y="114" text-anchor="middle">text, tables</text>
  <rect class="d-box" x="350" y="50" width="130" height="90" rx="10"/>
  <text class="d-text" x="415" y="88" text-anchor="middle">chunk</text>
  <text class="d-sub" x="415" y="114" text-anchor="middle">plus context</text>
  <rect class="d-box" x="520" y="50" width="130" height="90" rx="10"/>
  <text class="d-text" x="585" y="88" text-anchor="middle">embed</text>
  <text class="d-sub" x="585" y="114" text-anchor="middle">by content hash</text>
  <rect class="d-box-accent" x="690" y="50" width="120" height="90" rx="10"/>
  <text class="d-text" x="750" y="88" text-anchor="middle">index v2</text>
  <text class="d-sub" x="750" y="114" text-anchor="middle">with ACLs</text>
  <path class="d-edge" d="M 144 95 L 174 95" marker-end="url(#ai07q4-arrow)"/>
  <path class="d-edge" d="M 314 95 L 344 95" marker-end="url(#ai07q4-arrow)"/>
  <path class="d-edge" d="M 484 95 L 514 95" marker-end="url(#ai07q4-arrow)"/>
  <path class="d-edge" d="M 654 95 L 684 95" marker-end="url(#ai07q4-arrow)"/>
</svg>

The offline path runs continuously on change events, not once. Its output is a versioned index that the online path reads.

<svg class="iq-diagram" width="100%" viewBox="0 0 820 330" role="img" aria-label="Query path: question and session, rewrite and route, hybrid retrieve with filters, rerank, pack context, generate with citations, check and stream">
  <defs>
    <marker id="ai07q4-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="10" y="40" width="160" height="90" rx="10"/>
  <text class="d-text" x="90" y="78" text-anchor="middle">question</text>
  <text class="d-sub" x="90" y="104" text-anchor="middle">plus session</text>
  <rect class="d-box" x="230" y="40" width="160" height="90" rx="10"/>
  <text class="d-text" x="310" y="78" text-anchor="middle">rewrite</text>
  <text class="d-sub" x="310" y="104" text-anchor="middle">and route</text>
  <rect class="d-box" x="450" y="40" width="160" height="90" rx="10"/>
  <text class="d-text" x="530" y="78" text-anchor="middle">hybrid search</text>
  <text class="d-sub" x="530" y="104" text-anchor="middle">scoped by filter</text>
  <rect class="d-box-accent" x="650" y="40" width="160" height="90" rx="10"/>
  <text class="d-text" x="730" y="78" text-anchor="middle">rerank</text>
  <text class="d-sub" x="730" y="104" text-anchor="middle">top 50 to top 6</text>
  <rect class="d-box" x="650" y="210" width="160" height="90" rx="10"/>
  <text class="d-text" x="730" y="248" text-anchor="middle">pack context</text>
  <text class="d-sub" x="730" y="274" text-anchor="middle">token budget</text>
  <rect class="d-box" x="410" y="210" width="180" height="90" rx="10"/>
  <text class="d-text" x="500" y="248" text-anchor="middle">generate</text>
  <text class="d-sub" x="500" y="274" text-anchor="middle">with citations</text>
  <rect class="d-box-muted" x="170" y="210" width="180" height="90" rx="10"/>
  <text class="d-text" x="260" y="248" text-anchor="middle">check, stream</text>
  <text class="d-sub" x="260" y="274" text-anchor="middle">or abstain</text>
  <path class="d-edge" d="M 174 85 L 224 85" marker-end="url(#ai07q4-arrow2)"/>
  <path class="d-edge" d="M 394 85 L 444 85" marker-end="url(#ai07q4-arrow2)"/>
  <path class="d-edge" d="M 614 85 L 644 85" marker-end="url(#ai07q4-arrow2)"/>
  <path class="d-edge" d="M 730 134 L 730 204" marker-end="url(#ai07q4-arrow2)"/>
  <path class="d-edge" d="M 646 255 L 596 255" marker-end="url(#ai07q4-arrow2)"/>
  <path class="d-edge" d="M 406 255 L 356 255" marker-end="url(#ai07q4-arrow2)"/>
</svg>

Every arrow in the query path is a place to log: what went in, what came out, how long it took. Those traces are how you debug it later.

## 4. Back-of-Envelope Numbers

📌 **Interview term: capacity estimate** — rough sizing from stated assumptions, done before choosing infrastructure, so that "do we need a vector database cluster?" is answered by arithmetic.

The example **"Back-of-envelope sizing: index memory, embedding cost, query load and generation cost"** computes it from the assumptions in section 2, plus: 500-token chunks with 50 tokens of overlap, 1,024-dimension float32 vectors, HNSW with \`m = 16\`, 6 chunks and 400 tokens of chat history per prompt, 350 output tokens, and **illustrative** prices of $0.02 per million embedding tokens, $3 per million input tokens and $15 per million output tokens (placeholders; look up current prices for the models you choose):

~~~text
1) index size
   chunks per doc  ceil((2500 - 50) / 450) = 6
   total chunks    1,200,000
   vectors         1,200,000 x 1024 x 4 B = 4.92 GB
   graph links     1,200,000 x 32 x 4 B = 0.15 GB
   chunk text      1,200,000 x 500 x 4 B = 2.40 GB
~~~

About 5 GB of vectors fits in memory on one machine; a single Postgres with pgvector or one node of a dedicated engine is enough, with a replica for availability. Whether a separate vector database is needed at all is its own question: [What is a vector database and when do you actually need one?](/interview-question/what-is-a-vector-database-and-when-do-you-actually-need-one)

~~~text
3) query load and generation cost
   average 0.347 qps, peak x5 = 1.74 qps
   rerank pairs    1,500,000 per day
   prompt tokens   500 + 6 x 500 + 40 + 400 = 3,940 in, 350 out
   per query       $0.01707   per day $512.10   per 30 days $15,363
   with 3 chunks   2,440 in -> per 30 days $11,313 (26.4% less)
~~~

Two conclusions an interviewer looks for: query load is tiny (under 2 queries per second at peak), so the bottleneck is model latency and cost, not throughput; and **generation dominates the bill**, while embedding the whole corpus costs about $12 at the placeholder price. Retrieval quality is also a cost lever: a reranker good enough to send 3 chunks instead of 6 cut the illustrative bill by 26.4%. [How do you estimate and control LLM costs in production?](/interview-question/how-do-you-estimate-and-control-llm-costs-in-production) goes further.

A latency budget, with every number an **assumption** to replace with measurements:

| Stage | Budget (p50, assumed) | Notes |
| :--- | :--- | :--- |
| Query rewrite (small model) | 300 ms | Only when there is chat history or routing to do |
| Query embedding | 30 ms | One short text |
| Hybrid search + fusion | 50 ms | Vector and BM25 in parallel |
| Rerank 50 candidates | 100 ms | With a timeout and fallback |
| Time to first token | 500 to 1,000 ms | Depends on model and prompt size |
| Streaming the answer | several seconds | The user is already reading |

Streaming hides generation time but not anything before the first token, which is why retrieval and reranking have tight budgets. See [What techniques reduce LLM latency at each stage of a request?](/interview-question/what-techniques-reduce-llm-latency-at-each-stage-of-a-request)

## 5. The Ingestion Path in Detail

- **Connectors and change events.** Pull from the CMS, drive, ticketing system; prefer change notifications or change data capture over nightly full crawls, so edits and deletes arrive within minutes.
- **Parsing.** The quietest source of bad answers. PDFs with columns, tables, headers and scanned pages need a real parser (and OCR); keep headings and table structure as text the model can read.
- **Chunking with context.** Split by structure (headings, paragraphs) to a target size; details and trade-offs are in [Chunking in RAG: how do you pick size, overlap, and strategy?](/interview-question/chunking-in-rag-how-do-you-pick-size-overlap-and-strategy)

📌 **Interview term: contextual chunk header** — a short line prepended to each chunk before embedding and keyword indexing (document title, section path, or a model-written sentence situating the chunk), so a chunk like "the fee is waived after 60 days" still says which product and which fee. Anthropic's *Contextual Retrieval* post (checked October 2026) reports top-20 retrieval failures dropping from 5.7% to 2.9% with contextual embeddings plus contextual BM25 on their benchmark, and to 1.9% with reranking added; one vendor's measurement on its own data.

- **Metadata and permissions.** Tenant, ACL groups, source URL, document version, language, updated date, on every chunk; see [How do you scope retrieval with metadata filtering and multi-tenancy?](/interview-question/how-do-you-scope-retrieval-with-metadata-filtering-and-multi-tenancy)
- **Incremental updates.**

📌 **Interview term: content hash (idempotent ingestion)** — a hash of each chunk text, stored with it. Re-ingesting a document only re-embeds chunks whose hash changed, deletes chunks that no longer exist, and is safe to run twice.

The miniature pipeline in the example ingests four documents, then re-ingests after one edit (30 days became 45), one deletion and one new document:

~~~text
1) ingest, then re-ingest after edits
   index v1: upserted 7, unchanged 0, deleted 0, embed calls 7, chunks 7
   index v2: upserted 4, unchanged 4, deleted 1, embed calls 4, chunks 8
~~~

Four unchanged chunks cost nothing; the deleted promo chunk is gone, so it cannot be retrieved. The key part:

~~~js
if (index.chunks.get(id)?.hash === h) { kept++; return; }
if (!vectorCache.has(h)) vectorCache.set(h, embed(text));
~~~

📌 **Interview term: blue-green re-index** — when the embedding model or chunking changes, every vector must be rebuilt. Build the new index alongside the old one, evaluate it on the eval set, then switch reads with a pointer flip, keeping the old one for rollback. Vectors from two embedding models must never be mixed in one index.

## 6. The Query Path in Detail

- **Query understanding.** Rewrite follow-ups into standalone questions using chat history ("and for enterprise?" becomes "what is the refund window for enterprise customers?"), detect the language, and route: some questions need no retrieval, some need a database lookup or a tool instead.
- **Scoped hybrid retrieval.** Vector and BM25 search in parallel, both with the session-built filter, fused with reciprocal rank fusion; see [Hybrid search: why combine BM25 with vectors and how does RRF work?](/interview-question/hybrid-search-why-combine-bm25-with-vectors-and-how-does-rrf-work)
- **Rerank** the top 50 or so down to a handful, with a score floor and a timeout fallback; see [Reranking in RAG: when and how to add a cross-encoder?](/interview-question/reranking-in-rag-when-and-how-to-add-a-cross-encoder)
- **Pack the context** under a token budget: best chunks first, deduplicated, each labelled with an ID the model must cite.
- **Generate** with instructions to answer only from the provided sources, cite chunk IDs, and say so when the sources do not contain the answer.
- **Check** before or while streaming: every cited ID must be one that was actually provided; optionally a cheap faithfulness check on high-stakes answers.

📌 **Interview term: abstention** — deliberately answering "I do not know based on the documents" when retrieval finds nothing relevant, instead of letting the model guess.

The example runs three questions against index v2. The refund question shows the whole chain, including why one retriever is not enough (the vector side ranked an *express shipping* chunk first):

~~~text
   Q: How many days do I have to get a refund?
     bm25   refund#0 returns#1 shipping#1
     vector shipping#1 refund#0 refund#1
     rrf    refund#0=3.252 shipping#1=3.227 returns#1=3.175 refund#1=3.150
     rerank refund#0=1.000 refund#1=0.500 returns#1=0.500 shipping#0=0.500 shipping#1=0.500
     packed refund#0 (8 of 12 budget units)
     answer "Refunds are available within 45 days of purchase [refund#0]"  citations valid: true  index v2
~~~

The answer says 45 days, the edited value, because ingestion replaced the old chunk. RRF scores are printed multiplied by 100. A question the documents cannot answer gets nothing past the floor and an abstention:

~~~text
   Q: Do you ship to Mars?
     bm25   -
     vector warranty#0 shipping#0 returns#1
     rrf    warranty#0=1.639 shipping#0=1.613 returns#1=1.587 warranty#1=1.563
     rerank nothing above floor 0.500
     packed - (0 of 12 budget units)
     answer "I do not know based on the documents."  citations valid: true  index v2
~~~

The vector search still returned three "nearest" chunks; without the floor they would have gone into the prompt.

What a real generation call looks like with one SDK (not run here; the Vercel AI SDK \`generateText\` with \`model\`, \`system\` and \`prompt\` fields, checked against the AI SDK documentation, October 2026):

~~~ts
// not run here: needs the ai package, a provider package and an API key
import { generateText } from "ai";

const context = packed.map((c) => \`[\${c.id}] \${c.title}\\n\${c.text}\`).join("\\n\\n");
const { text } = await generateText({
  model,                                   // e.g. an OpenAI or Anthropic provider model
  system: "Answer only from the sources. Cite source ids in brackets. If the sources do not answer, say you do not know.",
  prompt: \`Sources:\\n\${context}\\n\\nQuestion: \${question}\`,
});
~~~

## 7. Security: Retrieved Text Is Untrusted Input

- **Scope** every retrieval path with the session-derived filter, including the keyword index and caches.
- **Prompt injection through documents.** A retrieved page can contain "ignore your instructions and ...". Keep instructions in the system prompt, mark sources as data, never give the generation step tools with side effects based only on retrieved text; see [What is prompt injection and how do you defend against it?](/interview-question/what-is-prompt-injection-and-how-do-you-defend-against-it)
- **PII.** Decide what may be sent to external APIs and logged; see [How do you handle PII and sensitive data when calling LLM APIs?](/interview-question/how-do-you-handle-pii-and-sensitive-data-when-calling-llm-apis)

## 8. Evaluation and Observability

📌 **Interview term: golden (eval) set** — a few hundred real questions with known answer chunks and reference answers, covering easy, hard, multi-part and unanswerable cases.

Measure each stage separately so a drop can be located: retrieval recall at depth and MRR or nDCG after reranking; answer-level faithfulness (does the answer follow from the sources), citation validity and correctness; abstention rate on unanswerable questions. Run it before every change to models, chunking, prompts or depth. In production, trace every request (question, rewritten query, filter, retrieved IDs with scores, reranked IDs, packed IDs, model, prompt version, latency per stage, answer, citations) and track user feedback.

Detail lives in sibling pages: [How do you evaluate a RAG pipeline end to end?](/interview-question/how-do-you-evaluate-a-rag-pipeline-end-to-end), [How do you build a golden dataset for evaluating an LLM feature?](/interview-question/how-do-you-build-a-golden-dataset-for-evaluating-an-llm-feature) and [What should you log and trace in an LLM application?](/interview-question/what-should-you-log-and-trace-in-an-llm-application). When answers go wrong, the triage method is in [What are common RAG failure modes and how do you debug them?](/interview-question/what-are-common-rag-failure-modes-and-how-do-you-debug-them)

## 9. What Is Different in 2025-26

Framed as practice trends rather than measured facts:

- **Hybrid plus rerank is the default retriever**, not an optimisation; pure vector search is the prototype.
- **Contextual chunks** (headers or model-written context) are common, because chunks on their own lose what document they came from.
- **Agentic retrieval.** For multi-hop or research-style questions, the model is given a search tool and decides what to search next, in a loop with a step budget (see [What is an AI agent and how does the agent loop work?](/interview-question/what-is-an-ai-agent-and-how-does-the-agent-loop-work)). It costs more latency and tokens, so route only hard questions there.
- **Long context windows complement retrieval.** Large windows let you send more context or whole documents for small corpora, but cost scales with input tokens and models use the middle of long inputs less reliably (Liu et al., *Lost in the Middle*, TACL 2024). See [Context windows in 2025-26: how do you use 128k-1M tokens without drowning?](/interview-question/context-windows-in-2025-26-how-do-you-use-128k-1m-tokens-without-drowning)
- **Evaluation is part of the product**, run in CI like tests.

## 10. Verified: Running the Code

Two examples, each run in Node and Python with identical output.

**"Miniature RAG pipeline: incremental ingest, hybrid retrieval, rerank, packing, citations"** keeps the index in a \`Map\` (dict in Python) standing in for a vector store, uses a 16-number hashing trick as a stub embedding model, a real BM25 formula over the chunks, RRF with k = 60, a term-coverage reranker standing in for a cross-encoder, a 12-unit context budget, and a fake LLM that answers by quoting the first packed chunk with its citation. It leaves out real models, persistence, concurrency and failures.

\`node pipeline.js\` and \`python3.12 pipeline.py\` both print exactly this:

~~~text
1) ingest, then re-ingest after edits
   index v1: upserted 7, unchanged 0, deleted 0, embed calls 7, chunks 7
   index v2: upserted 4, unchanged 4, deleted 1, embed calls 4, chunks 8

2) queries against index v2
   Q: How many days do I have to get a refund?
     bm25   refund#0 returns#1 shipping#1
     vector shipping#1 refund#0 refund#1
     rrf    refund#0=3.252 shipping#1=3.227 returns#1=3.175 refund#1=3.150
     rerank refund#0=1.000 refund#1=0.500 returns#1=0.500 shipping#0=0.500 shipping#1=0.500
     packed refund#0 (8 of 12 budget units)
     answer "Refunds are available within 45 days of purchase [refund#0]"  citations valid: true  index v2
   Q: Is water damage covered by the warranty?
     bm25   warranty#1 warranty#0
     vector warranty#1 warranty#0 shipping#0
     rrf    warranty#1=3.279 warranty#0=3.226 shipping#0=1.587 returns#1=1.563
     rerank warranty#1=0.750
     packed warranty#1 (5 of 12 budget units)
     answer "Water damage is not covered [warranty#1]"  citations valid: true  index v2
   Q: Do you ship to Mars?
     bm25   -
     vector warranty#0 shipping#0 returns#1
     rrf    warranty#0=1.639 shipping#0=1.613 returns#1=1.587 warranty#1=1.563
     rerank nothing above floor 0.500
     packed - (0 of 12 budget units)
     answer "I do not know based on the documents."  citations valid: true  index v2
~~~

**"Back-of-envelope sizing: index memory, embedding cost, query load and generation cost"** is pure arithmetic over the assumptions object at the top of the program; change them and re-run.

\`node capacity.js\` and \`python3.12 capacity.py\` both print exactly this:

~~~text
1) index size
   chunks per doc  ceil((2500 - 50) / 450) = 6
   total chunks    1,200,000
   vectors         1,200,000 x 1024 x 4 B = 4.92 GB
   graph links     1,200,000 x 32 x 4 B = 0.15 GB
   chunk text      1,200,000 x 500 x 4 B = 2.40 GB

2) embedding cost
   full build      600,000,000 tokens = $12.00
   daily changes   6,000,000 tokens = $0.12 per day

3) query load and generation cost
   average 0.347 qps, peak x5 = 1.74 qps
   rerank pairs    1,500,000 per day
   prompt tokens   500 + 6 x 500 + 40 + 400 = 3,940 in, 350 out
   per query       $0.01707   per day $512.10   per 30 days $15,363
   with 3 chunks   2,440 in -> per 30 days $11,313 (26.4% less)
~~~

What the runs show:

- Content hashes made re-ingestion re-embed only the 4 changed or new chunks and delete the removed one.
- Keyword and vector search disagreed on the refund question; fusion and reranking put the right chunk first.
- A floor turned an unanswerable question into an abstention, and citations were checked against the packed context.
- At this scale the index fits on one machine, peak load is under 2 queries per second, and generation tokens dominate cost.

## Common Pitfalls

- **Designing only the query path.** Ingestion (parsing, updates, deletes, permissions) is where many production failures start.
- **No versioning.** Changing the embedding model or chunking in place mixes incompatible vectors; build a new index and switch.
- **Post-filtering for permissions or trusting client-side filters.** Scope must come from the session and be applied inside retrieval.
- **Always sending context.** Without a relevance floor, unanswerable questions get irrelevant context and confident wrong answers.
- **No eval set before launch.** Without labelled questions you cannot tell whether a change to chunking or the reranker helped.
- **Ignoring the cost split.** Generation tokens, not embeddings or the vector store, are usually the largest bill; fewer, better chunks are a cost lever.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify and size:</strong> <span style="color:#f0e2c8;">I would ask who the users are, the latency target, how often documents change, and whether there are tenants or per-document permissions. Then size it: 200,000 docs of 2,500 tokens is about 1.2 million chunks, roughly 5 GB of 1,024-dimension vectors, under 2 queries per second at peak. One machine holds the index; model latency and cost are the real constraints.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Ingestion path:</strong> <span style="color:#f0e2c8;">Change events from the sources, a real parser for PDFs and tables, structure-aware chunks with a <strong style="color:#ffca28;">contextual header</strong>, tenant and ACL metadata on every chunk, and a <strong style="color:#ffca28;">content hash</strong> per chunk so re-ingestion only re-embeds what changed and deletes what is gone. Model or chunking changes go through a <strong style="color:#ffca28;">blue-green re-index</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Query path:</strong> <span style="color:#f0e2c8;">Rewrite follow-ups into standalone questions and route, run vector and BM25 search in parallel with a filter built from the session, fuse with RRF, rerank the top 50 down to about 6 with a score floor and a timeout fallback, pack them under a token budget with IDs, and generate with instructions to cite and to abstain.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Safety and checks:</strong> <span style="color:#f0e2c8;">Retrieved text is untrusted, so instructions stay in the system prompt and generation has no side-effect tools. Citations are checked against what was actually sent. Unanswerable questions get <em style="color:#f0e2c8;">I do not know</em>, not the nearest neighbours of nonsense.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Evaluation and operations:</strong> <span style="color:#f0e2c8;">A golden set with per-stage metrics, recall at depth, nDCG after rerank, faithfulness and citation validity, run before every change. Per-request traces of every stage, a per-stage latency budget with streaming, and cost tracked per query, where generation tokens dominate.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just put all the documents in a 1M-token context window?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For 200,000 documents it does not fit, and even for corpora that do, every question would pay for the whole input in tokens and latency, and models use the middle of long inputs less reliably. Long context is great for sending a few whole documents after retrieval, not for replacing retrieval.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a document that changes?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The change event triggers re-ingestion of that document. Chunks are hashed, so unchanged chunks are skipped, changed ones re-embedded and removed ones deleted. In my demo, editing one policy and deleting another re-embedded 4 chunks, kept 4 and deleted 1, and the next answer used the new 45-day value.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would you change for multi-hop questions?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Route them to an agentic retrieval loop: the model gets a search tool and decides what to search next, with a step and token budget. Alternatively decompose the question into sub-queries up front. It costs more latency, so only questions classified as complex go there.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where does most of the cost go?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Generation. With my illustrative prices, embedding the full corpus was about $12 but generation was around $512 per day at 30,000 queries. So the levers are fewer, better chunks, which a good reranker enables, prompt caching for the fixed system prompt, and a smaller model for easy questions.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you roll out a new embedding model?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Build a new index next to the old one with the new model, run the eval set against both, then switch reads with a pointer flip and keep the old index for rollback. Never mix vectors from two models in one index, because their spaces are not comparable.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Ingestion (indexing) pipeline | Offline path from source documents to searchable chunks, kept in sync |
| Query (serving) pipeline | Online path from a question to a cited answer |
| Capacity estimate | Sizing from stated assumptions before choosing infrastructure |
| Contextual chunk header | Title or context sentence prepended to each chunk before indexing |
| Content hash (idempotent ingestion) | Hash per chunk so only changed text is re-embedded |
| Blue-green re-index | Build a new index next to the old, evaluate, then switch reads |
| Abstention | Answering that the documents do not contain the answer |
| Golden (eval) set | Labelled questions with known answer chunks and reference answers |

**Conclusion:** A production RAG pipeline is two systems sharing a versioned index. The ingestion path parses real documents, chunks them with context, attaches tenant and permission metadata, and stays in sync through content hashes, deletes and blue-green re-indexing. The query path rewrites and routes the question, runs scoped hybrid search, reranks, packs a few cited chunks under a token budget, generates, checks citations and abstains when nothing is relevant. Size it with explicit assumptions (here about 5 GB of vectors, under 2 queries per second at peak, generation dominating cost), give each stage a latency budget, and treat the eval set and per-stage traces as part of the design, because they are how you will know it works and find out why when it does not.`,
    examples: [
      {
        label: `Miniature RAG pipeline: incremental ingest, hybrid retrieval, rerank, packing, citations`,
        variants: [
          { tech: "node", code: `// A miniature production RAG pipeline: incremental ingest, hybrid retrieval, rerank, pack, cite, check.
const STOP = new Set(["a", "the", "is", "are", "of", "to", "do", "i", "have", "we", "by", "in", "from", "go", "how", "many", "get", "only", "has", "not"]);
const terms = (t) => t.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(" ").filter((w) => w && !STOP.has(w)).map((w) => (w.endsWith("s") && w.length > 3 ? w.slice(0, -1) : w));
function hash(s) { let h = 5381; for (const c of s) h = (h * 33 + c.charCodeAt(0)) % 4294967296; return h.toString(16).padStart(8, "0"); }
const DIM = 16;
let embedCalls = 0;
function embed(t) { // stub embedding model: hashing trick, unit length
  embedCalls++;
  const v = new Array(DIM).fill(0);
  for (const w of terms(t)) { let h = 0; for (const c of w) h = (h * 31 + c.charCodeAt(0)) % 1000003; v[h % DIM] += 1; }
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}
const f3 = (x) => (Math.floor(x * 1000 + 0.5) / 1000).toFixed(3);

const index = { version: 0, chunks: new Map() }; // chunk id -> { doc, text, hash, v }
const vectorCache = new Map(); // content hash -> vector, so unchanged text is never re-embedded
function ingest(docs) {
  const before = embedCalls, seen = new Set();
  let added = 0, kept = 0, removed = 0;
  for (const [doc, body] of Object.entries(docs)) {
    body.split(". ").map((s) => s.replace(/\\.$/, "")).forEach((text, n) => {
      const id = \`\${doc}#\${n}\`, h = hash(text);
      seen.add(id);
      if (index.chunks.get(id)?.hash === h) { kept++; return; }
      if (!vectorCache.has(h)) vectorCache.set(h, embed(text));
      index.chunks.set(id, { doc, text, hash: h, v: vectorCache.get(h) });
      added++;
    });
  }
  for (const id of [...index.chunks.keys()]) if (!seen.has(id)) { index.chunks.delete(id); removed++; }
  index.version++;
  console.log(\`   index v\${index.version}: upserted \${added}, unchanged \${kept}, deleted \${removed}, embed calls \${embedCalls - before}, chunks \${index.chunks.size}\`);
}

function bm25(q) {
  const ids = [...index.chunks.keys()], N = ids.length;
  const toks = new Map(ids.map((id) => [id, terms(index.chunks.get(id).text)]));
  const avg = ids.reduce((s, id) => s + toks.get(id).length, 0) / N;
  return ids.map((id) => {
    const t = toks.get(id); let s = 0;
    for (const w of new Set(terms(q))) {
      const df = ids.filter((x) => toks.get(x).includes(w)).length, tf = t.filter((x) => x === w).length;
      if (tf) s += Math.log(1 + (N - df + 0.5) / (df + 0.5)) * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * t.length / avg));
    }
    return { id, s };
  }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s || (a.id < b.id ? -1 : 1));
}
function dense(q) {
  const qv = embed(q);
  return [...index.chunks].map(([id, c]) => ({ id, s: c.v.reduce((s, x, i) => s + x * qv[i], 0) })).sort((a, b) => b.s - a.s || (a.id < b.id ? -1 : 1));
}
function rrf(lists, k = 60) {
  const score = new Map();
  for (const l of lists) l.slice(0, 5).forEach((x, r) => score.set(x.id, (score.get(x.id) || 0) + 1 / (k + r + 1)));
  return [...score].map(([id, s]) => ({ id, s })).sort((a, b) => b.s - a.s || (a.id < b.id ? -1 : 1));
}
const rerank = (q, cands) => cands.map((c) => { const qt = terms(q), dt = new Set(terms(index.chunks.get(c.id).text)); return { id: c.id, s: qt.filter((w) => dt.has(w)).length / qt.length }; }).sort((a, b) => b.s - a.s || (a.id < b.id ? -1 : 1));
const fakeLlm = (context) => context.length ? \`\${context[0].text} [\${context[0].id}]\` : "I do not know based on the documents.";

function ask(q) {
  console.log(\`   Q: \${q}\`);
  const lex = bm25(q), vec = dense(q), fused = rrf([lex, vec]);
  console.log(\`     bm25   \${lex.slice(0, 3).map((x) => x.id).join(" ") || "-"}\`);
  console.log(\`     vector \${vec.slice(0, 3).map((x) => x.id).join(" ")}\`);
  console.log(\`     rrf    \${fused.slice(0, 4).map((x) => \`\${x.id}=\${f3(x.s * 100)}\`).join(" ")}\`);
  const ranked = rerank(q, fused).filter((x) => x.s >= 0.5);
  console.log(\`     rerank \${ranked.map((x) => \`\${x.id}=\${f3(x.s)}\`).join(" ") || "nothing above floor 0.500"}\`);
  const context = []; let used = 0;
  for (const x of ranked) { const c = index.chunks.get(x.id), cost = terms(c.text).length + 2; if (used + cost > 12) break; used += cost; context.push({ id: x.id, text: c.text }); }
  console.log(\`     packed \${context.map((c) => c.id).join(" ") || "-"} (\${used} of 12 budget units)\`);
  const answer = fakeLlm(context), cited = [...answer.matchAll(/\\[([a-z]+#\\d+)\\]/g)].map((m) => m[1]);
  const valid = cited.every((id) => context.some((c) => c.id === id));
  console.log(\`     answer "\${answer}"  citations valid: \${valid}  index v\${index.version}\`);
}

console.log("1) ingest, then re-ingest after edits");
ingest({ refund: "Refunds are available within 30 days of purchase. After 30 days we offer store credit only.", shipping: "Standard shipping takes 3 to 5 business days. Express shipping arrives next day.", warranty: "Hardware has a 1 year warranty. Water damage is not covered.", promo: "Free shipping on all orders in March 2024." });
ingest({ refund: "Refunds are available within 45 days of purchase. After 45 days we offer store credit only.", shipping: "Standard shipping takes 3 to 5 business days. Express shipping arrives next day.", warranty: "Hardware has a 1 year warranty. Water damage is not covered.", returns: "Start a return from the Orders page. Refunds go to the original card." });
console.log("");
console.log("2) queries against index v2");
ask("How many days do I have to get a refund?");
ask("Is water damage covered by the warranty?");
ask("Do you ship to Mars?");` },
          { tech: "python", code: `# A miniature production RAG pipeline: incremental ingest, hybrid retrieval, rerank, pack, cite, check.
import math
import re

STOP = {"a", "the", "is", "are", "of", "to", "do", "i", "have", "we", "by", "in", "from", "go", "how", "many", "get", "only", "has", "not"}


def terms(t):
    ws = [w for w in re.sub(r"[^a-z0-9 ]", " ", t.lower()).split(" ") if w and w not in STOP]
    return [w[:-1] if w.endswith("s") and len(w) > 3 else w for w in ws]


def chash(s):
    h = 5381
    for c in s:
        h = (h * 33 + ord(c)) % 4294967296
    return f"{h:08x}"


DIM = 16
embed_calls = 0


def embed(t):  # stub embedding model: hashing trick, unit length
    global embed_calls
    embed_calls += 1
    v = [0.0] * DIM
    for w in terms(t):
        h = 0
        for c in w:
            h = (h * 31 + ord(c)) % 1000003
        v[h % DIM] += 1
    n = math.sqrt(sum(x * x for x in v)) or 1
    return [x / n for x in v]


def f3(x):
    return f"{math.floor(x * 1000 + 0.5) / 1000:.3f}"


index = {"version": 0, "chunks": {}}  # chunk id -> {doc, text, hash, v}
vector_cache = {}  # content hash -> vector, so unchanged text is never re-embedded


def ingest(docs):
    before, seen = embed_calls, set()
    added = kept = removed = 0
    for doc, body in docs.items():
        for n, text in enumerate(re.sub(r"\\.$", "", s) for s in body.split(". ")):
            cid, h = f"{doc}#{n}", chash(text)
            seen.add(cid)
            if cid in index["chunks"] and index["chunks"][cid]["hash"] == h:
                kept += 1
                continue
            if h not in vector_cache:
                vector_cache[h] = embed(text)
            index["chunks"][cid] = {"doc": doc, "text": text, "hash": h, "v": vector_cache[h]}
            added += 1
    for cid in list(index["chunks"]):
        if cid not in seen:
            del index["chunks"][cid]
            removed += 1
    index["version"] += 1
    print(f"   index v{index['version']}: upserted {added}, unchanged {kept}, deleted {removed}, embed calls {embed_calls - before}, chunks {len(index['chunks'])}")


def ranked(items):
    return sorted(items, key=lambda x: (-x["s"], x["id"]))


def bm25(q):
    ids = list(index["chunks"])
    N = len(ids)
    toks = {cid: terms(index["chunks"][cid]["text"]) for cid in ids}
    avg = sum(len(toks[cid]) for cid in ids) / N
    out = []
    for cid in ids:
        t, s = toks[cid], 0
        for w in dict.fromkeys(terms(q)):
            df = len([x for x in ids if w in toks[x]])
            tf = t.count(w)
            if tf:
                s += math.log(1 + (N - df + 0.5) / (df + 0.5)) * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * len(t) / avg))
        out.append({"id": cid, "s": s})
    return ranked([x for x in out if x["s"] > 0])


def dense(q):
    qv = embed(q)
    out = []
    for cid, c in index["chunks"].items():
        s = 0
        for i, x in enumerate(c["v"]):
            s += x * qv[i]
        out.append({"id": cid, "s": s})
    return ranked(out)


def rrf(lists, k=60):
    score = {}
    for lst in lists:
        for r, x in enumerate(lst[:5]):
            score[x["id"]] = score.get(x["id"], 0) + 1 / (k + r + 1)
    return ranked([{"id": cid, "s": s} for cid, s in score.items()])


def rerank(q, cands):
    out = []
    for c in cands:
        qt, dt = terms(q), set(terms(index["chunks"][c["id"]]["text"]))
        out.append({"id": c["id"], "s": len([w for w in qt if w in dt]) / len(qt)})
    return ranked(out)


def fake_llm(context):
    return f"{context[0]['text']} [{context[0]['id']}]" if context else "I do not know based on the documents."


def ask(q):
    print(f"   Q: {q}")
    lex, vec = bm25(q), dense(q)
    fused = rrf([lex, vec])
    print(f"     bm25   {' '.join(x['id'] for x in lex[:3]) or '-'}")
    print(f"     vector {' '.join(x['id'] for x in vec[:3])}")
    print(f"     rrf    {' '.join(x['id'] + '=' + f3(x['s'] * 100) for x in fused[:4])}")
    kept = [x for x in rerank(q, fused) if x["s"] >= 0.5]
    print(f"     rerank {' '.join(x['id'] + '=' + f3(x['s']) for x in kept) or 'nothing above floor 0.500'}")
    context, used = [], 0
    for x in kept:
        c = index["chunks"][x["id"]]
        cost = len(terms(c["text"])) + 2
        if used + cost > 12:
            break
        used += cost
        context.append({"id": x["id"], "text": c["text"]})
    print(f"     packed {' '.join(c['id'] for c in context) or '-'} ({used} of 12 budget units)")
    answer = fake_llm(context)
    cited = re.findall(r"\\[([a-z]+#\\d+)\\]", answer)
    valid = all(any(c["id"] == cid for c in context) for cid in cited)
    print(f'     answer "{answer}"  citations valid: {str(valid).lower()}  index v{index["version"]}')


print("1) ingest, then re-ingest after edits")
ingest({"refund": "Refunds are available within 30 days of purchase. After 30 days we offer store credit only.", "shipping": "Standard shipping takes 3 to 5 business days. Express shipping arrives next day.", "warranty": "Hardware has a 1 year warranty. Water damage is not covered.", "promo": "Free shipping on all orders in March 2024."})
ingest({"refund": "Refunds are available within 45 days of purchase. After 45 days we offer store credit only.", "shipping": "Standard shipping takes 3 to 5 business days. Express shipping arrives next day.", "warranty": "Hardware has a 1 year warranty. Water damage is not covered.", "returns": "Start a return from the Orders page. Refunds go to the original card."})
print("")
print("2) queries against index v2")
ask("How many days do I have to get a refund?")
ask("Is water damage covered by the warranty?")
ask("Do you ship to Mars?")` },
        ],
      },
      {
        label: `Back-of-envelope sizing: index memory, embedding cost, query load and generation cost`,
        variants: [
          { tech: "node", code: `// Back-of-envelope sizing for a RAG system. Every input is an assumption you replace with your own.
const A = {
  docs: 200000, tokensPerDoc: 2500, chunkTokens: 500, overlapTokens: 50,
  dims: 1024, bytesPerDim: 4, hnswM: 16, bytesPerToken: 4,
  dailyChangedShare: 0.01,
  queriesPerDay: 30000, peakFactor: 5, rerankDepth: 50,
  systemTokens: 500, chunksInPrompt: 6, questionTokens: 40, historyTokens: 400, outputTokens: 350,
  // Illustrative prices in dollars per million tokens, NOT a real price list.
  embedPrice: 0.02, inputPrice: 3, outputPrice: 15,
};
const comma = (n) => String(Math.floor(n + 0.5)).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",");
const fx = (x, d) => (Math.floor(x * 10 ** d + 0.5) / 10 ** d).toFixed(d);
const GB = 1e9;

console.log("1) index size");
const stride = A.chunkTokens - A.overlapTokens;
const chunksPerDoc = Math.ceil((A.tokensPerDoc - A.overlapTokens) / stride);
const chunks = A.docs * chunksPerDoc;
console.log(\`   chunks per doc  ceil((\${A.tokensPerDoc} - \${A.overlapTokens}) / \${stride}) = \${chunksPerDoc}\`);
console.log(\`   total chunks    \${comma(chunks)}\`);
const vecGB = chunks * A.dims * A.bytesPerDim / GB;
const linkGB = chunks * 2 * A.hnswM * 4 / GB; // layer-0 neighbour ids, 4 bytes each
const textGB = chunks * A.chunkTokens * A.bytesPerToken / GB;
console.log(\`   vectors         \${comma(chunks)} x \${A.dims} x \${A.bytesPerDim} B = \${fx(vecGB, 2)} GB\`);
console.log(\`   graph links     \${comma(chunks)} x \${2 * A.hnswM} x 4 B = \${fx(linkGB, 2)} GB\`);
console.log(\`   chunk text      \${comma(chunks)} x \${A.chunkTokens} x \${A.bytesPerToken} B = \${fx(textGB, 2)} GB\`);

console.log("");
console.log("2) embedding cost");
const fullTokens = chunks * A.chunkTokens;
console.log(\`   full build      \${comma(fullTokens)} tokens = $\${fx(fullTokens / 1e6 * A.embedPrice, 2)}\`);
const dailyTokens = fullTokens * A.dailyChangedShare;
console.log(\`   daily changes   \${comma(dailyTokens)} tokens = $\${fx(dailyTokens / 1e6 * A.embedPrice, 2)} per day\`);

console.log("");
console.log("3) query load and generation cost");
const avgQps = A.queriesPerDay / 86400;
console.log(\`   average \${fx(avgQps, 3)} qps, peak x\${A.peakFactor} = \${fx(avgQps * A.peakFactor, 2)} qps\`);
console.log(\`   rerank pairs    \${comma(A.queriesPerDay * A.rerankDepth)} per day\`);
const inTok = A.systemTokens + A.chunksInPrompt * A.chunkTokens + A.questionTokens + A.historyTokens;
const perQuery = (inTok * A.inputPrice + A.outputTokens * A.outputPrice) / 1e6;
console.log(\`   prompt tokens   \${A.systemTokens} + \${A.chunksInPrompt} x \${A.chunkTokens} + \${A.questionTokens} + \${A.historyTokens} = \${comma(inTok)} in, \${A.outputTokens} out\`);
console.log(\`   per query       $\${fx(perQuery, 5)}   per day $\${fx(perQuery * A.queriesPerDay, 2)}   per 30 days $\${comma(perQuery * A.queriesPerDay * 30)}\`);
const lean = A.systemTokens + 3 * A.chunkTokens + A.questionTokens + A.historyTokens;
const leanCost = (lean * A.inputPrice + A.outputTokens * A.outputPrice) / 1e6;
console.log(\`   with 3 chunks   \${comma(lean)} in -> per 30 days $\${comma(leanCost * A.queriesPerDay * 30)} (\${fx(100 * (1 - leanCost / perQuery), 1)}% less)\`);` },
          { tech: "python", code: `# Back-of-envelope sizing for a RAG system. Every input is an assumption you replace with your own.
import math

A = {
    "docs": 200000, "tokensPerDoc": 2500, "chunkTokens": 500, "overlapTokens": 50,
    "dims": 1024, "bytesPerDim": 4, "hnswM": 16, "bytesPerToken": 4,
    "dailyChangedShare": 0.01,
    "queriesPerDay": 30000, "peakFactor": 5, "rerankDepth": 50,
    "systemTokens": 500, "chunksInPrompt": 6, "questionTokens": 40, "historyTokens": 400, "outputTokens": 350,
    # Illustrative prices in dollars per million tokens, NOT a real price list.
    "embedPrice": 0.02, "inputPrice": 3, "outputPrice": 15,
}


def comma(n):
    return f"{math.floor(n + 0.5):,}"


def fx(x, d):
    return f"{math.floor(x * 10 ** d + 0.5) / 10 ** d:.{d}f}"


GB = 1e9

print("1) index size")
stride = A["chunkTokens"] - A["overlapTokens"]
chunks_per_doc = math.ceil((A["tokensPerDoc"] - A["overlapTokens"]) / stride)
chunks = A["docs"] * chunks_per_doc
print(f"   chunks per doc  ceil(({A['tokensPerDoc']} - {A['overlapTokens']}) / {stride}) = {chunks_per_doc}")
print(f"   total chunks    {comma(chunks)}")
vec_gb = chunks * A["dims"] * A["bytesPerDim"] / GB
link_gb = chunks * 2 * A["hnswM"] * 4 / GB  # layer-0 neighbour ids, 4 bytes each
text_gb = chunks * A["chunkTokens"] * A["bytesPerToken"] / GB
print(f"   vectors         {comma(chunks)} x {A['dims']} x {A['bytesPerDim']} B = {fx(vec_gb, 2)} GB")
print(f"   graph links     {comma(chunks)} x {2 * A['hnswM']} x 4 B = {fx(link_gb, 2)} GB")
print(f"   chunk text      {comma(chunks)} x {A['chunkTokens']} x {A['bytesPerToken']} B = {fx(text_gb, 2)} GB")

print("")
print("2) embedding cost")
full_tokens = chunks * A["chunkTokens"]
print(f"   full build      {comma(full_tokens)} tokens = \${fx(full_tokens / 1e6 * A['embedPrice'], 2)}")
daily_tokens = full_tokens * A["dailyChangedShare"]
print(f"   daily changes   {comma(daily_tokens)} tokens = \${fx(daily_tokens / 1e6 * A['embedPrice'], 2)} per day")

print("")
print("3) query load and generation cost")
avg_qps = A["queriesPerDay"] / 86400
print(f"   average {fx(avg_qps, 3)} qps, peak x{A['peakFactor']} = {fx(avg_qps * A['peakFactor'], 2)} qps")
print(f"   rerank pairs    {comma(A['queriesPerDay'] * A['rerankDepth'])} per day")
in_tok = A["systemTokens"] + A["chunksInPrompt"] * A["chunkTokens"] + A["questionTokens"] + A["historyTokens"]
per_query = (in_tok * A["inputPrice"] + A["outputTokens"] * A["outputPrice"]) / 1e6
print(f"   prompt tokens   {A['systemTokens']} + {A['chunksInPrompt']} x {A['chunkTokens']} + {A['questionTokens']} + {A['historyTokens']} = {comma(in_tok)} in, {A['outputTokens']} out")
print(f"   per query       \${fx(per_query, 5)}   per day \${fx(per_query * A['queriesPerDay'], 2)}   per 30 days \${comma(per_query * A['queriesPerDay'] * 30)}")
lean = A["systemTokens"] + 3 * A["chunkTokens"] + A["questionTokens"] + A["historyTokens"]
lean_cost = (lean * A["inputPrice"] + A["outputTokens"] * A["outputPrice"]) / 1e6
print(f"   with 3 chunks   {comma(lean)} in -> per 30 days \${comma(lean_cost * A['queriesPerDay'] * 30)} ({fx(100 * (1 - lean_cost / per_query), 1)}% less)")` },
        ],
      },
    ],
  },
  {
    title: `What are common RAG failure modes and how do you debug them?`,
    difficulty: "hard",
    seoDescription: `RAG failure modes by stage, from missing or stale documents to ignored context and bad citations, and a trace-based method to find the stage at fault.`,
    description: `**Question presented to candidate:**
"Users say our RAG assistant sometimes gives wrong or outdated answers, and sometimes says it does not know things that are definitely in the docs. What usually goes wrong in a RAG system, and how would you actually debug one of these reports?"

**What a strong answer should cover:**
- Failures happen at a specific stage and should be named by it: not indexed or badly parsed, stale or duplicated versions, a fact split across chunks, retrieval miss (vocabulary mismatch, exact identifiers, wrong filter), ranked out by the reranker or the context budget, context present but ignored or contradicted, wrong citations, and answering questions the documents cannot answer
- The debugging method: reproduce from a per-request trace (rewritten query, filter, retrieved IDs and scores, reranked and packed IDs, prompt version, answer), identify the gold chunk, and walk the stages in order; the first stage that lost the gold chunk is where the fix goes
- Check the cheap upstream things first: is the document in the index at all, is it the current version, does one chunk actually contain the answer
- Turn single reports into an eval set and a funnel (indexed, retrieved, packed, answered correctly) so you fix the stage losing the most questions, and add each fixed case as a regression test
- Typical fixes per stage: parsing and sync fixes, structure-aware chunking or contextual headers, hybrid search and query rewriting, deeper reranking, fewer and better-ordered chunks, grounding and abstention instructions, citation validation

**Clarifying questions expected:**
- Do we log retrieved chunk IDs and scores per request, or only the question and answer?
- Do we have examples of the failing questions with the documents users expected?

**Code / implementation expected:** Optional — a triage function that classifies a logged request by the first stage that lost the answer, or a clear step-by-step debugging procedure.`,
    answer: `**Target Audience:** Engineers who run or are about to run a RAG feature in production and need a systematic way to turn "the bot got it wrong" into a specific, fixable cause.
**Difficulty:** Hard
**Verified with:** Node 22.22.0 and Python 3.12.3 (the chunk-boundary demo and the triage harness below). The request logs in the triage are hand-written examples of each failure type, not data from a real system. Research findings are cited inline.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A parcel arrives at the wrong address. "The delivery service is bad" is true and useless. A logistics team asks a sequence of questions instead: was the label printed correctly? Was the parcel scanned into the right depot? Was it loaded onto the right van? Did the driver read the label? Each answer is yes or no, and the first "no" tells you which team fixes it. Nobody retrains the drivers when the label printer is broken.

A RAG answer is a parcel that went through ingestion, chunking, retrieval, reranking, context packing and generation. "The model hallucinated" is the RAG version of "the delivery service is bad". The skill interviewers test is walking the stages in order with evidence, and fixing the first one that dropped the answer.

## 2. Where Answers Get Lost

<svg class="iq-diagram" width="100%" viewBox="0 0 820 200" role="img" aria-label="Pipeline stages in order: ingest, chunk, retrieve, rerank and pack, generate, cite. Each is a place where the answer can be lost">
  <defs>
    <marker id="ai07q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="10" y="60" width="100" height="80" rx="10"/>
  <text class="d-text" x="60" y="105" text-anchor="middle">ingest</text>
  <rect class="d-box-muted" x="150" y="60" width="100" height="80" rx="10"/>
  <text class="d-text" x="200" y="105" text-anchor="middle">chunk</text>
  <rect class="d-box" x="290" y="60" width="100" height="80" rx="10"/>
  <text class="d-text" x="340" y="105" text-anchor="middle">retrieve</text>
  <rect class="d-box" x="430" y="60" width="100" height="80" rx="10"/>
  <text class="d-text" x="480" y="96" text-anchor="middle">rerank</text>
  <text class="d-sub" x="480" y="122" text-anchor="middle">and pack</text>
  <rect class="d-box-accent" x="570" y="60" width="100" height="80" rx="10"/>
  <text class="d-text" x="620" y="105" text-anchor="middle">generate</text>
  <rect class="d-box-accent" x="710" y="60" width="100" height="80" rx="10"/>
  <text class="d-text" x="760" y="105" text-anchor="middle">cite</text>
  <path class="d-edge" d="M 114 100 L 144 100" marker-end="url(#ai07q5-arrow)"/>
  <path class="d-edge" d="M 254 100 L 284 100" marker-end="url(#ai07q5-arrow)"/>
  <path class="d-edge" d="M 394 100 L 424 100" marker-end="url(#ai07q5-arrow)"/>
  <path class="d-edge" d="M 534 100 L 564 100" marker-end="url(#ai07q5-arrow)"/>
  <path class="d-edge" d="M 674 100 L 704 100" marker-end="url(#ai07q5-arrow)"/>
</svg>

The grey stages run before any question is asked, so their failures look like "the model does not know"; the accented stages fail with the right text sitting in the prompt.

| Stage | Failure mode | What the user sees | Typical fix |
| :--- | :--- | :--- | :--- |
| Ingest | **Not indexed**: connector skipped it, parser produced garbage, file too big | "I do not know" for something documented | Ingestion monitoring, parser fixes, per-source document counts |
| Ingest | **Stale or duplicate versions**: edit not synced, old and new both indexed | Outdated or contradictory answers | Change-event sync, content hashes, deletes, one current version per document |
| Chunk | **Fact split across chunks** | Half an answer, or the wrong half | Structure-aware chunks, contextual headers, small overlap |
| Retrieve | **Retrieval miss**: different words, exact codes, wrong filter, follow-up question without context | Confident answer about something nearby | Hybrid search, query rewriting, checking the filter |
| Rerank / pack | **Ranked out**: found, then cut by the reranker or the token budget | Same as a miss, but the trace shows it was found | Deeper rerank, better reranker, smaller chunks |
| Generate | **Context ignored or contradicted**: answer chunk present but not used | Wrong answer with the right source in the prompt | Fewer, better-ordered chunks; grounding instructions; dedupe conflicts |
| Generate | **Answered the unanswerable** | Plausible invention | Relevance floor, abstention instruction and eval cases |
| Cite | **Bad citation**: cites a source that was not given or does not support the claim | Broken or misleading links | Validate cited IDs against the packed context |

📌 **Interview term: retrieval failure versus generation failure** — the first split in every investigation. If the chunk containing the answer never reached the prompt, the model could not have used it, and no prompt change will help. If it did reach the prompt, the problem is in how the model used it.

## 3. The Debugging Method

📌 **Interview term: gold chunk** — the chunk that contains the correct answer for a given question. Finding it (by searching the source documents yourself) is step one of every investigation.

📌 **Interview term: per-request trace** — a log record per request of every stage: original and rewritten question, filter, retrieved IDs with scores, reranked IDs with scores, packed IDs, prompt and model version, index version, answer and citations. Without it you can only guess; see [What should you log and trace in an LLM application?](/interview-question/what-should-you-log-and-trace-in-an-llm-application)

The procedure, in order, stopping at the first "no":

1. **Is the gold document in the source of truth, and is that version in the index?** Query the index directly by document ID and compare its version or hash with the source.
2. **Does one chunk contain the whole answer?** Read the chunks of the gold document.
3. **Is the gold chunk in the retrieved candidates?** Check the trace; rerun retrieval with the logged rewritten query and filter.
4. **Did it survive reranking and packing?** Check its reranked position, the score floor and the token budget.
5. **Was it used?** It was in the prompt, so read the answer against it: ignored, contradicted by another chunk, or buried among many?
6. **Are citations valid?** Every cited ID was actually provided and supports the sentence.

📌 **Interview term: triage** — classifying each failure by the first stage that lost the answer, so fixes go to the right place and counts tell you which stage to work on first.

The example **"Chunk-boundary check and a first-failing-stage triage over logged requests"** encodes steps 1 and 3 to 6 as a function. The core of it:

~~~js
if (r.gold === null) return abstained ? "ok" : "answered the unanswerable";
if (!(r.gold in INDEX)) return "not indexed";
if (INDEX[r.gold] !== SOURCE[r.gold]) return "stale index";
if (!r.cand.includes(r.gold)) return "retrieval miss";
if (!r.ctx.includes(r.gold)) return "ranked out";
if (!r.answer.includes(r.expect)) return r.ctx.indexOf(r.gold) > 0 ? "ignored (not first)" : "ignored context";
if (cites.some((c) => !r.ctx.includes(c))) return "bad citation";
~~~

The order of the checks *is* the method. Applied to nine logged requests, one per failure type plus two that worked:

~~~text
2) triage of logged requests
    1. What is the refund window?        gold policy#2   ctx pos 1  -> ok
    2. How do I set up SSO?              gold sso#4      ctx  -     -> not indexed
    3. Price of the team plan?           gold pricing#1  ctx pos 1  -> stale index
    4. Can I export to CSV?              gold export#0   ctx  -     -> ranked out
    5. What is error E1043?              gold limits#3   ctx  -     -> retrieval miss
    6. Max upload size?                  gold limits#3   ctx pos 4  -> ignored (not first)
    7. Who can view audit logs?          gold audit#2    ctx pos 1  -> bad citation
    8. Do you support carrier pigeons?   gold null       ctx  -     -> answered the unanswerable
    9. When is the invoice sent?         gold billing#7  ctx pos 1  -> ok
~~~

Note request 3: the gold chunk was retrieved, packed first and the model answered from it. The *model* did nothing wrong; the index held version v1 of the pricing chunk while the source was at v2. Without step 1, this looks exactly like a hallucination and someone rewrites the prompt.

## 4. Walking Through the Common Causes

### Not indexed and stale: check these first

They are the cheapest to check and the most expensive to miss: teams can spend days on prompts while a connector has silently skipped a folder. Monitor document counts per source, parser errors and sync lag, and keep a "lookup by document ID" tool for the index. Sync patterns (outbox, change data capture) are in [What is a vector database and when do you actually need one?](/interview-question/what-is-a-vector-database-and-when-do-you-actually-need-one)

### Split facts: chunking

📌 **Interview term: chunk boundary problem** — the words that together answer a question end up in different chunks, so no single chunk matches the question well and the one that is retrieved holds half the answer.

The first part of the example splits a three-sentence policy into 10-word chunks and asks whether any single chunk holds both "fee" and "60" (the fee rule and its 60-day condition):

~~~text
1) a fact split by a chunk boundary
   fixed 10 words, overlap 0  3 chunks; "fee" and "60" together: no
     chunk 0: Enterprise customers can cancel at any time. The cancellation fee
     chunk 1: is waived if notice is given 60 days before renewal.
     chunk 2: Otherwise one month is charged.
   fixed 10 words, overlap 4  4 chunks; "fee" and "60" together: no
   fixed 10 words, overlap 3  4 chunks; "fee" and "60" together: yes, chunk 1
   sentences, max 16 words    3 chunks; "fee" and "60" together: yes, chunk 1
~~~

Overlap 4 failed and overlap 3 happened to work: **overlap is luck, not a guarantee**, because the result depends on where window starts happen to land. Splitting on sentence boundaries kept the rule whole by construction. Chunking strategy in depth: [What chunking strategies exist and how does chunk size affect RAG quality?](/interview-question/what-chunking-strategies-exist-and-how-does-chunk-size-affect-rag-quality)

### Retrieval misses

- **Vocabulary mismatch.** Users say "money back", the docs say "refund". Embeddings help; query rewriting helps more for jargon.
- **Exact identifiers.** Error codes like E1043, SKUs and version numbers are where embeddings are weakest and keyword search is strongest; request 5 is this case. Fix with [hybrid search](/interview-question/what-is-hybrid-search-and-why-combine-bm25-with-vector-search).
- **Follow-up questions.** "And for the team plan?" retrieved on its own finds nothing; rewrite it into a standalone question with the chat history.
- **The wrong filter.** A language, product-version or tenant filter that excludes the gold chunk. Log the filter with every request; see [How do you scope retrieval with metadata filtering and multi-tenancy?](/interview-question/how-do-you-scope-retrieval-with-metadata-filtering-and-multi-tenancy)

### Ranked out

The gold chunk was retrieved and then cut: the reranker scored it below the floor or below k, or the token budget ran out first (request 4). Look at its reranked score. Fixes: rerank deeper, try a better reranker, use smaller chunks so more fit in the budget. Measured approach in [Reranking in RAG: when and how to add a cross-encoder?](/interview-question/reranking-in-rag-when-and-how-to-add-a-cross-encoder)

### Present but ignored

📌 **Interview term: lost in the middle** — models use information at the start or end of a long input more reliably than information in the middle. Liu et al., *Lost in the Middle: How Language Models Use Long Contexts* (TACL 2024, arXiv 2307.03172), showed accuracy dropping when the relevant passage sat mid-context in multi-document question answering.

In request 6 the gold chunk was fourth of four, after three distractors, and the model answered from the first. Fewer, better-ranked chunks with the best first is the fix; so is removing **conflicting chunks** (an old FAQ saying 500 MB next to the current limits page saying 2 GB), which is often an ingestion problem in disguise.

### Answering the unanswerable and bad citations

Request 8 asks something the documents do not cover; retrieval still returned a nearest chunk and the model built an answer on it. A relevance floor and an explicit "say you do not know" instruction fix it, and unanswerable questions belong in the eval set; see [How do you reduce hallucinations in a production LLM application?](/interview-question/how-do-you-reduce-hallucinations-in-a-production-llm-application). Request 7 gave the right answer but cited \`audit#9\`, a chunk that was never provided. Validate every cited ID against the packed context before showing it.

## 5. From Single Reports to a Funnel

One report tells you about one question. A labelled set tells you where to spend the next week.

📌 **Interview term: retrieval funnel** — over a labelled set, the number of answerable questions whose gold chunk survives each stage: in the source, indexed and current, retrieved, packed, answered correctly. The biggest drop is the stage to fix first.

~~~text
3) funnel: where answerable questions are lost
   in source of truth       8 of 8  ########
   indexed and current      6 of 8  ######
   in retrieved candidates  5 of 8  #####
   in packed context        4 of 8  ####
   answered correctly       3 of 8  ###
~~~

Here the largest single drop (2 of 8) is at ingestion, before any model is involved. "Answered correctly" counts the answer text only; request 7 is in it despite its bad citation, which is why citation validity is tracked as a separate metric. Building the labelled set is covered in [How do you build a golden dataset for evaluating an LLM feature?](/interview-question/how-do-you-build-a-golden-dataset-for-evaluating-an-llm-feature), and full RAG metrics (context recall, faithfulness, answer relevance) in [How do you evaluate a RAG pipeline end to end?](/interview-question/how-do-you-evaluate-a-rag-pipeline-end-to-end)

After fixing a case, **add it to the eval set** so it stays fixed; changes to chunking, models or prompts frequently re-break old cases.

## 6. Verified: Running the Code

The example **"Chunk-boundary check and a first-failing-stage triage over logged requests"** has four parts: a fixed-window and a sentence chunker over one policy text; nine hand-written request logs (question, gold chunk, expected answer text, candidate IDs, packed IDs, answer) checked against two maps standing in for the source of truth and the index; a funnel; and counts per bucket. The logs are illustrative, chosen to show one of each failure. A real harness reads traces from your logging system and uses a model or human grader instead of a substring check for "answered correctly".

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
1) a fact split by a chunk boundary
   fixed 10 words, overlap 0  3 chunks; "fee" and "60" together: no
     chunk 0: Enterprise customers can cancel at any time. The cancellation fee
     chunk 1: is waived if notice is given 60 days before renewal.
     chunk 2: Otherwise one month is charged.
   fixed 10 words, overlap 4  4 chunks; "fee" and "60" together: no
   fixed 10 words, overlap 3  4 chunks; "fee" and "60" together: yes, chunk 1
   sentences, max 16 words    3 chunks; "fee" and "60" together: yes, chunk 1

2) triage of logged requests
    1. What is the refund window?        gold policy#2   ctx pos 1  -> ok
    2. How do I set up SSO?              gold sso#4      ctx  -     -> not indexed
    3. Price of the team plan?           gold pricing#1  ctx pos 1  -> stale index
    4. Can I export to CSV?              gold export#0   ctx  -     -> ranked out
    5. What is error E1043?              gold limits#3   ctx  -     -> retrieval miss
    6. Max upload size?                  gold limits#3   ctx pos 4  -> ignored (not first)
    7. Who can view audit logs?          gold audit#2    ctx pos 1  -> bad citation
    8. Do you support carrier pigeons?   gold null       ctx  -     -> answered the unanswerable
    9. When is the invoice sent?         gold billing#7  ctx pos 1  -> ok

3) funnel: where answerable questions are lost
   in source of truth       8 of 8  ########
   indexed and current      6 of 8  ######
   in retrieved candidates  5 of 8  #####
   in packed context        4 of 8  ####
   answered correctly       3 of 8  ###

4) counts by bucket
    2  ok
    1  answered the unanswerable
    1  bad citation
    1  ignored (not first)
    1  not indexed
    1  ranked out
    1  retrieval miss
    1  stale index
~~~

What the run shows:

- Fixed windows split the fee rule from its condition; overlap 4 still failed, overlap 3 succeeded by luck, and sentence chunks kept it whole.
- Ordered checks put each failing request in exactly one bucket, and the stale-index case was caught before blaming the model.
- The funnel located the largest drop at ingestion, the stage furthest from the model.

## Common Pitfalls

- **Blaming the model first.** Check the index, the version and the chunks before touching the prompt; request 3 looked like a hallucination and was a sync bug.
- **Logging only question and answer.** Without retrieved and packed IDs with scores, every investigation starts from guesswork.
- **Fixing a downstream stage for an upstream bug.** A better reranker cannot find a document that was never indexed.
- **Trusting overlap to fix split facts.** It shifts the boundaries; structure-aware chunking or contextual headers keep units whole.
- **Sending more chunks to fix misses.** More context adds distractors and cost; fix recall at retrieval and send fewer, better chunks.
- **Not keeping fixed cases.** Every investigated failure is a free regression test; add it to the eval set.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Name failures by stage:</strong> <span style="color:#f0e2c8;">A wrong RAG answer was lost at a specific stage: not indexed or stale, split across chunks, missed by retrieval, cut by the reranker or the token budget, ignored in the prompt, cited wrongly, or the question had no answer and the model invented one. <em style="color:#f0e2c8;">The model hallucinated</em> is not a diagnosis.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. First split:</strong> <span style="color:#f0e2c8;">Did the chunk with the answer reach the prompt? If not, it is a <strong style="color:#ffca28;">retrieval failure</strong> and no prompt change helps. If yes, it is a <strong style="color:#ffca28;">generation failure</strong>: ignored, buried mid-context, or contradicted by another chunk.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The method:</strong> <span style="color:#f0e2c8;">From a <strong style="color:#ffca28;">per-request trace</strong> I find the gold chunk and walk the stages in order: in the index at the current version, one chunk holds the answer, in the candidates, survived rerank and packing, used, cited correctly. The first <em style="color:#f0e2c8;">no</em> is where the fix goes. In my demo that order caught a stale index that looked exactly like a hallucination.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Typical fixes:</strong> <span style="color:#f0e2c8;">Sync and parser monitoring for ingestion; structure-aware chunks or contextual headers for split facts, since overlap only moves the boundary; hybrid search and query rewriting for misses on codes and follow-ups; deeper reranking; fewer, better-ordered chunks; a relevance floor and abstention; validating cited IDs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Scale it up:</strong> <span style="color:#f0e2c8;">Turn reports into a labelled set and a <strong style="color:#ffca28;">funnel</strong>: indexed, retrieved, packed, answered. Fix the biggest drop first, which in my example was ingestion, the stage furthest from the model. Every fixed case goes into the eval set as a regression test.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What would you log to make this possible?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Per request: the original and rewritten question, the filter, retrieved IDs with scores, reranked IDs with scores, packed IDs, prompt and model version, index version, the answer and its citations, and latency per stage. With that, any report can be replayed stage by stage.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The answer chunk was in the prompt and the model still got it wrong. Now what?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Look at its position and the neighbours. Lost-in-the-middle research found models use mid-context passages less reliably, so I would send fewer chunks with the best first. Check for a conflicting older chunk, which is often an ingestion issue, and make the instruction to answer only from sources explicit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Users ask about error codes and get unrelated answers. Why?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Exact identifiers are where embeddings are weakest: E1043 and E1034 can land almost on top of each other in vector space. Keyword search matches them exactly, so the fix is hybrid search with BM25 fused in, and making sure the tokenizer keeps codes intact.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would more overlap fix split facts?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not reliably. In my run, overlap 4 still separated the fee rule from its condition and overlap 3 happened to work, because overlap only moves where windows start. Splitting on sentence or section boundaries, or adding a contextual header, keeps the unit whole by construction.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop the bot answering questions the docs do not cover?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A relevance floor on reranker scores so nothing weak is sent, an explicit instruction to say it does not know, and unanswerable questions in the eval set with abstention measured. Without the floor, retrieval always returns some nearest chunk for the model to build on.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Retrieval failure versus generation failure | Did the answer chunk reach the prompt or not; the first split in debugging |
| Gold chunk | The chunk containing the correct answer for a question |
| Per-request trace | Logged inputs, outputs, IDs and scores of every stage for one request |
| Triage | Classifying a failure by the first stage that lost the answer |
| Chunk boundary problem | The words of one answer split across chunks |
| Lost in the middle | Models use mid-context information less reliably than the start or end |
| Retrieval funnel | Counts of questions whose gold chunk survives each stage |

**Conclusion:** RAG failures are stage failures: the answer was never indexed or is stale, split across chunks, missed by retrieval, cut by reranking or the token budget, ignored or contradicted in the prompt, cited wrongly, or the question had no answer and the model invented one. Debug from a per-request trace by finding the gold chunk and walking the stages in order; the first stage that lost it is where the fix goes, and in the demo that order caught a stale index that would otherwise have been blamed on the model. Then turn reports into a labelled set and a funnel so you fix the stage that loses the most questions, and keep every fixed case as a regression test.`,
    examples: [
      {
        label: `Chunk-boundary check and a first-failing-stage triage over logged requests`,
        variants: [
          { tech: "node", code: `// RAG failure triage: classify each logged request by the first stage that lost the answer.
const words = (t) => t.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(" ").filter((w) => w);

console.log("1) a fact split by a chunk boundary");
const DOC = "Enterprise customers can cancel at any time. The cancellation fee is waived if notice is given 60 days before renewal. Otherwise one month is charged.";
function chunk(text, size, overlap) {
  const w = text.split(" "), out = [];
  for (let i = 0; i < w.length; i += size - overlap) { out.push(w.slice(i, i + size).join(" ")); if (i + size >= w.length) break; }
  return out;
}
function bySentence(text, max) { // whole sentences, packed up to max words
  const out = []; let cur = [];
  for (const sent of text.split(/(?<=\\.) /)) {
    const n = sent.split(" ").length;
    if (cur.length && cur.join(" ").split(" ").length + n > max) { out.push(cur.join(" ")); cur = []; }
    cur.push(sent);
  }
  if (cur.length) out.push(cur.join(" "));
  return out;
}
const configs = [["fixed 10 words, overlap 0", chunk(DOC, 10, 0)], ["fixed 10 words, overlap 4", chunk(DOC, 10, 4)], ["fixed 10 words, overlap 3", chunk(DOC, 10, 3)], ["sentences, max 16 words", bySentence(DOC, 16)]];
configs.forEach(([name, cs], k) => {
  const whole = cs.findIndex((c) => words(c).includes("fee") && words(c).includes("60"));
  console.log(\`   \${name.padEnd(26)} \${cs.length} chunks; "fee" and "60" together: \${whole >= 0 ? "yes, chunk " + whole : "no"}\`);
  if (k === 0) cs.forEach((c, i) => console.log(\`     chunk \${i}: \${c}\`));
});
console.log("");
console.log("2) triage of logged requests");
// Source of truth (document store) and what the vector index currently holds.
const SOURCE = { "policy#2": "v3", "pricing#1": "v2", "sso#4": "v1", "export#0": "v1", "limits#3": "v1", "billing#7": "v1", "audit#2": "v1" };
const INDEX = { "policy#2": "v3", "pricing#1": "v1", "export#0": "v1", "limits#3": "v1", "billing#7": "v1", "audit#2": "v1" };
const LOGS = [
  { q: "What is the refund window?", gold: "policy#2", expect: "45 days", cand: ["policy#2", "billing#7"], ctx: ["policy#2"], answer: "45 days [policy#2]" },
  { q: "How do I set up SSO?", gold: "sso#4", expect: "SAML", cand: ["audit#2", "limits#3"], ctx: ["audit#2"], answer: "I do not know." },
  { q: "Price of the team plan?", gold: "pricing#1", expect: "$12", cand: ["pricing#1"], ctx: ["pricing#1"], answer: "$10 per seat [pricing#1]" },
  { q: "Can I export to CSV?", gold: "export#0", expect: "CSV", cand: ["limits#3", "billing#7", "export#0"], ctx: ["limits#3", "billing#7"], answer: "Exports are limited to 10 per day [limits#3]" },
  { q: "What is error E1043?", gold: "limits#3", expect: "rate limit", cand: ["billing#7", "audit#2"], ctx: ["billing#7"], answer: "E1043 is a billing error [billing#7]" },
  { q: "Max upload size?", gold: "limits#3", expect: "2 GB", cand: ["limits#3", "export#0"], ctx: ["export#0", "billing#7", "audit#2", "limits#3"], answer: "Uploads up to 500 MB [export#0]" },
  { q: "Who can view audit logs?", gold: "audit#2", expect: "admins", cand: ["audit#2"], ctx: ["audit#2"], answer: "Only admins [audit#9]" },
  { q: "Do you support carrier pigeons?", gold: null, expect: null, cand: ["export#0"], ctx: ["export#0"], answer: "Yes, via the export API [export#0]" },
  { q: "When is the invoice sent?", gold: "billing#7", expect: "1st of the month", cand: ["billing#7"], ctx: ["billing#7"], answer: "On the 1st of the month [billing#7]" },
];
function triage(r) {
  const cites = [...r.answer.matchAll(/\\[([a-z]+#\\d+)\\]/g)].map((m) => m[1]);
  const abstained = r.answer.startsWith("I do not know");
  if (r.gold === null) return abstained ? "ok" : "answered the unanswerable";
  if (!(r.gold in INDEX)) return "not indexed";
  if (INDEX[r.gold] !== SOURCE[r.gold]) return "stale index";
  if (!r.cand.includes(r.gold)) return "retrieval miss";
  if (!r.ctx.includes(r.gold)) return "ranked out";
  if (!r.answer.includes(r.expect)) return r.ctx.indexOf(r.gold) > 0 ? "ignored (not first)" : "ignored context";
  if (cites.some((c) => !r.ctx.includes(c))) return "bad citation";
  return "ok";
}
const counts = new Map();
LOGS.forEach((r, i) => {
  const t = triage(r);
  counts.set(t, (counts.get(t) || 0) + 1);
  const pos = r.ctx.indexOf(r.gold);
  console.log(\`   \${String(i + 1).padStart(2)}. \${r.q.padEnd(33)} gold \${String(r.gold).padEnd(10)} \${pos >= 0 ? \`ctx pos \${pos + 1}\` : "ctx  -   "}  -> \${t}\`);
});

console.log("");
console.log("3) funnel: where answerable questions are lost");
const ans = LOGS.filter((r) => r.gold !== null);
const stages = [
  ["in source of truth", (r) => r.gold in SOURCE],
  ["indexed and current", (r) => INDEX[r.gold] === SOURCE[r.gold]],
  ["in retrieved candidates", (r) => INDEX[r.gold] === SOURCE[r.gold] && r.cand.includes(r.gold)],
  ["in packed context", (r) => INDEX[r.gold] === SOURCE[r.gold] && r.ctx.includes(r.gold)],
  ["answered correctly", (r) => INDEX[r.gold] === SOURCE[r.gold] && r.ctx.includes(r.gold) && r.answer.includes(r.expect)],
];
for (const [name, ok] of stages) {
  const n = ans.filter(ok).length;
  console.log(\`   \${name.padEnd(24)} \${n} of \${ans.length}  \${"#".repeat(n)}\`);
}
console.log("");
console.log("4) counts by bucket");
[...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).forEach(([t, n]) => console.log(\`   \${String(n).padStart(2)}  \${t}\`));` },
          { tech: "python", code: `# RAG failure triage: classify each logged request by the first stage that lost the answer.
import re


def words(t):
    return [w for w in re.sub(r"[^a-z0-9 ]", " ", t.lower()).split(" ") if w]


print("1) a fact split by a chunk boundary")
DOC = "Enterprise customers can cancel at any time. The cancellation fee is waived if notice is given 60 days before renewal. Otherwise one month is charged."


def chunk(text, size, overlap):
    w, out, i = text.split(" "), [], 0
    while i < len(w):
        out.append(" ".join(w[i:i + size]))
        if i + size >= len(w):
            break
        i += size - overlap
    return out


def by_sentence(text, max_words):  # whole sentences, packed up to max words
    out, cur = [], []
    for sent in re.split(r"(?<=\\.) ", text):
        n = len(sent.split(" "))
        if cur and len(" ".join(cur).split(" ")) + n > max_words:
            out.append(" ".join(cur))
            cur = []
        cur.append(sent)
    if cur:
        out.append(" ".join(cur))
    return out


configs = [("fixed 10 words, overlap 0", chunk(DOC, 10, 0)), ("fixed 10 words, overlap 4", chunk(DOC, 10, 4)), ("fixed 10 words, overlap 3", chunk(DOC, 10, 3)), ("sentences, max 16 words", by_sentence(DOC, 16))]
for k, (name, cs) in enumerate(configs):
    whole = next((i for i, c in enumerate(cs) if "fee" in words(c) and "60" in words(c)), -1)
    print(f"   {name.ljust(26)} {len(cs)} chunks; \\"fee\\" and \\"60\\" together: {'yes, chunk ' + str(whole) if whole >= 0 else 'no'}")
    if k == 0:
        for i, c in enumerate(cs):
            print(f"     chunk {i}: {c}")

print("")
print("2) triage of logged requests")
# Source of truth (document store) and what the vector index currently holds.
SOURCE = {"policy#2": "v3", "pricing#1": "v2", "sso#4": "v1", "export#0": "v1", "limits#3": "v1", "billing#7": "v1", "audit#2": "v1"}
INDEX = {"policy#2": "v3", "pricing#1": "v1", "export#0": "v1", "limits#3": "v1", "billing#7": "v1", "audit#2": "v1"}
LOGS = [
    {"q": "What is the refund window?", "gold": "policy#2", "expect": "45 days", "cand": ["policy#2", "billing#7"], "ctx": ["policy#2"], "answer": "45 days [policy#2]"},
    {"q": "How do I set up SSO?", "gold": "sso#4", "expect": "SAML", "cand": ["audit#2", "limits#3"], "ctx": ["audit#2"], "answer": "I do not know."},
    {"q": "Price of the team plan?", "gold": "pricing#1", "expect": "$12", "cand": ["pricing#1"], "ctx": ["pricing#1"], "answer": "$10 per seat [pricing#1]"},
    {"q": "Can I export to CSV?", "gold": "export#0", "expect": "CSV", "cand": ["limits#3", "billing#7", "export#0"], "ctx": ["limits#3", "billing#7"], "answer": "Exports are limited to 10 per day [limits#3]"},
    {"q": "What is error E1043?", "gold": "limits#3", "expect": "rate limit", "cand": ["billing#7", "audit#2"], "ctx": ["billing#7"], "answer": "E1043 is a billing error [billing#7]"},
    {"q": "Max upload size?", "gold": "limits#3", "expect": "2 GB", "cand": ["limits#3", "export#0"], "ctx": ["export#0", "billing#7", "audit#2", "limits#3"], "answer": "Uploads up to 500 MB [export#0]"},
    {"q": "Who can view audit logs?", "gold": "audit#2", "expect": "admins", "cand": ["audit#2"], "ctx": ["audit#2"], "answer": "Only admins [audit#9]"},
    {"q": "Do you support carrier pigeons?", "gold": None, "expect": None, "cand": ["export#0"], "ctx": ["export#0"], "answer": "Yes, via the export API [export#0]"},
    {"q": "When is the invoice sent?", "gold": "billing#7", "expect": "1st of the month", "cand": ["billing#7"], "ctx": ["billing#7"], "answer": "On the 1st of the month [billing#7]"},
]


def triage(r):
    cites = re.findall(r"\\[([a-z]+#\\d+)\\]", r["answer"])
    abstained = r["answer"].startswith("I do not know")
    if r["gold"] is None:
        return "ok" if abstained else "answered the unanswerable"
    if r["gold"] not in INDEX:
        return "not indexed"
    if INDEX[r["gold"]] != SOURCE[r["gold"]]:
        return "stale index"
    if r["gold"] not in r["cand"]:
        return "retrieval miss"
    if r["gold"] not in r["ctx"]:
        return "ranked out"
    if r["expect"] not in r["answer"]:
        return "ignored (not first)" if r["ctx"].index(r["gold"]) > 0 else "ignored context"
    if any(c not in r["ctx"] for c in cites):
        return "bad citation"
    return "ok"


counts = {}
for i, r in enumerate(LOGS):
    t = triage(r)
    counts[t] = counts.get(t, 0) + 1
    pos = r["ctx"].index(r["gold"]) if r["gold"] in r["ctx"] else -1
    where = f"ctx pos {pos + 1}" if pos >= 0 else "ctx  -   "
    gold = "null" if r["gold"] is None else r["gold"]
    print(f"   {str(i + 1).rjust(2)}. {r['q'].ljust(33)} gold {gold.ljust(10)} {where}  -> {t}")

print("")
print("3) funnel: where answerable questions are lost")
ans = [r for r in LOGS if r["gold"] is not None]


def current(r):
    return INDEX.get(r["gold"]) == SOURCE[r["gold"]]


stages = [
    ("in source of truth", lambda r: r["gold"] in SOURCE),
    ("indexed and current", current),
    ("in retrieved candidates", lambda r: current(r) and r["gold"] in r["cand"]),
    ("in packed context", lambda r: current(r) and r["gold"] in r["ctx"]),
    ("answered correctly", lambda r: current(r) and r["gold"] in r["ctx"] and r["expect"] in r["answer"]),
]
for name, ok in stages:
    n = len([r for r in ans if ok(r)])
    print(f"   {name.ljust(24)} {n} of {len(ans)}  {'#' * n}")
print("")
print("4) counts by bucket")
for t, n in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])):
    print(f"   {str(n).rjust(2)}  {t}")` },
        ],
      },
    ],
  },
];

export default augments;
