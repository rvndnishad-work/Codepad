/**
 * AI ENGINEERING ULTRA — batch 06: RAG I, retrieval (what RAG is and why not
 * fine-tune for knowledge, chunking strategies, picking chunk size and overlap,
 * hybrid search, BM25 + vectors fused with RRF).
 * Every example was run by scripts/verify-variant-examples.ts (node, python);
 * quoted output is that run's output.
 */
import type { AiUltraAugment } from "./ai-augments.types";

const augments: AiUltraAugment[] = [
  {
    title: `What is RAG and why use it instead of fine-tuning for knowledge?`,
    difficulty: "easy",
    seoDescription: `RAG retrieves relevant passages at question time and answers from them; for changing facts it beats fine-tuning on freshness, deletion, citations, access.`,
    description: `**Question presented to candidate:**
"Our support bot needs to answer from our own help-centre articles and policies, which change every week. One engineer wants to fine-tune a model on the articles; another wants RAG. Explain what retrieval-augmented generation is, how it works, and why you would or would not use it instead of fine-tuning for this."

**What a strong answer should cover:**
- The definition: RAG retrieves relevant passages from an external index at question time and puts them in the prompt, so the model answers from that evidence (non-parametric memory) instead of only from what is stored in its weights (parametric memory)
- The two halves: an offline indexing path (load, chunk, embed, store) and an online query path (embed or parse the query, retrieve top-k, build the prompt, generate with citations)
- Why RAG wins for knowledge: an update is a re-index of one document instead of a training run, deletions really delete, answers can cite sources, retrieval can be filtered per user or tenant, and the model can be told to say "I do not know" when nothing relevant is found
- Evidence beyond intuition: published comparisons (for example Ovadia et al., EMNLP 2024) found RAG beat unsupervised fine-tuning for injecting both existing and new facts
- What fine-tuning is still for: behaviour, format, tone and domain style, not facts that change; the two combine
- What RAG does not fix: answers are only as good as retrieval (chunking, hybrid search, reranking), and retrieved text is untrusted input (prompt injection)

**Clarifying questions expected:**
- How often does the content change, and must deletions take effect immediately?
- Does every user see every document, or does access depend on the user or customer?
- How big is the corpus: could it simply fit in the context window?

**Code / implementation expected:** Optional — sketching the retrieve, build-prompt, generate loop (with a citation and an "I do not know" path) is a strong signal.`,
    answer: `**Target Audience:** Beginners meeting retrieval-augmented generation for the first time, and engineers who need to defend "RAG, not fine-tuning" for a knowledge feature in an interview.
**Difficulty:** Easy
**Verified with:** Node 22.22.0 and Python 3.12.3 (a keyword retriever plus deterministic stub models; no real model or vector database is called). Papers cited inline were checked in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Two students sit the same exam on the company handbook. The first spent a month memorising it. The second is allowed to bring the handbook in and look things up.

On day one they both do well. Then HR changes the return policy from 30 days to 14. The memoriser still says 30, confidently, because that is what she learned; to fix her you have to make her study the whole book again. The open-book student just reads the new page. Ask both something the handbook never covered ("do you ship to Mars?") and the memoriser invents a plausible answer, while the open-book student can say "it is not in the book". And when the examiner asks "where does it say that?", only the open-book student can point to the page.

A language model on its own is the memoriser: everything it knows was squeezed into its weights during training. **Retrieval-augmented generation** turns it into the open-book student. That is the whole idea, and it explains every argument for RAG over fine-tuning when the goal is *knowledge*.

## 2. What RAG Is

📌 **Interview term: Retrieval-Augmented Generation (RAG)** — at question time, search an external collection of documents for passages relevant to the question, put those passages into the prompt, and have the model answer from them. The name comes from Lewis et al., "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (2020, arXiv 2005.11401), which paired a generator with a dense vector index of Wikipedia searched by a neural retriever.

That paper also gave the two words that make the trade-off precise:

📌 **Interview term: parametric memory** — knowledge stored in the model weights (its parameters). Cheap to use, expensive to change, impossible to cite.

📌 **Interview term: non-parametric memory** — knowledge stored outside the model, in an index you can read, update and delete from. RAG is a model with a non-parametric memory attached.

📌 **Interview term: grounding** — making the answer depend on supplied evidence rather than on the model's memory. A grounded answer can be checked against its sources.

A RAG system has two paths. The first runs offline, whenever documents change:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="Offline indexing path: documents are loaded, split into chunks, embedded into vectors and stored in an index together with metadata">
  <defs>
    <marker id="ai06q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="50" width="140" height="70" rx="10"/>
  <text class="d-text" x="90" y="80" text-anchor="middle">documents</text>
  <text class="d-sub" x="90" y="102" text-anchor="middle">pages, PDFs, tickets</text>
  <rect class="d-box" x="215" y="50" width="140" height="70" rx="10"/>
  <text class="d-text" x="285" y="80" text-anchor="middle">chunk</text>
  <text class="d-sub" x="285" y="102" text-anchor="middle">split into passages</text>
  <rect class="d-box" x="410" y="50" width="140" height="70" rx="10"/>
  <text class="d-text" x="480" y="80" text-anchor="middle">embed</text>
  <text class="d-sub" x="480" y="102" text-anchor="middle">text to vector</text>
  <rect class="d-box-accent" x="605" y="50" width="140" height="70" rx="10"/>
  <text class="d-text" x="675" y="80" text-anchor="middle">index</text>
  <text class="d-sub" x="675" y="102" text-anchor="middle">vectors + metadata</text>
  <path class="d-edge" d="M 160 85 L 207 85" marker-end="url(#ai06q1-arrow)"/>
  <path class="d-edge" d="M 355 85 L 402 85" marker-end="url(#ai06q1-arrow)"/>
  <path class="d-edge" d="M 550 85 L 597 85" marker-end="url(#ai06q1-arrow)"/>
</svg>

Chunking decides what a "passage" is, and it has two pages of its own: [what chunking strategies exist](/interview-question/what-chunking-strategies-exist-and-how-does-chunk-size-affect-rag-quality) and [how to pick size, overlap and strategy](/interview-question/chunking-in-rag-how-do-you-pick-size-overlap-and-strategy). Embedding and storage are covered in [What are embeddings?](/interview-question/what-are-embeddings-and-what-are-they-used-for) and [What is a vector database?](/interview-question/what-is-a-vector-database-and-when-do-you-actually-need-one)

The second path runs on every question:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Online query path: the question goes to the retriever, which returns the top k chunks from the index, the chunks and the question are assembled into a prompt, and the model writes an answer with citations">
  <defs>
    <marker id="ai06q1-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="90" y="70" text-anchor="middle">question</text>
  <text class="d-sub" x="90" y="92" text-anchor="middle">from the user</text>
  <rect class="d-box" x="215" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="285" y="70" text-anchor="middle">retrieve</text>
  <text class="d-sub" x="285" y="92" text-anchor="middle">top k chunks</text>
  <rect class="d-box" x="410" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="480" y="70" text-anchor="middle">build prompt</text>
  <text class="d-sub" x="480" y="92" text-anchor="middle">rules + sources</text>
  <rect class="d-box-accent" x="605" y="40" width="140" height="70" rx="10"/>
  <text class="d-text" x="675" y="70" text-anchor="middle">generate</text>
  <text class="d-sub" x="675" y="92" text-anchor="middle">answer + citations</text>
  <rect class="d-box-muted" x="215" y="150" width="140" height="60" rx="10"/>
  <text class="d-text" x="285" y="185" text-anchor="middle">index</text>
  <path class="d-edge" d="M 160 75 L 207 75" marker-end="url(#ai06q1-arrow2)"/>
  <path class="d-edge" d="M 355 75 L 402 75" marker-end="url(#ai06q1-arrow2)"/>
  <path class="d-edge" d="M 550 75 L 597 75" marker-end="url(#ai06q1-arrow2)"/>
  <path class="d-edge-dashed" d="M 285 110 L 285 142" marker-end="url(#ai06q1-arrow2)"/>
</svg>

The model never "learns" the documents. It reads a few of them, chosen for this question, every time. The quality of the answer is therefore capped by the quality of the retrieval: if the right passage is not among the top k, the model cannot use it.

📌 **Interview term: retriever** — the component that takes a query and returns ranked passages. It can be vector search, keyword search (BM25) or both; see [hybrid search](/interview-question/what-is-hybrid-search-and-why-combine-bm25-with-vector-search).

📌 **Interview term: top-k** — how many passages the retriever hands to the prompt. More passages raise the chance the right one is included and also raise cost, latency and the amount of irrelevant text the model must ignore.

## 3. Why RAG, Not Fine-Tuning, for Knowledge

📌 **Interview term: fine-tuning** — continuing to train a model on your own examples so its weights change. It is covered in depth in [fine-tuning, LoRA and prompt engineering](/interview-question/what-is-the-difference-between-fine-tuning-lora-and-prompt-engineering).

The comparison is about *facts that live in documents*. For each property a knowledge feature needs:

| Need | RAG | Fine-tuning on the documents |
| :--- | :--- | :--- |
| A policy changed today | Re-index one document; live in seconds | Rebuild the training set and run training again |
| A document must be deleted (legal, privacy) | Delete it from the index; it can no longer be retrieved | The fact may persist in the weights; there is no reliable "unlearn" |
| "Where does it say that?" | Cite the passage id that was in the prompt | No source; the weights cannot point to a page |
| Different users may see different documents | Filter retrieval by tenant or permission | One set of weights sees everything it was trained on |
| A question the documents do not answer | Retrieval comes back weak; the model can be told to refuse | The model produces its nearest memory, fluently |
| Debugging a wrong answer | Look at what was retrieved | Little to inspect |
| Cost per query | Higher: retrieved text adds input tokens every call | Lower: no extra context |

The evidence agrees with the intuition. Ovadia et al., "Fine-Tuning or Retrieval? Comparing Knowledge Injection in LLMs" (arXiv 2312.05934, EMNLP 2024) compared unsupervised fine-tuning with RAG on knowledge-heavy question sets and reported that RAG consistently outperformed fine-tuning, both for knowledge the base model had seen in training and for entirely new facts; they also found models struggle to learn new facts from fine-tuning unless shown many paraphrases of each fact.

So the rule of thumb interviewers want to hear is: **fine-tune for behaviour, retrieve for knowledge.** Fine-tuning is the right tool to change *how* a model answers (format, tone, domain style, following a house template, a narrow classification task). Retrieval is the right tool to change *what facts* it answers from. The two combine: a model fine-tuned to always cite and to refuse when sources are weak, fed by RAG. The broader three-way decision, including plain prompting, is its own question: [Fine-tune vs RAG vs prompt engineering](/interview-question/fine-tune-vs-rag-vs-prompt-engineering-how-do-you-choose-in-2025-26).

## 4. The Smallest Working RAG Loop

The example program makes the table above concrete. It has four documents for two tenants, a keyword retriever that counts shared words, and two stub "models":

- **RAG generator (stub):** answers only with the best retrieved passage and its id, and refuses when the best match shares fewer than two content words with the question.
- **"Fine-tuned" model (stub):** a frozen dictionary of what was in the documents at training time, which always answers.

Neither stub is a language model. They stand in for the two kinds of memory so the mechanism around them is what runs. The core of the RAG side is three functions:

~~~js
function retrieve(question, tenant, k = 2) {
  const q = new Set(words(question));
  return [...docs.entries()]
    .filter(([, d]) => d.tenant === tenant) // scope: a tenant only sees its own docs
    .map(([id, d]) => ({ id, text: d.text, score: words(d.text).filter((w) => q.has(w)).length }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1))
    .slice(0, k);
}
~~~

What happened on day two, after the policy changed and one document was swapped in the index:

~~~text
Q: How many days do I have to return an item?
  retrieved : returns-v2(3), shipping(1)
  RAG       : Items can be returned within 14 days of delivery for a full refund. [returns-v2]
  fine-tuned: You have 30 days to return an item.
~~~

The prompt the generator receives is the part a real system sends to a real model. Its first line carries the three grounding rules: answer from the sources, cite, and admit when the sources do not answer.

~~~text
Answer only from the sources. Cite the source id. If the sources do not answer, say you do not know.
Sources:
[returns-v2] Items can be returned within 14 days of delivery for a full refund.
[shipping] We ship to the UK and the EU; delivery takes 3 to 5 business days.
Question: How many days do I have to return an item?
~~~

📌 **Interview term: citation (attribution)** — the passage id the answer came from, returned to the user. It makes answers checkable and makes wrong answers debuggable: you can see whether retrieval or generation failed.

📌 **Interview term: abstention** — the system declining to answer when the evidence is missing or weak, instead of guessing. In RAG it can be driven by the retrieval score, by the prompt, or both; it is one of the main tools in [reducing hallucinations](/interview-question/how-do-you-reduce-hallucinations-in-a-production-llm-application).

A real system calls a model where the stub is. A minimal sketch with the OpenAI Node SDK (not run here; the Responses API shape follows OpenAI's API reference, and the model name is a placeholder you would choose):

~~~ts
import OpenAI from "openai";
const client = new OpenAI();

const hits = await retrieve(question, tenantId);           // your vector or hybrid search
const response = await client.responses.create({
  model: "<model-id>",
  instructions: "Answer only from the sources. Cite the source id. If the sources do not answer, say you do not know.",
  input: hits.map((h) => \`[\${h.id}] \${h.text}\`).join("\\n") + \`\\nQuestion: \${question}\`,
});
console.log(response.output_text);
~~~

## 5. What RAG Does Not Fix

- **Bad retrieval.** If the passage holding the answer is split in half, buried at rank 30, or phrased differently from the question, the model never sees it. Retrieval quality is most of RAG engineering: chunking, [hybrid search with RRF](/interview-question/hybrid-search-why-combine-bm25-with-vectors-and-how-does-rrf-work), [reranking](/interview-question/what-is-reranking-and-why-add-it-after-retrieval) and [metadata filters](/interview-question/how-do-you-scope-retrieval-with-metadata-filtering-and-multi-tenancy). The full list of ways it breaks is in [common RAG failure modes](/interview-question/what-are-common-rag-failure-modes-and-how-do-you-debug-them).
- **A model that ignores its sources.** Grounding instructions reduce, not remove, answers that drift from the passages. You measure this with faithfulness metrics; see [evaluating a RAG pipeline end to end](/interview-question/how-do-you-evaluate-a-rag-pipeline-end-to-end).
- **Untrusted documents.** Retrieved text goes straight into the prompt, so a document containing "ignore your instructions" is an indirect [prompt injection](/interview-question/what-is-prompt-injection-and-how-do-you-defend-against-it).
- **Questions that need the whole corpus.** "Which of our 4,000 contracts has the shortest notice period?" is an aggregation; top-k passages cannot answer it. That needs structured extraction or a database query.

### When you do not need RAG at all

If the whole knowledge base is small and stable (a 30-page policy manual), it may simply fit in the model context window. Putting all of it in a static prompt prefix, served from a [prompt cache](/interview-question/what-is-prompt-caching-and-how-does-it-reduce-cost-and-latency), avoids a retrieval system entirely. RAG earns its complexity when the corpus is too large for the context, changes often, or has per-user access rules. See [using large context windows without drowning](/interview-question/context-windows-in-2025-26-how-do-you-use-128k-1m-tokens-without-drowning).

## 6. Verified: Running the Code

The example **"A minimal RAG loop vs a frozen fine-tuned stub: update, refusal, tenant filter and citation"** builds an in-memory index (a \`Map\` standing in for a vector database), runs the same question before and after a policy change, asks a question the documents do not answer, repeats a question for a second tenant, prints the assembled prompt, and does the token arithmetic for one knowledge update. What the simulation leaves out: embeddings (the retriever counts shared words after a crude stemmer), a real model (the generator copies the top passage), and real training costs (the token figures are illustrative assumptions: a 2-million-token corpus, 3 epochs, a 400-token document).

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
== day 1: both systems know the return window ==
Q: How many days do I have to return an item?
  retrieved : returns-v1(3), shipping(1)
  RAG       : Items can be returned within 30 days of delivery for a full refund. [returns-v1]
  fine-tuned: You have 30 days to return an item.

== day 2: policy changes to 14 days; RAG re-indexes one document ==
Q: How many days do I have to return an item?
  retrieved : returns-v2(3), shipping(1)
  RAG       : Items can be returned within 14 days of delivery for a full refund. [returns-v2]
  fine-tuned: You have 30 days to return an item.

== a question the documents do not answer ==
Q: Do you ship to Mars?
  retrieved : shipping(1)
  RAG       : I do not know based on the provided documents.
  fine-tuned: We ship to every country within 5 business days.

== same question, another tenant (metadata filter) ==
  globex RAG: Globex accepts returns within 60 days of delivery. [returns-b]

== the prompt the generator actually receives ==
Answer only from the sources. Cite the source id. If the sources do not answer, say you do not know.
Sources:
[returns-v2] Items can be returned within 14 days of delivery for a full refund.
[shipping] We ship to the UK and the EU; delivery takes 3 to 5 business days.
Question: How many days do I have to return an item?

== tokens processed to apply one policy change (illustrative) ==
  RAG re-embed one doc : 400 tokens
  fine-tune, 3 epochs : 6,000,000 tokens (15,000x)
~~~

What the run shows:

- **Freshness:** after one document was replaced, RAG answered 14 days with the new source id; the frozen stub still says 30.
- **Abstention:** for Mars, retrieval found only a weak match (1 shared word), so RAG refused; the frozen stub produced a confident, wrong "we ship to every country".
- **Scoping:** the same question for the \`globex\` tenant retrieved only that tenant document (60 days). One index, filtered per request.
- **Update cost:** re-embedding one document processes 400 tokens; retraining over the corpus for 3 epochs processes 6,000,000 under these assumptions, 15,000 times more, before evaluating the new model.

## Edge Cases Worth Knowing

- **Stale duplicates.** If the old document is not deleted when the new one is indexed, both are retrieved and the model sees "30 days" and "14 days" side by side. Index updates need a stable document id and an upsert or delete, as the example does with \`returns-v1\`.
- **Weak-match thresholds are corpus-specific.** "Fewer than two shared words" works for four documents. Real systems tune the refusal threshold (or a reranker score cut-off) on labelled questions.
- **Citations can be fabricated too.** A model can cite \`[returns-v2]\` for a sentence that is not in it. Check that cited ids were actually in the prompt, and spot-check that the claim is in the passage.
- **Permissions must be applied before ranking.** Filtering after you take the top k can leave a user with zero results, or worse, leak a restricted passage into the prompt; see [metadata filtering and multi-tenancy](/interview-question/how-do-you-scope-retrieval-with-metadata-filtering-and-multi-tenancy).

## Common Pitfalls

- **Fine-tuning to teach facts.** It is slow to update, cannot cite, cannot delete, and, per the knowledge-injection results above, often does not even learn the new facts reliably. Use it for behaviour.
- **Shipping RAG without a refusal path.** Without an instruction and a score threshold for "not in the documents", RAG falls back to the model's memory and hallucinates with an authoritative tone.
- **Judging the system only by the final answer.** Measure retrieval separately (was the right passage in the top k?). Most bad RAG answers are retrieval misses, and you cannot fix what you do not measure.
- **Stuffing too many passages.** Raising k from 5 to 50 rarely fixes a retrieval problem; it adds cost and noise. Fix ranking instead (hybrid search, reranking).
- **Forgetting the index is a data pipeline.** Documents change, get deleted and get permissions. Without ids, versioning and re-index jobs, the index silently drifts from the source of truth.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">RAG, retrieval-augmented generation, means that at question time you search an index of your own documents, put the top passages into the prompt, and have the model answer <strong style="color:#ffca28;">from those passages</strong> with citations.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Two paths:</strong> <span style="color:#f0e2c8;">Offline you load, chunk, embed and store documents with metadata. Online you retrieve top-k for the question, build a prompt with grounding rules, and generate. The answer is capped by retrieval quality.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why not fine-tune:</strong> <span style="color:#f0e2c8;">Knowledge in weights is <strong style="color:#ffca28;">parametric memory</strong>: slow to update, impossible to cite, hard to delete, and the same for every user. An index is <strong style="color:#ffca28;">non-parametric memory</strong>: re-index one doc and it is live, delete and it is gone, filter per tenant, cite the passage.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Evidence:</strong> <span style="color:#f0e2c8;">Published comparisons, for example Ovadia et al. at EMNLP 2024, found RAG beat unsupervised fine-tuning at injecting both known and new facts. So: fine-tune for behaviour and format, retrieve for knowledge, and combine them when useful.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. What it does not fix:</strong> <span style="color:#f0e2c8;">Bad chunking or ranking means the model never sees the answer, retrieved text can carry prompt injection, and aggregation questions need structured queries. And if the corpus is small and stable, a cached long prompt may be simpler than RAG.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is RAG better at avoiding hallucinations?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because the answer can be checked against passages that were in the prompt, and because you can <strong style="color:#ffca28;">abstain</strong>: if retrieval scores are weak, refuse instead of guessing. RAG does not eliminate hallucination; the model can still drift from its sources, so you measure faithfulness.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you fine-tune instead, or as well?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the problem is behaviour: a strict output format, a tone, a narrow classification task, domain jargon, or teaching the model to cite and refuse reliably. Those are about <em style="color:#d8d8d8;">how</em> it answers. Facts that change stay in the index; a fine-tuned model can sit on top of RAG.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">The context windows are huge now. Why not paste every document into the prompt?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For a small, stable corpus that is a valid design, especially with prompt caching. It breaks down when the corpus exceeds the window, when you pay for hundreds of thousands of input tokens on every call, when quality degrades on very long inputs, and when different users may see different documents.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a user who must not see some documents?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store tenant and permission metadata on every chunk and apply the filter <strong style="color:#ffca28;">inside</strong> the retrieval query, before ranking, never after taking top-k. The example filters on <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tenant</code> before scoring, so the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">globex</code> question only ever sees <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">globex</code> documents.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know whether a bad answer came from retrieval or generation?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Log what was retrieved for each request. If the right passage was not in the top-k, it is a retrieval problem (chunking, ranking, filters). If it was there and the answer still went wrong, it is generation (prompt, model, too much noise). Evaluate the two separately.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Retrieval-Augmented Generation (RAG) | Retrieve relevant passages at question time, put them in the prompt, answer from them |
| Parametric memory | Knowledge stored in the model weights |
| Non-parametric memory | Knowledge stored in an external, editable index |
| Grounding | Making the answer depend on supplied evidence |
| Retriever | The search component that returns ranked passages for a query |
| Top-k | The number of retrieved passages placed in the prompt |
| Fine-tuning | Further training that changes the model weights |
| Citation (attribution) | The source id an answer came from, shown to the user |
| Abstention | Declining to answer when evidence is missing or weak |

**Conclusion:** RAG gives a language model an open book: an index you control, searched at question time, whose passages go into the prompt so the model answers from evidence and can cite it. For knowledge that changes, must be deletable, must be scoped per user or must be checkable, that beats fine-tuning on every axis except per-query cost, and published comparisons found it more accurate too. Fine-tuning remains the tool for changing behaviour, and the two combine well. The catch is that RAG moves the hard problem from training to retrieval: chunking, hybrid search, reranking, filters and evaluation are where a RAG system is actually won or lost.`,
    examples: [
      {
        label: `A minimal RAG loop vs a frozen fine-tuned stub: update, refusal, tenant filter and citation`,
        variants: [
          { tech: "node", code: `// RAG vs "knowledge baked into weights", with deterministic stubs (no model is called).
// The retriever is a tiny keyword index; the "generator" answers only from retrieved text.
const STOP = new Set("a an the is are do does i my of to in on for what how many can you we our with be it".split(" "));
const stem = (w) => (w.length > 4 && w.endsWith("ed") ? w.slice(0, -2) : w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);
const words = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\\s+/).filter((w) => w && !STOP.has(w)).map(stem);

const docs = new Map(); // id -> { tenant, text }  (stands in for a vector store)
const upsert = (id, tenant, text) => docs.set(id, { tenant, text });

function retrieve(question, tenant, k = 2) {
  const q = new Set(words(question));
  return [...docs.entries()]
    .filter(([, d]) => d.tenant === tenant) // scope: a tenant only sees its own docs
    .map(([id, d]) => ({ id, text: d.text, score: words(d.text).filter((w) => q.has(w)).length }))
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1))
    .slice(0, k);
}

function buildPrompt(question, hits) {
  const ctx = hits.map((h) => \`[\${h.id}] \${h.text}\`).join("\\n");
  return \`Answer only from the sources. Cite the source id. If the sources do not answer, say you do not know.\\nSources:\\n\${ctx}\\nQuestion: \${question}\`;
}

// Stub generator: copies the best-matching source sentence and cites it; refuses when nothing matches well.
function generate(question, hits) {
  const best = hits[0];
  if (!best || best.score < 2) return "I do not know based on the provided documents.";
  return \`\${best.text} [\${best.id}]\`;
}

// Stub "fine-tuned" model: facts memorised at training time, no sources, never says "I do not know".
const trainedSnapshot = {
  "return": "You have 30 days to return an item.",
  "ship": "We ship to every country within 5 business days.",
};
function fineTuned(question) {
  const ws = words(question).join(" ");
  if (ws.includes("return")) return trainedSnapshot.return;
  return trainedSnapshot.ship; // closest memory, stated confidently
}

const ask = (label, question, tenant = "acme") => {
  const hits = retrieve(question, tenant);
  console.log(\`\${label}\`);
  console.log(\`  retrieved : \${hits.map((h) => \`\${h.id}(\${h.score})\`).join(", ") || "(none)"}\`);
  console.log(\`  RAG       : \${generate(question, hits)}\`);
  console.log(\`  fine-tuned: \${fineTuned(question)}\`);
};

upsert("returns-v1", "acme", "Items can be returned within 30 days of delivery for a full refund.");
upsert("shipping", "acme", "We ship to the UK and the EU; delivery takes 3 to 5 business days.");
upsert("warranty", "acme", "Electronics carry a 2 year warranty covering manufacturing defects.");
upsert("returns-b", "globex", "Globex accepts returns within 60 days of delivery.");

console.log("== day 1: both systems know the return window ==");
ask("Q: How many days do I have to return an item?", "How many days do I have to return an item?");

console.log("\\n== day 2: policy changes to 14 days; RAG re-indexes one document ==");
docs.delete("returns-v1");
upsert("returns-v2", "acme", "Items can be returned within 14 days of delivery for a full refund.");
ask("Q: How many days do I have to return an item?", "How many days do I have to return an item?");

console.log("\\n== a question the documents do not answer ==");
ask("Q: Do you ship to Mars?", "Do you ship to Mars?");

console.log("\\n== same question, another tenant (metadata filter) ==");
const hb = retrieve("How many days do I have to return an item?", "globex");
console.log(\`  globex RAG: \${generate("x", hb)}\`);

console.log("\\n== the prompt the generator actually receives ==");
const q = "How many days do I have to return an item?";
console.log(buildPrompt(q, retrieve(q, "acme")));

// Cost of a knowledge update, illustrative: re-embed 1 doc vs a fine-tuning run over the whole corpus.
const corpusTokens = 2_000_000, docTokens = 400, epochs = 3;
console.log("\\n== tokens processed to apply one policy change (illustrative) ==");
console.log(\`  RAG re-embed one doc : \${docTokens.toLocaleString("en-US")} tokens\`);
console.log(\`  fine-tune, \${epochs} epochs : \${(corpusTokens * epochs).toLocaleString("en-US")} tokens (\${(corpusTokens * epochs / docTokens).toLocaleString("en-US")}x)\`);` },
          { tech: "python", code: `# RAG vs "knowledge baked into weights", with deterministic stubs (no model is called).
# The retriever is a tiny keyword index; the "generator" answers only from retrieved text.
import re

STOP = set("a an the is are do does i my of to in on for what how many can you we our with be it".split(" "))


def stem(w):
    if len(w) > 4 and w.endswith("ed"):
        return w[:-2]
    if len(w) > 3 and w.endswith("s"):
        return w[:-1]
    return w


def words(s):
    return [stem(w) for w in re.sub(r"[^a-z0-9 ]", " ", s.lower()).split() if w not in STOP]


docs = {}  # id -> {tenant, text}  (stands in for a vector store)


def upsert(id_, tenant, text):
    docs[id_] = {"tenant": tenant, "text": text}


def retrieve(question, tenant, k=2):
    q = set(words(question))
    hits = []
    for id_, d in docs.items():
        if d["tenant"] != tenant:  # scope: a tenant only sees its own docs
            continue
        score = len([w for w in words(d["text"]) if w in q])
        if score > 0:
            hits.append({"id": id_, "text": d["text"], "score": score})
    hits.sort(key=lambda h: (-h["score"], h["id"]))
    return hits[:k]


def build_prompt(question, hits):
    ctx = "\\n".join(f"[{h['id']}] {h['text']}" for h in hits)
    return ("Answer only from the sources. Cite the source id. If the sources do not answer, say you do not know.\\n"
            f"Sources:\\n{ctx}\\nQuestion: {question}")


# Stub generator: copies the best-matching source sentence and cites it; refuses when nothing matches well.
def generate(question, hits):
    best = hits[0] if hits else None
    if not best or best["score"] < 2:
        return "I do not know based on the provided documents."
    return f"{best['text']} [{best['id']}]"


# Stub "fine-tuned" model: facts memorised at training time, no sources, never says "I do not know".
trained_snapshot = {
    "return": "You have 30 days to return an item.",
    "ship": "We ship to every country within 5 business days.",
}


def fine_tuned(question):
    if "return" in " ".join(words(question)):
        return trained_snapshot["return"]
    return trained_snapshot["ship"]  # closest memory, stated confidently


def ask(label, question, tenant="acme"):
    hits = retrieve(question, tenant)
    print(label)
    print(f"  retrieved : {', '.join(f'{h['id']}({h['score']})' for h in hits) or '(none)'}")
    print(f"  RAG       : {generate(question, hits)}")
    print(f"  fine-tuned: {fine_tuned(question)}")


upsert("returns-v1", "acme", "Items can be returned within 30 days of delivery for a full refund.")
upsert("shipping", "acme", "We ship to the UK and the EU; delivery takes 3 to 5 business days.")
upsert("warranty", "acme", "Electronics carry a 2 year warranty covering manufacturing defects.")
upsert("returns-b", "globex", "Globex accepts returns within 60 days of delivery.")

print("== day 1: both systems know the return window ==")
ask("Q: How many days do I have to return an item?", "How many days do I have to return an item?")

print("\\n== day 2: policy changes to 14 days; RAG re-indexes one document ==")
del docs["returns-v1"]
upsert("returns-v2", "acme", "Items can be returned within 14 days of delivery for a full refund.")
ask("Q: How many days do I have to return an item?", "How many days do I have to return an item?")

print("\\n== a question the documents do not answer ==")
ask("Q: Do you ship to Mars?", "Do you ship to Mars?")

print("\\n== same question, another tenant (metadata filter) ==")
hb = retrieve("How many days do I have to return an item?", "globex")
print(f"  globex RAG: {generate('x', hb)}")

print("\\n== the prompt the generator actually receives ==")
q = "How many days do I have to return an item?"
print(build_prompt(q, retrieve(q, "acme")))

# Cost of a knowledge update, illustrative: re-embed 1 doc vs a fine-tuning run over the whole corpus.
corpus_tokens, doc_tokens, epochs = 2_000_000, 400, 3
print("\\n== tokens processed to apply one policy change (illustrative) ==")
print(f"  RAG re-embed one doc : {doc_tokens:,} tokens")
print(f"  fine-tune, {epochs} epochs : {corpus_tokens * epochs:,} tokens ({corpus_tokens * epochs // doc_tokens:,}x)")` },
        ],
      },
    ],
  },
  {
    title: `What chunking strategies exist and how does chunk size affect RAG quality?`,
    difficulty: "medium",
    seoDescription: `Fixed, recursive, structure-aware, semantic, parent-child and late chunking compared, and why chunks that are too small or too large hurt retrieval.`,
    description: `**Question presented to candidate:**
"Before documents go into a RAG index they get split into chunks. What chunking strategies are there, how do they differ, and what actually happens to retrieval quality when chunks are too small or too large?"

**What a strong answer should cover:**
- Why chunking exists at all: the chunk is the unit that is embedded, ranked and pasted into the prompt, so one vector has to represent one chunk and the model only sees whole chunks
- The main families: fixed-size windows (characters or tokens, with overlap), sentence and paragraph splits, recursive splitting on a separator hierarchy, structure-aware splitting (headings, HTML, code, tables), semantic splitting by embedding similarity, and parent-child (embed small, return large)
- Context-preserving add-ons: prefixing each chunk with its heading path or a generated summary of where it sits (contextual chunk headers, contextual retrieval) and late chunking, which embeds the whole document before splitting
- The size trade-off: small chunks match precisely but lose context (a sentence that says "the limit is 20" without saying which plan) and split facts across boundaries; large chunks keep context but blur the embedding, send more tokens, and bury the answer in noise
- That there is no universal best size; it depends on the documents, the questions and the embedding model, and is chosen by measuring retrieval

**Code / implementation expected:** Optional — a fixed-size or recursive splitter, or a comparison of strategies on a small corpus, is a strong signal.`,
    answer: `**Target Audience:** Engineers building their first RAG index, and anyone who needs to name and compare chunking strategies precisely in an interview.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (six chunkers and a TF-IDF retriever on one handbook; TF-IDF stands in for an embedding model, and no model is called). Library and paper facts were checked in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

You are turning a cookbook into index cards so a friend can find recipes fast. If you cut the book every 60 characters, one card says "bake for 20 min" and the next says "utes at 180 degrees", and nobody can tell which recipe either card belongs to. If you put the whole chapter on one card, the card for "how long do I bake the bread?" also contains 14 other recipes, and your friend has to read all of them. The useful card is one recipe, with its title written at the top.

A RAG system has the same problem. The search engine never sees your documents, only the cards you cut them into, and the model only ever reads whole cards. How you cut decides what can be found and what the model gets to read.

## 2. What a Chunk Is, and Why It Is the Unit of Everything

📌 **Interview term: chunk** — a piece of a source document stored as one searchable record: one embedding vector, one entry in the keyword index, one block of text pasted into the prompt.

📌 **Interview term: chunking** — the step in the indexing pipeline that splits documents into chunks, before embedding. It is part of the offline path described in [What is RAG?](/interview-question/what-is-rag-and-why-use-it-instead-of-fine-tuning-for-knowledge)

Three things happen per chunk, and each one pulls chunk size in a different direction:

1. **It is embedded as one vector.** An embedding compresses the whole chunk into one point ([What are embeddings?](/interview-question/what-are-embeddings-and-what-are-they-used-for)). A chunk about one thing gives a sharp point; a chunk about five things gives a blurred average of all five.
2. **It is ranked as one unit.** The retriever returns chunks, not sentences. If the answer is split across two chunks, neither one fully contains it.
3. **It is read as one unit.** Whatever is in a retrieved chunk is paid for in input tokens and must be read past by the model.

📌 **Interview term: retrieval granularity** — the size of the unit the retriever returns. Chunking sets it; parent-child retrieval (below) separates the unit you *search* from the unit you *return*.

## 3. The Strategy Catalogue

### Fixed-size windows

Cut every N characters or N tokens, optionally repeating the last M of each chunk at the start of the next (overlap). Simple, fast, predictable size, completely blind to meaning: it cuts mid-sentence and mid-table.

📌 **Interview term: fixed-size chunking** — splitting by a length budget alone, usually counted in tokens of the embedding model.

📌 **Interview term: chunk overlap** — the number of tokens two neighbouring chunks share, so a fact near a boundary is still whole in at least one of them. Choosing it is the subject of the sibling question, [how to pick size, overlap and strategy](/interview-question/chunking-in-rag-how-do-you-pick-size-overlap-and-strategy).

### Sentence and paragraph splits

Split on sentence or paragraph boundaries. Every chunk is grammatical, but sizes vary wildly, and a single sentence often depends on its neighbours ("It is kept for 90 days." What is?).

### Recursive splitting

Try the biggest natural separator first, and only fall back to smaller ones for pieces that are still too long; then merge small neighbours back up to the size limit. LangChain popularised this as \`RecursiveCharacterTextSplitter\`, whose documentation gives the default separator order as paragraph break, line break, space, then single characters, and describes it as trying them "in order until the chunks are small enough" (LangChain docs, checked October 2026). The example implements the same idea in a dozen lines:

~~~js
function recursive(text, size, seps = ["\\n\\n", "\\n", ". ", " "]) {
  if (text.length <= size || !seps.length) return [text];
  const [sep, ...rest] = seps;
  const pieces = text.split(sep).flatMap((p) => recursive(p, size, rest));
  const out = []; // greedily merge neighbours back up to the size limit
  for (const p of pieces) {
    if (out.length && out[out.length - 1].length + sep.length + p.length <= size) out[out.length - 1] += sep + p;
    else out.push(p);
  }
  return out;
}
~~~

📌 **Interview term: recursive character splitting** — splitting on a hierarchy of separators, from paragraphs down to words, so chunks follow natural boundaries whenever the size budget allows.

### Structure-aware splitting

Use the document's own structure: Markdown or HTML headings, numbered clauses in a contract, functions and classes in code (by parsing it), one row group per table with the header row repeated. Usually the biggest single win on well-structured content, because authors already grouped related sentences.

📌 **Interview term: structure-aware (document-aware) chunking** — splitting along headings, sections, code syntax or table boundaries rather than by length.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 250" role="img" aria-label="The same handbook cut two ways: fixed 60 character windows cut across the Free plan and Pro plan sections, while heading-aware chunks keep one plan per chunk">
  <text class="d-text" x="20" y="34">fixed 60 chars</text>
  <rect class="d-box-muted" x="20" y="50" width="220" height="56" rx="8"/>
  <text class="d-sub" x="130" y="83" text-anchor="middle">for 7 days. Pro plan The</text>
  <rect class="d-box-muted" x="270" y="50" width="220" height="56" rx="8"/>
  <text class="d-sub" x="380" y="83" text-anchor="middle">Pro plan costs 49 dollars per m</text>
  <rect class="d-box-muted" x="520" y="50" width="220" height="56" rx="8"/>
  <text class="d-sub" x="630" y="83" text-anchor="middle">onth. The rate limit is 300</text>
  <text class="d-text" x="20" y="154">heading sections</text>
  <rect class="d-box-accent" x="20" y="170" width="220" height="56" rx="8"/>
  <text class="d-sub" x="130" y="203" text-anchor="middle">Free plan: costs, limit, data</text>
  <rect class="d-box-accent" x="270" y="170" width="220" height="56" rx="8"/>
  <text class="d-sub" x="380" y="203" text-anchor="middle">Pro plan: costs, limit, data</text>
  <rect class="d-box-accent" x="520" y="170" width="220" height="56" rx="8"/>
  <text class="d-sub" x="630" y="203" text-anchor="middle">Enterprise plan: costs, limit</text>
</svg>

Fixed windows cut wherever the count runs out, so one chunk mixes the end of the Free plan with the start of the Pro plan. Heading-aware chunks each describe exactly one plan and carry its name.

### Semantic chunking

Embed each sentence, walk through the document, and start a new chunk where the similarity between consecutive sentences drops below a threshold, meaning the topic changed. It finds topic boundaries in unstructured text (transcripts, long prose) at the cost of one embedding call per sentence at index time, and an extra threshold to tune.

📌 **Interview term: semantic chunking** — placing chunk boundaries where adjacent-sentence embedding similarity drops, rather than at a fixed length.

### Parent-child (small-to-big)

Index small chunks (sentences or short passages) for precise matching, but when one matches, return its larger parent (the whole section) to the model. This decouples the two jobs that pull size in opposite directions.

📌 **Interview term: parent-child retrieval (small-to-big)** — search over small child chunks, return the parent chunk that contains the match.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Parent-child retrieval: the query matches a small child sentence inside a section, and the whole parent section is what is sent to the model">
  <defs>
    <marker id="ai06q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="80" width="130" height="60" rx="10"/>
  <text class="d-text" x="85" y="115" text-anchor="middle">query</text>
  <rect class="d-box-muted" x="210" y="20" width="300" height="190" rx="12"/>
  <text class="d-text" x="360" y="48" text-anchor="middle">parent: Pro plan section</text>
  <rect class="d-box" x="235" y="66" width="250" height="36" rx="8"/>
  <text class="d-sub" x="360" y="89" text-anchor="middle">child: costs 49 dollars</text>
  <rect class="d-box-accent" x="235" y="114" width="250" height="36" rx="8"/>
  <text class="d-sub" x="360" y="137" text-anchor="middle">child: data kept 90 days</text>
  <rect class="d-box" x="235" y="162" width="250" height="36" rx="8"/>
  <text class="d-sub" x="360" y="185" text-anchor="middle">child: rate limit 300</text>
  <rect class="d-box-accent" x="590" y="80" width="150" height="60" rx="10"/>
  <text class="d-text" x="665" y="107" text-anchor="middle">LLM reads</text>
  <text class="d-sub" x="665" y="126" text-anchor="middle">whole parent</text>
  <path class="d-edge" d="M 150 120 L 227 130" marker-end="url(#ai06q2-arrow)"/>
  <path class="d-edge-accent" d="M 510 110 L 582 110" marker-end="url(#ai06q2-arrow)"/>
</svg>

The match happens on one small, sharp sentence; the model still gets the full section, so it also sees which plan the sentence is about.

### Adding context back into each chunk

A chunk that says "The rate limit is 300 requests per minute." is useless without knowing it belongs to the Pro plan. Three techniques put that context back:

📌 **Interview term: contextual chunk headers** — prefixing every chunk with its document title and heading path ("Acme Cloud Handbook > Pro plan: ...") before embedding. Cheap and deterministic; the example does this in its heading and parent-child strategies.

📌 **Interview term: contextual retrieval** — Anthropic's name (September 2024) for having a model write a short note situating each chunk in its document, and prepending it before both embedding and BM25 indexing. Anthropic's original post was not retrieved here; secondary coverage of it reports a 49% drop in top-20 retrieval failures from contextual embeddings plus contextual BM25, and about 67% with reranking added, on Anthropic's own benchmarks. It costs one model call per chunk at index time, which prompt caching of the document makes cheaper.

📌 **Interview term: late chunking** — run a long-context embedding model over the whole document first, then split the token embeddings into chunks and average each span, so every chunk vector was computed with the full document in view. Introduced by Günther et al. (Jina AI), "Late Chunking: Contextual Chunk Embeddings Using Long-Context Embedding Models" (arXiv 2409.04701, 2024), and it needs an embedding model that exposes token-level outputs.

### Summary table

| Strategy | Boundaries come from | Good for | Weakness |
| :--- | :--- | :--- | :--- |
| Fixed-size (tokens) | Length budget | Uniform text, a quick baseline | Cuts sentences, tables and facts |
| Sentence / paragraph | Punctuation, blank lines | Prose with self-contained paragraphs | Sizes vary; lone sentences lose context |
| Recursive | Separator hierarchy + budget | General default for mixed text | Still blind to headings and semantics |
| Structure-aware | Headings, clauses, AST, tables | Docs, manuals, code, contracts | Needs a parser per format |
| Semantic | Embedding similarity drops | Transcripts, unstructured prose | Index-time cost, threshold tuning |
| Parent-child | Small for search, large for reading | Precise questions needing context | Two levels to store and keep in sync |
| Contextual headers / retrieval | Added context, any splitter | Chunks that depend on their heading | Extra index-time work |
| Late chunking | Any splitter, embedded in context | Pronoun-heavy, cross-referencing text | Needs a suitable long-context embedder |

## 4. How Chunk Size Changes Retrieval Quality

The example splits one short handbook (five sections: three plans, refunds, support) six ways, then asks six questions whose answers are known sentences. A strategy scores a hit when the top retrieved chunk contains the whole answer sentence.

~~~text
strategy          chunks  avg chars  hit@1  chars sent/answer
fixed 60 chars        13       57.5    1/6               54.5
fixed 600 chars        2      373.5    6/6              524.5
one sentence          15       42.7    4/6               51.3
recursive 200          5      147.8    6/6              149.8
heading section        5      142.0    6/6              148.7
parent-child          15       53.9    6/6              148.7
~~~

Each row is a lesson:

- **Too small, cut blindly (fixed 60):** 1 of 6. The answers are longer than the window or straddle a boundary, so no single chunk holds them. Chunk 3 is literally \`for 7 days.\\n\\n## Pro plan\\nThe Pro plan costs 49 dollars per m\`.
- **Too small, cut cleanly (one sentence):** 4 of 6. Every answer sentence exists whole, but "The rate limit is 5000 requests per minute." and "The rate limit is 20 requests per minute." look identical to the retriever once the heading is gone, and it picked the Free plan for an Enterprise question.
- **Too large (fixed 600):** 6 of 6, but each answer arrived inside about 525 characters of text, 3.5 times what the section-sized strategies sent. On a two-chunk index, "retrieval" is barely choosing anything. At real scale, large chunks are where embeddings blur, and the model must find one sentence in a long block, which is where the "lost in the middle" effect bites ([large context windows](/interview-question/context-windows-in-2025-26-how-do-you-use-128k-1m-tokens-without-drowning)).
- **Right-sized and structure-respecting (recursive 200, heading section):** 6 of 6 at about 150 characters sent. On this document they produce the same five chunks, because every section is one paragraph under 200 characters.
- **Parent-child:** 6 of 6, matching on 54-character sentences that carry a heading prefix, while sending the 149-character section.

📌 **Interview term: context dilution** — the drop in match quality when a chunk covers many topics, so its single vector sits between them and is close to none of them.

📌 **Interview term: context fragmentation** — the opposite failure: the facts needed to answer are spread across several chunks, or a chunk has lost the heading or sentence that gives it meaning.

What does published work say about sizes? Chroma's technical report "Evaluating Chunking Strategies for Retrieval" (July 2024) concluded that recursive splitting often performs well when its parameters are chosen appropriately, and that the default settings of some popular splitters perform relatively poorly. Secondary write-ups reproduce its tables with strong results around 200 tokens; that specific figure was not checked against the report here, and it is for their corpora and embedding models, not yours. The honest answer to "what size?" is a measured one, which is what the sibling page on [picking size, overlap and strategy](/interview-question/chunking-in-rag-how-do-you-pick-size-overlap-and-strategy) walks through.

## 5. Verified: Running the Code

The example **"Six chunking strategies on one handbook: hit@1 and context size per strategy"** implements fixed-size, sentence, recursive, heading-section and parent-child chunking, indexes each with TF-IDF cosine similarity (a deterministic stand-in for an embedding model: it matches shared words, not meanings), and scores six labelled questions. What the simulation leaves out: semantic and late chunking (both need a real embedding model), a real tokenizer (sizes are in characters), and scale (one document, so even giant chunks are easy to choose between).

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
strategy          chunks  avg chars  hit@1  chars sent/answer
fixed 60 chars        13       57.5    1/6               54.5
fixed 600 chars        2      373.5    6/6              524.5
one sentence          15       42.7    4/6               51.3
recursive 200          5      147.8    6/6              149.8
heading section        5      142.0    6/6              148.7
parent-child          15       53.9    6/6              148.7

why the misses happen:
  fixed 60 chars:
    Q2 got "for 7 days.  ## Pro plan The Pro plan costs "
    Q3 got "inal card. A refund takes 5 to 10 business d"
    Q4 got "esponse target for outages."
    Q5 got "for 7 days.  ## Pro plan The Pro plan costs "
    Q6 got " the statement. Annual plans can be refunded"
  one sentence:
    Q1 got "The rate limit is 20 requests per minute."
    Q2 got "Data is kept for 7 days."

fixed 60 cuts mid-sentence, e.g. chunk 3:
  "for 7 days.\\n\\n## Pro plan\\nThe Pro plan costs 49 dollars per m"
~~~

The "why the misses happen" lines show the two failure modes side by side: fixed windows retrieve fragments such as \`"inal card. A refund takes 5 to 10 business d"\`, and context-free sentences retrieve the right kind of fact for the wrong plan.

## Edge Cases Worth Knowing

- **Tables.** Splitting a table by length separates rows from their header. Keep a table whole if it fits, or chunk by row groups and repeat the header row in each chunk.
- **Code.** Split on function or class boundaries using a parser; a window that cuts a function in half matches neither half well.
- **PDF artefacts.** Page headers, footers and hyphenated line breaks end up inside chunks unless cleaned first; repeated headers also make every chunk look similar.
- **The embedding model input limit.** Text beyond an embedding model's maximum input length can be truncated or rejected depending on the provider and its settings (check yours), and if it is truncated a chunk larger than the limit silently loses its tail. Size chunks in the embedding model's own tokens.
- **Very short documents.** An FAQ entry of two sentences should be one chunk; splitting it only removes context.

## Common Pitfalls

- **Keeping the splitter defaults.** A library default was chosen for nobody in particular; the Chroma report found some defaults perform relatively poorly. Measure on your own questions.
- **Counting characters when the limits are in tokens.** Embedding limits, costs and context budgets are all in tokens, and the ratio of characters to tokens varies by language and content ([tokens](/interview-question/what-are-tokens-and-why-do-they-matter-for-cost-and-limits)).
- **Dropping the headings.** Most lost context is the heading. Prepend the heading path to every chunk; it is nearly free.
- **One strategy for every format.** Manuals, code, chat transcripts and spreadsheets need different splitters; route by document type.
- **Changing chunking without re-indexing everything.** Mixed chunkings in one index make scores incomparable. Re-chunk and re-embed the whole corpus and version the index.
- **Tuning chunking by eye.** Reading a few chunks feels productive; only a labelled question set tells you whether retrieval improved ([evaluating a RAG pipeline](/interview-question/how-do-you-evaluate-a-rag-pipeline-end-to-end)).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Why it matters:</strong> <span style="color:#f0e2c8;">The chunk is the unit that gets <strong style="color:#ffca28;">one embedding</strong>, gets ranked, and gets pasted into the prompt. So chunking caps retrieval: if the answer is split or blurred, no retriever or model can recover it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The families:</strong> <span style="color:#f0e2c8;">Fixed-size windows with overlap; sentence or paragraph splits; <strong style="color:#ffca28;">recursive</strong> splitting down a separator hierarchy; <strong style="color:#ffca28;">structure-aware</strong> splits on headings, code or tables; <strong style="color:#ffca28;">semantic</strong> splits where adjacent-sentence similarity drops; and <strong style="color:#ffca28;">parent-child</strong>, which searches small chunks but returns the parent section.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Putting context back:</strong> <span style="color:#f0e2c8;">Chunks lose their heading. Fix it with contextual chunk headers (prefix the heading path), contextual retrieval (a generated situating note per chunk), or <strong style="color:#ffca28;">late chunking</strong>, which embeds the whole document before splitting.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Size trade-off:</strong> <span style="color:#f0e2c8;">Small chunks match sharply but fragment: in my run, one-sentence chunks retrieved the Free plan rate limit for an Enterprise question. Large chunks keep context but dilute the vector and send more tokens: 600-character chunks hit 6/6 but sent 3.5 times the text.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. How I would choose:</strong> <span style="color:#f0e2c8;">Start with structure-aware or recursive chunks plus heading paths, consider parent-child when questions are precise, and pick the size with a labelled question set, measuring recall and tokens sent, not by eye or by library default.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is semantic chunking always better than fixed-size?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. It helps on long unstructured prose where topics shift without headings, but it costs an embedding per sentence at index time and adds a threshold to tune. On documents with good headings, structure-aware splitting is usually as good and much cheaper. Measure both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between parent-child retrieval and just using bigger chunks?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Bigger chunks make the <strong style="color:#ffca28;">search</strong> vector blurry. Parent-child keeps the search unit small and sharp and only enlarges the <strong style="color:#ffca28;">reading</strong> unit after a match, so you get precise matching and full context at the same time, at the cost of storing two levels.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you chunk tables and code?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Tables: keep small tables whole, otherwise chunk by row groups and repeat the header row in each chunk. Code: parse it and split by function or class, keeping the file path and signature in a header. Never cut either by a character count.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does late chunking actually change?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Normal chunking embeds each chunk alone, so a chunk saying <em style="color:#d8d8d8;">it expires after 90 days</em> does not know what <em style="color:#d8d8d8;">it</em> is. Late chunking runs a long-context embedder over the whole document, then averages the token vectors of each chunk span, so each chunk vector was computed with the whole document in view.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If you change the chunker, what else has to change?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Everything downstream of it: re-chunk and re-embed the whole corpus into a new index version, re-run the retrieval eval, and re-check top-k and the context budget, because chunk size and top-k together set how many tokens each query sends.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Chunk | One searchable piece of a document: one vector, one index entry, one prompt block |
| Chunking | Splitting documents into chunks before embedding |
| Retrieval granularity | The size of the unit the retriever returns |
| Fixed-size chunking | Splitting by a length budget alone |
| Chunk overlap | Tokens shared by neighbouring chunks so boundary facts stay whole |
| Recursive character splitting | Splitting on a separator hierarchy within a size budget |
| Structure-aware chunking | Splitting along headings, sections, code syntax or tables |
| Semantic chunking | Boundaries where adjacent-sentence similarity drops |
| Parent-child retrieval | Search small chunks, return their larger parent |
| Contextual chunk headers | Prefixing each chunk with its title and heading path |
| Contextual retrieval | Prepending a generated situating note to each chunk before indexing |
| Late chunking | Embedding the whole document, then pooling token vectors per chunk |
| Context dilution | A multi-topic chunk whose vector matches no topic well |
| Context fragmentation | Needed facts or their context split across chunks |

**Conclusion:** Chunking decides the unit that is embedded, ranked and read, so it quietly caps everything downstream. The strategies range from blind (fixed windows) through boundary-respecting (sentences, recursive, structure-aware, semantic) to designs that separate the search unit from the reading unit (parent-child) or put lost context back (contextual headers, contextual retrieval, late chunking). Small chunks match sharply but fragment meaning; large chunks keep meaning but dilute the match and cost tokens. Start with structure-aware or recursive chunks with the heading path attached, then let a labelled question set, not a default, decide the size.`,
    examples: [
      {
        label: `Six chunking strategies on one handbook: hit@1 and context size per strategy`,
        variants: [
          { tech: "node", code: `// Six chunking strategies on one handbook, scored by a TF-IDF retriever (stands in for embeddings).
const DOC = \`# Acme Cloud Handbook

## Free plan
The Free plan costs nothing. The rate limit is 20 requests per minute. Data is kept for 7 days.

## Pro plan
The Pro plan costs 49 dollars per month. The rate limit is 300 requests per minute. Data is kept for 90 days.

## Enterprise plan
Pricing is negotiated per contract. The rate limit is 5000 requests per minute. Data is kept for 3 years.

## Refunds
Refunds go back to the original card. A refund takes 5 to 10 business days to appear on the statement. Annual plans can be refunded within 30 days of purchase.

## Support
Free users get community support only. Pro users get email support with a 24 hour response target. Enterprise customers get a named engineer and a 1 hour response target for outages.\`;

const QA = [
  ["What is the rate limit on the Enterprise plan?", "The rate limit is 5000 requests per minute."],
  ["How long is data kept on the Pro plan?", "Data is kept for 90 days."],
  ["How long does a refund take to appear on the statement?", "A refund takes 5 to 10 business days to appear on the statement."],
  ["What response target do Enterprise customers get for outages?", "a named engineer and a 1 hour response target for outages"],
  ["How much does the Pro plan cost?", "The Pro plan costs 49 dollars per month."],
  ["Can annual plans be refunded?", "Annual plans can be refunded within 30 days of purchase."],
];

const STOP = new Set("a an the is are do does of to on for what how long much can be get".split(" "));
const toks = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\\s+/)
  .filter((w) => w && !STOP.has(w)).map((w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w));

// --- strategies: each returns [{ embed: text that is indexed, ret: text handed to the LLM }]
const fixed = (size) => { const out = []; for (let i = 0; i < DOC.length; i += size) out.push(DOC.slice(i, i + size)); return out; };
const sentences = (t) => t.split("\\n").filter((l) => l && !l.startsWith("#")).flatMap((l) => l.match(/[^.]+\\./g)).map((s) => s.trim());
function recursive(text, size, seps = ["\\n\\n", "\\n", ". ", " "]) {
  if (text.length <= size || !seps.length) return [text];
  const [sep, ...rest] = seps;
  const pieces = text.split(sep).flatMap((p) => recursive(p, size, rest));
  const out = []; // greedily merge neighbours back up to the size limit
  for (const p of pieces) {
    if (out.length && out[out.length - 1].length + sep.length + p.length <= size) out[out.length - 1] += sep + p;
    else out.push(p);
  }
  return out;
}
const sections = () => DOC.split("\\n## ").slice(1).map((s) => { const [h, ...body] = s.split("\\n"); return { h, body: body.join(" ") }; });

const STRATEGIES = {
  "fixed 60 chars": () => fixed(60).map((c) => ({ embed: c, ret: c })),
  "fixed 600 chars": () => fixed(600).map((c) => ({ embed: c, ret: c })),
  "one sentence": () => sentences(DOC).map((c) => ({ embed: c, ret: c })),
  "recursive 200": () => recursive(DOC, 200).map((c) => ({ embed: c, ret: c })),
  "heading section": () => sections().map(({ h, body }) => ({ embed: \`\${h}: \${body}\`, ret: \`\${h}: \${body}\` })),
  "parent-child": () => sections().flatMap(({ h, body }) =>
    sentences(body).map((s) => ({ embed: \`\${h}: \${s}\`, ret: \`\${h}: \${body}\` }))), // embed small, return the section
};

function search(chunks, query) {
  const docsT = chunks.map((c) => toks(c.embed));
  const df = new Map();
  for (const t of docsT) for (const w of new Set(t)) df.set(w, (df.get(w) || 0) + 1);
  const idf = (w) => Math.log(chunks.length / (df.get(w) || chunks.length)) + 1;
  const vec = (t) => { const v = new Map(); for (const w of t) v.set(w, (v.get(w) || 0) + idf(w)); return v; };
  const norm = (v) => Math.sqrt([...v.values()].reduce((a, x) => a + x * x, 0));
  const qv = vec(toks(query));
  let best = -1, bestS = -1;
  docsT.forEach((t, i) => {
    const dv = vec(t); let dot = 0;
    for (const [w, x] of qv) dot += x * (dv.get(w) || 0);
    const s = dot / (norm(qv) * norm(dv) || 1);
    if (s > bestS + 1e-12) { bestS = s; best = i; }
  });
  return chunks[best];
}

console.log("strategy          chunks  avg chars  hit@1  chars sent/answer");
const misses = {};
for (const [name, make] of Object.entries(STRATEGIES)) {
  const chunks = make();
  const avg = chunks.reduce((a, c) => a + c.embed.length, 0) / chunks.length;
  let hits = 0, sent = 0; misses[name] = [];
  QA.forEach(([q, gold], i) => {
    const top = search(chunks, q);
    sent += top.ret.length;
    if (top.ret.includes(gold)) hits++; else misses[name].push(\`Q\${i + 1} got "\${top.ret.slice(0, 44).replace(/\\n/g, " ")}"\`);
  });
  console.log(\`\${name.padEnd(17)} \${String(chunks.length).padStart(6)} \${avg.toFixed(1).padStart(10)} \${(hits + "/" + QA.length).padStart(6)} \${(sent / QA.length).toFixed(1).padStart(18)}\`);
}
console.log("\\nwhy the misses happen:");
for (const name of ["fixed 60 chars", "one sentence"]) {
  console.log(\`  \${name}:\`);
  for (const m of misses[name]) console.log(\`    \${m}\`);
}
console.log("\\nfixed 60 cuts mid-sentence, e.g. chunk 3:");
console.log(\`  "\${fixed(60)[2].replace(/\\n/g, "\\\\n")}"\`);` },
          { tech: "python", code: `# Six chunking strategies on one handbook, scored by a TF-IDF retriever (stands in for embeddings).
import math
import re

DOC = """# Acme Cloud Handbook

## Free plan
The Free plan costs nothing. The rate limit is 20 requests per minute. Data is kept for 7 days.

## Pro plan
The Pro plan costs 49 dollars per month. The rate limit is 300 requests per minute. Data is kept for 90 days.

## Enterprise plan
Pricing is negotiated per contract. The rate limit is 5000 requests per minute. Data is kept for 3 years.

## Refunds
Refunds go back to the original card. A refund takes 5 to 10 business days to appear on the statement. Annual plans can be refunded within 30 days of purchase.

## Support
Free users get community support only. Pro users get email support with a 24 hour response target. Enterprise customers get a named engineer and a 1 hour response target for outages."""

QA = [
    ("What is the rate limit on the Enterprise plan?", "The rate limit is 5000 requests per minute."),
    ("How long is data kept on the Pro plan?", "Data is kept for 90 days."),
    ("How long does a refund take to appear on the statement?", "A refund takes 5 to 10 business days to appear on the statement."),
    ("What response target do Enterprise customers get for outages?", "a named engineer and a 1 hour response target for outages"),
    ("How much does the Pro plan cost?", "The Pro plan costs 49 dollars per month."),
    ("Can annual plans be refunded?", "Annual plans can be refunded within 30 days of purchase."),
]

STOP = set("a an the is are do does of to on for what how long much can be get".split(" "))


def toks(s):
    ws = [w for w in re.sub(r"[^a-z0-9 ]", " ", s.lower()).split() if w not in STOP]
    return [w[:-1] if len(w) > 3 and w.endswith("s") else w for w in ws]


# --- strategies: each returns [{embed: text that is indexed, ret: text handed to the LLM}]
def fixed(size):
    return [DOC[i:i + size] for i in range(0, len(DOC), size)]


def sentences(t):
    out = []
    for line in t.split("\\n"):
        if line and not line.startswith("#"):
            out += [s.strip() for s in re.findall(r"[^.]+\\.", line)]
    return out


def recursive(text, size, seps=("\\n\\n", "\\n", ". ", " ")):
    if len(text) <= size or not seps:
        return [text]
    sep, rest = seps[0], seps[1:]
    pieces = [x for p in text.split(sep) for x in recursive(p, size, rest)]
    out = []  # greedily merge neighbours back up to the size limit
    for p in pieces:
        if out and len(out[-1]) + len(sep) + len(p) <= size:
            out[-1] += sep + p
        else:
            out.append(p)
    return out


def sections():
    res = []
    for s in DOC.split("\\n## ")[1:]:
        h, *body = s.split("\\n")
        res.append((h, " ".join(body)))
    return res


def plain(cs):
    return [{"embed": c, "ret": c} for c in cs]


STRATEGIES = {
    "fixed 60 chars": lambda: plain(fixed(60)),
    "fixed 600 chars": lambda: plain(fixed(600)),
    "one sentence": lambda: plain(sentences(DOC)),
    "recursive 200": lambda: plain(recursive(DOC, 200)),
    "heading section": lambda: [{"embed": f"{h}: {b}", "ret": f"{h}: {b}"} for h, b in sections()],
    "parent-child": lambda: [{"embed": f"{h}: {s}", "ret": f"{h}: {b}"}  # embed small, return the section
                             for h, b in sections() for s in sentences(b)],
}


def search(chunks, query):
    docs_t = [toks(c["embed"]) for c in chunks]
    df = {}
    for t in docs_t:
        for w in dict.fromkeys(t):
            df[w] = df.get(w, 0) + 1

    def idf(w):
        return math.log(len(chunks) / df.get(w, len(chunks))) + 1

    def vec(t):
        v = {}
        for w in t:
            v[w] = v.get(w, 0) + idf(w)
        return v

    def norm(v):
        a = 0
        for x in v.values():
            a += x * x
        return math.sqrt(a)

    qv = vec(toks(query))
    best, best_s = -1, -1
    for i, t in enumerate(docs_t):
        dv = vec(t)
        dot = 0
        for w, x in qv.items():
            dot += x * dv.get(w, 0)
        s = dot / ((norm(qv) * norm(dv)) or 1)
        if s > best_s + 1e-12:
            best_s, best = s, i
    return chunks[best]


print("strategy          chunks  avg chars  hit@1  chars sent/answer")
misses = {}
for name, make in STRATEGIES.items():
    chunks = make()
    avg = sum(len(c["embed"]) for c in chunks) / len(chunks)
    hits, sent, misses[name] = 0, 0, []
    for i, (q, gold) in enumerate(QA):
        top = search(chunks, q)
        sent += len(top["ret"])
        if gold in top["ret"]:
            hits += 1
        else:
            misses[name].append(f'Q{i + 1} got "{top["ret"][:44].replace(chr(10), " ")}"')
    print(f"{name:<17} {len(chunks):>6} {avg:>10.1f} {str(hits) + '/' + str(len(QA)):>6} {sent / len(QA):>18.1f}")
print("\\nwhy the misses happen:")
for name in ["fixed 60 chars", "one sentence"]:
    print(f"  {name}:")
    for m in misses[name]:
        print(f"    {m}")
print("\\nfixed 60 cuts mid-sentence, e.g. chunk 3:")
print('  "' + fixed(60)[2].replace("\\n", "\\\\n") + '"')` },
        ],
      },
    ],
  },
  {
    title: `Chunking in RAG: how do you pick size, overlap, and strategy?`,
    difficulty: "medium",
    seoDescription: `Pick the chunking strategy from document structure, bound size by facts and budgets, size overlap to answer length, then sweep on labelled questions.`,
    description: `**Question presented to candidate:**
"You are setting up the index for a RAG assistant over our engineering wiki. Walk me through how you would decide the chunk size, the overlap and the splitting strategy, and how you would know you got them right."

**What a strong answer should cover:**
- Strategy first, from the documents: follow their structure (headings, code units, table rows) where it exists, recursive splitting where it does not, and attach the heading path to each chunk
- Size from the questions and the models: short factual questions favour smaller chunks, explanatory questions favour larger ones or parent-child; chunks must fit the embedding model input limit, and top-k times chunk size must fit the context budget
- Overlap as boundary insurance with a cost: with fixed windows, an overlap of at least L-1 tokens guarantees any span of L tokens is whole in some chunk, while overlap multiplies storage and embedding cost by size / (size - overlap) and returns near-duplicate chunks
- Decide by measurement: a labelled question set with known answer passages, a sweep over a small grid of size and overlap, scored on recall@k and tokens sent per query, then the cheapest configuration that meets the recall target
- Operations: chunking is versioned with the index, any change means re-chunking and re-embedding everything, and the eval is re-run

**Clarifying questions expected:**
- What do the documents look like (structured pages, code, tables, PDFs) and what do typical questions ask (one fact, or an explanation)?
- Which embedding model, and what are its input limit and price?
- How many tokens of context and how much latency can each answer afford?

**Code / implementation expected:** Optional — a sliding-window chunker with overlap and a small parameter sweep with recall@k is a strong signal.`,
    answer: `**Target Audience:** Engineers who know what chunking is and now have to choose real parameters for a RAG index, and defend the choice with numbers in an interview.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (a sliding-window chunker swept over 12 size and overlap settings, scored by a TF-IDF retriever on 8 labelled questions; no model is called). Capacity arithmetic was run in Python 3.12.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A fisher choosing a net has three dials. The mesh size decides which fish get caught: too fine and the net fills with weed, too coarse and the fish swim through. The overlap between net panels decides whether fish escape through the seams. And the shape of the net should match the water: a trawl for open sea, a trap for a river. Nobody picks those dials from a forum post. They put the net in their own water, count what comes up, and adjust.

Chunking has the same three dials: **size**, **overlap** and **strategy**. The catalogue of strategies is on its own page, [What chunking strategies exist?](/interview-question/what-chunking-strategies-exist-and-how-does-chunk-size-affect-rag-quality) This page is about turning those dials for a real corpus and proving the choice: the arithmetic, the guarantee overlap gives you, and a measured sweep.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What are the documents: structured pages, code, tables, scanned PDFs? | Structure decides the strategy before size is even discussed |
| What do users ask: a single fact, a procedure, or "explain how X works"? | Fact lookups want small precise chunks; explanations want larger ones or parent-child |
| Which embedding model, and what is its input limit? | A chunk beyond the limit is truncated or rejected; tokens must be counted with that model tokenizer |
| How many tokens of context per answer can we afford, and at what latency? | Top-k times chunk size is the context bill on every query |
| How big is the corpus and how often does it change? | Overlap multiplies embedding and storage cost; re-indexing cost bounds how often you can re-tune |
| Do we have, or can we build, labelled questions with known answer passages? | Without them the choice is a guess |

## 3. Dial One: Strategy Comes From the Documents

Pick the splitter before the numbers, because the splitter decides where boundaries are allowed to fall:

| Content | Strategy | Notes |
| :--- | :--- | :--- |
| Wiki pages, docs, manuals (Markdown, HTML) | Split on headings; recursive within long sections | Prefix each chunk with its heading path |
| Code | Parse; one function or class per chunk | Keep file path and signature in the chunk header |
| Tables | Whole table if small; else row groups | Repeat the header row in every chunk |
| Transcripts, long prose without headings | Recursive, or semantic splitting | Overlap matters more here, since boundaries are guesses |
| FAQs, tickets, short records | One record per chunk | Do not split; there is nothing to gain |

📌 **Interview term: heading path** — the chain of headings above a chunk ("Runbooks > Billing DB > Backups"), prepended to the chunk text before embedding so the chunk keeps the context its section gave it.

## 4. Dial Two: Size, and the Arithmetic Behind It

Size is counted in **tokens of the embedding model**, not characters ([tokens](/interview-question/what-are-tokens-and-why-do-they-matter-for-cost-and-limits)). Three constraints bound it:

1. **Above:** the embedding model input limit, and the context budget: with top-k chunks per query, every query sends roughly \`k × size\` tokens of retrieved text to the model.
2. **Below:** a chunk must be big enough to hold a whole answer with its context. A chunk smaller than the facts it should contain cannot work.
3. **In between:** smaller is sharper for fact lookups, larger is better for explanations. Parent-child retrieval lets you take both: search small, return large.

📌 **Interview term: context budget** — the number of prompt tokens you allow retrieved text to take per query; \`top_k × chunk_size\` must fit it with room for instructions and the answer.

### Capacity arithmetic

For a sliding window over a document of \`N\` tokens with chunk size \`S\` and overlap \`O\`, the window moves by the **stride** \`S − O\`:

~~~text
chunks           = ceil((N − S) / (S − O)) + 1        (for N > S)
storage overhead ≈ S / (S − O)                         (tokens embedded / tokens in the corpus)
context per query ≈ k × S
~~~

📌 **Interview term: stride** — how far the window moves between chunks: chunk size minus overlap.

Worked with assumed inputs: a 10,000,000-token wiki, 1,024-dimension float32 vectors, top-k = 5:

| Size / overlap | Chunks | Embedded tokens vs corpus | Raw vector storage | Context per query |
| :--- | ---: | ---: | ---: | ---: |
| 512 / 0 | 19,532 | 1.00x | 80.0 MB | 2,560 tokens |
| 512 / 64 (12.5%) | 22,322 | 1.14x | 91.4 MB | 2,560 tokens |
| 512 / 256 (50%) | 39,062 | 2.00x | 160.0 MB | 2,560 tokens |

Storage here is vectors only (chunks × 1,024 × 4 bytes), before index structures and the text itself. The lesson is in the ratios: 50% overlap doubles what you embed, store and pay for, and it does not change the per-query context at all. Doubling chunk size, by contrast, halves the chunk count and doubles the context per query.

## 5. Dial Three: Overlap, and the Guarantee It Buys

Overlap exists for one reason: a fact that falls across a boundary is whole in neither chunk. How much is enough? For a sliding window there is an exact answer.

📌 **Interview term: boundary straddling** — a fact (an answer sentence, a step in a procedure) whose tokens are split between two consecutive chunks.

**The overlap rule:** with stride \`S − O\`, any span of \`L\` tokens starts fewer than \`S − O\` tokens after the start of some window, so it ends inside that window whenever \`(S − O − 1) + L ≤ S\`, which simplifies to **\`O ≥ L − 1\`**. The example checks this by brute force over every position:

~~~text
rule: a fact of L tokens always fits whole in some window when overlap >= L - 1
  size 24, overlap  6: every span up to 7 tokens fits whole (overlap + 1 = 7)
  size 24, overlap 12: every span up to 13 tokens fits whole (overlap + 1 = 13)
  size 24, overlap 13: every span up to 14 tokens fits whole (overlap + 1 = 14)
~~~

So if your answers are typically one or two sentences of 30 to 40 tokens, an overlap of about 40 tokens guarantees every such answer is whole in some chunk, whatever the chunk size. That is a better way to set overlap than a percentage: size it to the facts, not to the chunk. Two caveats: the guarantee is about fixed windows (structure-aware splitting puts boundaries at section breaks, where little straddles), and "whole in some chunk" is necessary for retrieval, not sufficient, since that chunk still has to rank in the top k.

📌 **Interview term: near-duplicate chunks** — neighbouring chunks that share much of their text because of overlap. With high overlap, two of your top-k slots can hold nearly the same passage, which wastes context; deduplicate or merge adjacent hits before building the prompt.

## 6. Decide by Measuring: The Sweep

The procedure that turns the three dials into a defensible choice:

<svg class="iq-diagram" width="100%" viewBox="0 0 760 170" role="img" aria-label="Tuning loop: build a labelled question set, sweep a small grid of size and overlap, score recall at k and tokens per query, pick the cheapest setting that meets the recall target">
  <defs>
    <marker id="ai06q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="50" width="150" height="70" rx="10"/>
  <text class="d-text" x="95" y="80" text-anchor="middle">labelled set</text>
  <text class="d-sub" x="95" y="102" text-anchor="middle">question + passage</text>
  <rect class="d-box" x="215" y="50" width="150" height="70" rx="10"/>
  <text class="d-text" x="290" y="80" text-anchor="middle">sweep grid</text>
  <text class="d-sub" x="290" y="102" text-anchor="middle">size x overlap</text>
  <rect class="d-box" x="410" y="50" width="150" height="70" rx="10"/>
  <text class="d-text" x="485" y="80" text-anchor="middle">score</text>
  <text class="d-sub" x="485" y="102" text-anchor="middle">recall@k, tokens</text>
  <rect class="d-box-accent" x="605" y="50" width="140" height="70" rx="10"/>
  <text class="d-text" x="675" y="80" text-anchor="middle">pick</text>
  <text class="d-sub" x="675" y="102" text-anchor="middle">cheapest that passes</text>
  <path class="d-edge" d="M 170 85 L 207 85" marker-end="url(#ai06q3-arrow)"/>
  <path class="d-edge" d="M 365 85 L 402 85" marker-end="url(#ai06q3-arrow)"/>
  <path class="d-edge" d="M 560 85 L 597 85" marker-end="url(#ai06q3-arrow)"/>
</svg>

The labelled set does not need to be large to be useful: a few dozen real questions with the passage that answers each, drawn from logs or written with subject experts, already separates good settings from bad ones. Building it is covered in [golden datasets](/interview-question/how-do-you-build-a-golden-dataset-for-evaluating-an-llm-feature).

📌 **Interview term: recall@k** — the share of questions for which a chunk containing the answer appears in the top k results. For chunking, require the answer span to be *whole* inside a retrieved chunk, not just overlapping it.

The example runs exactly this loop at toy scale: a 254-token document with eight facts (each 11 to 13 tokens) between filler sentences, swept over sizes 12, 24, 48 and 96 and overlaps of 0%, 25% and 50%, retrieving top-2 with TF-IDF:

~~~text
size   overlap  chunks  stored  dup   facts whole in a chunk  recall@2  ctx tok/query
  12    0 (0%)      22     254  1.00                     0/8       0/8           24.0
  12   3 (25%)      28     335  1.32                     2/8       2/8           23.9
  12   6 (50%)      42     500  1.97                     1/8       1/8           24.0
  24    0 (0%)      11     254  1.00                     5/8       5/8           46.8
  24   6 (25%)      14     332  1.31                     6/8       6/8           47.5
  24  12 (50%)      21     494  1.94                     8/8       8/8           46.8
  48    0 (0%)       6     254  1.00                     8/8       8/8           91.8
~~~

Reading it:

- **Size 12 cannot work.** The facts are 11 to 13 tokens, so a 12-token window holds only a lucky few of them whole, at any overlap (2/8 at best). That is the lower bound from section 4, observed.
- **At size 24, overlap is what rescues recall:** 5/8 with none, 6/8 with 6 tokens, 8/8 with 12. Twelve is exactly \`L − 1\` for the longest fact (13 tokens), the guarantee from section 5.
- **Overlap costs storage, not context.** The \`dup\` column (tokens stored divided by document tokens) goes to 1.94 at 50% overlap, while tokens sent per query stay near 47.
- **Bigger chunks also reach 8/8, at a price.** Size 48 with no overlap passes with fewer chunks and no duplication, but sends 91.8 tokens per query; size 96 sends 175.

The program then applies the selection rule, cheapest context among settings that meet the target:

~~~text
pick: the cheapest config with recall@2 = 100% is size 24, overlap 12 (50%): 46.8 context tokens per query
size 96 also reaches 100% but sends 175.0 tokens per query (3.7x)
~~~

Whether that is the right trade depends on what is scarce: if storage and re-embedding cost dominate, size 48 with no overlap is the better pick from the same table. The sweep does not decide for you; it turns the decision into a visible trade-off between named costs.

### Grid, defaults, and when to stop

A small grid is enough: three or four sizes spanning a factor of four, and two or three overlaps sized from your typical answer length. Practitioner guides commonly start from a few hundred tokens with modest overlap; treat that as one row of your grid, not the answer. Chroma's chunking report (July 2024) found that recursive splitting often performs well when parametrised appropriately and that some library defaults perform relatively poorly, which is the case for sweeping rather than trusting a default. Once chunking is settled, the next gains usually come from [hybrid search](/interview-question/hybrid-search-why-combine-bm25-with-vectors-and-how-does-rrf-work) and [reranking](/interview-question/reranking-in-rag-when-and-how-to-add-a-cross-encoder), not from a finer chunking grid.

## 7. Verified: Running the Code

The example **"Sweep chunk size and overlap, score recall@2 and context tokens, then pick a configuration"** builds the document, chunks it with a sliding window for every size and overlap pair, retrieves top-2 per question with TF-IDF cosine (log-scaled idf; a stand-in for embeddings that matches words, not meaning), counts a hit only when the answer span is whole inside a retrieved chunk, and brute-forces the overlap rule. What the simulation leaves out: a real tokenizer (tokens here are words), a real embedding model (so the dilution that large chunks cause in vector search does not show; the retriever finds the right chunk whenever one contains the fact), and structure-aware splitting.

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
document: 254 tokens, 8 facts, longest fact 13 tokens, top-k = 2
size   overlap  chunks  stored  dup   facts whole in a chunk  recall@2  ctx tok/query
  12    0 (0%)      22     254  1.00                     0/8       0/8           24.0
  12   3 (25%)      28     335  1.32                     2/8       2/8           23.9
  12   6 (50%)      42     500  1.97                     1/8       1/8           24.0
  24    0 (0%)      11     254  1.00                     5/8       5/8           46.8
  24   6 (25%)      14     332  1.31                     6/8       6/8           47.5
  24  12 (50%)      21     494  1.94                     8/8       8/8           46.8
  48    0 (0%)       6     254  1.00                     8/8       8/8           91.8
  48  12 (25%)       7     326  1.28                     8/8       8/8           94.8
  48  24 (50%)      10     470  1.85                     8/8       8/8           94.8
  96    0 (0%)       3     254  1.00                     8/8       8/8          175.0
  96  24 (25%)       4     326  1.28                     8/8       8/8          184.8
  96  48 (50%)       5     446  1.76                     8/8       8/8          183.5

pick: the cheapest config with recall@2 = 100% is size 24, overlap 12 (50%): 46.8 context tokens per query
size 96 also reaches 100% but sends 175.0 tokens per query (3.7x)

rule: a fact of L tokens always fits whole in some window when overlap >= L - 1
  size 24, overlap  6: every span up to 7 tokens fits whole (overlap + 1 = 7)
  size 24, overlap 12: every span up to 13 tokens fits whole (overlap + 1 = 13)
  size 24, overlap 13: every span up to 14 tokens fits whole (overlap + 1 = 14)
~~~

## Edge Cases Worth Knowing

- **Mixed content in one corpus.** One size rarely fits wiki pages, code and tables. Route documents by type to different splitters and sizes, and record the chunker version on every chunk.
- **The last window.** A sliding window ends with a short tail chunk (in the example, the final window is cut at the document end). Merging a tiny tail into its predecessor avoids a low-content chunk that matches badly.
- **Overlap with structure-aware splitting.** When boundaries fall at headings, overlap mostly duplicates the end of one section into the next topic. Use little or none there, and rely on heading paths and parent-child instead.
- **Top-k and size move together.** Halving chunk size at the same k halves the context per query and may drop recall; you may need to raise k, which brings the cost back. Sweep k alongside size when context is tight.
- **Eval leakage.** If the labelled questions were written by reading specific chunks of one chunking, they favour that chunking. Write questions from the source documents, not from chunks.

## Common Pitfalls

- **Setting overlap as a fixed percentage.** What matters is the length of the facts you need whole; size overlap from that (\`O ≥ L − 1\` for window chunking), and stop when the guarantee is met.
- **Optimising recall alone.** Large chunks always look good on recall. Report tokens per query beside it, or the sweep will pick the most expensive setting every time.
- **Scoring with overlap instead of containment.** A retrieved chunk that holds half of the answer is not a hit; count only whole answer spans.
- **Tuning on five questions you wrote yourself.** Use real user questions, enough of them to separate settings, and keep them fixed across runs.
- **Re-chunking part of the index.** Changing chunking means re-chunking and re-embedding everything into a new index version; mixed chunkings make scores incomparable.
- **Forgetting the embedding limit.** A chunk bigger than the embedding model input limit is truncated or rejected depending on the provider; size in that model's tokens and check.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Strategy first:</strong> <span style="color:#f0e2c8;">I pick the splitter from the documents: headings for wiki pages, functions for code, row groups for tables, recursive splitting for prose, and I prepend the <strong style="color:#ffca28;">heading path</strong> to every chunk.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Bound the size:</strong> <span style="color:#f0e2c8;">From below, a chunk must hold a whole answer with its context. From above, it must fit the embedding model input limit, and <strong style="color:#ffca28;">top-k times chunk size</strong> must fit the context budget on every query.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Overlap from facts:</strong> <span style="color:#f0e2c8;">For window chunking, an overlap of at least <strong style="color:#ffca28;">L minus 1</strong> tokens guarantees any L-token fact is whole in some chunk. So I size overlap to answer length, not to a percentage, and remember it multiplies storage by size over stride.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Measure:</strong> <span style="color:#f0e2c8;">I build a labelled set of real questions with their answer passages, sweep a small grid of sizes and overlaps, and score <strong style="color:#ffca28;">recall@k</strong> with whole-span containment next to tokens per query and storage.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Pick and operate:</strong> <span style="color:#f0e2c8;">I take the cheapest setting that meets the recall target, version the index with its chunker, and re-chunk and re-embed everything when it changes. In my toy sweep, size 24 with overlap 12 hit 8/8 at 46.8 tokens per query, while size 96 also hit 8/8 but sent 3.7 times as much.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use 50% overlap to be safe?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because it doubles what you embed and store (size over stride is 2) and fills top-k with near-duplicates, while the guarantee you need is already met at <strong style="color:#ffca28;">L minus 1</strong> tokens. In the sweep, 50% overlap pushed stored tokens to 1.94 times the document for no change in context per query.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How many labelled questions do you need?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Enough that the difference between settings is bigger than noise. A few dozen real questions already separate clearly bad settings; for close calls you need more, and they must come from real users or the source documents, not from reading one chunking output.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your eval says bigger chunks are always better. What is wrong?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You are probably scoring recall alone. Bigger chunks contain more, so recall rises, but every query pays for that text and the answer gets buried. Report tokens per query beside recall and choose under a budget, or use <strong style="color:#ffca28;">parent-child</strong> to get both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does overlap matter with heading-based splitting?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Much less. Boundaries fall where topics change, so little straddles them, and overlap mostly copies the end of one section into an unrelated one. Use heading paths and parent-child retrieval instead, and keep overlap for windows inside long sections.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you change first if recall is still low after tuning chunking?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Look at the misses. If the answer chunk exists but ranks low, the fix is retrieval: <strong style="color:#ffca28;">hybrid search</strong> for exact terms, then a <strong style="color:#ffca28;">reranker</strong>. If the chunk does not exist whole, it is chunking again. If the right document is filtered out, check metadata.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Heading path | The chain of headings above a chunk, prepended before embedding |
| Context budget | Prompt tokens allowed for retrieved text per query, about top-k × chunk size |
| Stride | How far the window moves between chunks: size minus overlap |
| Boundary straddling | A fact split between two consecutive chunks |
| Overlap rule | With window chunking, overlap of at least L − 1 tokens keeps any L-token span whole in some chunk |
| Near-duplicate chunks | Neighbouring chunks sharing much text because of overlap |
| Recall@k | Share of questions whose answer is whole in some top-k chunk |

**Conclusion:** Choose the strategy from the documents (follow their structure, attach heading paths), bound the size from below by the facts you must keep whole and from above by the embedding limit and the context budget, set overlap from the length of those facts rather than a percentage (overlap of at least L − 1 tokens guarantees an L-token fact is whole somewhere), and then let a sweep on labelled questions decide, reporting recall@k next to tokens per query and storage. The answer you defend in an interview is not a magic number; it is that procedure, with the trade-off it exposed.`,
    examples: [
      {
        label: `Sweep chunk size and overlap, score recall@2 and context tokens, then pick a configuration`,
        variants: [
          { tech: "node", code: `// Sweep chunk size x overlap on one document with 8 labelled questions, then pick a config.
// Tokens are words here; a real pipeline counts with the embedding model's tokenizer.
const FACTS = [
  ["The backup job for the billing database runs every night at 02:00 UTC.", "When does the billing database backup run?"],
  ["Customer passwords are hashed with argon2id using a per user salt.", "How are customer passwords hashed?"],
  ["Invoices older than seven years are archived to cold storage and then deleted.", "What happens to invoices older than seven years?"],
  ["The public API rejects payloads larger than 2 megabytes with status 413.", "What is the maximum API payload size?"],
  ["On call engineers must acknowledge a paging alert within fifteen minutes.", "How fast must on call engineers acknowledge a page?"],
  ["Feature flags are evaluated at the edge and cached for thirty seconds.", "How long are feature flags cached?"],
  ["Refund requests above 500 euros need approval from a finance manager.", "Who approves large refund requests?"],
  ["Staging data is refreshed from an anonymised production snapshot every Monday.", "How is staging data refreshed?"],
];
const FILLER = [
  "This section was reviewed by the platform group last quarter.",
  "Teams should read the related runbook before making changes.",
  "Questions about this topic go to the internal help channel.",
  "Older versions of this page are kept in the wiki history.",
];
// Build the document: 2 filler sentences, then a fact, repeated.
const tokens = [], spans = [];
FACTS.forEach(([fact], i) => {
  for (const f of [FILLER[i % 4], FILLER[(i + 1) % 4]]) tokens.push(...f.split(" "));
  spans.push([tokens.length, tokens.length + fact.split(" ").length]);
  tokens.push(...fact.split(" "));
});
const N = tokens.length;
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
const STOP = new Set("the a an is are and for of to at with by from in on be this how what when who must".split(" "));
const terms = (ws) => ws.map(norm).filter((w) => w && !STOP.has(w));

function chunk(size, overlap) {
  const out = [], stride = size - overlap;
  for (let s = 0; ; s += stride) { out.push([s, Math.min(s + size, N)]); if (s + size >= N) break; }
  return out;
}
function topK(chunks, query, k) {
  const docs = chunks.map(([a, b]) => terms(tokens.slice(a, b)));
  const df = new Map();
  for (const d of docs) for (const w of new Set(d)) df.set(w, (df.get(w) || 0) + 1);
  const vec = (t) => { const v = new Map(); for (const w of t) v.set(w, (v.get(w) || 0) + Math.log(1 + docs.length / (df.get(w) || docs.length))); return v; };
  const len = (v) => Math.sqrt([...v.values()].reduce((a, x) => a + x * x, 0)) || 1;
  const q = vec(terms(query.split(" ")));
  return docs.map((d, i) => {
    const v = vec(d); let dot = 0;
    for (const [w, x] of q) dot += x * (v.get(w) || 0);
    return { i, s: Math.round((dot / (len(q) * len(v))) * 1e9) };
  }).sort((a, b) => b.s - a.s || a.i - b.i).slice(0, k).map((h) => chunks[h.i]);
}

const K = 2, rows = [];
console.log(\`document: \${N} tokens, \${FACTS.length} facts, longest fact \${Math.max(...spans.map(([a, b]) => b - a))} tokens, top-k = \${K}\`);
console.log("size   overlap  chunks  stored  dup   facts whole in a chunk  recall@2  ctx tok/query");
for (const size of [12, 24, 48, 96]) {
  for (const pct of [0, 25, 50]) {
    const overlap = Math.floor((size * pct) / 100);
    const chunks = chunk(size, overlap);
    const stored = chunks.reduce((a, [x, y]) => a + y - x, 0);
    const whole = spans.filter(([a, b]) => chunks.some(([x, y]) => x <= a && b <= y)).length;
    let hit = 0, ctx = 0;
    FACTS.forEach(([, q], i) => {
      const got = topK(chunks, q, K);
      ctx += got.reduce((a, [x, y]) => a + y - x, 0);
      if (got.some(([x, y]) => x <= spans[i][0] && spans[i][1] <= y)) hit++;
    });
    rows.push({ size, overlap, pct, recall: hit / FACTS.length, ctx: ctx / FACTS.length, stored });
    console.log(\`\${String(size).padStart(4)}  \${(overlap + " (" + pct + "%)").padStart(8)}  \${String(chunks.length).padStart(6)}  \${String(stored).padStart(6)}  \${(stored / N).toFixed(2)}  \${(whole + "/" + FACTS.length).padStart(22)}  \${(hit + "/" + FACTS.length).padStart(8)}  \${(ctx / FACTS.length).toFixed(1).padStart(13)}\`);
  }
}
const ok = rows.filter((r) => r.recall === 1).sort((a, b) => a.ctx - b.ctx || a.stored - b.stored);
const p = ok[0];
console.log(\`\\npick: the cheapest config with recall@2 = 100% is size \${p.size}, overlap \${p.overlap} (\${p.pct}%): \${p.ctx.toFixed(1)} context tokens per query\`);
const big = rows.find((r) => r.size === 96 && r.pct === 0);
console.log(\`size 96 also reaches \${Math.round(big.recall * 100)}% but sends \${big.ctx.toFixed(1)} tokens per query (\${(big.ctx / p.ctx).toFixed(1)}x)\`);
console.log("\\nrule: a fact of L tokens always fits whole in some window when overlap >= L - 1");
for (const [size, overlap] of [[24, 6], [24, 12], [24, 13]]) {
  const chunks = chunk(size, overlap);
  let worst = 0; // longest span that is guaranteed to fit, found by brute force over all positions
  for (let L = 1; L <= size; L++) {
    let all = true;
    for (let a = 0; a + L <= N && all; a++) all = chunks.some(([x, y]) => x <= a && a + L <= y);
    if (all) worst = L; else break;
  }
  console.log(\`  size \${size}, overlap \${String(overlap).padStart(2)}: every span up to \${worst} tokens fits whole (overlap + 1 = \${overlap + 1})\`);
}` },
          { tech: "python", code: `# Sweep chunk size x overlap on one document with 8 labelled questions, then pick a config.
# Tokens are words here; a real pipeline counts with the embedding model's tokenizer.
import math
import re

FACTS = [
    ("The backup job for the billing database runs every night at 02:00 UTC.", "When does the billing database backup run?"),
    ("Customer passwords are hashed with argon2id using a per user salt.", "How are customer passwords hashed?"),
    ("Invoices older than seven years are archived to cold storage and then deleted.", "What happens to invoices older than seven years?"),
    ("The public API rejects payloads larger than 2 megabytes with status 413.", "What is the maximum API payload size?"),
    ("On call engineers must acknowledge a paging alert within fifteen minutes.", "How fast must on call engineers acknowledge a page?"),
    ("Feature flags are evaluated at the edge and cached for thirty seconds.", "How long are feature flags cached?"),
    ("Refund requests above 500 euros need approval from a finance manager.", "Who approves large refund requests?"),
    ("Staging data is refreshed from an anonymised production snapshot every Monday.", "How is staging data refreshed?"),
]
FILLER = [
    "This section was reviewed by the platform group last quarter.",
    "Teams should read the related runbook before making changes.",
    "Questions about this topic go to the internal help channel.",
    "Older versions of this page are kept in the wiki history.",
]
# Build the document: 2 filler sentences, then a fact, repeated.
tokens, spans = [], []
for i, (fact, _) in enumerate(FACTS):
    for f in (FILLER[i % 4], FILLER[(i + 1) % 4]):
        tokens += f.split(" ")
    spans.append((len(tokens), len(tokens) + len(fact.split(" "))))
    tokens += fact.split(" ")
N = len(tokens)
STOP = set("the a an is are and for of to at with by from in on be this how what when who must".split(" "))


def terms(ws):
    out = []
    for w in ws:
        w = re.sub(r"[^a-z0-9]", "", w.lower())
        if w and w not in STOP:
            out.append(w)
    return out


def chunk(size, overlap):
    out, stride, s = [], size - overlap, 0
    while True:
        out.append((s, min(s + size, N)))
        if s + size >= N:
            break
        s += stride
    return out


def top_k(chunks, query, k):
    docs = [terms(tokens[a:b]) for a, b in chunks]
    df = {}
    for d in docs:
        for w in dict.fromkeys(d):
            df[w] = df.get(w, 0) + 1

    def vec(t):
        v = {}
        for w in t:
            v[w] = v.get(w, 0) + math.log(1 + len(docs) / df.get(w, len(docs)))
        return v

    def length(v):
        a = 0
        for x in v.values():
            a += x * x
        return math.sqrt(a) or 1

    q = vec(terms(query.split(" ")))
    scored = []
    for i, d in enumerate(docs):
        v = vec(d)
        dot = 0
        for w, x in q.items():
            dot += x * v.get(w, 0)
        scored.append((-math.floor(dot / (length(q) * length(v)) * 1e9 + 0.5), i))
    scored.sort()
    return [chunks[i] for _, i in scored[:k]]


K, rows = 2, []
print(f"document: {N} tokens, {len(FACTS)} facts, longest fact {max(b - a for a, b in spans)} tokens, top-k = {K}")
print("size   overlap  chunks  stored  dup   facts whole in a chunk  recall@2  ctx tok/query")
for size in (12, 24, 48, 96):
    for pct in (0, 25, 50):
        overlap = size * pct // 100
        chunks = chunk(size, overlap)
        stored = sum(y - x for x, y in chunks)
        whole = len([1 for a, b in spans if any(x <= a and b <= y for x, y in chunks)])
        hit, ctx = 0, 0
        for i, (_, q) in enumerate(FACTS):
            got = top_k(chunks, q, K)
            ctx += sum(y - x for x, y in got)
            if any(x <= spans[i][0] and spans[i][1] <= y for x, y in got):
                hit += 1
        rows.append({"size": size, "overlap": overlap, "pct": pct, "recall": hit / len(FACTS), "ctx": ctx / len(FACTS), "stored": stored})
        print(f"{size:>4}  {f'{overlap} ({pct}%)':>8}  {len(chunks):>6}  {stored:>6}  {stored / N:.2f}  "
              f"{f'{whole}/{len(FACTS)}':>22}  {f'{hit}/{len(FACTS)}':>8}  {ctx / len(FACTS):>13.1f}")
ok = sorted([r for r in rows if r["recall"] == 1], key=lambda r: (r["ctx"], r["stored"]))
p = ok[0]
print(f"\\npick: the cheapest config with recall@2 = 100% is size {p['size']}, overlap {p['overlap']} ({p['pct']}%): {p['ctx']:.1f} context tokens per query")
big = next(r for r in rows if r["size"] == 96 and r["pct"] == 0)
print(f"size 96 also reaches {round(big['recall'] * 100)}% but sends {big['ctx']:.1f} tokens per query ({big['ctx'] / p['ctx']:.1f}x)")
print("\\nrule: a fact of L tokens always fits whole in some window when overlap >= L - 1")
for size, overlap in ((24, 6), (24, 12), (24, 13)):
    chunks = chunk(size, overlap)
    worst = 0  # longest span that is guaranteed to fit, found by brute force over all positions
    for L in range(1, size + 1):
        if all(any(x <= a and a + L <= y for x, y in chunks) for a in range(0, N - L + 1)):
            worst = L
        else:
            break
    print(f"  size {size}, overlap {overlap:>2}: every span up to {worst} tokens fits whole (overlap + 1 = {overlap + 1})")` },
        ],
      },
    ],
  },
  {
    title: `What is hybrid search and why combine BM25 with vector search?`,
    difficulty: "medium",
    seoDescription: `Hybrid search runs BM25 and vector search together and fuses the results, so exact identifiers and paraphrased questions both find their chunk.`,
    description: `**Question presented to candidate:**
"Our RAG search uses embeddings only, and support agents complain that searching for an error code like ERR-4012 or a part number returns the wrong articles, even though plain-English questions work well. What is hybrid search, and why would combining BM25 with vector search fix this?"

**What a strong answer should cover:**
- What each retriever is: BM25 is lexical (sparse) scoring of exact term matches, weighted by term rarity (IDF), term-frequency saturation and length normalisation; vector search is dense retrieval by embedding similarity, which matches meaning and paraphrase
- Their complementary failures: embeddings blur exact tokens such as error codes, SKUs, names, version numbers and rare jargon; BM25 misses synonyms and paraphrases ("money back" vs "refund") and has no notion of meaning
- Hybrid search: run both retrievers on the same query (usually in parallel), then fuse the two ranked lists into one, most often with Reciprocal Rank Fusion because the two score scales are not comparable
- Where it sits in the pipeline: before a reranker, which reorders the fused candidates; recall of the candidate set is what hybrid improves
- Practical costs and options: two indexes to keep in sync, a little extra latency, engine support (search engines and several vector databases fuse natively; with Postgres you fuse in SQL), and the need to measure on both query types

**Code / implementation expected:** Optional — BM25 scoring, a cosine search, and a fusion of the two ranked lists on a toy corpus is a strong signal.`,
    answer: `**Target Audience:** Engineers whose embedding-only RAG search misses exact terms, and anyone who needs to explain lexical vs semantic retrieval and why teams combine them.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (BM25 written from scratch, a deterministic stub embedding, and RRF fusion on an eight-article knowledge base; no model or search engine is called). Engine facts were checked in each vendor's documentation in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A hardware shop has two assistants. The first has memorised every part number in the catalogue: say "SKU-88B714" and she walks straight to the shelf. But say "the thing that keeps the X200 running when it is unplugged" and she stares at you, because you never said "battery". The second assistant understands what you mean, every time: "you want a battery for a laptop". But give him "SKU-88B714" and he brings you *a* battery, possibly the one for the X300, because to him all those codes look alike.

The shop does not choose between them. It asks both, and trusts what both agree on. That is hybrid search: a keyword retriever (the part-number expert) and a vector retriever (the meaning expert) run on every query, and their answers are merged.

## 2. The Two Retrievers

### Lexical search and BM25

📌 **Interview term: lexical (keyword) search** — retrieval by matching the actual words of the query against the words of each document, using an inverted index (a map from each term to the documents containing it).

📌 **Interview term: BM25 (Okapi BM25)** — the standard lexical scoring function. For each query term found in a document, it adds a score that grows with:

- **IDF (inverse document frequency):** rare terms count more. \`ERR-4012\` appears in one article, so matching it is strong evidence; \`card\` appears in several, so it is weak evidence.
- **Term frequency, with saturation:** the third occurrence of a term adds less than the first; the parameter \`k1\` controls how fast it saturates.
- **Length normalisation:** a match in a short document counts more than the same match in a long one; the parameter \`b\` controls how much.

Elasticsearch documents its BM25 defaults as \`k1 = 1.2\` and \`b = 0.75\`, and Elastic's own BM25 guide says those work well for most corpora (Elastic docs and blog, checked October 2026). The example implements the same formula with a Lucene-style IDF:

~~~js
s += Math.log(1 + (D.length - n + 0.5) / (n + 0.5))          // idf: n = docs containing the term
   * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * d.length / avgdl)); // tf saturation (k1 = 1.2), length norm (b = 0.75)
~~~

📌 **Interview term: sparse retrieval** — another name for lexical retrieval: each document is a vector over the whole vocabulary that is zero almost everywhere. Learned sparse models (SPLADE is the best-known family) keep this shape but learn the term weights, including related terms not in the text.

### Vector search

📌 **Interview term: dense retrieval (vector search)** — embed the query and every chunk with the same embedding model, then return the chunks whose vectors are closest, usually by cosine similarity. Covered in [What are embeddings?](/interview-question/what-are-embeddings-and-what-are-they-used-for) and [how similarity search works](/interview-question/how-does-similarity-search-work-cosine-dot-product-and-euclidean).

Dense vectors are good at meaning: "how do I get my money back" lands near "refunds are issued to the original payment method" although they share no words.

## 3. Why Each One Fails Where the Other Succeeds

| Query type | Example | BM25 | Vector search |
| :--- | :--- | :--- | :--- |
| Exact identifier | \`ERR-4012\`, \`SKU-88B714\`, \`CVE-2024-3094\` | Strong: rare token, high IDF | Weak: similar codes embed to similar vectors |
| Paraphrase | "money back" for refunds | Fails: no shared words | Strong |
| Synonym or different wording | "cannot sign in" vs "login fails" | Fails unless words overlap | Strong |
| Names, version numbers, rare jargon | \`pgvector 0.8\`, a customer name | Strong | Unreliable, especially for terms rare in the embedding model training data |
| Long natural-language question | "why does my invoice show two charges" | Noisy: common words dominate | Strong |
| Typos | "refnud" | Fails without fuzzy matching | Often tolerant |

📌 **Interview term: vocabulary mismatch** — the user and the document use different words for the same thing. It is the classic failure of lexical search and the main reason dense retrieval was adopted.

📌 **Interview term: exact-match failure (of dense retrieval)** — an embedding captures that a string is "an error code" or "a part number" far better than *which* one, so near-identical identifiers end up near each other and the wrong one can rank first.

The run shows both failures, and the fix. For each query, the rank of the article that actually answers it:

~~~text
query                         type          BM25  vector  hybrid   (rank of the right doc)
ERR-4012                      exact code       1       2       1
how do I get my money back    paraphrase       -       1       1
battery for X200              model number     1       2       1
I cannot sign in              paraphrase       -       1       1
card declined ERR-4012        mixed            1       1       1
expired card                  keywords         1       1       1
~~~

A dash means BM25 returned nothing at all: no query word appears in the right article. The vector stub ranks the X300 battery above the X200 one and the ERR-4013 article above ERR-4012, because to it those are the same kind of thing.

## 4. Hybrid Search: Run Both, Fuse the Lists

📌 **Interview term: hybrid search** — running a lexical and a dense retriever on the same query and merging their ranked results into one list.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 260" role="img" aria-label="Hybrid search: the query goes to BM25 and to vector search in parallel, the two ranked lists go into a fusion step, and the fused top k goes on to an optional reranker">
  <defs>
    <marker id="ai06q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="95" width="120" height="70" rx="10"/>
  <text class="d-text" x="80" y="135" text-anchor="middle">query</text>
  <rect class="d-box" x="210" y="25" width="170" height="70" rx="10"/>
  <text class="d-text" x="295" y="55" text-anchor="middle">BM25</text>
  <text class="d-sub" x="295" y="77" text-anchor="middle">exact terms, rare ids</text>
  <rect class="d-box" x="210" y="165" width="170" height="70" rx="10"/>
  <text class="d-text" x="295" y="195" text-anchor="middle">vector search</text>
  <text class="d-sub" x="295" y="217" text-anchor="middle">meaning, paraphrase</text>
  <rect class="d-box-accent" x="440" y="95" width="130" height="70" rx="10"/>
  <text class="d-text" x="505" y="125" text-anchor="middle">fusion</text>
  <text class="d-sub" x="505" y="147" text-anchor="middle">usually RRF</text>
  <rect class="d-box-muted" x="620" y="95" width="125" height="70" rx="10"/>
  <text class="d-text" x="682" y="125" text-anchor="middle">rerank</text>
  <text class="d-sub" x="682" y="147" text-anchor="middle">optional</text>
  <path class="d-edge" d="M 140 118 L 202 70" marker-end="url(#ai06q4-arrow)"/>
  <path class="d-edge" d="M 140 142 L 202 190" marker-end="url(#ai06q4-arrow)"/>
  <path class="d-edge" d="M 380 70 L 432 118" marker-end="url(#ai06q4-arrow)"/>
  <path class="d-edge" d="M 380 190 L 432 142" marker-end="url(#ai06q4-arrow)"/>
  <path class="d-edge-dashed" d="M 570 130 L 612 130" marker-end="url(#ai06q4-arrow)"/>
</svg>

The two searches are independent, so they run in parallel and the added latency is roughly the slower of the two plus the fusion, which is trivial arithmetic. The hard part is the fusion itself: BM25 scores are unbounded (14.2, 9.1, ...) while cosine similarities sit in a narrow band (0.83, 0.79, ...), so adding them lets BM25 decide alone.

📌 **Interview term: Reciprocal Rank Fusion (RRF)** — the most common fusion method: ignore the raw scores, give each document \`1 / (k + rank)\` from every list it appears in, and sort by the sum, with \`k = 60\` as the usual constant (Cormack, Clarke and Büttcher, SIGIR 2009). A document ranked well by *both* retrievers beats one ranked first by only one. For ERR-4012 in the run:

~~~text
  RRF kb-01 = 1/(60+1) + 1/(60+2) = 0.03252   kb-02 = 1/(60+1) = 0.01639
~~~

The full mechanics (why ranks instead of scores, what \`k\` does, weighted RRF, normalised score fusion as the alternative, and the rank window) are the subject of the sibling question, [Hybrid search: how does RRF work?](/interview-question/hybrid-search-why-combine-bm25-with-vectors-and-how-does-rrf-work)

### Where hybrid fits in a RAG pipeline

Hybrid search is a **recall** tool: it widens the candidate set so the right chunk is in it. A [reranker](/interview-question/what-is-reranking-and-why-add-it-after-retrieval) then reorders a few dozen fused candidates with a more expensive model for **precision**. The common production shape is hybrid retrieval of maybe 50 to 100 candidates, rerank, keep the top handful for the prompt; see [designing a production RAG pipeline](/interview-question/how-would-you-design-a-production-rag-pipeline-end-to-end-in-2025-26).

### Where you get it

Support varies and changes by version, so check your engine's current docs. As documented in October 2026:

- **Elasticsearch** has an \`rrf\` retriever that fuses child retrievers such as a BM25 query and a kNN search (Elastic reference).
- **OpenSearch** offers a hybrid query fused either by a normalisation processor (for example min-max with a weighted arithmetic mean) or, since 2.19, by an RRF score-ranker processor (OpenSearch docs and blog).
- **Weaviate** has a \`hybrid\` query with an \`alpha\` weight between keyword and vector results; its docs list \`relativeScoreFusion\` as the default fusion since v1.24, with \`rankedFusion\` the earlier default.
- **Qdrant** runs dense and sparse prefetches in one query and fuses them, with RRF and DBSF (distribution-based score fusion) as the documented options.
- **PostgreSQL with pgvector** has no built-in fusion: you run a full-text query (\`tsvector\`, ranked with \`ts_rank\` or \`ts_rank_cd\`, which is not BM25) and a vector query, and fuse them in SQL, typically with RRF in a CTE. Guides such as Railway's pgvector hybrid-search guide show this pattern; the engine choice itself is covered in [pgvector vs Pinecone vs Qdrant](/interview-question/pgvector-vs-pinecone-vs-qdrant-how-do-you-choose-a-vector-db-in-2025).

## 5. Verified: Running the Code

The example **"BM25 vs a stub embedding vs hybrid RRF on exact codes and paraphrases"** indexes eight support articles, scores six queries three ways and reports where the right article lands. BM25 is implemented in full (Lucene-style IDF, \`k1 = 1.2\`, \`b = 0.75\`). The "embedding" is a stub: a hand-written table maps words to concepts (\`money\`, \`refund\` and \`back\` all map to *refund*; any \`ERR-\` code maps to one *error code* concept), and documents are compared by cosine similarity over those concepts. That deliberately exaggerates the real behaviour: a real embedding model does see the characters of \`ERR-4012\`, but similar codes still sit close together, which is the failure the stub makes visible. What the simulation leaves out: a real embedding model, an inverted index (BM25 here scans all eight documents), and a reranker.

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
query                         type          BM25  vector  hybrid   (rank of the right doc)
ERR-4012                      exact code       1       2       1
how do I get my money back    paraphrase       -       1       1
battery for X200              model number     1       2       1
I cannot sign in              paraphrase       -       1       1
card declined ERR-4012        mixed            1       1       1
expired card                  keywords         1       1       1

method   recall@1   MRR
bm25          4/6   0.667
vector        4/6   0.833
hybrid        6/6   1.000

why "ERR-4012" needs BM25:
  BM25 list   : kb-01
  vector list : kb-02, kb-01  (both docs are just "an error code" to the vector)
  RRF kb-01 = 1/(60+1) + 1/(60+2) = 0.03252   kb-02 = 1/(60+1) = 0.01639
~~~

The summary is the argument for hybrid search in three lines: each retriever alone reaches 4 of 6 at rank 1, failing on *different* queries, and the fused list gets all 6. Hybrid does not always reach the best of both: when one retriever is confidently wrong and the other is unsure, fusion can still rank the wrong document first, which is why you measure it and often add a reranker.

## Edge Cases Worth Knowing

- **Tokenisation decides what BM25 can match.** A default analyser may split \`ERR-4012\` into \`err\` and \`4012\`, or \`sign-in\` into two tokens, changing matches. In the example \`sign-in\` stays one token, which is why "I cannot sign in" gets nothing from BM25. Test the analyser on your identifiers.
- **Stemming and stop words.** Without stemming, \`battery\` does not match \`batteries\` (visible in the example). Language-specific analysers fix most of this; they need configuring per language.
- **Filters must apply to both sides.** A tenant or permission filter applied to the vector query but forgotten on the keyword query leaks documents; see [metadata filtering and multi-tenancy](/interview-question/how-do-you-scope-retrieval-with-metadata-filtering-and-multi-tenancy).
- **Two indexes, one truth.** The keyword index and the vector index must be updated and deleted together, or fusion merges stale results with fresh ones.
- **Queries with no lexical overlap.** For pure paraphrases BM25 returns nothing; fusion then simply passes the vector list through, which is the correct behaviour.

## Common Pitfalls

- **Adding raw scores.** BM25 and cosine live on different scales; a raw sum is BM25 alone. Fuse by rank (RRF) or normalise first.
- **Assuming embeddings handle identifiers.** Product codes, error codes, ticket ids, people names and version strings are exactly where dense retrieval is weakest. Test them explicitly.
- **Evaluating on one query type.** A test set of natural-language questions will "prove" vectors alone are enough. Include identifier, keyword and paraphrase queries in proportion to real traffic.
- **Treating hybrid as the last step.** Hybrid improves the candidate set; ordering within it is a reranker's job. Do not expect fusion to put the single best chunk first every time.
- **Retrieving too few per side.** If each retriever only returns its top 5 before fusion, a document ranked sixth by both never gets a chance. Fetch a deeper window from each side than the k you finally keep.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Two retrievers:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">BM25</strong> is lexical: it scores exact term matches, weighted by rarity (IDF), with term-frequency saturation and length normalisation. <strong style="color:#ffca28;">Vector search</strong> is dense: it embeds query and chunks and returns the nearest by cosine, so it matches meaning.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Opposite failures:</strong> <span style="color:#f0e2c8;">Embeddings blur exact tokens: error codes, SKUs, names, versions. BM25 misses paraphrase and synonyms: <em style="color:#f0e2c8;">money back</em> never matches <em style="color:#f0e2c8;">refund</em>. Real traffic has both kinds of query.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Hybrid:</strong> <span style="color:#f0e2c8;">Run both on every query, in parallel, and <strong style="color:#ffca28;">fuse</strong> the two ranked lists. Scores are on different scales, so fusion is usually by rank with <strong style="color:#ffca28;">Reciprocal Rank Fusion</strong>: sum <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1/(k + rank)</code> with k around 60.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Evidence:</strong> <span style="color:#f0e2c8;">In my toy run each retriever alone got the right article first on 4 of 6 queries, failing on different ones, and the fused list got 6 of 6: BM25 rescued <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ERR-4012</code>, vectors rescued <em style="color:#f0e2c8;">I cannot sign in</em>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Where it sits:</strong> <span style="color:#f0e2c8;">Hybrid is a recall tool for the candidate set; a reranker then orders the top few dozen. Costs are a second index to keep in sync and a little latency. Elasticsearch, OpenSearch, Weaviate and Qdrant fuse natively; with Postgres you fuse in SQL.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just add the BM25 score and the cosine score?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">They are on different scales: BM25 is unbounded and depends on the corpus and query length, cosine sits in a narrow band. A raw sum is effectively BM25 alone. You either fuse by <strong style="color:#ffca28;">rank</strong> (RRF) or normalise each list first and take a weighted combination.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would a better embedding model remove the need for BM25?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It narrows the gap but does not remove it: an embedding still compresses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ERR-4012</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ERR-4013</code> into nearby points, and new jargon or identifiers that are rare in its training data embed poorly. Test identifier queries on your own data before dropping the keyword side.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is learned sparse retrieval?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Models such as the SPLADE family produce sparse, vocabulary-sized vectors like BM25, but with learned term weights, including related terms not present in the text. They can fill the lexical role in hybrid search with some semantic expansion, at the cost of running a model at index and query time.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How deep should each retriever search before fusion?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Deeper than the k you finally keep, because a document ranked sixth by both retrievers can be the best fused result. Typical setups fetch a few dozen to a hundred per side, fuse, then rerank and keep a handful.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you do hybrid search on Postgres?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keep a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tsvector</code> column with a GIN index for full-text search and a pgvector column for embeddings, run both queries in CTEs, and fuse with RRF in SQL using a full outer join on the chunk id. Note that Postgres full-text ranking (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ts_rank</code>) is not BM25.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Lexical (keyword) search | Retrieval by matching the query words, through an inverted index |
| BM25 | Lexical scoring with IDF, saturating term frequency (k1) and length normalisation (b) |
| Sparse retrieval | Lexical-style retrieval over vocabulary-sized, mostly-zero vectors, including learned variants |
| Dense retrieval (vector search) | Nearest-neighbour search over embeddings |
| Vocabulary mismatch | User and document use different words for the same thing |
| Exact-match failure | Embeddings placing near-identical identifiers close together, so the wrong one wins |
| Hybrid search | Running lexical and dense retrieval together and merging the results |
| Reciprocal Rank Fusion (RRF) | Fusion by summing 1 / (k + rank) across lists |

**Conclusion:** BM25 and vector search fail in opposite places. BM25 nails rare exact tokens (error codes, part numbers, names) and is blind to paraphrase; embeddings understand paraphrase and blur exact tokens. Hybrid search runs both on every query and fuses their ranked lists, usually with Reciprocal Rank Fusion because their scores are not comparable, so a query of either kind finds its document. It costs a second index and a little latency, it improves the recall of the candidate set rather than the final ordering (that is a reranker's job), and like everything in retrieval it should be proven on a test set that includes both kinds of query.`,
    examples: [
      {
        label: `BM25 vs a stub embedding vs hybrid RRF on exact codes and paraphrases`,
        variants: [
          { tech: "node", code: `// BM25 vs a stub "embedding" vs hybrid (RRF) on a tiny support knowledge base.
// The stub maps words to concepts, so paraphrases match; codes collapse into one "code" concept,
// which is the real weakness of dense vectors exaggerated: they know it is an error code, not which one.
const DOCS = [
  ["kb-02", "Error ERR-4013 means the card expired."],
  ["kb-01", "Error ERR-4012 means the payment card was declined by the bank."],
  ["kb-03", "Refunds are issued to the original payment method within 5 business days."],
  ["kb-04", "If login fails, reset your password from the sign-in page."],
  ["kb-06", "Batteries for the X300 use part SKU-88B715 and ship separately."],
  ["kb-05", "Replacement battery for the X200 is part SKU-88B714."],
  ["kb-07", "Two factor codes are sent by text message to your registered phone."],
  ["kb-08", "Cancel a subscription from the billing page at any time."],
];
const QUERIES = [
  ["ERR-4012", "kb-01", "exact code"],
  ["how do I get my money back", "kb-03", "paraphrase"],
  ["battery for X200", "kb-05", "model number"],
  ["I cannot sign in", "kb-04", "paraphrase"],
  ["card declined ERR-4012", "kb-01", "mixed"],
  ["expired card", "kb-02", "keywords"],
];
const STOP = new Set("a an the is are for to of by from if your you i do how my in at and has use".split(" "));
const tok = (s) => s.toLowerCase().split(/[^a-z0-9-]+/).filter((w) => w && !STOP.has(w));

// ---- BM25 (Lucene-style idf, k1 = 1.2, b = 0.75)
const D = DOCS.map(([, t]) => tok(t));
const avgdl = D.reduce((a, d) => a + d.length, 0) / D.length;
const df = (w) => D.filter((d) => d.includes(w)).length;
function bm25(query) {
  const q = tok(query);
  return D.map((d, i) => {
    let s = 0;
    for (const w of q) {
      const tf = d.filter((x) => x === w).length, n = df(w);
      if (!tf) continue;
      s += Math.log(1 + (D.length - n + 0.5) / (n + 0.5)) * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * d.length / avgdl));
    }
    return { id: DOCS[i][0], s };
  }).filter((h) => h.s > 0);
}

// ---- stub embedding: bag of concepts, cosine similarity
const CONCEPT = {
  refund: "refund", refunds: "refund", money: "refund", back: "refund", reimburse: "refund",
  login: "login", "sign-in": "login", sign: "login", password: "login", fails: "fail", cannot: "fail",
  card: "card", payment: "pay", billing: "pay", declined: "decline", expired: "expire",
  battery: "battery", batteries: "battery", error: "error",
  subscription: "subscription", cancel: "cancel", codes: "otp", message: "otp", phone: "otp",
};
function embed(text) {
  const v = new Map();
  for (const w of tok(text)) {
    const c = /^err-\\d+$/.test(w) ? "errcode" : /^sku-/.test(w) ? "partno" : /^x\\d+$/.test(w) ? "model" : CONCEPT[w];
    if (c) v.set(c, (v.get(c) || 0) + 1);
  }
  return v;
}
const cos = (a, b) => {
  let dot = 0, na = 0, nb = 0;
  for (const [k, x] of a) { dot += x * (b.get(k) || 0); na += x * x; }
  for (const x of b.values()) nb += x * x;
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
};
const E = DOCS.map(([, t]) => embed(t));
const vector = (query) => { const q = embed(query); return E.map((e, i) => ({ id: DOCS[i][0], s: cos(q, e) })).filter((h) => h.s > 0); };

// ---- ranking + Reciprocal Rank Fusion
const order = (hits) => hits.map((h, i) => ({ ...h, i })).sort((a, b) => b.s - a.s || a.i - b.i).map((h) => h.id);
function rrf(lists, k = 60) {
  const score = new Map(), first = [];
  for (const list of lists) list.forEach((id, r) => { if (!score.has(id)) first.push(id); score.set(id, (score.get(id) || 0) + 1 / (k + r + 1)); });
  return first.map((id, i) => ({ id, s: score.get(id), i })).sort((a, b) => b.s - a.s || a.i - b.i).map((h) => h.id);
}

const rankOf = (list, id) => { const r = list.indexOf(id); return r < 0 ? "-" : String(r + 1); };
console.log("query                         type          BM25  vector  hybrid   (rank of the right doc)");
const tot = { bm25: [0, 0], vector: [0, 0], hybrid: [0, 0] };
for (const [q, gold, type] of QUERIES) {
  const L = { bm25: order(bm25(q)), vector: order(vector(q)) };
  L.hybrid = rrf([L.bm25, L.vector]);
  for (const m of Object.keys(tot)) {
    const r = L[m].indexOf(gold);
    if (r === 0) tot[m][0]++;
    if (r >= 0) tot[m][1] += 1 / (r + 1);
  }
  console.log(\`\${q.padEnd(29)} \${type.padEnd(13)} \${rankOf(L.bm25, gold).padStart(4)}  \${rankOf(L.vector, gold).padStart(6)}  \${rankOf(L.hybrid, gold).padStart(6)}\`);
}
console.log("\\nmethod   recall@1   MRR");
for (const [m, [r1, mrr]] of Object.entries(tot)) console.log(\`\${m.padEnd(8)} \${(r1 + "/" + QUERIES.length).padStart(8)}   \${(mrr / QUERIES.length).toFixed(3)}\`);

console.log('\\nwhy "ERR-4012" needs BM25:');
const vb = order(vector("ERR-4012")), bb = order(bm25("ERR-4012"));
console.log(\`  BM25 list   : \${bb.join(", ")}\`);
console.log(\`  vector list : \${vb.slice(0, 2).join(", ")}  (both docs are just "an error code" to the vector)\`);
console.log(\`  RRF kb-01 = 1/(60+1) + 1/(60+2) = \${(1 / 61 + 1 / 62).toFixed(5)}   kb-02 = 1/(60+1) = \${(1 / 61).toFixed(5)}\`);` },
          { tech: "python", code: `# BM25 vs a stub "embedding" vs hybrid (RRF) on a tiny support knowledge base.
# The stub maps words to concepts, so paraphrases match; codes collapse into one "code" concept,
# which is the real weakness of dense vectors exaggerated: they know it is an error code, not which one.
import math
import re

DOCS = [
    ("kb-02", "Error ERR-4013 means the card expired."),
    ("kb-01", "Error ERR-4012 means the payment card was declined by the bank."),
    ("kb-03", "Refunds are issued to the original payment method within 5 business days."),
    ("kb-04", "If login fails, reset your password from the sign-in page."),
    ("kb-06", "Batteries for the X300 use part SKU-88B715 and ship separately."),
    ("kb-05", "Replacement battery for the X200 is part SKU-88B714."),
    ("kb-07", "Two factor codes are sent by text message to your registered phone."),
    ("kb-08", "Cancel a subscription from the billing page at any time."),
]
QUERIES = [
    ("ERR-4012", "kb-01", "exact code"),
    ("how do I get my money back", "kb-03", "paraphrase"),
    ("battery for X200", "kb-05", "model number"),
    ("I cannot sign in", "kb-04", "paraphrase"),
    ("card declined ERR-4012", "kb-01", "mixed"),
    ("expired card", "kb-02", "keywords"),
]
STOP = set("a an the is are for to of by from if your you i do how my in at and has use".split(" "))


def tok(s):
    return [w for w in re.split(r"[^a-z0-9-]+", s.lower()) if w and w not in STOP]


# ---- BM25 (Lucene-style idf, k1 = 1.2, b = 0.75)
D = [tok(t) for _, t in DOCS]
avgdl = sum(len(d) for d in D) / len(D)


def df(w):
    return len([d for d in D if w in d])


def bm25(query):
    q = tok(query)
    out = []
    for i, d in enumerate(D):
        s = 0
        for w in q:
            tf, n = d.count(w), df(w)
            if not tf:
                continue
            s += math.log(1 + (len(D) - n + 0.5) / (n + 0.5)) * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * len(d) / avgdl))
        if s > 0:
            out.append({"id": DOCS[i][0], "s": s})
    return out


# ---- stub embedding: bag of concepts, cosine similarity
CONCEPT = {
    "refund": "refund", "refunds": "refund", "money": "refund", "back": "refund", "reimburse": "refund",
    "login": "login", "sign-in": "login", "sign": "login", "password": "login", "fails": "fail", "cannot": "fail",
    "card": "card", "payment": "pay", "billing": "pay", "declined": "decline", "expired": "expire",
    "battery": "battery", "batteries": "battery", "error": "error",
    "subscription": "subscription", "cancel": "cancel", "codes": "otp", "message": "otp", "phone": "otp",
}


def embed(text):
    v = {}
    for w in tok(text):
        if re.fullmatch(r"err-\\d+", w):
            c = "errcode"
        elif w.startswith("sku-"):
            c = "partno"
        elif re.fullmatch(r"x\\d+", w):
            c = "model"
        else:
            c = CONCEPT.get(w)
        if c:
            v[c] = v.get(c, 0) + 1
    return v


def cos(a, b):
    dot = na = nb = 0
    for k, x in a.items():
        dot += x * b.get(k, 0)
        na += x * x
    for x in b.values():
        nb += x * x
    return dot / math.sqrt(na * nb) if na and nb else 0


E = [embed(t) for _, t in DOCS]


def vector(query):
    q = embed(query)
    return [{"id": DOCS[i][0], "s": cos(q, e)} for i, e in enumerate(E) if cos(q, e) > 0]


# ---- ranking + Reciprocal Rank Fusion
def order(hits):
    return [h["id"] for _, h in sorted(enumerate(hits), key=lambda p: (-p[1]["s"], p[0]))]


def rrf(lists, k=60):
    score, first = {}, []
    for lst in lists:
        for r, id_ in enumerate(lst):
            if id_ not in score:
                first.append(id_)
            score[id_] = score.get(id_, 0) + 1 / (k + r + 1)
    return [id_ for i, id_ in sorted(enumerate(first), key=lambda p: (-score[p[1]], p[0]))]


def rank_of(lst, id_):
    return str(lst.index(id_) + 1) if id_ in lst else "-"


print("query                         type          BM25  vector  hybrid   (rank of the right doc)")
tot = {"bm25": [0, 0], "vector": [0, 0], "hybrid": [0, 0]}
for q, gold, typ in QUERIES:
    L = {"bm25": order(bm25(q)), "vector": order(vector(q))}
    L["hybrid"] = rrf([L["bm25"], L["vector"]])
    for m in tot:
        if gold in L[m]:
            r = L[m].index(gold)
            if r == 0:
                tot[m][0] += 1
            tot[m][1] += 1 / (r + 1)
    print(f"{q:<29} {typ:<13} {rank_of(L['bm25'], gold):>4}  {rank_of(L['vector'], gold):>6}  {rank_of(L['hybrid'], gold):>6}")
print("\\nmethod   recall@1   MRR")
for m, (r1, mrr) in tot.items():
    print(f"{m:<8} {f'{r1}/{len(QUERIES)}':>8}   {mrr / len(QUERIES):.3f}")

print('\\nwhy "ERR-4012" needs BM25:')
vb, bb = order(vector("ERR-4012")), order(bm25("ERR-4012"))
print(f"  BM25 list   : {', '.join(bb)}")
print(f'  vector list : {", ".join(vb[:2])}  (both docs are just "an error code" to the vector)')
print(f"  RRF kb-01 = 1/(60+1) + 1/(60+2) = {1 / 61 + 1 / 62:.5f}   kb-02 = 1/(60+1) = {1 / 61:.5f}")` },
        ],
      },
    ],
  },
  {
    title: `Hybrid search: why combine BM25 with vectors and how does RRF work?`,
    difficulty: "medium",
    seoDescription: `Why BM25 and vector scores cannot be added, how Reciprocal Rank Fusion merges ranked lists with 1/(k+rank), and how k, weights and windows change it.`,
    description: `**Question presented to candidate:**
"You have a BM25 result list and a vector-search result list for the same query, and you need one ranking to send to the reranker. Why can you not just add the scores, how does Reciprocal Rank Fusion combine the lists, and what are its knobs and its alternatives?"

**What a strong answer should cover:**
- The scale problem: BM25 scores are unbounded and corpus-dependent while cosine similarities sit in a narrow band, so a raw sum is decided by BM25, and normalised scores are distorted by outliers
- RRF itself: each document gets the sum over lists of 1 / (k + rank), with documents missing from a list contributing nothing; it uses only ranks, rewards agreement between retrievers, and needs no training (Cormack, Clarke and Büttcher, SIGIR 2009, with k = 60)
- The knobs: the rank constant k (small k favours each list top results, large k flattens toward counting appearances), per-retriever weights (weighted RRF), and the rank window, meaning how deep each list is read before fusing
- The main alternative: normalise each list (min-max, z-score or distribution-based) and take a weighted convex combination; it keeps score margins and can beat RRF when tuned on labelled data (Bruch et al.), at the cost of tuning and outlier sensitivity
- Engines expose these as parameters (for example Elasticsearch rank_constant and rank_window_size, Weaviate fusion types and alpha), so defaults should be checked per version and tuned on a labelled set

**Code / implementation expected:** Yes — implementing RRF over two ranked lists (a few lines) and working one example by hand is expected; comparing it with min-max fusion is a plus.`,
    answer: `**Target Audience:** Engineers implementing or tuning hybrid retrieval who need to explain, and compute by hand, how two ranked lists become one.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (raw-score sum, min-max convex combination and RRF with different k, weights and windows, on two fixed result lists; no search engine is called). Engine parameters and papers were checked in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

A baking contest has two judges. One scores out of 100 and is generous: her scores run from 60 to 98. The other scores out of 5 and is stingy: 3.1 to 4.2. If you add their scores, the first judge decides the winner on her own, because her numbers are twenty times bigger. If you rescale both to 0 to 1, one wildly enthusiastic 98 squashes every other cake towards zero. The fair, boring and surprisingly robust fix is to ignore the numbers and use each judge's *placings*: first place from either judge counts for a lot, tenth place for a little, and a cake both judges placed near the top wins.

That is Reciprocal Rank Fusion. The two judges are your keyword retriever and your vector retriever; why you run both at all is covered in [What is hybrid search?](/interview-question/what-is-hybrid-search-and-why-combine-bm25-with-vector-search) This page is about the merge.

## 2. The Problem: Two Lists, Two Scales

The example uses two result lists of the shapes real retrievers produce:

~~~text
input lists
  BM25   : d1=14.2  d2=9.1  d3=8.7  d4=3.2  d5=2.9  d6=2.5
  vector : d7=0.83  d1=0.8  d8=0.79  d3=0.75  d2=0.61  d5=0.6
~~~

BM25 scores are unbounded and depend on the corpus statistics and how many terms the query has. Cosine similarities from an embedding model often crowd into a narrow band. Neither is a probability, and a BM25 of 9 and a cosine of 0.8 are not "the same amount of relevance".

📌 **Interview term: score fusion** — combining result lists by their scores (after some normalisation).

📌 **Interview term: rank fusion** — combining result lists by the positions of documents only, ignoring their scores.

Adding the raw numbers is score fusion with no normalisation, and the run shows the result: the fused top five is exactly the BM25 order with one swap, and the vector retriever's favourite, \`d7\`, is nowhere.

~~~text
1) raw score sum (scales differ, so BM25 decides alone)
  top 5: d1 d2 d3 d5 d4
~~~

## 3. Reciprocal Rank Fusion

📌 **Interview term: Reciprocal Rank Fusion (RRF)** — every document gets, from each list it appears in, \`1 / (k + rank)\`, where rank starts at 1; the contributions are summed and documents are sorted by the sum. A document absent from a list gets nothing from it. Introduced by Cormack, Clarke and Büttcher, "Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods" (SIGIR 2009), with \`k = 60\`.

📌 **Interview term: rank constant (k)** — the number added to every rank. It damps the advantage of the very top positions; with \`k = 60\`, first place is worth \`1/61\` and tenth place \`1/70\`.

The whole algorithm, as in the example:

~~~js
function rrf(lists, k = 60, weights = lists.map(() => 1), window = Infinity) {
  const m = new Map();
  lists.forEach((l, j) => l.slice(0, window).forEach(([id], r) => m.set(id, (m.get(id) || 0) + weights[j] / (k + r + 1))));
  return rank(m);
}
~~~

Worked by hand for the two lists, \`k = 60\`:

~~~text
  doc  bm25 rank  vec rank  arithmetic                  score
  d1           1         2  1/61 + 1/62                 0.03252
  d2           2         5  1/62 + 1/65                 0.03151
  d3           3         4  1/63 + 1/64                 0.03150
  d5           5         6  1/65 + 1/66                 0.03054
  d7           -         1  1/61                        0.01639
  d8           -         3  1/63                        0.01587
  d4           4         -  1/64                        0.01563
  d6           6         -  1/66                        0.01515
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 760 260" role="img" aria-label="RRF scoring: d1 is rank 1 in the BM25 list and rank 2 in the vector list, so it collects two contributions and wins; d7 is rank 1 in only one list, so it collects one contribution and ranks below documents both lists found">
  <defs>
    <marker id="ai06q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="170" height="100" rx="10"/>
  <text class="d-text" x="105" y="50" text-anchor="middle">BM25 list</text>
  <text class="d-sub" x="105" y="76" text-anchor="middle">1. d1</text>
  <text class="d-sub" x="105" y="100" text-anchor="middle">2. d2</text>
  <rect class="d-box-muted" x="20" y="140" width="170" height="100" rx="10"/>
  <text class="d-text" x="105" y="170" text-anchor="middle">vector list</text>
  <text class="d-sub" x="105" y="196" text-anchor="middle">1. d7</text>
  <text class="d-sub" x="105" y="220" text-anchor="middle">2. d1</text>
  <rect class="d-box-accent" x="290" y="40" width="200" height="70" rx="10"/>
  <text class="d-text" x="390" y="68" text-anchor="middle">d1 = 1/61 + 1/62</text>
  <text class="d-sub" x="390" y="92" text-anchor="middle">found by both</text>
  <rect class="d-box" x="290" y="150" width="200" height="70" rx="10"/>
  <text class="d-text" x="390" y="178" text-anchor="middle">d7 = 1/61</text>
  <text class="d-sub" x="390" y="202" text-anchor="middle">found by one</text>
  <rect class="d-box-accent" x="580" y="80" width="160" height="100" rx="10"/>
  <text class="d-text" x="660" y="110" text-anchor="middle">fused order</text>
  <text class="d-sub" x="660" y="136" text-anchor="middle">d1 d2 d3 d5 d7</text>
  <path class="d-edge" d="M 190 70 L 282 75" marker-end="url(#ai06q5-arrow)"/>
  <path class="d-edge" d="M 190 210 L 282 95" marker-end="url(#ai06q5-arrow)"/>
  <path class="d-edge-dashed" d="M 190 190 L 282 185" marker-end="url(#ai06q5-arrow)"/>
  <path class="d-edge" d="M 490 75 L 572 120" marker-end="url(#ai06q5-arrow)"/>
  <path class="d-edge" d="M 490 185 L 572 145" marker-end="url(#ai06q5-arrow)"/>
</svg>

\`d1\` collects from both lists and wins. \`d7\`, first in the vector list, lands fifth: with \`k = 60\`, one first place (\`1/61\` = 0.01639) is worth roughly half of two mid-table places (\`d5\`: 0.03054). That is the defining property of RRF:

📌 **Interview term: consensus bias** — RRF favours documents that several retrievers agree on over documents one retriever loves and the other never returned. It is usually what you want in hybrid search, and it is also how RRF can bury a correct result that only one retriever could find, such as an exact identifier match.

Three more properties follow from the formula:

- **It ignores score margins.** \`d1\` beat \`d2\` by 14.2 vs 9.1 in BM25; RRF only sees "1st vs 2nd". Information is thrown away, and in exchange outliers cannot distort anything (section 5).
- **Missing documents count as zero**, so a document returned by only one list can still rank, below the documents both found.
- **No training, no tuning required to start.** It works with any number of lists (several query rewrites, several embedding models) and any retrievers, which is why it is the common default.

## 4. The Knobs

### The rank constant k

~~~text
4) the k constant: small k rewards the top of each list, large k flattens
  k =   1: top 5 d1 d2 d7 d3 d5   weight of rank 1 / rank 10 = 5.50
  k =  10: top 5 d1 d2 d3 d5 d7   weight of rank 1 / rank 10 = 1.82
  k =  60: top 5 d1 d2 d3 d5 d7   weight of rank 1 / rank 10 = 1.15
  k = 600: top 5 d1 d2 d3 d5 d7   weight of rank 1 / rank 10 = 1.01
~~~

With \`k = 1\`, first place is worth 5.5 times tenth place, so a document that one retriever ranks first (\`d7\`) climbs to third. With \`k = 600\`, every position is worth almost the same, and RRF degenerates into counting how many lists contain the document. \`k = 60\` sits between, mildly top-weighted. Secondary sources describe 60 as an empirical choice that worked well rather than a derived value; Bruch et al. (below) found RRF's results do depend on it, so it is a parameter worth sweeping on your own queries, not a law. Engines differ in the exact formula and default too: Elasticsearch documents \`rank_constant\` with a default of 60 and a minimum of 1, while other engines define their own default, so check before comparing numbers across systems.

### Weights

📌 **Interview term: weighted RRF** — multiply each list's contribution by a weight, \`w_j / (k + rank)\`, to trust one retriever more.

~~~text
5) weighted RRF, vector list weight 2 (trust semantics more)
  top 5: d1 d3 d2 d5 d7
~~~

Doubling the vector weight lifts \`d3\` (vector rank 4) above \`d2\` (vector rank 5). Weights are a cheap lever when one query type dominates your traffic; set them from evaluation, not intuition.

### The rank window

📌 **Interview term: rank window** — how many results from each retriever are fed into fusion. A document outside every window cannot appear in the fused list at all.

~~~text
6) rank window: each retriever only contributes its top 3
  fused: d1 d7 d2 d3 d8   (5 docs; never seen: d5 d4 d6)
~~~

With a window of 3, \`d5\`, the fourth-best fused document over the full lists, disappears because both retrievers ranked it below third. Elasticsearch calls this \`rank_window_size\`; its reference pages for different 8.x versions disagree on the default (the request \`size\` in some, 10 in others), which is a reason to set it explicitly. Fetch a deeper window than the number of results you keep: fusing 50 to 100 per side and keeping 20 for a reranker is a common shape.

## 5. The Alternative: Normalise, Then Combine Scores

📌 **Interview term: min-max normalisation** — rescale each list so its top score is 1 and its bottom score is 0: \`(s − min) / (max − min)\`.

📌 **Interview term: convex combination** — a weighted average of the normalised scores, \`α · lexical + (1 − α) · dense\` with α between 0 and 1. Weaviate's \`alpha\` and OpenSearch's normalisation-processor weights are this idea.

It keeps score margins, which RRF discards: a document far ahead in one list stays far ahead. The cost is that min and max come from single documents, so one outlier rescales everyone else:

~~~text
2) min-max normalise each list, then 0.5 * bm25 + 0.5 * vector
  top 5: d1 d3 d7 d8 d2   scores: 0.935 0.591 0.500 0.413 0.304
  d1 scores 41.0 instead of 14.2: top 5: d1 d7 d8 d3 d2   scores: 0.935 0.500 0.413 0.407 0.107
~~~

Only \`d1\`'s BM25 score changed, yet \`d3\` fell from second to fourth: its normalised BM25 score shrank from 0.53 to 0.16 because the maximum moved. RRF, given the same change, does not move at all, since no rank changed:

~~~text
  same with the outlier d1 = 41.0: top 5: d1 d2 d3 d5 d7  (ranks did not change, so neither does RRF)
~~~

📌 **Interview term: distribution-based score fusion (DBSF)** — normalise each list using its mean and standard deviation instead of its min and max, which is less sensitive to one extreme score. Qdrant documents DBSF alongside RRF as its fusion options.

Which is better? Bruch, Gai and Ingber, "An Analysis of Fusion Functions for Hybrid Retrieval" (arXiv 2210.11934, ACM TOIS), found that a convex combination, tuned with a small set of labelled examples, outperformed RRF both in-domain and out-of-domain in their experiments, that the choice of normalisation mattered less than expected, and that RRF is sensitive to its parameters. The practical reading: RRF is the robust zero-tuning default; a tuned convex combination can beat it once you have labelled queries to set α.

| | RRF | Normalised convex combination |
| :--- | :--- | :--- |
| Uses | Ranks only | Scores, after normalisation |
| Tuning needed | None to start (k, weights optional) | α, plus a normaliser choice |
| Outlier scores | No effect | Can reorder everything (see run) |
| Score margins | Discarded | Kept |
| Adding a third list | Trivial | Needs normalising and weighting it too |
| Best when | No labelled data, many lists, quick default | Labelled queries available to tune α |

## 6. In a Real Engine

The same fusion expressed as an Elasticsearch \`rrf\` retriever (not run here; the shape follows the Elasticsearch RRF reference, with \`standard\` and \`knn\` child retrievers and \`rank_constant\` and \`rank_window_size\` beside them; field names are placeholders):

~~~json
{
  "retriever": {
    "rrf": {
      "retrievers": [
        { "standard": { "query": { "match": { "body": "card declined ERR-4012" } } } },
        { "knn": { "field": "body_embedding", "query_vector": [0.12, -0.03, 0.88], "k": 50, "num_candidates": 100 } }
      ],
      "rank_constant": 60,
      "rank_window_size": 50
    }
  }
}
~~~

Other engines expose the same choices under other names: OpenSearch has an RRF score-ranker processor (since 2.19) next to its normalisation processor; Weaviate offers \`rankedFusion\` and \`relativeScoreFusion\`, documenting the latter as the default since v1.24; Qdrant fuses prefetch results with RRF or DBSF. With PostgreSQL you write the RRF sum yourself in SQL over a full-text CTE and a pgvector CTE. Whichever engine you use, the fused list then usually goes to a reranker: [Reranking in RAG: when and how to add a cross-encoder](/interview-question/reranking-in-rag-when-and-how-to-add-a-cross-encoder).

## 7. Verified: Running the Code

The example **"Fuse a BM25 list and a vector list: raw sum, min-max, and RRF with k, weights and a rank window"** takes the two fixed lists above (scores chosen to look like real BM25 and cosine outputs) and prints six fusions. The lists are hard-coded so the arithmetic can be followed by hand; there is no retrieval step, and ties in fused scores are broken by first appearance (the BM25 list is read first). Floating point output is formatted identically in both languages by rounding half up on the exact binary value, the way JavaScript \`toFixed\` does.

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
input lists
  BM25   : d1=14.2  d2=9.1  d3=8.7  d4=3.2  d5=2.9  d6=2.5
  vector : d7=0.83  d1=0.8  d8=0.79  d3=0.75  d2=0.61  d5=0.6

1) raw score sum (scales differ, so BM25 decides alone)
  top 5: d1 d2 d3 d5 d4

2) min-max normalise each list, then 0.5 * bm25 + 0.5 * vector
  top 5: d1 d3 d7 d8 d2   scores: 0.935 0.591 0.500 0.413 0.304
  d1 scores 41.0 instead of 14.2: top 5: d1 d7 d8 d3 d2   scores: 0.935 0.500 0.413 0.407 0.107

3) RRF, k = 60: score(d) = sum over lists of 1 / (k + rank)
  doc  bm25 rank  vec rank  arithmetic                  score
  d1           1         2  1/61 + 1/62                 0.03252
  d2           2         5  1/62 + 1/65                 0.03151
  d3           3         4  1/63 + 1/64                 0.03150
  d5           5         6  1/65 + 1/66                 0.03054
  d7           -         1  1/61                        0.01639
  d8           -         3  1/63                        0.01587
  d4           4         -  1/64                        0.01563
  d6           6         -  1/66                        0.01515
  same with the outlier d1 = 41.0: top 5: d1 d2 d3 d5 d7  (ranks did not change, so neither does RRF)

4) the k constant: small k rewards the top of each list, large k flattens
  k =   1: top 5 d1 d2 d7 d3 d5   weight of rank 1 / rank 10 = 5.50
  k =  10: top 5 d1 d2 d3 d5 d7   weight of rank 1 / rank 10 = 1.82
  k =  60: top 5 d1 d2 d3 d5 d7   weight of rank 1 / rank 10 = 1.15
  k = 600: top 5 d1 d2 d3 d5 d7   weight of rank 1 / rank 10 = 1.01

5) weighted RRF, vector list weight 2 (trust semantics more)
  top 5: d1 d3 d2 d5 d7

6) rank window: each retriever only contributes its top 3
  fused: d1 d7 d2 d3 d8   (5 docs; never seen: d5 d4 d6)
~~~

## Edge Cases Worth Knowing

- **Ties.** Different documents can get identical RRF sums (rank 1 + rank 3 and rank 3 + rank 1 in two lists). Break ties deterministically, for example by the best single rank or a stable id, or results will flicker between identical queries.
- **Duplicates within a list.** If a list contains several chunks of the same document, decide whether you fuse chunks or documents; fusing at document level after deduplication avoids one long document taking several slots.
- **Empty lists.** When BM25 finds nothing (pure paraphrase), RRF returns the vector list unchanged. That is correct, but monitor it: many empty lexical results can mean a broken analyser.
- **Comparing fused scores across queries.** RRF sums depend on how many lists and how deep the windows are; they are not a confidence value. Do not threshold "relevance" on them; use a reranker score for that.
- **Filters must be applied inside each retriever.** Fusing and then filtering by tenant can leave a user with too few results, or leak documents if a filter is forgotten on one side.

## Common Pitfalls

- **Adding raw BM25 and cosine scores.** BM25 dominates and the vector retriever becomes decoration.
- **Treating k = 60 as sacred.** It is a sensible starting point; sweep k (and weights) on labelled queries if fusion quality matters.
- **A rank window equal to the final k.** Documents ranked just below the cut-off by both retrievers are often the best fused results; read deeper than you keep.
- **Min-max on tiny or skewed lists.** With few results, or one outlier, normalised scores swing wildly; prefer RRF or a distribution-based normaliser.
- **Expecting fusion to fix ranking inside the candidates.** Fusion improves which documents are candidates; a cross-encoder reranker is what orders them well.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Why combine:</strong> <span style="color:#f0e2c8;">BM25 catches exact terms and identifiers that embeddings blur; vectors catch paraphrase BM25 cannot. So hybrid runs both and must merge two ranked lists into one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Why not add scores:</strong> <span style="color:#f0e2c8;">BM25 is unbounded and corpus-dependent, cosine sits in a narrow band, so a raw sum is BM25 alone. Min-max normalising helps, but one outlier score rescales the whole list.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. RRF:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Reciprocal Rank Fusion</strong> ignores scores: each document gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1/(k + rank)</code> from every list it appears in, summed, with k = 60 from Cormack et al. at SIGIR 2009. Documents both retrievers agree on rise; a document missing from a list gets zero from it.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Knobs:</strong> <span style="color:#f0e2c8;">Small <strong style="color:#ffca28;">k</strong> makes it top-heavy, large k flattens it toward counting appearances. <strong style="color:#ffca28;">Weights</strong> trust one retriever more. The <strong style="color:#ffca28;">rank window</strong> is how deep each list is read; anything outside it can never be fused in, so read deeper than you keep.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Trade-off:</strong> <span style="color:#f0e2c8;">RRF needs no training and is immune to outliers, but discards margins. A <strong style="color:#ffca28;">convex combination</strong> of normalised scores keeps margins and, tuned on labelled queries, beat RRF in Bruch et al. I start with RRF, measure, and send the fused top few dozen to a reranker.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Work out the RRF score for a document ranked 1st in BM25 and 2nd in vector search.</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With k = 60 it is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1/61 + 1/62</code>, about 0.03252. A document ranked 1st by only one retriever gets <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1/61</code>, about 0.01639, so agreement between the two lists beats a single first place.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you set k to 1?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rank 1 becomes worth 5.5 times rank 10 instead of 1.15 times, so a document that one retriever ranks first can jump over documents both lists ranked well. In the run, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d7</code>, first only in the vector list, rose from fifth to third.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you prefer a weighted score combination over RRF?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When you have labelled queries to tune the weight, and score margins carry information, for example one retriever is very confident. Bruch et al. found a tuned convex combination outperformed RRF in and out of domain. Without labels, or with many lists, RRF is the safer default.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you threshold the fused RRF score to drop irrelevant results?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not reliably. The sum depends on how many lists there are and how deep the windows go, not on absolute relevance, so it is not comparable across queries. Use a reranker score or the individual retriever scores for cut-offs.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How deep should each retriever go before fusion?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Deeper than the final k. A document ranked just below the cut-off by both lists can be the best fused result, and in the run a window of 3 removed <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">d5</code>, which was fourth overall. Fetching 50 to 100 per side and keeping a few dozen for reranking is a common shape.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Score fusion | Combining lists by their (normalised) scores |
| Rank fusion | Combining lists by positions only |
| Reciprocal Rank Fusion (RRF) | Sum of 1 / (k + rank) over the lists a document appears in |
| Rank constant (k) | The number added to every rank; small k is top-heavy, large k is flat |
| Consensus bias | RRF favouring documents several retrievers agree on |
| Weighted RRF | RRF with a per-list multiplier |
| Rank window | How many results per retriever enter fusion |
| Min-max normalisation | Rescaling a list to 0..1 by its min and max |
| Convex combination | Weighted average of normalised scores, alpha and 1 − alpha |
| Distribution-based score fusion (DBSF) | Normalising each list by its mean and spread before combining |

**Conclusion:** BM25 and vector scores cannot be added because they live on different scales, and normalising them makes the result hostage to outliers. Reciprocal Rank Fusion sidesteps both by using only ranks: each list contributes 1 / (k + rank), the sums are sorted, and documents that several retrievers agree on rise to the top. Its knobs are the rank constant (how top-heavy), weights (which retriever to trust) and the rank window (how deep to read). It needs no training, which makes it the standard default; a convex combination of normalised scores keeps margins and, tuned on labelled queries, can beat it. Either way, fusion builds the candidate set and a reranker orders it.`,
    examples: [
      {
        label: `Fuse a BM25 list and a vector list: raw sum, min-max, and RRF with k, weights and a rank window`,
        variants: [
          { tech: "node", code: `// Fusing two ranked lists: raw-score sum, min-max convex combination, and RRF (with k, weights, window).
// The scores are fixed numbers of the kind BM25 (unbounded) and cosine (about 0 to 1) really produce.
const BM25 = [["d1", 14.2], ["d2", 9.1], ["d3", 8.7], ["d4", 3.2], ["d5", 2.9], ["d6", 2.5]];
const VEC = [["d7", 0.83], ["d1", 0.8], ["d8", 0.79], ["d3", 0.75], ["d2", 0.61], ["d5", 0.6]];
const f = (x, d = 4) => x.toFixed(d);

function rank(scores) { // scores: Map id -> number; ties keep first-seen order
  return [...scores.entries()].map(([id, s], i) => ({ id, s, i })).sort((a, b) => b.s - a.s || a.i - b.i);
}
function rawSum(lists) {
  const m = new Map();
  for (const l of lists) for (const [id, s] of l) m.set(id, (m.get(id) || 0) + s);
  return rank(m);
}
function minMax(lists, weights) {
  const m = new Map();
  lists.forEach((l, j) => {
    const hi = l[0][1], lo = l[l.length - 1][1];
    for (const [id, s] of l) m.set(id, (m.get(id) || 0) + weights[j] * (s - lo) / (hi - lo)); // missing from a list adds 0
  });
  return rank(m);
}
function rrf(lists, k = 60, weights = lists.map(() => 1), window = Infinity) {
  const m = new Map();
  lists.forEach((l, j) => l.slice(0, window).forEach(([id], r) => m.set(id, (m.get(id) || 0) + weights[j] / (k + r + 1))));
  return rank(m);
}
const ids = (res, n = 5) => res.slice(0, n).map((h) => h.id).join(" ");

console.log("input lists");
console.log(\`  BM25   : \${BM25.map(([id, s]) => \`\${id}=\${s}\`).join("  ")}\`);
console.log(\`  vector : \${VEC.map(([id, s]) => \`\${id}=\${s}\`).join("  ")}\`);

console.log("\\n1) raw score sum (scales differ, so BM25 decides alone)");
console.log(\`  top 5: \${ids(rawSum([BM25, VEC]))}\`);

console.log("\\n2) min-max normalise each list, then 0.5 * bm25 + 0.5 * vector");
const mm = minMax([BM25, VEC], [0.5, 0.5]);
console.log(\`  top 5: \${ids(mm)}   scores: \${mm.slice(0, 5).map((h) => f(h.s, 3)).join(" ")}\`);
const BM25b = [["d1", 41.0], ...BM25.slice(1)]; // one outlier score at the top of the BM25 list
const mo = minMax([BM25b, VEC], [0.5, 0.5]);
console.log(\`  d1 scores 41.0 instead of 14.2: top 5: \${ids(mo)}   scores: \${mo.slice(0, 5).map((h) => f(h.s, 3)).join(" ")}\`);

console.log("\\n3) RRF, k = 60: score(d) = sum over lists of 1 / (k + rank)");
const R = rrf([BM25, VEC]);
const pos = (l, id) => l.findIndex(([x]) => x === id) + 1;
console.log("  doc  bm25 rank  vec rank  arithmetic                  score");
for (const h of R) {
  const a = pos(BM25, h.id), b = pos(VEC, h.id);
  const parts = [a && \`1/\${60 + a}\`, b && \`1/\${60 + b}\`].filter(Boolean).join(" + ");
  console.log(\`  \${h.id}   \${String(a || "-").padStart(9)}  \${String(b || "-").padStart(8)}  \${parts.padEnd(26)}  \${f(h.s, 5)}\`);
}
console.log(\`  same with the outlier d1 = 41.0: top 5: \${ids(rrf([BM25b, VEC]))}  (ranks did not change, so neither does RRF)\`);

console.log("\\n4) the k constant: small k rewards the top of each list, large k flattens");
for (const k of [1, 10, 60, 600]) {
  const r = rrf([BM25, VEC], k);
  console.log(\`  k = \${String(k).padStart(3)}: top 5 \${ids(r)}   weight of rank 1 / rank 10 = \${f((k + 10) / (k + 1), 2)}\`);
}

console.log("\\n5) weighted RRF, vector list weight 2 (trust semantics more)");
console.log(\`  top 5: \${ids(rrf([BM25, VEC], 60, [1, 2]))}\`);

console.log("\\n6) rank window: each retriever only contributes its top 3");
const w = rrf([BM25, VEC], 60, [1, 1], 3);
const gone = rrf([BM25, VEC]).map((h) => h.id).filter((id) => !w.some((h) => h.id === id));
console.log(\`  fused: \${ids(w, 9)}   (\${w.length} docs; never seen: \${gone.join(" ")})\`);` },
          { tech: "python", code: `# Fusing two ranked lists: raw-score sum, min-max convex combination, and RRF (with k, weights, window).
# The scores are fixed numbers of the kind BM25 (unbounded) and cosine (about 0 to 1) really produce.
from decimal import ROUND_HALF_UP, Decimal

BM25 = [("d1", 14.2), ("d2", 9.1), ("d3", 8.7), ("d4", 3.2), ("d5", 2.9), ("d6", 2.5)]
VEC = [("d7", 0.83), ("d1", 0.8), ("d8", 0.79), ("d3", 0.75), ("d2", 0.61), ("d5", 0.6)]


def f(x, d=4):  # round half up on the exact binary value, like JavaScript toFixed
    return str(Decimal(x).quantize(Decimal(1).scaleb(-d), rounding=ROUND_HALF_UP))


def show(x):  # print a score the way JavaScript prints a number
    return str(int(x)) if x == int(x) else repr(x)


def rank(scores):  # scores: dict id -> number (insertion ordered); ties keep first-seen order
    return [{"id": id_, "s": s} for _, (id_, s) in sorted(enumerate(scores.items()), key=lambda p: (-p[1][1], p[0]))]


def raw_sum(lists):
    m = {}
    for lst in lists:
        for id_, s in lst:
            m[id_] = m.get(id_, 0) + s
    return rank(m)


def min_max(lists, weights):
    m = {}
    for j, lst in enumerate(lists):
        hi, lo = lst[0][1], lst[-1][1]
        for id_, s in lst:
            m[id_] = m.get(id_, 0) + weights[j] * (s - lo) / (hi - lo)  # missing from a list adds 0
    return rank(m)


def rrf(lists, k=60, weights=None, window=None):
    weights = weights or [1] * len(lists)
    m = {}
    for j, lst in enumerate(lists):
        for r, (id_, _) in enumerate(lst[:window]):
            m[id_] = m.get(id_, 0) + weights[j] / (k + r + 1)
    return rank(m)


def ids(res, n=5):
    return " ".join(h["id"] for h in res[:n])


print("input lists")
print("  BM25   : " + "  ".join(f"{i}={show(s)}" for i, s in BM25))
print("  vector : " + "  ".join(f"{i}={show(s)}" for i, s in VEC))

print("\\n1) raw score sum (scales differ, so BM25 decides alone)")
print(f"  top 5: {ids(raw_sum([BM25, VEC]))}")

print("\\n2) min-max normalise each list, then 0.5 * bm25 + 0.5 * vector")
mm = min_max([BM25, VEC], [0.5, 0.5])
print(f"  top 5: {ids(mm)}   scores: {' '.join(f(h['s'], 3) for h in mm[:5])}")
BM25b = [("d1", 41.0)] + BM25[1:]  # one outlier score at the top of the BM25 list
mo = min_max([BM25b, VEC], [0.5, 0.5])
print(f"  d1 scores 41.0 instead of 14.2: top 5: {ids(mo)}   scores: {' '.join(f(h['s'], 3) for h in mo[:5])}")

print("\\n3) RRF, k = 60: score(d) = sum over lists of 1 / (k + rank)")
R = rrf([BM25, VEC])


def pos(lst, id_):
    return next((i + 1 for i, (x, _) in enumerate(lst) if x == id_), 0)


print("  doc  bm25 rank  vec rank  arithmetic                  score")
for h in R:
    a, b = pos(BM25, h["id"]), pos(VEC, h["id"])
    parts = " + ".join(p for p in (a and f"1/{60 + a}", b and f"1/{60 + b}") if p)
    print(f"  {h['id']}   {str(a or '-'):>9}  {str(b or '-'):>8}  {parts:<26}  {f(h['s'], 5)}")
print(f"  same with the outlier d1 = 41.0: top 5: {ids(rrf([BM25b, VEC]))}  (ranks did not change, so neither does RRF)")

print("\\n4) the k constant: small k rewards the top of each list, large k flattens")
for k in (1, 10, 60, 600):
    r = rrf([BM25, VEC], k)
    print(f"  k = {k:>3}: top 5 {ids(r)}   weight of rank 1 / rank 10 = {f((k + 10) / (k + 1), 2)}")

print("\\n5) weighted RRF, vector list weight 2 (trust semantics more)")
print(f"  top 5: {ids(rrf([BM25, VEC], 60, [1, 2]))}")

print("\\n6) rank window: each retriever only contributes its top 3")
w = rrf([BM25, VEC], 60, [1, 1], 3)
gone = [h["id"] for h in rrf([BM25, VEC]) if not any(x["id"] == h["id"] for x in w)]
print(f"  fused: {ids(w, 9)}   ({len(w)} docs; never seen: {' '.join(gone)})")` },
        ],
      },
    ],
  },
];

export default augments;
