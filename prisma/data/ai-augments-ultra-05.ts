/**
 * AI ENGINEERING ULTRA — batch 05: embeddings and vector search (what embeddings
 * are, similarity metrics and ANN indexes, choosing an embedding model and its
 * dimensions, when you need a vector database, pgvector vs Pinecone vs Qdrant).
 * Every example was run by scripts/verify-variant-examples.ts (node, python);
 * quoted output is that run's output.
 */
import type { AiUltraAugment } from "./ai-augments.types";

const augments: AiUltraAugment[] = [
  {
    title: `What are embeddings and what are they used for?`,
    difficulty: "easy",
    seoDescription: `Embeddings turn text into vectors so similar meaning sits close together, powering semantic search, RAG, dedup, clustering and classification.`,
    description: `**Question presented to candidate:**
"You keep hearing that our search and our RAG feature run on embeddings. Explain what an embedding actually is, how one gets made, and what kinds of product features you can build with them."

**What a strong answer should cover:**
- An embedding is a fixed-length list of numbers (a dense vector) produced by an embedding model, arranged so that texts with similar meaning get vectors that point in similar directions
- It is produced by a dedicated encoder model trained (usually contrastively) on pairs of related and unrelated texts, not by the chat model generating tokens; documents are embedded once at index time, the query at request time
- Similarity becomes arithmetic (cosine or dot product), which powers semantic search and RAG retrieval, deduplication, clustering, classification by nearest labelled example, recommendations and anomaly detection
- Embeddings find meaning without shared words, but they miss exact identifiers (error codes, SKUs, names), which is why keyword search is often combined with them
- Vectors from different models (or versions) live in different spaces and cannot be compared; switching model means re-embedding everything, so the model name and version are stored with the index

**Code / implementation expected:** Optional — embedding a few sentences and ranking them by cosine similarity, or explaining that call, is enough.`,
    answer: `**Target Audience:** Engineers who keep hearing "it runs on embeddings" (search, RAG, recommendations) and want to know what an embedding actually is before building with one.
**Difficulty:** Easy
**Verified with:** Node 22.22.0 and Python 3.12.3 (the toy embedding program below; its 6-number word vectors are hand-written stand-ins for a learned model). Product facts are cited inline with the date they were checked (October 2026).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Picture a huge library with no catalogue. A librarian decides to give every book a position on a giant map: cookbooks in the north-east, travel guides in the south, password-and-account help in the west. Two books about the same thing end up near each other even if they use completely different words: "Resetting your credentials" sits next to "I forgot my login". Now, when someone walks in with a question, the librarian puts the question on the same map and walks to the nearest books.

An **embedding** is that map position, written as a list of numbers. An **embedding model** is the librarian who decides where everything goes. Once every document has a position, "find related things" stops being a fuzzy language problem and becomes simple arithmetic: measure which points are close.

This is why embeddings sit under so many AI features. Semantic search, the retrieval step in RAG, "similar items", duplicate-ticket detection, clustering feedback into themes: all of them are "put things on the map, then measure distance". The interviewer wants to hear that you understand the map, how it is drawn, what it is good at, and where it misleads you.

## 2. What an Embedding Is

An embedding is a fixed-length list of numbers that represents the meaning of some input. "Fixed-length" matters: a three-word query and a 400-word paragraph both become, say, 1,024 numbers. That is what lets you compare any two of them directly.

📌 **Interview term: embedding** — a vector of numbers produced by a model for a piece of input (text, image, audio, code) such that inputs with similar meaning get similar vectors.

📌 **Interview term: dense vector** — a vector where almost every position holds a non-zero value, as opposed to a **sparse vector** (like a keyword count list over a 50,000-word vocabulary, where nearly every position is zero). Embeddings are dense.

📌 **Interview term: dimensions** — the number of values in each vector. Commercial text embedding models commonly output from a few hundred to a few thousand; OpenAI documents 1,536 for \`text-embedding-3-small\` and 3,072 for \`text-embedding-3-large\` by default (OpenAI embeddings guide, checked October 2026). How to choose is its own question: [Embeddings in 2025-26: how do you choose model, dimensions, and distance?](/interview-question/embeddings-in-2025-26-how-do-you-choose-model-dimensions-and-distance)

📌 **Interview term: vector space (embedding space)** — the "map" all of one model's vectors live in. Positions only mean something relative to other vectors from the same model.

<svg class="iq-diagram" width="100%" viewBox="0 0 820 200" role="img" aria-label="Text goes into an embedding model, which outputs a fixed length vector of numbers that is stored next to the original text">
  <defs>
    <marker id="ai05q1-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="55" width="170" height="90" rx="10"/>
  <text class="d-text" x="105" y="93" text-anchor="middle">any text</text>
  <text class="d-sub" x="105" y="119" text-anchor="middle">3 words or 400</text>
  <rect class="d-box" x="250" y="55" width="180" height="90" rx="10"/>
  <text class="d-text" x="340" y="93" text-anchor="middle">embedding model</text>
  <text class="d-sub" x="340" y="119" text-anchor="middle">encoder, no text out</text>
  <rect class="d-box-accent" x="490" y="55" width="150" height="90" rx="10"/>
  <text class="d-text" x="565" y="93" text-anchor="middle">vector</text>
  <text class="d-sub" x="565" y="119" text-anchor="middle">fixed length</text>
  <rect class="d-box-muted" x="690" y="55" width="110" height="90" rx="10"/>
  <text class="d-text" x="745" y="93" text-anchor="middle">stored</text>
  <text class="d-sub" x="745" y="119" text-anchor="middle">with text</text>
  <path class="d-edge" d="M 194 100 L 244 100" marker-end="url(#ai05q1-arrow)"/>
  <path class="d-edge" d="M 434 100 L 484 100" marker-end="url(#ai05q1-arrow)"/>
  <path class="d-edge" d="M 644 100 L 684 100" marker-end="url(#ai05q1-arrow)"/>
</svg>

The vector is stored next to the text (or an ID pointing to it), because the numbers on their own are unreadable: you search with the vector and show the user the text.

## 3. How an Embedding Model Learns the Map

Nobody hand-writes the numbers in a real model. The model learns them from data.

**The history in one paragraph.** The idea took off with word2vec (Mikolov, Chen, Corrado and Dean, Google, arXiv 1301.3781, January 2013), which learned one vector per *word* from which words appear near each other. Its famous demonstration, credited in that paper to earlier work on vector offsets, is that \`vector("King") - vector("Man") + vector("Woman")\` lands closest to \`vector("Queen")\`. Modern text embedding models are transformer encoders that produce one vector per *whole passage*, taking word order and context into account.

📌 **Interview term: encoder (bi-encoder)** — a model that reads an input once and outputs a representation of it, rather than generating text. "Bi-encoder" means query and document are embedded *separately* by the same model, so documents can be embedded ahead of time. (Contrast with a **cross-encoder**, which reads query and document together; that is the reranker in [What is reranking and why add it after retrieval?](/interview-question/what-is-reranking-and-why-add-it-after-retrieval))

📌 **Interview term: pooling** — turning the per-token internal states of the encoder into one vector, for example by averaging them or taking a special first token. That single vector is the embedding.

📌 **Interview term: contrastive learning** — training on pairs: a question and its real answer, a title and its article, two paraphrases. The model is rewarded when related pairs get close vectors and unrelated pairs (often the other examples in the same batch) get distant ones. This is why "close" ends up meaning "related" or "answers the question", not just "uses the same words".

A useful consequence: the model learns what its training pairs taught it. A general model trained on web question-answer pairs knows that "refund" and "money back" are related; it may not know that in your company "Blue Plan" and "Enterprise tier" are the same product. That gap is the main reason teams evaluate several models on their own data.

## 4. Similarity Becomes Arithmetic

Once two texts are vectors, "how related are they?" is one calculation. The standard one for text is **cosine similarity**: it measures the angle between the two vectors, from 1 (same direction) through 0 (unrelated) to -1 (opposite).

📌 **Interview term: cosine similarity** — the dot product of two vectors divided by the product of their lengths; for vectors already scaled to length 1 it *is* the dot product. Why there are three metrics (cosine, dot product, Euclidean) and how search stays fast over millions of vectors is covered in [How does similarity search work — cosine, dot product and Euclidean?](/interview-question/how-does-similarity-search-work-cosine-dot-product-and-euclidean)

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="A two dimensional sketch of an embedding space with account help points close together, billing points close together and a food point far away">
  <rect class="d-box-muted" x="20" y="20" width="720" height="260" rx="12"/>
  <circle class="d-accent" cx="120" cy="90" r="7"/>
  <text class="d-sub" x="120" y="66" text-anchor="middle">reset password</text>
  <circle class="d-accent" cx="170" cy="150" r="7"/>
  <text class="d-sub" x="170" y="180" text-anchor="middle">forgot my login</text>
  <circle class="d-accent" cx="380" cy="200" r="7"/>
  <text class="d-sub" x="380" y="230" text-anchor="middle">charged twice</text>
  <circle class="d-accent" cx="450" cy="170" r="7"/>
  <text class="d-sub" x="500" y="200" text-anchor="middle">refund</text>
  <circle class="d-accent" cx="650" cy="90" r="7"/>
  <text class="d-sub" x="650" y="66" text-anchor="middle">pizza recipe</text>
  <path class="d-edge-accent" d="M 124 98 L 166 142"/>
  <path class="d-edge-dashed" d="M 180 150 L 640 92"/>
</svg>

The short solid line is a small angle (very similar); the long dashed line is a large one (unrelated). Real spaces have hundreds of dimensions, so a 2D sketch like this only shows the idea, never the real layout.

## 5. What Embeddings Are Used For

Every use below is the same two steps: embed, then compare. The example program runs four of them with a toy model.

| Use | How it works | Where it shows up |
| :--- | :--- | :--- |
| **Semantic search** | Embed the query, return the documents whose vectors are closest | Help-centre search, code search, "search by meaning" |
| **RAG retrieval** | Same as semantic search, over document chunks, feeding the top chunks to an LLM | [What is RAG and why use it instead of fine-tuning for knowledge?](/interview-question/what-is-rag-and-why-use-it-instead-of-fine-tuning-for-knowledge) |
| **Deduplication** | Two items above a tuned similarity threshold are treated as the same | Merging duplicate tickets, near-duplicate pages before indexing |
| **Classification** | Give a new item the label of its nearest labelled examples, or train a small classifier on the vectors | Routing tickets to queues, intent detection |
| **Clustering** | Group vectors that sit close together, then name each group | Theme discovery in feedback or support logs |
| **Recommendations** | Recommend items whose vectors are close to items a user liked | "More like this", related articles |
| **Anomaly detection** | Flag items far from every known cluster | Unusual log lines, off-topic inputs |
| **Semantic caching** | Reuse an earlier LLM answer when a new question is close enough | [What is semantic caching and when is it safe to use?](/interview-question/what-is-semantic-caching-and-when-is-it-safe-to-use) |

The toy program shows the core claim, matching by meaning instead of words. A real keyword search would find nothing for the first and second queries:

~~~text
  "I forgot my login credentials"
    top hit: "How to reset your password"  cosine 0.993  runner-up 0.090  shared words with hit: 0
  "I was charged twice, give my money back"
    top hit: "Get a refund for a duplicate charge"  cosine 0.996  runner-up 0.120  shared words with hit: 0
~~~

Classification by nearest labelled example needs no training at all: three labelled sentences were enough to route three new tickets correctly in the run.

### Index time and query time

📌 **Interview term: index time vs query time** — documents are embedded once, ahead of time, and stored (index time). Only the user query is embedded per request (query time). That keeps request cost to one short embedding call plus the search, and it means changing the model requires re-embedding the whole corpus.

A real call looks like this (not run here; the shape follows the OpenAI embeddings guide, checked October 2026):

~~~ts
import OpenAI from "openai";
const client = new OpenAI();
const res = await client.embeddings.create({
  model: "text-embedding-3-small",
  input: ["How to reset your password", "Track a late package"], // many texts per call
});
const vectors = res.data.map((d) => d.embedding); // one array of numbers per input, in order
~~~

Large inputs must first be split into pieces the model accepts and that each make sense alone; see [What chunking strategies exist and how does chunk size affect RAG quality?](/interview-question/what-chunking-strategies-exist-and-how-does-chunk-size-affect-rag-quality)

## 6. Where Embeddings Mislead You

**Exact tokens.** An embedding summarises meaning, so it blurs things that only matter letter for letter: error code \`E-4012\` versus \`E-4021\`, a SKU, a rare surname. Keyword search (BM25) is better at those, which is why production retrieval often runs both: [What is hybrid search and why combine BM25 with vector search?](/interview-question/what-is-hybrid-search-and-why-combine-bm25-with-vector-search)

**Different models, different maps.** Two models (or two versions of one model) place meaning in different coordinates. Comparing a vector from one with a vector from the other produces numbers that look valid and mean nothing. The program simulates "model B" by storing the same knowledge in a different coordinate order:

~~~text
4) mixing models: query from model B, documents from model A
  top hit: "Change your flight booking" cosine 0.995 -> vectors from different models are not comparable
~~~

The score is high and the answer is nonsense, with no error raised. This is the most dangerous failure because nothing crashes.

📌 **Interview term: embedding model versioning** — recording which model (and version, and dimensions) produced each stored vector, so queries always use the same model and a change is a planned re-embed instead of a silent bug.

**Scores are relative.** A cosine of 0.8 can be "very similar" for one model and "barely related" for another, because each model spreads its vectors differently. Thresholds (for deduplication, caching, "no good match found") must be tuned on labelled examples for your model.

**Fine detail and negation.** Sentences that share most of their content but differ in one word ("refund approved" and "refund not approved") can land close together. Use embeddings to find candidates, then verify with a reranker, rules or the LLM where precision matters.

**Domain words.** A general model may not know your internal jargon. Evaluate on your own queries before trusting it.

## 7. Verified: Running the Code

The example **"Toy embedding model: semantic search, dedup, classification and the model-mismatch trap"** stands in for a real model. Each known word has a hand-written 6-number vector over the concepts account, payment, food, travel, problem and delivery; a sentence vector is the average of its word vectors, scaled to length 1. A real model learns about a thousand numbers per text from data and understands word order; the toy ignores unknown words and order. What carries over exactly is the mechanism: embed, compare with cosine, pick the closest.

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
1) semantic search: shared words vs embedding cosine
  "I forgot my login credentials"
    top hit: "How to reset your password"  cosine 0.993  runner-up 0.090  shared words with hit: 0
  "I was charged twice, give my money back"
    top hit: "Get a refund for a duplicate charge"  cosine 0.996  runner-up 0.120  shared words with hit: 0
  "my package never arrived"
    top hit: "Track a late package"  cosine 0.991  runner-up 0.123  shared words with hit: 1
2) deduplication: cosine above 0.95 means the same ticket
  1 vs 2: 0.999 duplicate
  1 vs 3: 0.000 different
  2 vs 3: 0.000 different
3) classification: label of the most similar labelled example
  "Login credentials not working" -> account (0.987)
  "Money charged twice" -> billing (0.976)
  "Package is late" -> shipping (0.981)
4) mixing models: query from model B, documents from model A
  top hit: "Change your flight booking" cosine 0.995 -> vectors from different models are not comparable
~~~

What the run shows:

- Semantic search finds the right article with zero or one shared words, and the margin to the runner-up is large (0.993 vs 0.090).
- Deduplication works with a threshold: the two password tickets score 0.999, the unrelated one 0.000. With a real model, unrelated texts rarely score exactly 0; that only happens here because the toy concepts do not overlap.
- Classification by nearest labelled example routes all three new tickets correctly from three labelled examples.
- Mixing models returns a confident, wrong answer (0.995 for a flight article).

## Edge Cases Worth Knowing

- **Queries and documents can be asymmetric.** Some models expect a prefix or task type that says whether the text is a query or a document (the E5 model cards ask for \`query: \` and \`passage: \`). Leaving it out silently degrades results. See the sibling question on choosing a model.
- **Very short and very long inputs.** A one-word query carries little meaning to place; a very long passage averages many topics into one vector. Both reduce precision. Chunking addresses the second.
- **Non-text inputs.** Multimodal embedding models put images and text in one shared space, so a text query can find a photo. See [How do multimodal models handle images, audio and other non-text inputs?](/interview-question/how-do-multimodal-models-handle-images-audio-and-other-non-text-inputs)
- **Privacy.** An embedding is derived from the text and is not an anonymisation step; treat stored vectors with the same care as the text they came from.

## Common Pitfalls

- **Treating cosine scores as absolute.** A fixed threshold copied from a blog post will not fit your model; tune it on labelled pairs.
- **Mixing models or versions in one index.** Results stay plausible-looking and become wrong. Store the model name with every vector and re-embed on a change.
- **Using embeddings alone for exact lookups.** Order numbers, error codes and names need keyword or structured search alongside.
- **Embedding whole documents as one vector.** A long document becomes an average of many topics; chunk it and keep pointers to the source.
- **Using the chat model to "embed".** Embeddings come from a dedicated embedding model and endpoint; it is much cheaper and is trained for exactly this.
- **Skipping evaluation.** Pick the model by measuring retrieval quality on your own queries, not by assuming the biggest one wins.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">An embedding is a fixed-length list of numbers, a <strong style="color:#ffca28;">dense vector</strong>, that an embedding model produces for a piece of text, an image or code. The model is trained so that things with similar meaning get vectors pointing in similar directions.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. How it is made:</strong> <span style="color:#f0e2c8;">A dedicated <strong style="color:#ffca28;">encoder</strong> model reads the whole input and outputs one vector, often around a thousand numbers. It is trained contrastively: related pairs are pulled together, unrelated ones pushed apart. You embed documents once at index time and each query at request time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Why it is useful:</strong> <span style="color:#f0e2c8;">Meaning becomes geometry, so similarity is one cheap calculation, usually <strong style="color:#ffca28;">cosine similarity</strong>. In my toy run, <em style="color:#f0e2c8;">I forgot my login credentials</em> matched <em style="color:#f0e2c8;">How to reset your password</em> at cosine <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.993</code> with zero shared words.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. What you build with it:</strong> <span style="color:#f0e2c8;">Semantic search and RAG retrieval, deduplication with a similarity threshold, clustering, classification by nearest labelled example, recommendations and anomaly detection, all from the same vectors.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. The limits:</strong> <span style="color:#f0e2c8;">Embeddings blur exact tokens like error codes and SKUs, so production search usually adds keyword search. And vectors from different models are not comparable: in my run a query from the wrong model matched a flight booking article at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.995</code>. Store the model name with the index and re-embed on a change.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is an embedding model different from the chat model?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The chat model is a decoder that predicts the next token over and over. An embedding model is usually an encoder that reads the input once and pools its internal states into one vector; it never generates text. It is much smaller and cheaper per token, and providers sell it as a separate model and endpoint.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just use keyword search?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Keyword search only matches words that literally appear, so <em style="color:#d8d8d8;">forgot my login</em> never finds <em style="color:#d8d8d8;">reset your password</em>. Embeddings match meaning, including across languages for multilingual models. The reverse is also true: keywords win on exact identifiers and rare names. That is why hybrid search combines both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when you change embedding model?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every stored vector becomes useless for new queries, because the two models put meaning in different coordinates. You re-embed the whole corpus with the new model, build a new index next to the old one, and switch over once it is evaluated. Storing model name and version with each index makes this a planned migration.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you embed a whole 50-page document as one vector?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You can if it fits the model input limit, but one vector then averages many topics and matches nothing well. For retrieval you split documents into chunks, embed each chunk, and store a pointer back to the source. Chunk size is its own trade-off.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a high cosine score proof that two texts mean the same thing?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. Scores are relative and differ between models, so a threshold like 0.8 has to be tuned on labelled pairs for your model and data. Embeddings also struggle with negation and fine detail: <em style="color:#d8d8d8;">refund approved</em> and <em style="color:#d8d8d8;">refund not approved</em> can land close together. Use them to find candidates, then verify with a reranker or rules where precision matters.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Embedding | A vector of numbers representing an input so that similar meaning gives similar vectors |
| Dense vector | A vector with values in almost every position; the opposite of a mostly-zero sparse vector |
| Dimensions | How many numbers each vector holds |
| Vector space | The coordinate system one model places all its vectors in |
| Encoder (bi-encoder) | A model that turns an input into a representation; query and document are embedded separately |
| Pooling | Combining per-token states into a single vector |
| Contrastive learning | Training that pulls related pairs together and pushes unrelated ones apart |
| Cosine similarity | Angle-based similarity; equals the dot product for unit-length vectors |
| Index time vs query time | Documents embedded once ahead of time; only the query is embedded per request |
| Embedding model versioning | Recording which model produced each vector so they are never mixed |

**Conclusion:** An embedding is a position on a map of meaning, drawn by a dedicated encoder model trained to put related things close together. Once text is a vector, relatedness is arithmetic, and the same vectors power semantic search, RAG retrieval, deduplication, classification, clustering and recommendations. The strong answer also names the limits: embeddings blur exact identifiers, their scores are only meaningful relative to one model, and vectors from different models cannot be compared, so the model is versioned with the index and evaluated on your own data before it is trusted.`,
    examples: [
      {
        label: `Toy embedding model: semantic search, dedup, classification and the model-mismatch trap`,
        variants: [
          { tech: "node", code: `// A toy embedding model: every known word has a 6-number vector over the
// concepts [account, payment, food, travel, problem, delivery].
// A sentence vector is the mean of its word vectors, scaled to length 1.
// Real models learn ~1,000 numbers per text from data; the mechanism is the same.
const WORDS = {
  password: [0.9, 0, 0, 0, 0.2, 0], login: [0.9, 0, 0, 0, 0.1, 0],
  reset: [0.6, 0, 0, 0, 0.3, 0], forgot: [0.5, 0, 0, 0, 0.4, 0],
  credentials: [0.9, 0.1, 0, 0, 0, 0], account: [0.8, 0.2, 0, 0, 0, 0],
  refund: [0, 0.9, 0, 0, 0, 0.2], charged: [0, 0.9, 0, 0, 0.2, 0],
  charge: [0, 0.9, 0, 0, 0.1, 0], duplicate: [0, 0.3, 0, 0, 0.4, 0],
  twice: [0, 0.3, 0, 0, 0.3, 0], money: [0, 0.8, 0, 0, 0, 0],
  pizza: [0, 0, 0.9, 0, 0, 0.2], recipe: [0, 0, 0.9, 0, 0, 0],
  flight: [0, 0, 0, 0.9, 0, 0], booking: [0, 0.2, 0, 0.7, 0, 0],
  package: [0, 0, 0, 0, 0, 0.9], late: [0, 0, 0, 0.1, 0.3, 0.6],
  arrived: [0, 0, 0, 0.2, 0, 0.7], track: [0, 0, 0, 0.1, 0, 0.8],
};
const tokens = (t) => t.toLowerCase().split(/[^a-z]+/).filter(Boolean);
function embed(text, perm = [0, 1, 2, 3, 4, 5]) {
  const v = [0, 0, 0, 0, 0, 0];
  for (const w of tokens(text)) if (WORDS[w]) WORDS[w].forEach((x, i) => (v[perm[i]] += x));
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return v.map((x) => x / n);
}
const cos = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0); // unit vectors: dot = cosine
const overlap = (q, d) => { const s = new Set(tokens(d)); return tokens(q).filter((w) => s.has(w)).length; };
const f3 = (x) => x.toFixed(3);

const docs = ["How to reset your password", "Get a refund for a duplicate charge",
  "Track a late package", "Change your flight booking", "Easy pizza recipe"];
const index = docs.map((d) => ({ text: d, vec: embed(d) }));

console.log("1) semantic search: shared words vs embedding cosine");
for (const q of ["I forgot my login credentials", "I was charged twice, give my money back", "my package never arrived"]) {
  const qv = embed(q);
  const ranked = index.map((d) => ({ d, s: cos(qv, d.vec) })).sort((a, b) => b.s - a.s);
  const top = ranked[0].d.text;
  console.log(\`  "\${q}"\`);
  console.log(\`    top hit: "\${top}"  cosine \${f3(ranked[0].s)}  runner-up \${f3(ranked[1].s)}  shared words with hit: \${overlap(q, top)}\`);
}

console.log("2) deduplication: cosine above 0.95 means the same ticket");
const tickets = ["Forgot password, cannot login", "Need to reset my login password", "Pizza recipe please"];
for (let i = 0; i < tickets.length; i++)
  for (let j = i + 1; j < tickets.length; j++) {
    const s = cos(embed(tickets[i]), embed(tickets[j]));
    console.log(\`  \${i + 1} vs \${j + 1}: \${f3(s)} \${s > 0.95 ? "duplicate" : "different"}\`);
  }

console.log("3) classification: label of the most similar labelled example");
const labelled = [["Reset my account password", "account"], ["Refund the charge", "billing"], ["Track my package", "shipping"]];
for (const t of ["Login credentials not working", "Money charged twice", "Package is late"]) {
  const best = labelled.map(([x, l]) => ({ l, s: cos(embed(t), embed(x)) })).sort((a, b) => b.s - a.s)[0];
  console.log(\`  "\${t}" -> \${best.l} (\${f3(best.s)})\`);
}

console.log("4) mixing models: query from model B, documents from model A");
const modelB = [3, 4, 5, 0, 1, 2]; // same knowledge, different coordinate layout
const qb = embed("I forgot my login credentials", modelB);
const wrong = index.map((d) => ({ d, s: cos(qb, d.vec) })).sort((a, b) => b.s - a.s)[0];
console.log(\`  top hit: "\${wrong.d.text}" cosine \${f3(wrong.s)} -> vectors from different models are not comparable\`);` },
          { tech: "python", code: `# A toy embedding model: every known word has a 6-number vector over the
# concepts [account, payment, food, travel, problem, delivery].
# A sentence vector is the mean of its word vectors, scaled to length 1.
# Real models learn ~1,000 numbers per text from data; the mechanism is the same.
import math
import re

WORDS = {
    "password": [0.9, 0, 0, 0, 0.2, 0], "login": [0.9, 0, 0, 0, 0.1, 0],
    "reset": [0.6, 0, 0, 0, 0.3, 0], "forgot": [0.5, 0, 0, 0, 0.4, 0],
    "credentials": [0.9, 0.1, 0, 0, 0, 0], "account": [0.8, 0.2, 0, 0, 0, 0],
    "refund": [0, 0.9, 0, 0, 0, 0.2], "charged": [0, 0.9, 0, 0, 0.2, 0],
    "charge": [0, 0.9, 0, 0, 0.1, 0], "duplicate": [0, 0.3, 0, 0, 0.4, 0],
    "twice": [0, 0.3, 0, 0, 0.3, 0], "money": [0, 0.8, 0, 0, 0, 0],
    "pizza": [0, 0, 0.9, 0, 0, 0.2], "recipe": [0, 0, 0.9, 0, 0, 0],
    "flight": [0, 0, 0, 0.9, 0, 0], "booking": [0, 0.2, 0, 0.7, 0, 0],
    "package": [0, 0, 0, 0, 0, 0.9], "late": [0, 0, 0, 0.1, 0.3, 0.6],
    "arrived": [0, 0, 0, 0.2, 0, 0.7], "track": [0, 0, 0, 0.1, 0, 0.8],
}


def tokens(t):
    return [w for w in re.split(r"[^a-z]+", t.lower()) if w]


def embed(text, perm=(0, 1, 2, 3, 4, 5)):
    v = [0.0] * 6
    for w in tokens(text):
        if w in WORDS:
            for i, x in enumerate(WORDS[w]):
                v[perm[i]] += x
    n = math.sqrt(sum(x * x for x in v))
    return [x / n for x in v]


def cos(a, b):  # unit vectors: dot = cosine
    s = 0.0
    for x, y in zip(a, b):
        s += x * y
    return s


def overlap(q, d):
    s = set(tokens(d))
    return len([w for w in tokens(q) if w in s])


def f3(x):
    return f"{x:.3f}"


docs = ["How to reset your password", "Get a refund for a duplicate charge",
        "Track a late package", "Change your flight booking", "Easy pizza recipe"]
index = [{"text": d, "vec": embed(d)} for d in docs]

print("1) semantic search: shared words vs embedding cosine")
for q in ["I forgot my login credentials", "I was charged twice, give my money back", "my package never arrived"]:
    qv = embed(q)
    ranked = sorted(({"d": d, "s": cos(qv, d["vec"])} for d in index), key=lambda r: -r["s"])
    top = ranked[0]["d"]["text"]
    print(f'  "{q}"')
    print(f'    top hit: "{top}"  cosine {f3(ranked[0]["s"])}  runner-up {f3(ranked[1]["s"])}  shared words with hit: {overlap(q, top)}')

print("2) deduplication: cosine above 0.95 means the same ticket")
tickets = ["Forgot password, cannot login", "Need to reset my login password", "Pizza recipe please"]
for i in range(len(tickets)):
    for j in range(i + 1, len(tickets)):
        s = cos(embed(tickets[i]), embed(tickets[j]))
        print(f"  {i + 1} vs {j + 1}: {f3(s)} {'duplicate' if s > 0.95 else 'different'}")

print("3) classification: label of the most similar labelled example")
labelled = [["Reset my account password", "account"], ["Refund the charge", "billing"], ["Track my package", "shipping"]]
for t in ["Login credentials not working", "Money charged twice", "Package is late"]:
    best = sorted(({"l": l, "s": cos(embed(t), embed(x))} for x, l in labelled), key=lambda r: -r["s"])[0]
    print(f'  "{t}" -> {best["l"]} ({f3(best["s"])})')

print("4) mixing models: query from model B, documents from model A")
model_b = [3, 4, 5, 0, 1, 2]  # same knowledge, different coordinate layout
qb = embed("I forgot my login credentials", model_b)
wrong = sorted(({"d": d, "s": cos(qb, d["vec"])} for d in index), key=lambda r: -r["s"])[0]
print(f'  top hit: "{wrong["d"]["text"]}" cosine {f3(wrong["s"])} -> vectors from different models are not comparable')` },
        ],
      },
    ],
  },
  {
    title: `How does similarity search work — cosine, dot product and Euclidean?`,
    difficulty: "medium",
    seoDescription: `Cosine, dot product and Euclidean distance with worked numbers, why normalising makes them agree, and how IVF and HNSW trade recall for speed.`,
    description: `**Question presented to candidate:**
"Once we have embeddings, we have to find the closest ones to a query. Explain cosine similarity, dot product and Euclidean distance, when they give different answers, and how search stays fast when there are millions of vectors."

**What a strong answer should cover:**
- The three measures: dot product (direction and length), cosine similarity (angle only, the dot product divided by both lengths), Euclidean distance (straight-line distance); higher is closer for the first two, lower for the third
- On raw vectors they can rank the same documents differently, because length counts in dot product and Euclidean but not in cosine; on unit-length vectors all three give the same ranking (squared Euclidean = 2 - 2 x cosine), so you normalise and use the cheap dot product
- The rule for choosing: use the metric the embedding model was trained for and the same one at index and query time; dot product without normalisation only where length carries meaning (for example popularity in recommendation)
- Exact (flat) k-nearest-neighbour search costs one distance per stored vector per query, which is fine for small sets and too slow at scale
- Approximate nearest neighbour (ANN) indexes such as IVF (probe a few clusters) and HNSW (walk a layered graph) touch a small fraction of vectors and trade a little recall for a lot of speed, tuned with knobs like \`nprobe\` and \`ef_search\` and measured as recall@k against exact search

**Code / implementation expected:** Optional — computing the three metrics by hand, or a short exact top-k loop, is a strong signal; implementing an ANN index is not expected.`,
    answer: `**Target Audience:** Engineers who have embeddings and now need to find the closest ones, and who want to know what the metric setting on their vector index actually does.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (both examples below: the three metrics worked by hand, and a small IVF index measured against exact search on seeded synthetic data). Database defaults and operator names are cited inline with the date checked (October 2026).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the examples; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

You are standing in a city centre and ask two friends which café is "closest to what you want". One friend points in a direction: "everything you like is that way, north-east". The other measures with a ruler: "this one is 300 metres from you". A third friend, who works for the tourist board, ranks cafés by "direction, but bigger cafés count more".

All three are reasonable. They just answer slightly different questions, and on the same map they can recommend different cafés. That is exactly the situation with **cosine similarity** (direction), **Euclidean distance** (ruler) and **dot product** (direction weighted by size). If [embeddings](/interview-question/what-are-embeddings-and-what-are-they-used-for) put meaning on a map, the metric is the rule for "close".

The second half of the story is scale. Measuring every café with a ruler is fine for a village. For a country of 50 million cafés, you need a smarter way to only look in the right neighbourhood. That is what **approximate nearest neighbour** indexes do, and they come with a trade-off an interviewer will ask about: they sometimes miss the true closest one.

## 2. The Three Measures in Plain Numbers

Take two vectors, \`a\` and \`b\`, with the same number of values.

📌 **Interview term: dot product (inner product)** — multiply the matching values and add the results: \`a·b = a1*b1 + a2*b2 + ...\`. It grows when the vectors point the same way *and* when they are long. Higher means more similar.

📌 **Interview term: vector length (L2 norm)** — \`|a| = sqrt(a·a)\`, the straight-line length of the arrow from the origin.

📌 **Interview term: cosine similarity** — \`a·b / (|a| * |b|)\`: the dot product with both lengths divided out, which leaves only the cosine of the angle between the arrows. It runs from 1 (same direction) through 0 (perpendicular) to -1 (opposite). Length no longer counts.

📌 **Interview term: Euclidean distance (L2 distance)** — \`sqrt((a1-b1)^2 + (a2-b2)^2 + ...)\`, the ruler distance between the two arrow tips. Lower means more similar, and both direction and length count.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 420" role="img" aria-label="Three arrows from one origin: the query, a short arrow in exactly the same direction, and a long arrow at a much wider angle">
  <defs>
    <marker id="ai05q2-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <path class="d-edge" d="M 80 380 L 80 30"/>
  <path class="d-edge" d="M 80 380 L 720 380"/>
  <path class="d-edge-accent" d="M 80 380 L 280 180" marker-end="url(#ai05q2-arrow)"/>
  <text class="d-accent" x="295" y="175">query</text>
  <path class="d-edge" d="M 80 380 L 150 310" marker-end="url(#ai05q2-arrow)"/>
  <text class="d-sub" x="175" y="340">C: short, same angle</text>
  <path class="d-edge" d="M 80 380 L 680 360" marker-end="url(#ai05q2-arrow)"/>
  <text class="d-sub" x="560" y="318" text-anchor="middle">B: long, wide angle</text>
</svg>

Cosine prefers C (the angle to the query is zero, however short C is). Dot product can prefer B (it is so long that the product is large despite the wider angle). Euclidean measures the gap between the arrow tips, so it prefers whichever tip is physically nearest the query tip, which in the worked numbers below is a third document, A.

| Measure | Formula | Closer means | Length matters? | Range |
| :--- | :--- | :--- | :--- | :--- |
| Dot product | sum of a_i * b_i | higher | yes | any number |
| Cosine similarity | a·b / (\\|a\\| \\|b\\|) | higher | no | -1 to 1 |
| Euclidean distance | sqrt(sum of (a_i - b_i)^2) | lower | yes | 0 and up |

## 3. When They Disagree, and Why Normalising Fixes It

The first example works this through with a query \`[1, 1]\` and three documents: **A** \`[0.9, 0.8]\` (on topic, normal length), **B** \`[6, 1]\` (long, off-angle), **C** \`[0.3, 0.3]\` (exactly the same direction, short).

~~~text
raw vectors (lengths differ)
  doc  cosine  dot     euclid
  A    0.998   1.700   0.224
  B    0.814   7.000   5.000
  C    1.000   0.600   0.990
  ranking by cosine: C > A > B
  ranking by dot:    B > A > C
  ranking by euclid: A > C > B
~~~

Three metrics, three different winners. B wins on dot product purely because it is long: in text search that is how one very long, rambling chunk can outrank precise ones if you use raw dot product on vectors whose length means nothing.

Now scale every vector to length 1 and run the same table:

~~~text
after scaling every vector to length 1
  doc  cosine  dot     euclid
  A    0.998   0.998   0.059
  B    0.814   0.814   0.610
  C    1.000   1.000   0.000
  ranking by cosine: C > A > B
  ranking by dot:    C > A > B
  ranking by euclid: C > A > B
~~~

📌 **Interview term: L2 normalisation** — dividing a vector by its length so it has length 1 (a **unit vector**). After it, cosine similarity and dot product are the same number, and Euclidean distance gives the same ranking.

The reason is one line of algebra, which the program also checks numerically: for unit vectors, \`|a - b|^2 = |a|^2 + |b|^2 - 2 a·b = 2 - 2 cos(a, b)\`. Squared distance falls exactly as cosine rises, so the order never changes.

~~~text
identity check on unit vectors: euclid^2 = 2 - 2 * cosine
  A: 0.003 vs 0.003
  B: 0.373 vs 0.373
  C: 0.000 vs 0.000
~~~

That is why the practical answer is so often "normalise, then use dot product": it is the cheapest of the three (no square root, no division at query time) and it gives the cosine ranking. OpenAI states in its embeddings FAQ that its API returns vectors already normalised to length 1, so cosine can be computed as a dot product and cosine and Euclidean give identical rankings (OpenAI Help Center, "Embeddings FAQ", checked October 2026). Other providers differ, so check each model card.

### So which metric should you choose?

1. **The one the embedding model was trained and documented for.** Most text models are trained with cosine; the model card says so.
2. **The same at index time and query time.** An index built for Euclidean and queried as if it were cosine returns a different order without any error.
3. **Raw dot product only when length carries meaning.** In recommendation, an item vector may be longer for popular items, and you *want* that to raise its score. This is called maximum inner product search.

📌 **Interview term: maximum inner product search (MIPS)** — finding the vectors with the largest raw dot product with the query, length included. It is a different problem from cosine search unless all vectors have the same length.

What the databases call them (from their documentation, checked October 2026):

| System | Cosine | Dot product | Euclidean |
| :--- | :--- | :--- | :--- |
| pgvector | \`<=>\` returns cosine *distance* (1 - cosine) | \`<#>\` returns the *negative* inner product, so ascending sort works | \`<->\` |
| Qdrant | \`Cosine\` (normalises vectors when they are stored) | \`Dot\` | \`Euclid\` (also offers \`Manhattan\`) |
| Pinecone | \`cosine\` | \`dotproduct\` | \`euclidean\` |

The pgvector signs are a classic bug source: \`<#>\` is negative so that "smallest first" means "most similar first", and \`<=>\` is a distance, so similarity is \`1 - distance\`.

## 4. Exact Search and Why It Stops Scaling

The simplest search computes the metric between the query and every stored vector, then keeps the best k.

📌 **Interview term: k-nearest neighbours (kNN), exact or flat search** — compare the query against every vector; the result is guaranteed to be the true top k. Cost per query is N vectors times d dimensions multiply-adds.

That is perfectly fine for small collections. At 1,024 dimensions, 50,000 vectors is about 51 million multiply-adds per query, which is milliseconds on one CPU core. At 100 million vectors it is about 100 billion, which is seconds per query even before you have more than one user. The sizing arithmetic is worked in [What is a vector database and when do you actually need one?](/interview-question/what-is-a-vector-database-and-when-do-you-actually-need-one)

📌 **Interview term: approximate nearest neighbour (ANN)** — an index that finds *most* of the true nearest neighbours while touching only a small fraction of the vectors. "Approximate" is literal: it can miss some of the true top k.

📌 **Interview term: recall@k** — of the true top k (from exact search), the fraction the ANN index returned. 95% recall@10 means that, on average, 9.5 of the 10 true nearest neighbours came back.

## 5. IVF: Only Search the Right Neighbourhoods

📌 **Interview term: IVF (inverted file index)** — split the vectors into clusters with k-means, remember each cluster centre, and file every vector under its nearest centre (each cluster is a "list"). At query time, find the few centres closest to the query and only scan their lists. The knob is how many lists you probe (\`nprobe\`; pgvector calls it \`ivfflat.probes\`).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="IVF index: the query is compared with cluster centres first, then only the vectors inside the two closest clusters are scanned">
  <rect class="d-box-muted" x="20" y="20" width="720" height="260" rx="12"/>
  <circle class="d-box-accent" cx="190" cy="120" r="70"/>
  <text class="d-text" x="190" y="125" text-anchor="middle">list 1</text>
  <circle class="d-box-accent" cx="380" cy="170" r="70"/>
  <text class="d-text" x="380" y="175" text-anchor="middle">list 2</text>
  <circle class="d-box" cx="600" cy="100" r="60"/>
  <text class="d-sub" x="600" y="105" text-anchor="middle">list 3 skipped</text>
  <circle class="d-box" cx="640" cy="240" r="35"/>
  <text class="d-sub" x="640" y="245" text-anchor="middle">skipped</text>
  <circle class="d-accent" cx="290" cy="80" r="8"/>
  <text class="d-accent" x="290" y="58" text-anchor="middle">query</text>
</svg>

The query sits between lists 1 and 2, so with two probes both are scanned and lists 3 and 4 are skipped. The risk is visible too: a true neighbour sitting just inside a skipped list is missed. That is the recall loss.

The second example builds a 30-list IVF index over 3,000 seeded vectors and compares it with exact search over 40 queries:

~~~text
method      distance computations per query   recall@10
flat        3000                              100.00%
ivf n=1     134                               43.25%
ivf n=4     433                               78.75%
ivf n=16    1640                              99.75%
~~~

Probing one list is 22 times less work and finds fewer than half the true neighbours. Probing 16 of 30 finds almost all of them at about half the work. The shape of this curve depends on how clustered your data is, which is why the knob is tuned by measurement, not by rule. (Real embedding sets have many more vectors per list, so the savings at a given recall are much larger than in this tiny run; pgvector suggests on the order of rows/1,000 lists up to a million rows and sqrt(rows) beyond, with the default \`probes\` of 1 per its documentation, checked October 2026.)

## 6. HNSW: Walk a Graph Toward the Query

📌 **Interview term: HNSW (Hierarchical Navigable Small World)** — a graph index from Malkov and Yashunin (arXiv 1603.09320, first posted March 2016). Each vector is a node linked to its near neighbours. Nodes are also placed on higher layers with exponentially decreasing probability, so the top layers are sparse "express routes" and the bottom layer contains everything. A search starts at the top, greedily hops to whichever neighbour is closest to the query, drops a layer and continues, keeping a list of the best candidates found.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 330" role="img" aria-label="HNSW layers: a sparse top layer with long links, a middle layer, and a dense bottom layer with all vectors; the search path moves down layer by layer toward the query">
  <rect class="d-box-muted" x="20" y="20" width="720" height="80" rx="10"/>
  <text class="d-sub" x="70" y="65" text-anchor="middle">layer 2</text>
  <circle class="d-box" cx="200" cy="60" r="12"/>
  <circle class="d-box" cx="520" cy="60" r="12"/>
  <path class="d-edge" d="M 214 60 L 506 60"/>
  <rect class="d-box-muted" x="20" y="125" width="720" height="80" rx="10"/>
  <text class="d-sub" x="70" y="170" text-anchor="middle">layer 1</text>
  <circle class="d-box" cx="200" cy="165" r="12"/>
  <circle class="d-box" cx="360" cy="165" r="12"/>
  <circle class="d-box" cx="520" cy="165" r="12"/>
  <circle class="d-box" cx="650" cy="165" r="12"/>
  <path class="d-edge" d="M 214 165 L 346 165"/>
  <path class="d-edge" d="M 374 165 L 506 165"/>
  <path class="d-edge" d="M 534 165 L 636 165"/>
  <rect class="d-box-muted" x="20" y="230" width="720" height="80" rx="10"/>
  <text class="d-sub" x="70" y="275" text-anchor="middle">layer 0</text>
  <circle class="d-box" cx="160" cy="270" r="10"/>
  <circle class="d-box" cx="240" cy="270" r="10"/>
  <circle class="d-box" cx="320" cy="270" r="10"/>
  <circle class="d-box" cx="400" cy="270" r="10"/>
  <circle class="d-box" cx="480" cy="270" r="10"/>
  <circle class="d-box-accent" cx="560" cy="270" r="12"/>
  <circle class="d-box" cx="640" cy="270" r="10"/>
  <path class="d-edge-accent" d="M 520 72 L 520 153"/>
  <path class="d-edge-accent" d="M 520 177 L 556 258"/>
</svg>

The accent path is one search: enter at the top, move along the long link toward the query region, drop down, take a shorter link, drop again, and finish among the bottom-layer neighbours (the highlighted node is the result).

The knobs, with pgvector defaults from its documentation (checked October 2026):

| Knob | What it controls | Raise it and... | pgvector default |
| :--- | :--- | :--- | :--- |
| \`m\` | links per node | better recall, more memory, slower build | 16 |
| \`ef_construction\` | candidate list size while building | better graph, slower build | 64 |
| \`ef_search\` | candidate list size while querying | better recall, higher latency | 40 |

HNSW usually gives better recall at a given latency than IVF and does not need a training step, at the price of more memory (the links) and slower builds. IVF is cheaper to build and smaller. Both are often combined with compressed vectors to fit more in memory, covered in [Embeddings in 2025-26: how do you choose model, dimensions, and distance?](/interview-question/embeddings-in-2025-26-how-do-you-choose-model-dimensions-and-distance)

📌 **Interview term: product quantization (PQ)** — compressing each vector by splitting it into sub-vectors and replacing each with the ID of its nearest "codebook" centre. Distances are then estimated from small lookup tables. Big memory savings, some accuracy loss; often paired with IVF (IVF-PQ).

## 7. Filters Change the Picture

Real queries usually carry a condition: this tenant, this language, published after a date. Applying the condition after the ANN search can silently return fewer than k results, because the index only hands back a small candidate set before the filter runs. How each database handles this is the core of [pgvector vs Pinecone vs Qdrant: how do you choose a vector DB in 2025?](/interview-question/pgvector-vs-pinecone-vs-qdrant-how-do-you-choose-a-vector-db-in-2025), and the data-modelling side is in [How do you scope retrieval with metadata filtering and multi-tenancy?](/interview-question/how-do-you-scope-retrieval-with-metadata-filtering-and-multi-tenancy)

## 8. Verified: Running the Code

**Example 1, "Cosine vs dot product vs Euclidean on raw and unit-length vectors"**, uses 2-dimensional vectors so every number can be checked by hand. \`node a.js\` and \`python3.12 a.py\` both print exactly this:

~~~text
raw vectors (lengths differ)
  doc  cosine  dot     euclid
  A    0.998   1.700   0.224
  B    0.814   7.000   5.000
  C    1.000   0.600   0.990
  ranking by cosine: C > A > B
  ranking by dot:    B > A > C
  ranking by euclid: A > C > B
after scaling every vector to length 1
  doc  cosine  dot     euclid
  A    0.998   0.998   0.059
  B    0.814   0.814   0.610
  C    1.000   1.000   0.000
  ranking by cosine: C > A > B
  ranking by dot:    C > A > B
  ranking by euclid: C > A > B
identity check on unit vectors: euclid^2 = 2 - 2 * cosine
  A: 0.003 vs 0.003
  B: 0.373 vs 0.373
  C: 0.000 vs 0.000
~~~

**Example 2, "Exact search vs an IVF index: recall@10 against distance computations"**, generates 3,000 vectors in 16 dimensions around 30 seeded cluster centres (a simple linear congruential generator and a sum-of-uniforms approximation to a normal distribution, so Node and Python produce identical numbers). It builds the IVF index with 5 rounds of k-means, then compares each of 40 queries against the exact top 10. "Distance computations" counts the 30 centre comparisons plus every vector scanned. Real libraries add SIMD, compressed vectors and better clustering; the trade-off curve, not the absolute numbers, is the point. \`node b.js\` and \`python3.12 b.py\` both print exactly this:

~~~text
3000 vectors, 16 dims, 30 IVF lists, top-10, 40 queries
method      distance computations per query   recall@10
flat        3000                              100.00%
ivf n=1     134                               43.25%
ivf n=2     237                               64.50%
ivf n=4     433                               78.75%
ivf n=8     830                               91.75%
ivf n=16    1640                              99.75%
ivf n=30    3030                              100.00%
~~~

What the runs show:

- On raw vectors, the three metrics pick three different winners; length is what separates them.
- After normalising, all three agree, and the identity squared Euclidean = 2 - 2 x cosine holds to every printed digit.
- IVF recall rises with the number of lists probed while the work rises roughly linearly; probing every list is exact search plus the overhead of the centre comparisons.

## Edge Cases Worth Knowing

- **Zero vectors.** Cosine divides by length, so an all-zero vector (for example, an empty string embedded by a toy model) has no defined cosine. Guard against empty inputs.
- **Negative cosine.** Many text models rarely produce strongly negative cosines between real texts; most scores sit in a narrow positive band. Do not read 0 as "opposite meaning".
- **Ties and determinism.** Equal scores can come back in any order between runs or replicas; break ties by ID if results must be stable.
- **Index built before the data.** IVF centres learned from a small or unrepresentative sample give poor lists; pgvector advises creating an IVFFlat index after the table has data.
- **Changing the metric.** The index is built for one metric. Changing it means building a new index (and, if the model changed, re-embedding).

## Common Pitfalls

- **Raw dot product on unnormalised text vectors.** Long chunks win because of their length, not their relevance. Normalise, or use cosine.
- **Mismatched metric between index and query.** The database will happily rank with the wrong rule; nothing errors.
- **Confusing distance with similarity.** pgvector \`<=>\` is a distance and \`<#>\` is negative; sorting the wrong way returns the worst matches first.
- **Never measuring recall.** An ANN index with default settings can quietly lose a large share of the true neighbours; measure recall@k against exact search on real queries.
- **Assuming ANN is always needed.** For tens of thousands of vectors, or per-tenant sets after a filter, exact search is simpler and perfect.
- **Post-filtering with a small candidate list.** Selective filters can return fewer than k results; see the vector DB comparison.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Three measures:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Dot product</strong> multiplies matching coordinates and adds them up, so both direction and length count. <strong style="color:#ffca28;">Cosine similarity</strong> is the dot product divided by both lengths, so only the angle counts. <strong style="color:#ffca28;">Euclidean distance</strong> is the straight-line distance, where lower means closer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. They can disagree:</strong> <span style="color:#f0e2c8;">On raw vectors they rank differently. In my run a long, off-angle vector won on dot product (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">7.0</code>), a short, perfectly aligned one won on cosine (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1.000</code>), and a third won on Euclidean. Length is what splits them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Normalise and they agree:</strong> <span style="color:#f0e2c8;">Scale every vector to length 1 and the rankings become identical, because squared Euclidean equals <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">2 - 2 x cosine</code> and cosine equals the dot product. Most text pipelines normalise, then use the cheap dot product. The rule is: use the metric the model was trained for, the same at index and query time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Exact search does not scale:</strong> <span style="color:#f0e2c8;">Exact k-nearest-neighbour search computes one distance per stored vector per query, so cost grows linearly with the corpus. That is fine for tens of thousands of vectors and too slow at tens of millions.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. ANN trades recall for speed:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">IVF</strong> clusters the vectors and only scans the closest few clusters; <strong style="color:#ffca28;">HNSW</strong> walks a layered graph toward the query. In my IVF run, probing 4 of 30 lists touched 433 vectors instead of 3,000 at <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">78.75%</code> recall@10, and 16 lists reached <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">99.75%</code>. You tune the knob and measure <strong style="color:#ffca28;">recall@k</strong> against exact search.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If the vectors are normalised, why do databases still offer three metrics?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not every vector is normalised. Some models output unnormalised vectors where length carries information, and recommendation systems often use raw dot product so that popular items with larger vectors score higher. Image and other feature vectors may need Euclidean. The database cannot know, so you pick the metric when you create the index, and it must match the model.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between distance and similarity in practice?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Similarity goes up as things get closer, distance goes down. Databases that sort ascending expose distances: pgvector returns cosine distance (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1 - cosine</code>) from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;=&gt;</code> and the negative inner product from <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">&lt;#&gt;</code>. Mixing the conventions in code is a classic bug, where you sort the wrong way and return the least similar results first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does HNSW work at a high level?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It builds a graph where each vector links to its near neighbours, in several layers: few nodes and long links on top, all nodes and short links at the bottom. A search starts at the top, greedily moves to whichever neighbour is closer to the query, drops a layer and repeats. It keeps a candidate list of size <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ef_search</code>, so a larger value explores more and finds more true neighbours at higher latency.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you know your ANN index is good enough?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Take a sample of real queries, compute the exact top-k with a flat scan, and compare it with what the index returns. The overlap is recall@k. Then raise <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ef_search</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">nprobe</code> until recall meets your target at acceptable latency, and re-check as the data grows, because recall can drift as an index fills.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When is exact search the right answer?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the set you search is small: a few tens of thousands of vectors, or a filter that narrows millions down to a few thousand for one tenant. Exact search has perfect recall, no index to build or tune, and no memory overhead for a graph.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Dot product (inner product) | Sum of the products of matching values; direction and length both count |
| Vector length (L2 norm) | sqrt of the dot product of a vector with itself |
| Cosine similarity | Dot product divided by both lengths; angle only |
| Euclidean distance | Straight-line distance between the tips; lower is closer |
| L2 normalisation | Scaling a vector to length 1, after which all three metrics rank the same |
| Maximum inner product search (MIPS) | Ranking by raw dot product, length included |
| kNN, exact or flat search | Compare against every vector; perfect recall, linear cost |
| Approximate nearest neighbour (ANN) | An index that finds most true neighbours while touching few vectors |
| Recall@k | Fraction of the true top k that the index returned |
| IVF | Cluster the vectors, scan only the closest few clusters |
| HNSW | Layered neighbour graph searched greedily from the top layer down |
| Product quantization (PQ) | Compressing vectors into short codes and estimating distances from tables |

**Conclusion:** Similarity search is two decisions. The first is the rule for "close": dot product counts direction and length, cosine counts only direction, Euclidean measures the gap; on unit-length vectors they agree, so most text systems normalise and use the cheap dot product, always matching what the model was trained for. The second is how to find the closest vectors fast: exact search is perfect and linear in cost, while ANN indexes such as IVF and HNSW touch a small fraction of vectors in exchange for recall, so the strong answer always ends with tuning \`nprobe\` or \`ef_search\` against recall@k measured on real queries.`,
    examples: [
      {
        label: `Cosine vs dot product vs Euclidean on raw and unit-length vectors`,
        variants: [
          { tech: "node", code: `// Three ways to score "how close" a document vector is to a query vector.
// 2-dimensional so you can check every number by hand.
const q = [1, 1];
const docs = { A: [0.9, 0.8], B: [6, 1], C: [0.3, 0.3] }; // A on topic, B long and off-angle, C same angle but short
const sq = (x) => x * x;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const norm = (a) => Math.sqrt(dot(a, a));
const cosine = (a, b) => dot(a, b) / (norm(a) * norm(b));
const euclid = (a, b) => Math.sqrt(sq(a[0] - b[0]) + sq(a[1] - b[1]));
const unit = (a) => a.map((x) => x / norm(a));
const f = (x) => x.toFixed(3);

function table(title, query, set) {
  console.log(title);
  console.log("  doc  cosine  dot     euclid");
  const names = Object.keys(set);
  for (const n of names) console.log(\`  \${n}    \${f(cosine(query, set[n]))}   \${f(dot(query, set[n])).padEnd(6)}  \${f(euclid(query, set[n]))}\`);
  const by = (score, desc) => [...names].sort((x, y) => (desc ? score(set[y]) - score(set[x]) : score(set[x]) - score(set[y]))).join(" > ");
  console.log(\`  ranking by cosine: \${by((v) => cosine(query, v), true)}\`);
  console.log(\`  ranking by dot:    \${by((v) => dot(query, v), true)}\`);
  console.log(\`  ranking by euclid: \${by((v) => euclid(query, v), false)}\`);
}

table("raw vectors (lengths differ)", q, docs);
const unitDocs = Object.fromEntries(Object.entries(docs).map(([k, v]) => [k, unit(v)]));
table("after scaling every vector to length 1", unit(q), unitDocs);

console.log("identity check on unit vectors: euclid^2 = 2 - 2 * cosine");
for (const [k, v] of Object.entries(unitDocs)) {
  const e2 = sq(euclid(unit(q), v)), rhs = 2 - 2 * cosine(unit(q), v);
  console.log(\`  \${k}: \${f(e2)} vs \${f(rhs)}\`);
}` },
          { tech: "python", code: `# Three ways to score "how close" a document vector is to a query vector.
# 2-dimensional so you can check every number by hand.
import math

q = [1, 1]
docs = {"A": [0.9, 0.8], "B": [6, 1], "C": [0.3, 0.3]}  # A on topic, B long and off-angle, C same angle but short


def sq(x):
    return x * x


def dot(a, b):
    return a[0] * b[0] + a[1] * b[1]


def norm(a):
    return math.sqrt(dot(a, a))


def cosine(a, b):
    return dot(a, b) / (norm(a) * norm(b))


def euclid(a, b):
    return math.sqrt(sq(a[0] - b[0]) + sq(a[1] - b[1]))


def unit(a):
    return [x / norm(a) for x in a]


def f(x):
    return f"{x:.3f}"


def table(title, query, s):
    print(title)
    print("  doc  cosine  dot     euclid")
    names = list(s)
    for n in names:
        print(f"  {n}    {f(cosine(query, s[n]))}   {f(dot(query, s[n])).ljust(6)}  {f(euclid(query, s[n]))}")

    def by(score, desc):
        return " > ".join(sorted(names, key=lambda n: -score(s[n]) if desc else score(s[n])))

    print(f"  ranking by cosine: {by(lambda v: cosine(query, v), True)}")
    print(f"  ranking by dot:    {by(lambda v: dot(query, v), True)}")
    print(f"  ranking by euclid: {by(lambda v: euclid(query, v), False)}")


table("raw vectors (lengths differ)", q, docs)
unit_docs = {k: unit(v) for k, v in docs.items()}
table("after scaling every vector to length 1", unit(q), unit_docs)

print("identity check on unit vectors: euclid^2 = 2 - 2 * cosine")
for k, v in unit_docs.items():
    e2 = sq(euclid(unit(q), v))
    rhs = 2 - 2 * cosine(unit(q), v)
    print(f"  {k}: {f(e2)} vs {f(rhs)}")` },
        ],
      },
      {
        label: `Exact search vs an IVF index: recall@10 against distance computations`,
        variants: [
          { tech: "node", code: `// Exact (flat) search vs an IVF index (k-means buckets, probe the closest few).
// Seeded generator so every run and every language prints the same numbers.
let seed = 42;
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const gauss = () => { let s = 0; for (let i = 0; i < 12; i++) s += rand(); return s - 6; }; // approx normal, no log/cos
const D = 16, N = 3000, CLUSTERS = 30, LISTS = 30, K = 10, QUERIES = 40;

const centers = [];
for (let c = 0; c < CLUSTERS; c++) { const v = []; for (let d = 0; d < D; d++) v.push(gauss() * 2); centers.push(v); }
const pts = [];
for (let i = 0; i < N; i++) { const c = centers[i % CLUSTERS]; const v = []; for (let d = 0; d < D; d++) v.push(c[d] + gauss() * 2.5); pts.push(v); }
const dist2 = (a, b) => { let s = 0; for (let d = 0; d < D; d++) { const t = a[d] - b[d]; s += t * t; } return s; };
const order = (arr) => arr.sort((x, y) => x[0] - y[0] || x[1] - y[1]); // by distance, then id

// build the IVF index: 5 rounds of k-means, start from evenly spaced points
let cents = []; for (let j = 0; j < LISTS; j++) cents.push(pts[j * 97].slice());
let assign = new Array(N).fill(0);
for (let round = 0; round < 5; round++) {
  for (let i = 0; i < N; i++) { let best = 0; for (let j = 1; j < LISTS; j++) if (dist2(pts[i], cents[j]) < dist2(pts[i], cents[best])) best = j; assign[i] = best; }
  const sum = cents.map(() => new Array(D).fill(0)), cnt = new Array(LISTS).fill(0);
  for (let i = 0; i < N; i++) { cnt[assign[i]]++; for (let d = 0; d < D; d++) sum[assign[i]][d] += pts[i][d]; }
  cents = cents.map((c, j) => (cnt[j] ? sum[j].map((s) => s / cnt[j]) : c));
}
const lists = cents.map(() => []);
for (let i = 0; i < N; i++) lists[assign[i]].push(i);

const queries = [];
for (let qi = 0; qi < QUERIES; qi++) { const c = centers[(qi * 7) % CLUSTERS]; const v = []; for (let d = 0; d < D; d++) v.push(c[d] + gauss() * 3); queries.push(v); }

function exact(q) { return order(pts.map((p, i) => [dist2(q, p), i])).slice(0, K).map((x) => x[1]); }
function ivf(q, nprobe) {
  const near = order(cents.map((c, j) => [dist2(q, c), j])).slice(0, nprobe);
  const cand = []; for (const [, j] of near) for (const i of lists[j]) cand.push([dist2(q, pts[i]), i]);
  return { ids: order(cand).slice(0, K).map((x) => x[1]), work: LISTS + cand.length };
}

console.log(\`\${N} vectors, \${D} dims, \${LISTS} IVF lists, top-\${K}, \${QUERIES} queries\`);
console.log("method      distance computations per query   recall@10");
console.log(\`flat        \${String(N).padEnd(34)}100.00%\`);
for (const nprobe of [1, 2, 4, 8, 16, 30]) {
  let hit = 0, work = 0;
  for (const q of queries) {
    const truth = new Set(exact(q)); const r = ivf(q, nprobe);
    work += r.work; hit += r.ids.filter((i) => truth.has(i)).length;
  }
  const label = \`ivf n=\${nprobe}\`.padEnd(12);
  console.log(\`\${label}\${String(Math.floor(work / QUERIES + 0.5)).padEnd(34)}\${((100 * hit) / (QUERIES * K)).toFixed(2)}%\`);
}` },
          { tech: "python", code: `# Exact (flat) search vs an IVF index (k-means buckets, probe the closest few).
# Seeded generator so every run and every language prints the same numbers.
import math

seed = 42


def rand():
    global seed
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296


def gauss():  # approx normal, no log/cos
    s = 0.0
    for _ in range(12):
        s += rand()
    return s - 6


D, N, CLUSTERS, LISTS, K, QUERIES = 16, 3000, 30, 30, 10, 40

centers = [[gauss() * 2 for _ in range(D)] for _ in range(CLUSTERS)]
pts = []
for i in range(N):
    c = centers[i % CLUSTERS]
    pts.append([c[d] + gauss() * 2.5 for d in range(D)])


def dist2(a, b):
    s = 0.0
    for d in range(D):
        t = a[d] - b[d]
        s += t * t
    return s


def order(arr):  # by distance, then id
    return sorted(arr, key=lambda x: (x[0], x[1]))


# build the IVF index: 5 rounds of k-means, start from evenly spaced points
cents = [pts[j * 97][:] for j in range(LISTS)]
assign = [0] * N
for _ in range(5):
    for i in range(N):
        best = 0
        for j in range(1, LISTS):
            if dist2(pts[i], cents[j]) < dist2(pts[i], cents[best]):
                best = j
        assign[i] = best
    sums = [[0.0] * D for _ in range(LISTS)]
    cnt = [0] * LISTS
    for i in range(N):
        cnt[assign[i]] += 1
        for d in range(D):
            sums[assign[i]][d] += pts[i][d]
    cents = [[s / cnt[j] for s in sums[j]] if cnt[j] else c for j, c in enumerate(cents)]
lists = [[] for _ in range(LISTS)]
for i in range(N):
    lists[assign[i]].append(i)

queries = []
for qi in range(QUERIES):
    c = centers[(qi * 7) % CLUSTERS]
    queries.append([c[d] + gauss() * 3 for d in range(D)])


def exact(q):
    return [x[1] for x in order([(dist2(q, p), i) for i, p in enumerate(pts)])[:K]]


def ivf(q, nprobe):
    near = order([(dist2(q, c), j) for j, c in enumerate(cents)])[:nprobe]
    cand = [(dist2(q, pts[i]), i) for _, j in near for i in lists[j]]
    return [x[1] for x in order(cand)[:K]], LISTS + len(cand)


print(f"{N} vectors, {D} dims, {LISTS} IVF lists, top-{K}, {QUERIES} queries")
print("method      distance computations per query   recall@10")
print(f"flat        {str(N).ljust(34)}100.00%")
for nprobe in [1, 2, 4, 8, 16, 30]:
    hit = work = 0
    for q in queries:
        truth = set(exact(q))
        ids, w = ivf(q, nprobe)
        work += w
        hit += len([i for i in ids if i in truth])
    label = f"ivf n={nprobe}".ljust(12)
    print(f"{label}{str(math.floor(work / QUERIES + 0.5)).ljust(34)}{100 * hit / (QUERIES * K):.2f}%")` },
        ],
      },
    ],
  },
  {
    title: `Embeddings in 2025-26: how do you choose model, dimensions, and distance?`,
    difficulty: "medium",
    seoDescription: `Choose an embedding model by your own retrieval evals, size dimensions and precision with Matryoshka truncation and quantization, and match the metric.`,
    description: `**Question presented to candidate:**
"We are building retrieval over about ten million document chunks. Walk me through how you would pick the embedding model, how many dimensions to store, and which distance metric to use, and what would make you change those choices later."

**What a strong answer should cover:**
- Model choice is an evaluation, not a leaderboard pick: shortlist from MTEB and model cards on hard constraints (languages, max input length, hosting and data rules, price), then measure recall@k or nDCG on your own labelled queries
- The details that silently cost quality: query and document prefixes or task types, the model input limit versus chunk size, multilingual and domain fit
- Dimensions are a storage, memory and latency budget: raw float32 is dimensions x 4 bytes per vector; Matryoshka-trained models (OpenAI \`dimensions\` parameter, other MRL models) can be truncated and renormalised with small loss, models without that training cannot
- Precision is a second lever: int8 scalar quantization (4x smaller) loses little; binary (32x) needs rescoring with the full vectors and works best with many dimensions
- Distance is whatever the model was trained for, normally cosine; normalise once and use dot product, and keep the same metric at index and query time
- Changing model means re-embedding everything: version the index, dual-write or rebuild alongside, evaluate, then switch

**Clarifying questions expected:**
- Which languages and content types (prose, code, tables) must it handle, and how long are the chunks?
- Can the data be sent to a third-party API, or must the model run in our own environment?
- What is the latency and memory budget for the index, and how fast does the corpus grow?

**Code / implementation expected:** Optional — the storage arithmetic for dimensions and precision, or a small recall@k comparison, is a strong signal.`,
    answer: `**Target Audience:** Engineers setting up retrieval who must commit to an embedding model, a vector size and a metric, and want a defensible way to choose rather than copying a blog post.
**Difficulty:** Medium
**Verified with:** Node 22.22.0 and Python 3.12.3 (the truncation and quantization program below, on seeded synthetic vectors). Model facts, prices and limits are cited inline with the source and the date checked (October 2026); they change often, so treat them as examples of the mechanism, not as a current price list.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Choosing an embedding model is like choosing the filing system for a warehouse you are about to fill. Pick shelves that are too big and you pay rent on empty space forever; too small and things get crushed together and you cannot find them. And once ten million boxes are on the shelves, changing the system means taking every box down and putting it back.

That last part is what makes this decision different from choosing a chat model. You can switch chat models with a config change. You cannot switch embedding models without **re-embedding the entire corpus**, because vectors from two models are not comparable (the basics are in [What are embeddings and what are they used for?](/interview-question/what-are-embeddings-and-what-are-they-used-for)). So the choice deserves a short, measured process, and the interviewer is listening for three things: you evaluate on your own data, you treat dimensions as a cost budget, and you plan for the migration you will eventually do anyway.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Which languages, and what content: prose, code, tables, product names? | Rules out English-only models, or favours code-trained ones |
| How long are the chunks, and how long are queries? | A chunk longer than the model input limit is silently cut off |
| May the text be sent to a third-party API? | If not, you need an open-weight model you host yourself |
| How many vectors now and in a year, and what latency target? | Decides how many dimensions and how much precision you can afford in memory |
| Do we already run a database with a vector type? | Some indexes cap dimensions (pgvector HNSW on \`vector\` caps at 2,000) |
| Do we have labelled queries, or must we build them? | Without them you cannot compare models at all |

## 3. Choosing the Model: Constraints, Then Your Own Eval

### Step 1: filter on hard constraints

- **Input limit.** Each model has a maximum input length in tokens. For example, the BAAI bge-m3 model card lists 8,192 tokens (and 1,024 output dimensions). If your chunks are longer than the limit, the end of each chunk is never seen.
- **Languages and domain.** A multilingual model lets a Spanish query find an English document; an English-only model will not.
- **Hosting and data rules.** API models (OpenAI, Google, Cohere, Voyage and others) need no serving infrastructure; open-weight models (bge-m3, the E5 family and others) can run inside your network. The same trade-off for chat models is in [How do you choose between open-weight models and proprietary API models?](/interview-question/how-do-you-choose-between-open-weight-models-and-proprietary-api-models)
- **Price.** Embedding is cheap per token but corpora are large. Worked example with OpenAI list prices from its model pages (checked October 2026: $0.02 per million tokens for \`text-embedding-3-small\`, $0.13 for \`text-embedding-3-large\`): 10 million chunks x 400 tokens = 4 billion tokens, so a full embed costs about **$80** with the small model and **$520** with the large one. Cheap once, but you pay it again on every model change.

### Step 2: shortlist from public benchmarks

📌 **Interview term: MTEB (Massive Text Embedding Benchmark)** — a public benchmark of embedding models over many tasks (retrieval, classification, clustering, semantic similarity and more) with a leaderboard on Hugging Face (Muennighoff et al., arXiv 2210.07316, October 2022). Its own paper found that no single method dominated across all tasks. Use the **retrieval** columns, in your languages, to pick three or four candidates.

### Step 3: measure on your own queries

📌 **Interview term: retrieval eval** — a set of real queries, each labelled with the document chunks that answer it, scored by metrics such as **recall@k** (did the right chunk appear in the top k?) and **nDCG** (how high did it rank?). Building the labelled set is covered in [How do you build a golden dataset for evaluating an LLM feature?](/interview-question/how-do-you-build-a-golden-dataset-for-evaluating-an-llm-feature) and evaluating the whole pipeline in [How do you evaluate a RAG pipeline end to end?](/interview-question/how-do-you-evaluate-a-rag-pipeline-end-to-end)

Run every candidate exactly as it is meant to be used, which includes one detail that is easy to miss:

📌 **Interview term: asymmetric embedding (query and document prefixes, task types)** — some models are trained to embed queries and documents differently. The E5 model cards ask for a \`query: \` prefix on queries and \`passage: \` on documents, and say results are worse without them. Google describes \`RETRIEVAL_QUERY\` and \`RETRIEVAL_DOCUMENT\` task types for its Gemini embedding models (from secondary sources and integration docs; one developer forum report says a preview model ignored the setting, so check the current docs and test it).

## 4. Choosing Dimensions: A Storage and Speed Budget

Every stored vector costs \`dimensions x bytes per value\`. At float32 that is 4 bytes per value, so one 3,072-dimension vector is 12,288 bytes and one 1,024-dimension vector is 4,096 bytes. Multiply by the corpus and the number becomes an infrastructure decision. From the run (raw vectors only, before any index overhead):

~~~text
storage for 10,000,000 vectors:
  3072d  float32  122.9 GB  int8   30.7 GB  binary    3.8 GB
  1024d  float32   41.0 GB  int8   10.2 GB  binary    1.3 GB
   256d  float32   10.2 GB  int8    2.6 GB  binary    0.3 GB
~~~

More dimensions also mean more work per distance calculation, so latency and cost per query rise with them. The question is how many dimensions you can drop before retrieval quality falls.

### Matryoshka models can be shortened; others cannot

📌 **Interview term: Matryoshka Representation Learning (MRL)** — a training method (Kusupati et al., NeurIPS 2022, arXiv 2205.13147) that makes the first values of a vector carry the most information, like nested Russian dolls: the first 256 numbers are a usable embedding, the first 1,024 a better one, all of them the best. You can truncate the vector and **renormalise** it to length 1 with a small, measurable loss.

OpenAI exposes this through a \`dimensions\` parameter on its \`text-embedding-3\` models. Its launch post (January 2024) reported that \`text-embedding-3-large\` shortened to 256 dimensions still outperformed the older \`text-embedding-ada-002\` at 1,536 on MTEB, and its embeddings FAQ says shortened outputs are still normalised to length 1 (both checked October 2026).

The program shows why the training matters. It builds two synthetic corpora: one where the signal is concentrated in the first dimensions (the property MRL training produces) and one where it is spread evenly (an ordinary model). Then it truncates both and measures recall@10 against the full-dimension ranking:

~~~text
mrl   truncation recall@10: 32d 100.0%  16d 98.0%  8d 76.5%  4d 28.5%
flat  truncation recall@10: 32d 100.0%  16d 32.0%  8d 13.5%  4d 5.5%
~~~

Halving the "mrl" vectors keeps 98% of the neighbours; halving the "flat" vectors keeps 32%. **Never truncate a model that was not trained for it**, and measure the loss on your data even when it was: the curve for a real model has to be measured, not assumed from this synthetic one.

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Matryoshka vector: the first 256 values are a usable embedding, the first 1024 a better one, and the full 3072 the most accurate">
  <rect class="d-box" x="40" y="40" width="680" height="60" rx="8"/>
  <rect class="d-box-accent" x="40" y="40" width="230" height="60" rx="8"/>
  <rect class="d-box-accent" x="40" y="40" width="70" height="60" rx="8"/>
  <text class="d-text" x="75" y="76" text-anchor="middle">256</text>
  <text class="d-text" x="190" y="76" text-anchor="middle">1024</text>
  <text class="d-text" x="495" y="76" text-anchor="middle">3072 values</text>
  <text class="d-sub" x="75" y="150" text-anchor="middle">smallest</text>
  <text class="d-sub" x="190" y="150" text-anchor="middle">middle</text>
  <text class="d-sub" x="495" y="150" text-anchor="middle">full accuracy</text>
  <path class="d-edge-dashed" d="M 75 110 L 75 130"/>
  <path class="d-edge-dashed" d="M 190 110 L 190 130"/>
  <path class="d-edge-dashed" d="M 495 110 L 495 130"/>
</svg>

Each prefix of the vector is itself an embedding; keep a prefix, divide it by its new length, and index that.

A practical pattern this enables: **two-stage search**, where a short prefix (say 256 values) is searched in memory to get a few hundred candidates, and the full vectors (on disk or in a second column) rescore them.

### Precision: fewer bytes per value

📌 **Interview term: scalar quantization (int8)** — storing each value as an 8-bit integer instead of a 32-bit float: 4x smaller, with typically small loss. Qdrant documents 4x compression for scalar quantization and up to 32x for binary (Qdrant quantization docs, checked October 2026).

📌 **Interview term: binary quantization** — keeping only the sign of each value (1 bit), and comparing vectors by counting differing bits (**Hamming distance**). 32x smaller and very fast, but much less precise, so it is used with **oversampling and rescoring**: fetch several times more candidates with the bits, then rerank them with the full vectors. Qdrant documents it as best suited to high-dimensional vectors.

From the run, at full 32 dimensions on the evenly spread corpus:

~~~text
precision at 32d (flat corpus):
  float32  100.0%
  int8     98.0%
  binary   29.0%
  binary, rescore top 40 in float   52.5%
  binary, rescore top 100 in float  74.0%
~~~

int8 keeps almost everything. Binary on its own collapses at 32 dimensions, because 32 bits cannot tell a thousand vectors apart well; rescoring a larger candidate set recovers much of it. With real models of 1,000 or more dimensions, each vector has far more bits, which is why binary plus rescoring is used there and not on small vectors. Treat this as a direction to test, not a number to quote.

## 5. Choosing the Distance Metric

This is the easy one, once you know why (the full maths is in [How does similarity search work — cosine, dot product and Euclidean?](/interview-question/how-does-similarity-search-work-cosine-dot-product-and-euclidean)):

1. **Use the metric the model card names.** For most text embedding models that is cosine.
2. **Normalise once, then use dot product.** On unit vectors cosine and dot product are identical and Euclidean ranks the same, and dot product is the cheapest.
3. **Renormalise after truncation.** A truncated unit vector is no longer unit length.
4. **Fix it at index creation.** The metric is chosen when the index or collection is created, and it must be the same at query time.

| Decision | Default | Change it when |
| :--- | :--- | :--- |
| Model | Best recall@k on your own eval among models that pass the constraints | A new model wins your eval by more than noise, and the re-embed cost is worth it |
| Dimensions | The smallest truncation (MRL models only) within about 1 point of full recall | Memory or latency is over budget, or recall is short of target |
| Precision | float32, or int8 when memory matters | Memory forces binary: then oversample and rescore |
| Metric | Whatever the model card says, usually cosine; implement as dot product on unit vectors | Only if the model documents something else |

### Database limits feed back into the choice

pgvector HNSW indexes support the \`vector\` type up to 2,000 dimensions and \`halfvec\` (16-bit floats) up to 4,000 (pgvector documentation and mirrors, checked October 2026). A 3,072-dimension model therefore needs \`halfvec\`, or truncation to 2,000 or fewer, if you want an HNSW index in Postgres. That is a reason to settle dimensions *together* with the database, covered in [pgvector vs Pinecone vs Qdrant: how do you choose a vector DB in 2025?](/interview-question/pgvector-vs-pinecone-vs-qdrant-how-do-you-choose-a-vector-db-in-2025)

## 6. Planning the Migration You Will Eventually Do

📌 **Interview term: re-embedding migration** — moving a corpus to a new embedding model. Because old and new vectors cannot be compared, it is a full rebuild: new index or column alongside the old, backfill by re-embedding, dual-write new documents, evaluate, switch reads behind a flag, keep the old index for rollback.

<svg class="iq-diagram" width="100%" viewBox="0 0 820 200" role="img" aria-label="Migration steps: build the new index alongside, backfill and dual write, evaluate and shadow, switch reads, then retire the old index">
  <defs>
    <marker id="ai05q3-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="55" width="130" height="90" rx="10"/>
  <text class="d-text" x="85" y="93" text-anchor="middle">new index</text>
  <text class="d-sub" x="85" y="119" text-anchor="middle">alongside</text>
  <rect class="d-box" x="190" y="55" width="130" height="90" rx="10"/>
  <text class="d-text" x="255" y="93" text-anchor="middle">backfill</text>
  <text class="d-sub" x="255" y="119" text-anchor="middle">dual write</text>
  <rect class="d-box" x="360" y="55" width="130" height="90" rx="10"/>
  <text class="d-text" x="425" y="93" text-anchor="middle">evaluate</text>
  <text class="d-sub" x="425" y="119" text-anchor="middle">shadow reads</text>
  <rect class="d-box-accent" x="530" y="55" width="130" height="90" rx="10"/>
  <text class="d-text" x="595" y="93" text-anchor="middle">switch</text>
  <text class="d-sub" x="595" y="119" text-anchor="middle">behind a flag</text>
  <rect class="d-box-muted" x="700" y="55" width="100" height="90" rx="10"/>
  <text class="d-text" x="750" y="93" text-anchor="middle">retire</text>
  <text class="d-sub" x="750" y="119" text-anchor="middle">old index</text>
  <path class="d-edge" d="M 154 100 L 184 100" marker-end="url(#ai05q3-arrow)"/>
  <path class="d-edge" d="M 324 100 L 354 100" marker-end="url(#ai05q3-arrow)"/>
  <path class="d-edge" d="M 494 100 L 524 100" marker-end="url(#ai05q3-arrow)"/>
  <path class="d-edge" d="M 664 100 L 694 100" marker-end="url(#ai05q3-arrow)"/>
</svg>

Store the model name, version, dimensions and normalisation with every index (or in a column) so a query can never be embedded with a different model than the vectors it searches. The same discipline as a prompt or model upgrade applies: [How do you catch regressions when changing a prompt or upgrading a model?](/interview-question/how-do-you-catch-regressions-when-changing-a-prompt-or-upgrading-a-model)

A real request with a reduced size looks like this (not run here; shape from the OpenAI embeddings guide, checked October 2026):

~~~ts
const res = await client.embeddings.create({
  model: "text-embedding-3-large",
  input: chunks,
  dimensions: 1024, // shortened Matryoshka output, still unit length per the OpenAI FAQ
});
~~~

## 7. Verified: Running the Code

The example **"Truncating dimensions and quantizing vectors: recall@10 and storage on synthetic data"** generates 1,000 seeded 32-dimension vectors per corpus and 20 queries that are noisy copies of known documents. In the "mrl" corpus, dimension d is scaled by 0.85 to the power d, so early dimensions carry most of the signal, which imitates what Matryoshka training produces; in the "flat" corpus every dimension has equal weight. Ground truth is the exact top 10 by full-dimension cosine. Truncation keeps the first t values and renormalises; int8 maps each unit-vector value to an integer in -127..127; binary keeps the sign. No real model is involved, so the percentages show the mechanism and the direction of each effect, not what any real model would score; the storage table is plain arithmetic for real sizes.

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
mrl   truncation recall@10: 32d 100.0%  16d 98.0%  8d 76.5%  4d 28.5%
flat  truncation recall@10: 32d 100.0%  16d 32.0%  8d 13.5%  4d 5.5%
precision at 32d (flat corpus):
  float32  100.0%
  int8     98.0%
  binary   29.0%
  binary, rescore top 40 in float   52.5%
  binary, rescore top 100 in float  74.0%
storage for 10,000,000 vectors:
  3072d  float32  122.9 GB  int8   30.7 GB  binary    3.8 GB
  1024d  float32   41.0 GB  int8   10.2 GB  binary    1.3 GB
   256d  float32   10.2 GB  int8    2.6 GB  binary    0.3 GB
~~~

What the run shows:

- Truncation works only when the model put the information first: 98% vs 32% recall at half the dimensions.
- int8 is close to free in quality and 4x smaller; binary needs rescoring, and more candidates to rescore recover more recall.
- At 10 million vectors the difference between 3,072-dimension float32 and 256-dimension int8 is about 123 GB versus under 3 GB of raw vectors.

## Edge Cases Worth Knowing

- **Chunks over the input limit.** Providers may cut the input off or reject it; either way, measure chunk lengths in the embedding model tokenizer, not in characters. See [What are tokens and why do they matter for cost and limits?](/interview-question/what-are-tokens-and-why-do-they-matter-for-cost-and-limits)
- **Hybrid models.** bge-m3 can produce dense, sparse and multi-vector outputs from one model (per its model card), which can replace a separate keyword index in some hybrid setups; see [What is hybrid search and why combine BM25 with vector search?](/interview-question/what-is-hybrid-search-and-why-combine-bm25-with-vector-search)
- **Vendor deprecation.** An API model can be retired on the vendor schedule, forcing a re-embed you did not plan. Budget for it, or host an open-weight model.
- **Quantization plus truncation.** The two levers multiply, and so do their losses; evaluate the combination you will actually deploy.

## Common Pitfalls

- **Choosing by leaderboard rank alone.** The top of MTEB is often within noise, and your domain is not in it. Run your own retrieval eval.
- **Forgetting the query and document prefixes or task type.** The model still returns vectors; they are just worse. Follow the model card exactly.
- **Truncating a non-Matryoshka model.** Recall collapses (32% at half size in the synthetic run). Only truncate models documented to support it, and renormalise.
- **Picking 3,072 dimensions by default.** It can multiply memory and query cost several times over for a gain your eval may not even detect.
- **Not recording the model with the index.** A later code change embeds queries with a new model and quietly breaks search.
- **Ignoring database dimension limits.** A model whose output exceeds the index limit forces a late redesign.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Constraints first:</strong> <span style="color:#f0e2c8;">I start from the hard requirements: languages, content type, chunk length versus the model input limit, whether data may leave our environment, and the budget. That turns a long list of models into three or four candidates from MTEB and the model cards.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Measure on our queries:</strong> <span style="color:#f0e2c8;">I build a few hundred labelled query-to-document pairs from real traffic and measure <strong style="color:#ffca28;">recall@k</strong> or nDCG for each candidate, with the prefixes or task types each model card asks for. The leaderboard only shortlists.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Dimensions are a budget:</strong> <span style="color:#f0e2c8;">Raw float32 storage is dimensions x 4 bytes, so 10 million vectors at 3,072 dims is about <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">122.9 GB</code> before any index. With a <strong style="color:#ffca28;">Matryoshka</strong> model I can truncate and renormalise: in my synthetic run 16 of 32 dims kept <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">98%</code> recall@10, while a model without that training kept only <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">32%</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Precision is the second lever:</strong> <span style="color:#f0e2c8;">int8 scalar quantization is 4x smaller and kept <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">98%</code> recall in my run; binary is 32x smaller but needs oversampling and rescoring with full vectors. I test both on our data before choosing.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Distance and change:</strong> <span style="color:#f0e2c8;">The metric is whatever the model was trained for, usually cosine, so I normalise and use dot product, the same at index and query time. I store the model name, version and dimensions with the index, because changing any of them means re-embedding and a side-by-side cutover.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just take the top model on MTEB?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">MTEB averages many tasks and public datasets, and your queries, jargon and languages are not in it. Scores near the top are often within noise of each other, while price, latency, dimensions and input limits differ a lot. Use it to shortlist, then run your own retrieval eval, which is the only number that predicts your search quality.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the OpenAI <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">dimensions</code> parameter actually do?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It returns a shorter vector from a model trained so that the leading values carry the most information, and OpenAI documents that the shortened output is still normalised to length 1. OpenAI reported that text-embedding-3-large shortened to 256 dimensions still beat the older ada-002 at 1,536 on MTEB. You can also truncate stored full vectors yourself, but then you must renormalise them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you migrate to a new embedding model without downtime?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Create a new index or column next to the old one, backfill it by re-embedding the corpus, and dual-write new documents to both. Run the retrieval eval and a shadow comparison on live queries, then switch reads with a flag, keep the old index for rollback, and delete it later. Queries must always be embedded with the same model as the index they hit.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Open-weight or API embedding model?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An API model means no serving work and simple per-token pricing, but your text leaves your environment and the vendor controls deprecation. An open-weight model such as bge-m3 can run inside your network and never changes under you, but you operate GPUs or CPUs for it. Data rules and volume usually decide.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Does the distance metric matter if vectors are normalised?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not for ranking: on unit vectors cosine, dot product and Euclidean give the same order. What matters is that the index and the query use the same one, and that you do not use raw dot product on unnormalised vectors from a model trained for cosine, where long vectors would win on length.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| MTEB | Public benchmark and leaderboard for embedding models across many tasks |
| Retrieval eval | Labelled queries scored with recall@k or nDCG on your own data |
| Asymmetric embedding | Different prefixes or task types for queries and documents |
| Matryoshka Representation Learning (MRL) | Training that puts the most information in the first values so vectors can be truncated |
| Scalar quantization (int8) | One byte per value instead of four; 4x smaller |
| Binary quantization | One bit per value, compared with Hamming distance; used with oversampling and rescoring |
| Re-embedding migration | Rebuilding the corpus with a new model alongside the old index, then switching |

**Conclusion:** Choose the embedding model by filtering on hard constraints, shortlisting from MTEB, and measuring recall@k on your own labelled queries with each model used exactly as its card says. Treat dimensions and precision as a budget: Matryoshka-trained models can be truncated and renormalised with small loss, int8 is a near-free 4x saving, and binary needs rescoring. Use the metric the model was trained for, implemented as dot product on unit vectors. And because any change means re-embedding everything, store the model, version and dimensions with the index and plan the side-by-side migration before you need it.`,
    examples: [
      {
        label: `Truncating dimensions and quantizing vectors: recall@10 and storage on synthetic data`,
        variants: [
          { tech: "node", code: `// Dimensions and precision: what you lose when you store fewer or smaller numbers.
// Synthetic vectors (seeded). "mrl" puts most signal in the first dimensions, the
// way Matryoshka-trained models are built to; "flat" spreads it evenly.
let seed = 7;
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const gauss = () => { let s = 0; for (let i = 0; i < 12; i++) s += rand(); return s - 6; };
const D = 32, N = 1000, Q = 20, K = 10;
const DECAY = [1]; for (let d = 1; d < D; d++) DECAY.push(DECAY[d - 1] * 0.85); // weight of dimension d in "mrl"

function corpus(weight) {
  const docs = [], qs = [];
  for (let i = 0; i < N; i++) { const v = []; for (let d = 0; d < D; d++) v.push(gauss() * weight(d)); docs.push(v); }
  for (let j = 0; j < Q; j++) { const base = docs[j * 37]; qs.push(base.map((x, d) => x + gauss() * 0.6 * weight(d))); }
  return { docs, qs };
}
const dotT = (a, b, t) => { let s = 0; for (let d = 0; d < t; d++) s += a[d] * b[d]; return s; };
const cosT = (a, b, t) => dotT(a, b, t) / Math.sqrt(dotT(a, a, t) * dotT(b, b, t)); // truncate then renormalise
const topK = (scores) => scores.map((s, i) => [s, i]).sort((x, y) => y[0] - x[0] || x[1] - y[1]).slice(0, K).map((x) => x[1]);
function recall(qs, score, truth) {
  let hit = 0;
  qs.forEach((q, j) => { const t = new Set(truth[j]); hit += topK(score(q)).filter((i) => t.has(i)).length; });
  return ((100 * hit) / (Q * K)).toFixed(1) + "%";
}

for (const [name, weight] of [["mrl", (d) => DECAY[d]], ["flat", () => 1]]) {
  const { docs, qs } = corpus(weight);
  const truth = qs.map((q) => topK(docs.map((x) => cosT(q, x, D))));
  const row = [32, 16, 8, 4].map((t) => \`\${t}d \${recall(qs, (q) => docs.map((x) => cosT(q, x, t)), truth)}\`);
  console.log(\`\${name.padEnd(5)} truncation recall@10: \${row.join("  ")}\`);
}

// precision on the flat corpus at full 32 dims
const { docs, qs } = corpus(() => 1);
const truth = qs.map((q) => topK(docs.map((x) => cosT(q, x, D))));
const unit = (v) => { const n = Math.sqrt(dotT(v, v, D)); return v.map((x) => x / n); };
const U = docs.map(unit);
const maxAbs = Math.max(...U.flat().map(Math.abs));
const i8 = U.map((v) => v.map((x) => Math.floor((x / maxAbs) * 127 + 0.5))); // 1 byte per dimension
const bits = U.map((v) => v.map((x) => (x > 0 ? 1 : 0)));              // 1 bit per dimension
const hamming = (a, b) => { let s = 0; for (let d = 0; d < D; d++) if (a[d] !== b[d]) s++; return s; };
console.log("precision at 32d (flat corpus):");
console.log(\`  float32  \${recall(qs, (q) => U.map((x) => dotT(unit(q), x, D)), truth)}\`);
console.log(\`  int8     \${recall(qs, (q) => { const u = unit(q); return i8.map((x) => dotT(u, x, D)); }, truth)}\`);
console.log(\`  binary   \${recall(qs, (q) => { const b = unit(q).map((x) => (x > 0 ? 1 : 0)); return bits.map((x) => -hamming(b, x)); }, truth)}\`);
const rescore = (q, keep) => {
  const u = unit(q), b = u.map((x) => (x > 0 ? 1 : 0));
  const cand = new Set(bits.map((x, i) => [-hamming(b, x), i]).sort((x, y) => y[0] - x[0] || x[1] - y[1]).slice(0, keep).map((x) => x[1]));
  return U.map((x, i) => (cand.has(i) ? dotT(u, x, D) : -9));
};
console.log(\`  binary, rescore top 40 in float   \${recall(qs, (q) => rescore(q, 40), truth)}\`);
console.log(\`  binary, rescore top 100 in float  \${recall(qs, (q) => rescore(q, 100), truth)}\`);

// storage arithmetic at production scale (vectors only, no index overhead)
console.log("storage for 10,000,000 vectors:");
for (const dims of [3072, 1024, 256]) {
  const gb = (bytes) => ((dims * bytes * 1e7) / 1e9).toFixed(1).padStart(6) + " GB";
  console.log(\`  \${String(dims).padStart(4)}d  float32 \${gb(4)}  int8 \${gb(1)}  binary \${gb(1 / 8)}\`);
}` },
          { tech: "python", code: `# Dimensions and precision: what you lose when you store fewer or smaller numbers.
# Synthetic vectors (seeded). "mrl" puts most signal in the first dimensions, the
# way Matryoshka-trained models are built to; "flat" spreads it evenly.
import math

seed = 7


def rand():
    global seed
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296


def gauss():
    s = 0.0
    for _ in range(12):
        s += rand()
    return s - 6


D, N, Q, K = 32, 1000, 20, 10
DECAY = [1.0]
for d in range(1, D):
    DECAY.append(DECAY[d - 1] * 0.85)  # weight of dimension d in "mrl"


def corpus(weight):
    docs = [[gauss() * weight(d) for d in range(D)] for _ in range(N)]
    qs = []
    for j in range(Q):
        base = docs[j * 37]
        qs.append([x + gauss() * 0.6 * weight(d) for d, x in enumerate(base)])
    return docs, qs


def dot_t(a, b, t):
    s = 0.0
    for d in range(t):
        s += a[d] * b[d]
    return s


def cos_t(a, b, t):  # truncate then renormalise
    return dot_t(a, b, t) / math.sqrt(dot_t(a, a, t) * dot_t(b, b, t))


def top_k(scores):
    return [i for _, i in sorted(((s, i) for i, s in enumerate(scores)), key=lambda x: (-x[0], x[1]))[:K]]


def recall(qs, score, truth):
    hit = 0
    for j, q in enumerate(qs):
        t = set(truth[j])
        hit += len([i for i in top_k(score(q)) if i in t])
    return f"{100 * hit / (Q * K):.1f}%"


for name, weight in [("mrl", lambda d: DECAY[d]), ("flat", lambda d: 1)]:
    docs, qs = corpus(weight)
    truth = [top_k([cos_t(q, x, D) for x in docs]) for q in qs]
    row = [f"{t}d {recall(qs, lambda q, t=t: [cos_t(q, x, t) for x in docs], truth)}" for t in [32, 16, 8, 4]]
    print(f"{name.ljust(5)} truncation recall@10: {'  '.join(row)}")

# precision on the flat corpus at full 32 dims
docs, qs = corpus(lambda d: 1)
truth = [top_k([cos_t(q, x, D) for x in docs]) for q in qs]


def unit(v):
    n = math.sqrt(dot_t(v, v, D))
    return [x / n for x in v]


U = [unit(v) for v in docs]
max_abs = max(abs(x) for v in U for x in v)
i8 = [[math.floor((x / max_abs) * 127 + 0.5) for x in v] for v in U]  # 1 byte per dimension
bits = [[1 if x > 0 else 0 for x in v] for v in U]                      # 1 bit per dimension


def hamming(a, b):
    return sum(1 for d in range(D) if a[d] != b[d])


def to_bits(v):
    return [1 if x > 0 else 0 for x in v]


def rescore(q, keep):
    u = unit(q)
    b = to_bits(u)
    ranked = sorted(((-hamming(b, x), i) for i, x in enumerate(bits)), key=lambda x: (-x[0], x[1]))[:keep]
    cand = {i for _, i in ranked}
    return [dot_t(u, x, D) if i in cand else -9 for i, x in enumerate(U)]


print("precision at 32d (flat corpus):")
print(f"  float32  {recall(qs, lambda q: [dot_t(unit(q), x, D) for x in U], truth)}")
print(f"  int8     {recall(qs, lambda q: (lambda u: [dot_t(u, x, D) for x in i8])(unit(q)), truth)}")
print(f"  binary   {recall(qs, lambda q: (lambda b: [-hamming(b, x) for x in bits])(to_bits(unit(q))), truth)}")
print(f"  binary, rescore top 40 in float   {recall(qs, lambda q: rescore(q, 40), truth)}")
print(f"  binary, rescore top 100 in float  {recall(qs, lambda q: rescore(q, 100), truth)}")

# storage arithmetic at production scale (vectors only, no index overhead)
print("storage for 10,000,000 vectors:")
for dims in [3072, 1024, 256]:
    def gb(nbytes):
        return f"{dims * nbytes * 1e7 / 1e9:.1f}".rjust(6) + " GB"
    print(f"  {str(dims).rjust(4)}d  float32 {gb(4)}  int8 {gb(1)}  binary {gb(1 / 8)}")` },
        ],
      },
    ],
  },
  {
    title: `What is a vector database and when do you actually need one?`,
    difficulty: "easy",
    seoDescription: `A vector database stores embeddings with metadata and finds nearest neighbours fast; size it with arithmetic and avoid a second store until you need one.`,
    description: `**Question presented to candidate:**
"Everyone says you need a vector database for RAG. What is a vector database actually, what does it do that a list of vectors in memory does not, and how would you decide whether our project needs one?"

**What a strong answer should cover:**
- A vector database stores vectors with their IDs and metadata and answers "the k nearest vectors to this one, matching this filter", using an approximate nearest neighbour index, plus the normal database jobs: inserts, updates, deletes, persistence, replication and access control
- The options form a ladder: exact search in application memory or a library, a vector extension in the database you already run (such as pgvector in Postgres), or a dedicated vector database or managed service
- The decision is sizing arithmetic: vectors x dimensions x 4 bytes of memory, and vectors x dimensions multiply-adds per exact query, against the latency target and query rate
- Exact search over tens of thousands of vectors, or over a filtered per-tenant subset, is fast and perfectly accurate; ANN indexes matter at millions of vectors or high query rates
- A separate vector store adds a second copy of your data that must be kept in sync (deletes, permission changes, updates); keeping vectors next to the rows avoids that drift
- Signals that justify a dedicated system: very large or fast-growing collections, strict latency at high QPS, heavy filtered search, built-in hybrid search, or a team that does not want to operate it

**Code / implementation expected:** Optional — the memory and compute arithmetic, or a short exact top-k loop with a filter, is a strong signal.`,
    answer: `**Target Audience:** Engineers starting a RAG or semantic search project who keep being told to "add a vector database" and want to know what that is and whether they need one yet.
**Difficulty:** Easy
**Verified with:** Node 22.22.0 and Python 3.12.3 (the sizing, filtered search and sync simulation below). The per-core speed in the sizing table is a stated assumption, not a measurement. Product facts are cited inline with the date checked (October 2026).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

You have a box of 200 recipe cards. To find "something like lasagne" you flip through all 200; it takes a minute and you never miss one. Now you have 20 million recipe cards. Flipping through all of them takes weeks, so you build a system: cards sorted into labelled drawers by type of dish, an index of which drawer holds what, someone to file new cards and pull out old ones, and a copy of the whole thing in case of fire.

A **vector database** is that system for [embeddings](/interview-question/what-are-embeddings-and-what-are-they-used-for). The interesting interview question is not "what is it" but the second half: **when do you actually need one?** For 200 cards, the filing system is pure overhead. Plenty of real projects are closer to 200 cards than 20 million, and the strongest answers show the arithmetic that tells you which one you are.

## 2. What a Vector Database Does

📌 **Interview term: vector database** — a data store whose main query is "return the k stored vectors nearest to this query vector, optionally only those matching a filter", backed by an index that answers it fast, plus the usual database duties: inserts, updates, deletes, durable storage, replication, backups and access control.

📌 **Interview term: vector index (ANN index)** — the data structure that finds near neighbours without comparing against every vector, such as HNSW or IVF. It returns *approximately* the nearest ones; how that works is in [How does similarity search work — cosine, dot product and Euclidean?](/interview-question/how-does-similarity-search-work-cosine-dot-product-and-euclidean)

📌 **Interview term: metadata (payload)** — the fields stored with each vector: document ID, tenant, language, date, access group, the chunk text. Filters run on these.

📌 **Interview term: upsert** — insert a record, or replace it if the ID already exists. Vector stores use it so re-indexing a document is one idempotent operation.

<svg class="iq-diagram" width="100%" viewBox="0 0 820 260" role="img" aria-label="Query flow: the app embeds the question, sends the vector and a filter to the vector database, which uses its ANN index and metadata to return matching IDs and text">
  <defs>
    <marker id="ai05q4-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="70" width="130" height="90" rx="10"/>
  <text class="d-text" x="85" y="108" text-anchor="middle">question</text>
  <text class="d-sub" x="85" y="134" text-anchor="middle">plus tenant</text>
  <rect class="d-box" x="200" y="70" width="150" height="90" rx="10"/>
  <text class="d-text" x="275" y="108" text-anchor="middle">embed</text>
  <text class="d-sub" x="275" y="134" text-anchor="middle">query vector</text>
  <rect class="d-box-accent" x="400" y="30" width="220" height="170" rx="12"/>
  <text class="d-text" x="510" y="62" text-anchor="middle">vector database</text>
  <rect class="d-box" x="420" y="85" width="180" height="40" rx="6"/>
  <text class="d-sub" x="510" y="110" text-anchor="middle">ANN index</text>
  <rect class="d-box" x="420" y="140" width="180" height="40" rx="6"/>
  <text class="d-sub" x="510" y="165" text-anchor="middle">metadata filter</text>
  <rect class="d-box-muted" x="670" y="70" width="130" height="90" rx="10"/>
  <text class="d-text" x="735" y="108" text-anchor="middle">top k</text>
  <text class="d-sub" x="735" y="134" text-anchor="middle">IDs and text</text>
  <path class="d-edge" d="M 154 115 L 194 115" marker-end="url(#ai05q4-arrow)"/>
  <path class="d-edge" d="M 354 115 L 394 115" marker-end="url(#ai05q4-arrow)"/>
  <path class="d-edge" d="M 624 115 L 664 115" marker-end="url(#ai05q4-arrow)"/>
</svg>

The embedding model is usually outside the database (some products can call one for you). The database receives a vector and a filter, and returns IDs, scores and the stored metadata.

## 3. The Ladder of Options

You do not have to jump straight to a dedicated product. There are three rungs:

| Rung | What it is | Good for | Cost of choosing it |
| :--- | :--- | :--- | :--- |
| 1. In-process | Vectors in an array or a library index (FAISS, hnswlib) inside your service | Small, mostly static sets; prototypes; per-request re-ranking | You handle persistence, updates and multiple instances yourself |
| 2. Extension in your database | A vector column and index in the database you already run, such as pgvector in Postgres | Most products up to millions of vectors, where vectors sit next to the rows they describe | Shares resources with your main workload; tuning is on you |
| 3. Dedicated engine or managed service | Qdrant, Pinecone, Weaviate, Milvus and others | Very large or fast-growing collections, high query rates, heavy filtered or hybrid search | A second system to run or pay for, and a second copy of the data to keep in sync |

Search engines you may already operate are another route: Elasticsearch, for example, documents a \`dense_vector\` field with HNSW-based approximate kNN (Elastic documentation, checked October 2026). The head-to-head comparison of the main options is in [pgvector vs Pinecone vs Qdrant: how do you choose a vector DB in 2025?](/interview-question/pgvector-vs-pinecone-vs-qdrant-how-do-you-choose-a-vector-db-in-2025); this page is about whether you need to climb at all.

## 4. Do the Arithmetic First

Two numbers decide most of it.

📌 **Interview term: vector memory footprint** — vectors x dimensions x bytes per value. At float32 that is 4 bytes per value. ANN indexes run fastest when vectors (and graph links) are in RAM, so this is roughly the memory bill before index overhead.

📌 **Interview term: brute-force cost** — exact search does one multiply-add per dimension per stored vector, so \`vectors x dimensions\` per query. It grows linearly with the collection.

The program works both out at 1,024 dimensions, with an explicit **assumption** that one CPU core sustains about 10 billion multiply-adds per second in a tight vectorised loop (measure your own hardware; the column scales directly with it):

~~~text
1) sizing at 1024 dims, float32, exact scan on one core
   vectors        raw size    multiply-adds/query  est. ms/query
   50,000         0.2 GB      51,200,000           5.1
   1,000,000      4.1 GB      1,024,000,000        102.4
   10,000,000     41.0 GB     10,240,000,000       1024.0
   100,000,000    409.6 GB    102,400,000,000      10240.0
~~~

Reading it:

- **50,000 vectors** fit in a fifth of a gigabyte and scan in milliseconds. An ANN index buys almost nothing; exact search is simpler and has perfect recall.
- **1 million** is about 100 ms per query on one core. Fine for an internal tool at low traffic; too slow for a user-facing search box at hundreds of queries per second. This is where an index starts to pay.
- **10 to 100 million** needs an ANN index, serious memory planning (or quantization and fewer dimensions, see [Embeddings in 2025-26: how do you choose model, dimensions, and distance?](/interview-question/embeddings-in-2025-26-how-do-you-choose-model-dimensions-and-distance)), and possibly sharding across machines.

Multiply by your query rate too: 100 ms of CPU per query at 50 queries per second is five cores busy just scanning.

### Filters often make the set small again

Most real queries are scoped: one tenant, one workspace, one product line. If a filter narrows ten million vectors to the 20,000 belonging to one customer, exact search over those is cheap and perfectly accurate. The program does exactly that with a plain loop:

~~~text
2) exact filtered search, tenant = initech, top 5
   ids 42, 678, 4846, 66, 3370   scanned 1250 of 5000   all initech: true
~~~

No index, no database, correct results, and the row it was looking for (42) is first. How to model tenants and filters properly is in [How do you scope retrieval with metadata filtering and multi-tenancy?](/interview-question/how-do-you-scope-retrieval-with-metadata-filtering-and-multi-tenancy)

## 5. The Hidden Cost: a Second Copy of Your Data

A separate vector store holds a copy of information that also lives in your main database: which documents exist, who may see them, what they say. Every change must reach both.

📌 **Interview term: sync drift** — the period (or permanent state, after a bug) where the vector store disagrees with the source of truth: a deleted document still searchable, a permission change not applied, an edited document still matching its old text.

The program simulates it. Rows live in the main database; vectors are copied to a separate store by an asynchronous sync job that reads change events:

~~~text
3) user deletes doc 42 (separate vector store, async sync)
   before the sync job runs   top 3: 42, 678, 4846    stale ids: 42
   after the sync job runs    top 3: 678, 4846, 66    stale ids: none
~~~

Until the job runs, the deleted document is the **top** result. If that document was deleted because it held something private, that is an incident, not a ranking issue. With vectors stored next to the rows and changed in the same transaction, the window does not exist:

~~~text
   same delete with vectors in the main DB (one transaction)
   immediately                top 3: 4846, 66, 3370   stale ids: none
~~~

<svg class="iq-diagram" width="100%" viewBox="0 0 820 250" role="img" aria-label="Two layouts: vectors in the main database change in one transaction, while a separate vector store is updated later by a sync worker reading an outbox">
  <defs>
    <marker id="ai05q4-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="60" width="240" height="120" rx="12"/>
  <text class="d-text" x="140" y="105" text-anchor="middle">main database</text>
  <text class="d-sub" x="140" y="135" text-anchor="middle">rows and vectors</text>
  <rect class="d-box" x="330" y="60" width="170" height="120" rx="12"/>
  <text class="d-text" x="415" y="105" text-anchor="middle">main database</text>
  <text class="d-sub" x="415" y="135" text-anchor="middle">rows and outbox</text>
  <rect class="d-box-muted" x="550" y="60" width="110" height="120" rx="12"/>
  <text class="d-text" x="605" y="105" text-anchor="middle">sync</text>
  <text class="d-sub" x="605" y="135" text-anchor="middle">worker</text>
  <rect class="d-box" x="700" y="60" width="100" height="120" rx="12"/>
  <text class="d-text" x="750" y="105" text-anchor="middle">vector</text>
  <text class="d-sub" x="750" y="135" text-anchor="middle">store</text>
  <path class="d-edge-dashed" d="M 504 120 L 544 120" marker-end="url(#ai05q4-arrow2)"/>
  <path class="d-edge-dashed" d="M 664 120 L 694 120" marker-end="url(#ai05q4-arrow2)"/>
</svg>

On the left, one transaction changes rows and vectors together. On the right, every change crosses two dashed hops before search sees it, and each hop can lag or fail.

If you do run a separate store, make the sync reliable:

📌 **Interview term: transactional outbox** — write a change event to an outbox table *in the same transaction* as the main change; a worker then applies events to the vector store and marks them done. Nothing is lost if the worker crashes, and replays are safe if the apply step is an idempotent upsert or delete.

📌 **Interview term: change data capture (CDC)** — streaming the database change log (inserts, updates, deletes) to consumers, such as the job that updates the vector store, instead of having application code write twice.

Even with both, add a read-time check against the source of truth for anything access-controlled, so a lagging delete or permission change cannot leak.

## 6. Signals That You Do Need One

| Signal | Why a dedicated system helps |
| :--- | :--- |
| Tens of millions of vectors or more, growing fast | Sharding, quantization and memory management built in |
| Strict p95 latency at high query rates | Tuned ANN serving, replicas for read throughput |
| Heavy filtered search with selective filters | Filter-aware indexes (covered in the comparison page) |
| Built-in hybrid (keyword plus vector) search | One query instead of two systems and a merge step; see [What is hybrid search and why combine BM25 with vector search?](/interview-question/what-is-hybrid-search-and-why-combine-bm25-with-vector-search) |
| Vector workload hurting the main database | Index builds and memory pressure moved off your transactional system |
| The team does not want to operate it | A managed service trades money for operations work |

If none of those are true yet, the usual recommendation is the second rung: vectors in the database you already run, next to the rows. Moving up later is a re-index, not a rewrite, if retrieval sits behind your own small interface.

## 7. Verified: Running the Code

The example **"Sizing arithmetic, a filtered exact search, and the stale result a separate vector store can return"** has three parts. Part 1 is arithmetic; the milliseconds column depends entirely on the stated 10-billion-multiply-adds-per-second assumption. Part 2 generates 5,000 seeded random 32-dimension vectors across four tenants and searches one tenant by exact dot product. Part 3 simulates two stores with in-memory maps: a \`Map\` (dict in Python) stands for the main database, a second one for the vector store, and an array stands for the outbox that a sync job drains. It leaves out network delays, failures and retries, which in a real system make the stale window longer and less predictable.

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
1) sizing at 1024 dims, float32, exact scan on one core
   vectors        raw size    multiply-adds/query  est. ms/query
   50,000         0.2 GB      51,200,000           5.1
   1,000,000      4.1 GB      1,024,000,000        102.4
   10,000,000     41.0 GB     10,240,000,000       1024.0
   100,000,000    409.6 GB    102,400,000,000      10240.0
2) exact filtered search, tenant = initech, top 5
   ids 42, 678, 4846, 66, 3370   scanned 1250 of 5000   all initech: true
3) user deletes doc 42 (separate vector store, async sync)
   before the sync job runs   top 3: 42, 678, 4846    stale ids: 42
   after the sync job runs    top 3: 678, 4846, 66    stale ids: none
   same delete with vectors in the main DB (one transaction)
   immediately                top 3: 4846, 66, 3370   stale ids: none
~~~

What the run shows:

- Exact search is milliseconds at tens of thousands of vectors and seconds at a hundred million, so the answer to "do we need an index" is in the arithmetic.
- A filtered exact search in a plain loop is correct and cheap when the filter makes the set small.
- A separate store returned a deleted document as its top hit until the sync job ran; a single-store layout never did.

## Edge Cases Worth Knowing

- **Index memory is more than raw vectors.** HNSW stores neighbour links per vector, and some systems keep a full-precision copy alongside a quantized one. Budget headroom on top of the raw size.
- **Write-heavy workloads.** Some ANN indexes are slower to update than to query, and some (IVF) degrade if the data drifts away from the clusters they were built on. Plan rebuilds.
- **Backups and restores.** A separate vector store needs its own backup story, and after a restore it must match the main database, which is another reason to keep vectors re-creatable from the source.
- **Cold starts.** An in-process index must be loaded or rebuilt on every deploy; at millions of vectors that can take minutes.

## Common Pitfalls

- **Adding a vector database on day one.** For thousands to low millions of vectors, an extension in your existing database or exact search is usually enough, with one less system to run.
- **Skipping the arithmetic.** Memory and per-query cost are two multiplications; do them before choosing infrastructure.
- **Ignoring deletes and permissions in the sync.** The stale-delete window is a data-leak risk in multi-tenant or access-controlled search.
- **Dual writes from application code.** Writing to two stores without an outbox or CDC eventually leaves them inconsistent after a crash between the two writes.
- **Treating the vector store as the source of truth.** Keep the original text and metadata in your main database so the vector store can always be rebuilt.
- **Assuming the index is accurate.** ANN results are approximate; measure recall against exact search on real queries.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">A vector database stores vectors with their IDs and metadata and answers one main query: the k nearest vectors to this one that match this filter. It does that with an <strong style="color:#ffca28;">ANN index</strong>, and also does the ordinary database jobs: upserts, deletes, persistence, replication and access control.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The ladder of options:</strong> <span style="color:#f0e2c8;">Exact search in memory or a library like FAISS; a vector extension in the database you already run, such as <strong style="color:#ffca28;">pgvector</strong>; or a dedicated engine or managed service such as Qdrant or Pinecone. I start as low on the ladder as the numbers allow.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Do the arithmetic:</strong> <span style="color:#f0e2c8;">Memory is vectors x dimensions x 4 bytes and exact search costs vectors x dimensions multiply-adds per query. At 1,024 dims, 50,000 vectors is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.2 GB</code> and about 5 ms per query on one core under my assumption; 100 million is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">409.6 GB</code> and about 10 seconds, which needs an index.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Count the second copy:</strong> <span style="color:#f0e2c8;">A separate vector store is a second copy of your data. In my simulation a deleted document still came back as the top hit until the sync job ran. Vectors stored next to the rows, in the same transaction, never drift.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When it is worth it:</strong> <span style="color:#f0e2c8;">Tens of millions of vectors, strict latency at high QPS, heavy filtered or hybrid search, or a team that prefers a managed service. Below that, Postgres with pgvector or plain exact search is simpler, and I move up only when measurements say so.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a vector database just an ANN library with a server?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The index is the core, but the database adds what a library does not: durable storage, updates and deletes without rebuilding everything, metadata filters combined with the vector search, replication, backups, multi-tenancy and access control. FAISS or hnswlib give you the index; you would build the rest yourself.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not keep vectors in the search engine we already run, such as Elasticsearch?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You can: Elasticsearch documents a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">dense_vector</code> field with HNSW-based approximate kNN search, and other general-purpose stores have added similar features. The question is the same as for any option: does it handle your scale, filters and latency, and does it avoid a second copy of the data? If you already run one of them for search, adding vectors there can be the simplest path.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep a separate vector store in sync?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Write changes to an outbox table in the same transaction as the main data, or stream them with change data capture, and have a worker apply them to the vector store idempotently. Deletes and permission changes are the dangerous ones, so also filter results against the source of truth at read time when access matters.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does a vector database cost to run?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Mostly memory: ANN indexes are fastest when vectors and graph links fit in RAM, so cost grows with vectors x dimensions x bytes plus index overhead. Quantization and fewer dimensions cut it directly. Managed services price on storage and on read and write units instead, so query volume matters too.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">At what size would you move off pgvector?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">There is no fixed number; it depends on dimensions, filters, query rate and hardware. I would move when measured p95 latency or recall at our real query rate misses the target after tuning the index, when index builds or memory become a burden on the main database, or when we need features it lacks.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Vector database | A store that answers nearest-neighbour queries with filters, plus normal database duties |
| Vector index (ANN index) | A structure such as HNSW or IVF that finds near neighbours without a full scan |
| Metadata (payload) | Fields stored with each vector, used for filtering and display |
| Upsert | Insert or replace by ID |
| Vector memory footprint | vectors x dimensions x bytes per value |
| Brute-force cost | vectors x dimensions multiply-adds per exact query |
| Sync drift | The vector store disagreeing with the source of truth |
| Transactional outbox | Change events written in the same transaction, applied later by a worker |
| Change data capture (CDC) | Streaming the database change log to consumers |

**Conclusion:** A vector database stores vectors with their metadata and answers "nearest k that match this filter" quickly with an ANN index, while also handling updates, deletes, persistence and replication. Whether you need one is arithmetic: memory is vectors x dimensions x 4 bytes and exact search costs vectors x dimensions per query, so tens of thousands of vectors (or a small filtered subset) need nothing special, while tens of millions at high query rates do. A separate store also means a second copy of your data that can drift, as the deleted-but-still-found document showed. Start with exact search or a vector extension in the database you already run, and climb the ladder when measurements, not fashion, say so.`,
    examples: [
      {
        label: `Sizing arithmetic, a filtered exact search, and the stale result a separate vector store can return`,
        variants: [
          { tech: "node", code: `// Do you need a vector database? (1) sizing arithmetic, (2) a filtered exact
// search in plain code, (3) what goes wrong when vectors live in a second store.
let seed = 11;
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

// 1) sizing: raw float32 vectors and brute-force work per query
// ASSUMPTION: one CPU core does about 10 billion multiply-adds per second in a
// tight SIMD loop. Change it to your own measurement.
const DIMS = 1024, MADDS_PER_SEC = 1e10;
console.log(\`1) sizing at \${DIMS} dims, float32, exact scan on one core\`);
console.log("   vectors        raw size    multiply-adds/query  est. ms/query");
for (const n of [50000, 1000000, 10000000, 100000000]) {
  const gb = (n * DIMS * 4) / 1e9, madds = n * DIMS, ms = (madds / MADDS_PER_SEC) * 1000;
  console.log(\`   \${n.toLocaleString("en-US").padEnd(14)} \${(gb.toFixed(1) + " GB").padEnd(11)} \${madds.toLocaleString("en-US").padEnd(20)} \${ms.toFixed(1)}\`);
}

// 2) exact search with a filter: no index, no database, just a loop
const D = 32, N = 5000, TENANTS = ["acme", "globex", "initech", "umbrella"];
const rows = [];
for (let i = 0; i < N; i++) {
  const v = []; for (let d = 0; d < D; d++) v.push(rand() - 0.5);
  rows.push({ id: i, tenant: TENANTS[i % 4], vec: v });
}
const dot = (a, b) => { let s = 0; for (let d = 0; d < D; d++) s += a[d] * b[d]; return s; };
function search(store, q, tenant, k) {
  let scanned = 0; const hits = [];
  for (const r of store.values()) {
    if (r.tenant !== tenant) continue; // the WHERE clause runs first: exact pre-filter
    scanned++; hits.push([dot(q, r.vec), r.id]);
  }
  hits.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  return { ids: hits.slice(0, k).map((h) => h[1]), scanned };
}
const query = rows[42].vec.map((x) => x + (rand() - 0.5) * 0.2); // a paraphrase of row 42 (tenant initech)
const r2 = search(new Map(rows.map((r) => [r.id, r])), query, "initech", 5);
console.log("2) exact filtered search, tenant = initech, top 5");
console.log(\`   ids \${r2.ids.join(", ")}   scanned \${r2.scanned} of \${N}   all initech: \${r2.ids.every((i) => rows[i].tenant === "initech")}\`);

// 3) two stores: rows in the main DB, vectors copied to a vector store by an async sync job
const mainDb = new Map(rows.map((r) => [r.id, r]));
const vectorStore = new Map(rows.map((r) => [r.id, r]));
const outbox = []; // change events waiting for the sync job
function deleteDoc(id, colocated) {
  mainDb.delete(id);
  if (colocated) vectorStore.delete(id); // same transaction: both or neither
  else outbox.push({ op: "delete", id }); // applied later
}
const syncJob = () => { while (outbox.length) { const e = outbox.shift(); if (e.op === "delete") vectorStore.delete(e.id); } };
const show = (label) => {
  const r = search(vectorStore, query, "initech", 3);
  const stale = r.ids.filter((id) => !mainDb.has(id));
  console.log(\`   \${label.padEnd(26)} top 3: \${r.ids.join(", ").padEnd(16)} stale ids: \${stale.length ? stale.join(", ") : "none"}\`);
};
console.log("3) user deletes doc 42 (separate vector store, async sync)");
deleteDoc(42, false); show("before the sync job runs"); syncJob(); show("after the sync job runs");
console.log("   same delete with vectors in the main DB (one transaction)");
deleteDoc(r2.ids[1], true); show("immediately");` },
          { tech: "python", code: `# Do you need a vector database? (1) sizing arithmetic, (2) a filtered exact
# search in plain code, (3) what goes wrong when vectors live in a second store.
seed = 11


def rand():
    global seed
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296


# 1) sizing: raw float32 vectors and brute-force work per query
# ASSUMPTION: one CPU core does about 10 billion multiply-adds per second in a
# tight SIMD loop. Change it to your own measurement.
DIMS, MADDS_PER_SEC = 1024, 1e10
print(f"1) sizing at {DIMS} dims, float32, exact scan on one core")
print("   vectors        raw size    multiply-adds/query  est. ms/query")
for n in [50000, 1000000, 10000000, 100000000]:
    gb = (n * DIMS * 4) / 1e9
    madds = n * DIMS
    ms = (madds / MADDS_PER_SEC) * 1000
    print(f"   {f'{n:,}'.ljust(14)} {(f'{gb:.1f}' + ' GB').ljust(11)} {f'{madds:,}'.ljust(20)} {ms:.1f}")

# 2) exact search with a filter: no index, no database, just a loop
D, N, TENANTS = 32, 5000, ["acme", "globex", "initech", "umbrella"]
rows = []
for i in range(N):
    v = [rand() - 0.5 for _ in range(D)]
    rows.append({"id": i, "tenant": TENANTS[i % 4], "vec": v})


def dot(a, b):
    s = 0.0
    for d in range(D):
        s += a[d] * b[d]
    return s


def search(store, q, tenant, k):
    scanned = 0
    hits = []
    for r in store.values():
        if r["tenant"] != tenant:
            continue  # the WHERE clause runs first: exact pre-filter
        scanned += 1
        hits.append((dot(q, r["vec"]), r["id"]))
    hits.sort(key=lambda h: (-h[0], h[1]))
    return [h[1] for h in hits[:k]], scanned


query = [x + (rand() - 0.5) * 0.2 for x in rows[42]["vec"]]  # a paraphrase of row 42 (tenant initech)
ids2, scanned2 = search({r["id"]: r for r in rows}, query, "initech", 5)
print("2) exact filtered search, tenant = initech, top 5")
all_ok = "true" if all(rows[i]["tenant"] == "initech" for i in ids2) else "false"
print(f"   ids {', '.join(map(str, ids2))}   scanned {scanned2} of {N}   all initech: {all_ok}")

# 3) two stores: rows in the main DB, vectors copied to a vector store by an async sync job
main_db = {r["id"]: r for r in rows}
vector_store = {r["id"]: r for r in rows}
outbox = []  # change events waiting for the sync job


def delete_doc(doc_id, colocated):
    del main_db[doc_id]
    if colocated:
        del vector_store[doc_id]  # same transaction: both or neither
    else:
        outbox.append({"op": "delete", "id": doc_id})  # applied later


def sync_job():
    while outbox:
        e = outbox.pop(0)
        if e["op"] == "delete":
            vector_store.pop(e["id"], None)


def show(label):
    ids, _ = search(vector_store, query, "initech", 3)
    stale = [i for i in ids if i not in main_db]
    stale_txt = ", ".join(map(str, stale)) if stale else "none"
    print(f"   {label.ljust(26)} top 3: {', '.join(map(str, ids)).ljust(16)} stale ids: {stale_txt}")


print("3) user deletes doc 42 (separate vector store, async sync)")
delete_doc(42, False)
show("before the sync job runs")
sync_job()
show("after the sync job runs")
print("   same delete with vectors in the main DB (one transaction)")
delete_doc(ids2[1], True)
show("immediately")` },
        ],
      },
    ],
  },
  {
    title: `pgvector vs Pinecone vs Qdrant: how do you choose a vector DB in 2025?`,
    difficulty: "hard",
    seoDescription: `Compare pgvector, Pinecone and Qdrant on filtered search, multi-tenancy, scale, cost and operations, and prove the choice with a recall and latency test.`,
    description: `**Question presented to candidate:**
"We run Postgres today and are adding RAG over customer documents, with thousands of tenants. The team is split between pgvector, Pinecone and Qdrant. How would you make that decision, and what would you test before committing?"

**What a strong answer should cover:**
- The three are different shapes: pgvector is an extension inside the Postgres you already run (vectors next to rows, SQL filters, transactions); Pinecone is a fully managed service billed on usage; Qdrant is an open-source engine you self-host or buy as a managed cloud, with rich payload filtering and quantization
- Filtered search is the real differentiator: post-filtering a small ANN candidate list returns too few results for selective filters; know pgvector \`ef_search\` and the iterative index scans added in 0.8.0, Qdrant payload indexes and filter-aware HNSW with a query planner, and Pinecone filtering integrated into retrieval
- Multi-tenancy design per system: Postgres row-level security, partitions or partial indexes; Pinecone namespaces; Qdrant tenant payload indexes and per-tenant graphs
- Scale and cost levers: dimension limits (pgvector HNSW \`vector\` up to 2,000, \`halfvec\` up to 4,000), memory and quantization, managed usage pricing versus servers you run
- Operations and consistency: one database and one backup versus a second system to sync; who is on call
- A proof of concept on your own data: recall@k against exact search, p95 latency at target QPS with real filters, ingest and delete behaviour, cost at projected scale

**Clarifying questions expected:**
- How many vectors and tenants, how uneven are tenant sizes, and how fast does it grow?
- What latency and query rate must we meet, and how selective are the typical filters?
- Do we have the people to operate another stateful system, and are there data-residency rules?

**Code / implementation expected:** Optional — explaining or sketching the filtered query (for example the pgvector SQL with an HNSW index and iterative scan) and a recall measurement is a strong signal.`,
    answer: `**Target Audience:** Engineers and tech leads who have decided they need vector search and must pick between an extension in Postgres, a managed service and an open-source engine, then defend the choice.
**Difficulty:** Hard
**Verified with:** Node 22.22.0 and Python 3.12.3 (the filtered-search simulation below). Product behaviour, limits and pricing models are cited inline with the source and the date checked (October 2026). The title says 2025; the facts here are as found in October 2026, and all three products ship changes several times a year, so re-check versions before relying on any one detail.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All program output shown was produced by actually running the example; the **Verified** section quotes it in full.

## 1. Why This Even Matters — A Story First

Your company needs somewhere to keep its tools. Option one: add a well-organised cupboard to the workshop you already have. Option two: rent a fully serviced storage unit across town, where staff fetch things for you and charge per trip. Option three: buy a purpose-built tool store you can put in your own yard, or pay its makers to run one for you.

All three can work. The cupboard is cheapest and everything is in one place, but it shares space with everything else in the workshop. The serviced unit needs no work from you, but every tool now lives in two places and you pay per trip. The purpose-built store is the most capable, and someone has to look after it.

That is **pgvector**, **Pinecone** and **Qdrant**. Whether you need a vector database at all is the sibling question, [What is a vector database and when do you actually need one?](/interview-question/what-is-a-vector-database-and-when-do-you-actually-need-one); this page assumes you need vector search and must pick where it lives. The interviewer is not looking for brand loyalty. They want to hear which properties actually decide it (filtered search, tenancy, scale, operations, cost) and how you would prove the choice on your own data.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How many vectors now and in a year, at what dimensions? | Sets memory, index build time and whether one Postgres node is enough |
| How many tenants, and how uneven are their sizes? | A few huge tenants and many tiny ones need different index strategies |
| How selective are typical filters (tenant, access group, date)? | Selective filters break naive post-filtering; this is the biggest technical differentiator |
| What p95 latency and query rate must we meet? | Decides whether the vector workload can share the transactional database |
| Who operates it, and is there a data-residency rule? | A managed service trades operations work for data leaving your environment |
| Do we need keyword plus vector (hybrid) search? | Some options do it in one query; others need a second system |

## 3. Three Different Shapes

📌 **Interview term: pgvector** — an open-source Postgres extension that adds vector types (\`vector\`, \`halfvec\`, \`bit\`, \`sparsevec\`), distance operators and two ANN index types (HNSW and IVFFlat). Vectors live in ordinary tables, next to the rows they describe, inside your transactions and backups.

📌 **Interview term: Pinecone** — a fully managed vector database service. Its serverless indexes bill on read units, write units and storage (Pinecone docs, "Understanding cost", checked October 2026), and you never see a server.

📌 **Interview term: Qdrant** — an open-source vector search engine (Apache 2.0 licence, per its GitHub repository) that you can self-host or use as a managed cloud. It stores vectors with a JSON **payload** and is known for payload filtering, quantization options and multi-tenancy controls.

| Property | pgvector | Pinecone | Qdrant |
| :--- | :--- | :--- | :--- |
| Where it runs | Inside your Postgres (self-run or a managed Postgres) | Vendor-managed only | Self-hosted, or the vendor managed cloud |
| Data copies | One: vectors next to rows | Two: your DB plus Pinecone | Two: your DB plus Qdrant |
| Filters | Any SQL \`WHERE\`, joins, row-level security | Metadata filter language inside the query | Payload filter language with payload indexes |
| Consistency with your data | Same transaction | Sync pipeline | Sync pipeline |
| Index types | HNSW, IVFFlat | Managed, not user-chosen | HNSW with filter-aware links |
| Who operates it | Your database team | The vendor | You, or the vendor on the cloud plan |
| Cost model | The Postgres capacity you already pay for, plus more | Usage: read and write units plus storage | Your servers, or cloud plan pricing |

## 4. Filtered Search Is the Real Differentiator

Almost every production RAG query has a condition: this tenant, this access group, these languages. The naive way to combine a condition with an ANN index is to fetch candidates from the index and then apply the filter.

📌 **Interview term: post-filtering** — run the ANN search first, take its candidate list (in pgvector HNSW, about \`hnsw.ef_search\` rows, 40 by default), then apply the \`WHERE\` clause. If the filter is selective, few or none of those candidates survive.

📌 **Interview term: pre-filtering** — find the matching rows first (with a B-tree or payload index), then compute distances only over them. Exact and correct; cost grows with the number of matching rows.

📌 **Interview term: filter-aware (in-graph) filtering** — the index walk itself skips non-matching nodes and keeps going until it has enough matches, sometimes with extra graph links so the walk does not get stuck when many nodes are excluded.

<svg class="iq-diagram" width="100%" viewBox="0 0 800 220" role="img" aria-label="Post filtering: the index returns 40 candidates, the filter keeps only those that match, and a selective filter leaves fewer than 10">
  <defs>
    <marker id="ai05q5-arrow" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="160" height="100" rx="10"/>
  <text class="d-text" x="100" y="102" text-anchor="middle">ANN index</text>
  <text class="d-sub" x="100" y="128" text-anchor="middle">all tenants</text>
  <rect class="d-box" x="240" y="60" width="160" height="100" rx="10"/>
  <text class="d-text" x="320" y="102" text-anchor="middle">40 candidates</text>
  <text class="d-sub" x="320" y="128" text-anchor="middle">nearest overall</text>
  <rect class="d-box" x="460" y="60" width="140" height="100" rx="10"/>
  <text class="d-text" x="530" y="102" text-anchor="middle">WHERE</text>
  <text class="d-sub" x="530" y="128" text-anchor="middle">tenant filter</text>
  <rect class="d-box-accent" x="660" y="60" width="120" height="100" rx="10"/>
  <text class="d-text" x="720" y="102" text-anchor="middle">0 to 3</text>
  <text class="d-sub" x="720" y="128" text-anchor="middle">rows left</text>
  <path class="d-edge" d="M 184 110 L 234 110" marker-end="url(#ai05q5-arrow)"/>
  <path class="d-edge" d="M 404 110 L 454 110" marker-end="url(#ai05q5-arrow)"/>
  <path class="d-edge" d="M 604 110 L 654 110" marker-end="url(#ai05q5-arrow)"/>
</svg>

Nothing errors. The query just returns 2 rows instead of 10, and the RAG answer is built on whatever little survived.

The example measures four strategies for "top 10 WHERE filter" as the filter gets more selective. Its "index" returns candidates in exact nearest-first order, 40 at a time, so it is a *best-case* ANN index: every loss comes from the filtering strategy, not from approximation. Selected rows (the full output is in the Verified section):

~~~text
filter        strategy      avg returned  recall   avg vectors touched
10% of rows   post-filter   3.4            34%    40.0
10% of rows   iterative     10.0          100%    124.0
1% of rows    post-filter   0.3             3%    40.0
1% of rows    iterative     10.0          100%    1084.0
1% of rows    pre-filter    10.0          100%    60.0
0.2% of rows  iterative     3.2            32%    2000.0
0.2% of rows  pre-filter    10.0          100%    12.0
~~~

Three lessons:

1. **Post-filtering is fine for broad filters and broken for selective ones.** At 50% it returned all 10; at 1% it returned 0.3 on average.
2. **Iterative scanning fixes it, at a cost, up to a cap.** At 1% it had to walk 1,084 candidates; at 0.2% it hit its 2,000-candidate cap and returned 3.2.
3. **For very selective filters, pre-filtering (or a separate index per value) is both correct and cheapest.** 12 matching rows is 12 distance calculations.

### How each product handles it

**pgvector.** Version 0.8.0 (October 2024) added **iterative index scans**: with \`hnsw.iterative_scan\` set to \`strict_order\` or \`relaxed_order\` (it is off by default), the scan continues until enough rows pass the filter, bounded by \`hnsw.max_scan_tuples\` (default 20,000) and \`hnsw.scan_mem_multiplier\` (pgvector documentation and changelog, checked October 2026). For very selective filters the documented alternatives are a B-tree index on the filter column so the planner can prefilter, partial HNSW indexes per value, or table partitioning by the filter key.

~~~sql
-- not run here; operators and settings per the pgvector documentation (checked October 2026)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE chunks (id bigserial PRIMARY KEY, tenant_id bigint NOT NULL, body text, embedding vector(1024));
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON chunks (tenant_id);

SET hnsw.ef_search = 100;                 -- bigger candidate list per step
SET hnsw.iterative_scan = relaxed_order;  -- keep scanning until LIMIT is satisfied
SELECT id, body, 1 - (embedding <=> $1) AS cosine
FROM chunks WHERE tenant_id = $2
ORDER BY embedding <=> $1 LIMIT 10;
~~~

**Qdrant.** Filtering relies on **payload indexes** on the filtered fields; Qdrant builds extra HNSW links for indexed fields so the graph stays navigable under a filter, and a per-segment query planner estimates how many points match and can choose a payload-index lookup or a full scan instead of the graph when few points match. Qdrant 1.16 added ACORN as a further option for filtered search (Qdrant docs and articles on filterable HNSW and ACORN, checked October 2026). Qdrant also notes that adding a payload index after the HNSW graph is built can make filtered search less efficient until the graph is rebuilt.

**Pinecone.** Pinecone describes its metadata filtering as **single-stage**: the filter is applied during retrieval rather than before or after it (Pinecone learning article "The Missing WHERE Clause in Vector Search", and the Ingber and Liberty ICML 2025 paper on filtering in Pinecone serverless, checked October 2026). These are the vendor descriptions; the internal mechanism is not something you can inspect, so verify recall under your own filters in the proof of concept.

## 5. Multi-Tenancy

📌 **Interview term: multi-tenancy (for vector search)** — serving many customers from one system so that each query only ever sees one customer data, without one large customer slowing down the others.

| Approach | pgvector | Pinecone | Qdrant |
| :--- | :--- | :--- | :--- |
| Logical isolation | \`tenant_id\` column plus Postgres row-level security | **Namespaces**: each query targets one namespace (or none) | Tenant field with a keyword payload index flagged \`is_tenant\` |
| Physical separation for big tenants | Partitions or partial indexes per large tenant | Namespace per tenant; separate indexes if needed | Per-tenant HNSW graphs (\`payload_m\` with global \`m=0\`); tiered multitenancy in 1.16 promotes large tenants to dedicated shards |
| Cost link | Shared Postgres capacity | A query costs about 1 read unit per GB of the namespace it searches, minimum 0.25 (Pinecone cost docs) | Your servers or cloud plan |

Sources: Pinecone limits and cost documentation; Qdrant multitenancy guide and 1.16 release post (checked October 2026). Note Qdrant warns that disabling the global graph (\`m=0\`) makes queries *without* a tenant filter slow, and that \`is_tenant\` is a storage and performance hint, not access control.

The Pinecone cost link has a design consequence: searching one tenant namespace is cheap when tenants are small, and searching one huge shared namespace with a filter costs as much as the whole namespace size. Data modelling is covered in [How do you scope retrieval with metadata filtering and multi-tenancy?](/interview-question/how-do-you-scope-retrieval-with-metadata-filtering-and-multi-tenancy)

## 6. Scale, Memory and Dimensions

- **pgvector dimension limits.** HNSW indexes support \`vector\` up to 2,000 dimensions, \`halfvec\` up to 4,000, \`bit\` up to 64,000, and \`sparsevec\` up to 1,000 non-zero elements (pgvector documentation, checked October 2026). A 3,072-dimension model is indexed with an expression index on \`embedding::halfvec(3072)\`, or truncated if it is a Matryoshka model; see [Embeddings in 2025-26: how do you choose model, dimensions, and distance?](/interview-question/embeddings-in-2025-26-how-do-you-choose-model-dimensions-and-distance)
- **Memory.** All three are fastest when the working set is in RAM. In Postgres, HNSW builds want generous \`maintenance_work_mem\`, and the vector workload competes with transactional queries for the same buffer cache.
- **Quantization.** Qdrant documents scalar (int8, 4x), binary (up to 32x) and other quantization methods with rescoring against original vectors (Qdrant quantization docs, checked October 2026). pgvector offers \`halfvec\` (2 bytes per value) and \`bit\` types with which you can build binary-plus-rescore queries yourself. Pinecone manages storage internally.
- **Throughput limits.** Pinecone documents per-index read-unit rate limits for serverless (2,000 query read units per second per index at the time checked) and per-namespace upsert limits; check the current limits page for your plan.

## 7. Hybrid Search

If you need keyword and vector search together ([Hybrid search: why combine BM25 with vectors and how does RRF work?](/interview-question/hybrid-search-why-combine-bm25-with-vectors-and-how-does-rrf-work)):

- **pgvector:** Postgres has built-in full-text search, so both queries run in one database and you merge them in SQL or code (for example with reciprocal rank fusion). The \`sparsevec\` type can also hold learned sparse vectors.
- **Pinecone:** supports sparse-dense vectors in one index, and querying with sparse values requires the index to use the \`dotproduct\` metric (Pinecone hybrid search docs, checked October 2026).
- **Qdrant:** its Query API supports dense and sparse vectors in one request with fusion such as RRF, added in version 1.10 (Qdrant 1.10 release notes and hybrid query docs, checked October 2026).

## 8. Operations, Consistency and Cost

The non-feature questions often decide it:

📌 **Interview term: operational surface** — everything someone must run, monitor, upgrade, back up and be on call for. pgvector adds an extension to a system you already operate. Self-hosted Qdrant adds a new stateful cluster. Pinecone adds none, but adds a vendor dependency and a sync pipeline.

📌 **Interview term: total cost of ownership (TCO)** — infrastructure or usage bills *plus* the engineering time to run, tune and integrate. A managed service can be cheaper overall at moderate scale even when its bill is higher, and more expensive at very high, steady query volumes.

The consistency point from the sibling page applies directly: with Pinecone or Qdrant your documents live in two places, and deletes and permission changes must reach the vector store through an outbox or change data capture, with a read-time check for access-controlled data. With pgvector they change in one transaction.

## 9. A Decision Path

<svg class="iq-diagram" width="100%" viewBox="0 0 800 400" role="img" aria-label="Decision path: already on Postgres at moderate scale leads to pgvector; no team to run infrastructure leads to Pinecone; large scale with complex filters or self-hosting needs leads to Qdrant">
  <defs>
    <marker id="ai05q5-arrow2" markerWidth="8" markerHeight="8" refX="5" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="250" y="20" width="300" height="70" rx="10"/>
  <text class="d-text" x="400" y="50" text-anchor="middle">on Postgres and</text>
  <text class="d-text" x="400" y="74" text-anchor="middle">numbers fit one node?</text>
  <rect class="d-box-accent" x="40" y="160" width="200" height="70" rx="10"/>
  <text class="d-text" x="140" y="200" text-anchor="middle">pgvector</text>
  <rect class="d-box-muted" x="420" y="160" width="300" height="70" rx="10"/>
  <text class="d-text" x="570" y="190" text-anchor="middle">want zero ops and</text>
  <text class="d-text" x="570" y="214" text-anchor="middle">data may leave?</text>
  <rect class="d-box-accent" x="330" y="310" width="180" height="70" rx="10"/>
  <text class="d-text" x="420" y="350" text-anchor="middle">Pinecone</text>
  <rect class="d-box-accent" x="580" y="310" width="180" height="70" rx="10"/>
  <text class="d-text" x="670" y="350" text-anchor="middle">Qdrant</text>
  <path class="d-edge" d="M 330 94 L 180 154" marker-end="url(#ai05q5-arrow2)"/>
  <text class="d-sub" x="215" y="115" text-anchor="middle">yes</text>
  <path class="d-edge" d="M 470 94 L 550 154" marker-end="url(#ai05q5-arrow2)"/>
  <text class="d-sub" x="545" y="115" text-anchor="middle">no</text>
  <path class="d-edge" d="M 520 234 L 440 304" marker-end="url(#ai05q5-arrow2)"/>
  <text class="d-sub" x="445" y="265" text-anchor="middle">yes</text>
  <path class="d-edge" d="M 620 234 L 660 304" marker-end="url(#ai05q5-arrow2)"/>
  <text class="d-sub" x="680" y="265" text-anchor="middle">no</text>
</svg>

This is a starting point, not a verdict: the proof of concept below can overturn it. Other engines (Weaviate, Milvus, Elasticsearch, managed vector features in cloud databases) fit the same questions.

| Situation | Leaning | Why |
| :--- | :--- | :--- |
| Postgres shop, up to a few million vectors, many small tenants | pgvector | One copy of the data, SQL filters and row-level security, no new system |
| Small team, spiky traffic, no appetite for running search infrastructure | Pinecone | Fully managed, usage-based; accept the sync pipeline and vendor dependency |
| Large collection, complex selective filters, need quantization or self-hosting for cost or residency | Qdrant | Payload indexes, tenant-aware indexing, quantization, run anywhere |
| Vector workload is starting to hurt the transactional database | Qdrant or Pinecone | Move the load off Postgres, keep Postgres as the source of truth |

### The proof of concept that actually decides it

1. **Your data, your filters.** Load a realistic sample (or all) of your vectors with real metadata, including your largest and smallest tenants.
2. **Recall@10 against exact search** for a few hundred real queries, *with* their filters. This is where post-filtering problems appear.
3. **p95 and p99 latency at target QPS**, under concurrent ingest.
4. **Updates and deletes.** Delete a document and check how quickly it disappears from results.
5. **Cost at projected scale**: instance sizes for pgvector or self-hosted Qdrant, read and write units plus storage for Pinecone, plus the people time.

Keep retrieval behind a small interface in your code and the source text in your main database, so a later move is a re-index and a cutover.

## 10. Verified: Running the Code

The example **"Filtered top-10 search: post-filter vs iterative scan vs pre-filter vs partition"** generates 6,000 seeded random 16-dimension vectors and 10 queries. Filters are defined by row ID so each matches a fixed share of rows (50%, 10%, 1%, 0.2%). For each query it computes the exact nearest-first order once and uses it as a perfect index that returns 40 candidates at a time (EF = 40, like pgvector default \`ef_search\`). Post-filter takes 40 and filters; iterative keeps taking 40 more until 10 match or 2,000 candidates are seen (a scaled-down stand-in for \`hnsw.max_scan_tuples\`); pre-filter computes exact distances over only the matching rows; partition stands for a separate index per filter value (a namespace, partial index or per-tenant graph), touching at most 40 vectors inside it. Real indexes are approximate, which would lower every recall figure somewhat; the relative behaviour is what the run shows.

\`node main.js\` and \`python3.12 main.py\` both print exactly this:

~~~text
6000 vectors, top 10, EF 40, iterative cap 2000, 10 queries
filter        strategy      avg returned  recall   avg vectors touched
50% of rows   post-filter   10.0          100%    40.0
50% of rows   iterative     10.0          100%    40.0
50% of rows   pre-filter    10.0          100%    3000.0
50% of rows   partition     10.0          100%    40.0
10% of rows   post-filter   3.4            34%    40.0
10% of rows   iterative     10.0          100%    124.0
10% of rows   pre-filter    10.0          100%    600.0
10% of rows   partition     10.0          100%    40.0
1% of rows    post-filter   0.3             3%    40.0
1% of rows    iterative     10.0          100%    1084.0
1% of rows    pre-filter    10.0          100%    60.0
1% of rows    partition     10.0          100%    40.0
0.2% of rows  post-filter   0.1             1%    40.0
0.2% of rows  iterative     3.2            32%    2000.0
0.2% of rows  pre-filter    10.0          100%    12.0
0.2% of rows  partition     10.0          100%    12.0
~~~

What the run shows:

- Post-filtering returns 10 of 10 at a 50% filter, 3.4 at 10%, 0.3 at 1% and 0.1 at 0.2%, with no error at any point.
- Iterative scanning restores full results until it hits its cap; the work it does grows as the filter gets more selective.
- Pre-filtering and per-value partitions are exact and cheap exactly where post-filtering is worst, which is why tenant-scoped indexes and planners that switch strategy matter.

## Edge Cases Worth Knowing

- **Relaxed ordering.** pgvector \`relaxed_order\` may return results slightly out of distance order for better recall; re-sort the final rows if exact order matters.
- **One giant tenant.** A tenant with 40% of all rows behaves like an unfiltered search inside its own partition; give it its own index or shard.
- **Indexes added late.** In Qdrant, payload indexes created after the graph may not get filter-aware links until a rebuild; in Postgres, an IVFFlat index built on an empty table clusters badly.
- **Version drift.** Managed Postgres providers may lag pgvector releases (iterative scans need 0.8.0 or later); check the version your provider runs.
- **Metric fixed at creation.** The Qdrant collection distance and the pgvector index operator class are chosen when the collection or index is created, and Pinecone takes the metric when the index is created (we found no documented way to change it afterwards, so plan for a new index). Changing the metric means rebuilding.

## Common Pitfalls

- **Choosing on benchmarks without filters.** Unfiltered QPS charts say nothing about "top 10 for this tenant", which is most of your traffic.
- **Trusting default \`ef_search\` with selective filters.** pgvector returns fewer rows than \`LIMIT\` without warning; enable iterative scans or prefilter.
- **Forgetting the second copy.** Pinecone and Qdrant need a reliable sync for deletes and permission changes; plan the outbox or CDC before launch.
- **One shared namespace for all tenants in Pinecone.** Each query pays for the whole namespace size; per-tenant namespaces keep both cost and blast radius down.
- **Ignoring dimension limits.** A 3,072-dimension model cannot use a pgvector HNSW index on the \`vector\` type; plan \`halfvec\` or truncation.
- **No exit plan.** Without a retrieval interface and source data in your main database, the first migration becomes a rewrite.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Three different shapes:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">pgvector</strong> is an extension inside the Postgres we already run, so vectors sit next to rows with SQL filters and transactions. <strong style="color:#ffca28;">Pinecone</strong> is a fully managed service billed on usage. <strong style="color:#ffca28;">Qdrant</strong> is an open-source engine we can self-host or buy as a managed cloud. The choice is as much about operations as about features.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Filters decide it:</strong> <span style="color:#f0e2c8;">Most of our queries are top 10 for one tenant. If a filter is applied after a small candidate list it silently returns too few rows: in my simulation, with 40 candidates and a 1% filter, post-filtering returned <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">0.3</code> of 10 results. pgvector 0.8 added iterative index scans, Qdrant has payload indexes and a filter-aware planner, Pinecone filters inside retrieval.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Tenancy design:</strong> <span style="color:#f0e2c8;">In Postgres I would use a tenant column with row-level security, plus partitions or partial indexes for the largest tenants. Pinecone gives one namespace per tenant; Qdrant has a tenant payload index and can build per-tenant graphs. Uneven tenant sizes matter more than the total count.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Scale and cost:</strong> <span style="color:#f0e2c8;">I check the limits that bite: pgvector HNSW indexes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">vector</code> up to 2,000 dimensions and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">halfvec</code> up to 4,000; memory grows with vectors x dimensions; quantization cuts it. Then I compare usage pricing against servers we run, at our projected volume.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Prove it:</strong> <span style="color:#f0e2c8;">Default for a Postgres shop at moderate scale is pgvector, because there is no second copy to sync. Before committing I run a proof of concept on our data: <strong style="color:#ffca28;">recall@10</strong> against exact search with real filters, p95 latency at target QPS, delete and update behaviour, and projected monthly cost. The numbers, not the hype, pick the winner.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does post-filtering lose results, and how does pgvector fix it?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An HNSW scan hands back about <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ef_search</code> candidates (40 by default) before the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">WHERE</code> clause runs, so if only 1% of rows match, almost none of the 40 survive. pgvector 0.8.0 added iterative index scans: with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hnsw.iterative_scan</code> set to <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">strict_order</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">relaxed_order</code> it keeps scanning until enough rows pass, capped by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hnsw.max_scan_tuples</code>. For very selective filters a B-tree prefilter, a partial index or partitioning works better.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you do multi-tenancy in each?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Postgres: a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">tenant_id</code> column, row-level security, and partitions or partial indexes for big tenants. Pinecone: one namespace per tenant, since a query targets a single namespace, which also keeps the read cost proportional to that tenant size. Qdrant: one collection with a keyword payload index on the tenant field marked as a tenant, optionally per-tenant HNSW graphs; Qdrant 1.16 added tiered multitenancy to promote large tenants to their own shards.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you pick Pinecone?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When the team does not want to run a stateful search system, traffic is spiky or hard to predict, and the corpus is large enough that tuning Postgres would become a project. You accept a second copy of the data and a sync pipeline, vendor pricing on read and write units, and data leaving your environment.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you pick Qdrant over pgvector?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">When vector search is a core workload that should not compete with the transactional database, the collection is large, filters are complex and selective, and you want controls such as quantization, on-disk storage and per-tenant indexing, while keeping the option to self-host for cost or data-residency reasons.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you de-risk the choice?</span>
</div>

<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put retrieval behind a small interface in your code, so the store is swappable, and keep the source text and metadata in your main database so any vector store can be rebuilt by re-indexing. Then a migration is a backfill and a cutover rather than a rewrite.</span>
</div>


</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| pgvector | Postgres extension adding vector types, distance operators and HNSW and IVFFlat indexes |
| Pinecone | Fully managed vector database service billed on read units, write units and storage |
| Qdrant | Open-source vector search engine, self-hosted or managed, with payload filtering and quantization |
| Post-filtering | Apply the filter after the ANN candidate list; loses results under selective filters |
| Pre-filtering | Find matching rows first, then compute distances over them |
| Filter-aware (in-graph) filtering | The index walk skips non-matching nodes and continues until it has enough |
| Multi-tenancy | Many customers in one system, each query seeing only one customer data |
| Operational surface | Everything someone must run, monitor, upgrade and be on call for |
| Total cost of ownership (TCO) | Bills plus the engineering time to run and integrate the system |

**Conclusion:** pgvector, Pinecone and Qdrant are three different shapes: an extension inside the Postgres you already run, a fully managed usage-billed service, and an open-source engine you host or rent. The deciding questions are how they handle selective filters (post-filtering silently drops results, which pgvector iterative scans, Qdrant payload indexes and planner, and Pinecone single-stage filtering each address), how they isolate tenants of very different sizes, the dimension, memory and cost limits at your scale, and whether you want to operate another stateful system and keep a second copy of your data in sync. A Postgres shop at moderate scale usually starts with pgvector; a team that wants zero operations leans to Pinecone; large, filter-heavy or self-hosted workloads lean to Qdrant. Then a proof of concept on your own data, measuring filtered recall@10, p95 latency at target QPS, deletes and cost, makes the final call.`,
    examples: [
      {
        label: `Filtered top-10 search: post-filter vs iterative scan vs pre-filter vs partition`,
        variants: [
          { tech: "node", code: `// Filtered vector search: four strategies and what each returns for "top 10
// WHERE <filter>" as the filter gets more selective. The "index" here returns
// candidates in exact nearest-first order, EF at a time: a best-case ANN index,
// so every loss below comes from the filter strategy, not from approximation.
let seed = 2025;
const rand = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const D = 16, N = 6000, K = 10, EF = 40, MAX_SCAN = 2000, QUERIES = 10;

const pts = [];
for (let i = 0; i < N; i++) { const v = []; for (let d = 0; d < D; d++) v.push(rand() - 0.5); pts.push(v); }
const FILTERS = [
  ["50% of rows", (i) => i % 2 === 0],
  ["10% of rows", (i) => i % 10 === 3],
  ["1% of rows", (i) => i % 100 === 7],
  ["0.2% of rows", (i) => i % 500 === 7],
];
const dist2 = (a, b) => { let s = 0; for (let d = 0; d < D; d++) { const t = a[d] - b[d]; s += t * t; } return s; };
const qs = [];
for (let j = 0; j < QUERIES; j++) { const v = []; for (let d = 0; d < D; d++) v.push(rand() - 0.5); qs.push(v); }

function strategies(q, match) {
  const all = pts.map((p, i) => [dist2(q, p), i]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const truth = all.filter(([, i]) => match(i)).slice(0, K).map((x) => x[1]);
  const out = {};
  // post-filter: take EF nearest candidates, then apply WHERE
  out.post = { ids: all.slice(0, EF).filter(([, i]) => match(i)).slice(0, K).map((x) => x[1]), touched: EF };
  // iterative scan: keep pulling EF more until K matches or MAX_SCAN candidates seen
  let seen = 0; const got = [];
  while (got.length < K && seen < MAX_SCAN && seen < N) {
    for (const [, i] of all.slice(seen, seen + EF)) if (match(i) && got.length < K) got.push(i);
    seen += EF;
  }
  out.iter = { ids: got, touched: seen };
  // pre-filter: find matching rows first (a B-tree or payload index), then exact distance on them
  const subset = all.filter(([, i]) => match(i));
  out.pre = { ids: subset.slice(0, K).map((x) => x[1]), touched: subset.length };
  // partition: a separate index per filter value (namespace, partial index, per-tenant graph)
  out.part = { ids: subset.slice(0, K).map((x) => x[1]), touched: Math.min(EF, subset.length) };
  return { truth, out };
}

console.log(\`\${N} vectors, top \${K}, EF \${EF}, iterative cap \${MAX_SCAN}, \${QUERIES} queries\`);
console.log("filter        strategy      avg returned  recall   avg vectors touched");
const NAMES = { post: "post-filter", iter: "iterative", pre: "pre-filter", part: "partition" };
for (const [label, match] of FILTERS) {
  const acc = {};
  for (const k of Object.keys(NAMES)) acc[k] = { ret: 0, hit: 0, touched: 0 };
  for (const q of qs) {
    const { truth, out } = strategies(q, match);
    const t = new Set(truth);
    for (const k of Object.keys(NAMES)) {
      acc[k].ret += out[k].ids.length; acc[k].touched += out[k].touched;
      acc[k].hit += out[k].ids.filter((i) => t.has(i)).length;
    }
  }
  for (const k of Object.keys(NAMES)) {
    const a = acc[k];
    console.log(\`\${label.padEnd(14)}\${NAMES[k].padEnd(14)}\${(a.ret / QUERIES).toFixed(1).padEnd(14)}\${((100 * a.hit) / (QUERIES * K)).toFixed(0).padStart(3)}%    \${(a.touched / QUERIES).toFixed(1)}\`);
  }
}` },
          { tech: "python", code: `# Filtered vector search: four strategies and what each returns for "top 10
# WHERE <filter>" as the filter gets more selective. The "index" here returns
# candidates in exact nearest-first order, EF at a time: a best-case ANN index,
# so every loss below comes from the filter strategy, not from approximation.
seed = 2025


def rand():
    global seed
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296


D, N, K, EF, MAX_SCAN, QUERIES = 16, 6000, 10, 40, 2000, 10

pts = [[rand() - 0.5 for _ in range(D)] for _ in range(N)]
FILTERS = [
    ("50% of rows", lambda i: i % 2 == 0),
    ("10% of rows", lambda i: i % 10 == 3),
    ("1% of rows", lambda i: i % 100 == 7),
    ("0.2% of rows", lambda i: i % 500 == 7),
]


def dist2(a, b):
    s = 0.0
    for d in range(D):
        t = a[d] - b[d]
        s += t * t
    return s


qs = [[rand() - 0.5 for _ in range(D)] for _ in range(QUERIES)]


def strategies(q, match):
    everything = sorted(((dist2(q, p), i) for i, p in enumerate(pts)), key=lambda x: (x[0], x[1]))
    truth = [i for _, i in everything if match(i)][:K]
    out = {}
    # post-filter: take EF nearest candidates, then apply WHERE
    out["post"] = ([i for _, i in everything[:EF] if match(i)][:K], EF)
    # iterative scan: keep pulling EF more until K matches or MAX_SCAN candidates seen
    seen, got = 0, []
    while len(got) < K and seen < MAX_SCAN and seen < N:
        for _, i in everything[seen:seen + EF]:
            if match(i) and len(got) < K:
                got.append(i)
        seen += EF
    out["iter"] = (got, seen)
    # pre-filter: find matching rows first (a B-tree or payload index), then exact distance on them
    subset = [i for _, i in everything if match(i)]
    out["pre"] = (subset[:K], len(subset))
    # partition: a separate index per filter value (namespace, partial index, per-tenant graph)
    out["part"] = (subset[:K], min(EF, len(subset)))
    return truth, out


print(f"{N} vectors, top {K}, EF {EF}, iterative cap {MAX_SCAN}, {QUERIES} queries")
print("filter        strategy      avg returned  recall   avg vectors touched")
NAMES = {"post": "post-filter", "iter": "iterative", "pre": "pre-filter", "part": "partition"}
for label, match in FILTERS:
    acc = {k: {"ret": 0, "hit": 0, "touched": 0} for k in NAMES}
    for q in qs:
        truth, out = strategies(q, match)
        t = set(truth)
        for k in NAMES:
            ids, touched = out[k]
            acc[k]["ret"] += len(ids)
            acc[k]["touched"] += touched
            acc[k]["hit"] += len([i for i in ids if i in t])
    for k, name in NAMES.items():
        a = acc[k]
        recall = f"{100 * a['hit'] / (QUERIES * K):.0f}".rjust(3)
        print(f"{label.ljust(14)}{name.ljust(14)}{f'{a['ret'] / QUERIES:.1f}'.ljust(14)}{recall}%    {a['touched'] / QUERIES:.1f}")` },
        ],
      },
    ],
  },
];

export default augments;
