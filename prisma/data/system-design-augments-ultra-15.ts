/**
 * SYSTEM DESIGN ULTRA — batch 15: Classic designs II: feeds and media. Every example was run by
 * scripts/verify-variant-examples.ts (node, python, go, java); quoted output is that run's output.
 */
import type { SystemDesignUltraAugment } from "./system-design-augments.types";

const augments: SystemDesignUltraAugment[] = [
  {
    title: `How would you design a news feed system?`,
    difficulty: "hard",
    seoDescription: `Design a ranked news feed: candidate generation, multi-stage ranking, snapshot pagination, seen-state and hydration, with capacity math and a verified run.`,
    description: `**Question presented to candidate:**
"Design the home news feed for a social network like Facebook or LinkedIn. People follow friends, pages and groups, and when they open the app they should see the most relevant posts first, not just the newest. Assume a few hundred million daily users."

**What a strong answer should cover:**
- Requirements and a capacity estimate: feed requests per second at peak, candidates per request, and why scoring every candidate with a heavy model is unaffordable
- The pipeline: **candidate generation** (fan-out or pull from the people and pages you follow), **multi-stage ranking** (a cheap filter then a heavier model), then **filtering** (privacy, blocks, already seen) and **hydration** of post ids into full posts
- Why a ranked feed cannot use offset pagination or a plain score cursor, and how a per-session **feed snapshot** gives stable pages while new posts wait behind a "new posts" banner
- **Seen-state** and impression logging, which feed both deduplication and the ranking model
- Storage choices: feed caches hold ids not post bodies, posts live in a sharded store, counters are aggregated asynchronously; what breaks first at 10x

**Clarifying questions expected:**
- Ranked or chronological? If ranked, is there an existing model, or do we design the ranking signals too?
- What sources feed the feed: only people you follow, or also groups, pages, recommendations and ads?
- How fresh must it be: should a friend post appear within seconds, or is a minute fine?

**Code / implementation expected:** Optional — a scoring function and a pagination demo that shows duplicates with offsets and stable pages with a snapshot; the example does both and computes the capacity numbers.`,
    answer: `**Target Audience:** Engineers preparing for a senior system design round. You know what a server, a database and a cache are; feed-specific ideas are defined as we go.
**Difficulty:** Hard
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Product facts are cited inline and were checked in October 2026.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. All numbers in the capacity and pagination sections come from the example program; the **Verified** section quotes its full output. The sibling question [How would you design Twitter's timeline at scale?](/interview-question/how-would-you-design-twitter-s-timeline-at-scale) covers fan-out on write vs read in depth; this page focuses on what changes when the feed is **ranked**.

## 1. Why This Even Matters — A Story First

Imagine a friend who reads every newspaper, letter and flyer addressed to you, then hands you a small stack each morning with the most interesting things on top. That friend does three jobs: **collect** everything that could matter (hundreds of items), **sort** it by what you are likely to care about, and **remember** what you already read so tomorrow's stack is not a repeat.

A news feed is that friend at the scale of hundreds of millions of people, opening the app many times a day, expecting the stack in well under a second. Collecting is cheap per item but huge in total; sorting well needs expensive machine-learning models; remembering needs a log of every impression. The design is about doing each job at the right moment and at the right cost.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Ranked or chronological? | Chronological is a merge problem (see the Twitter timeline page); ranked adds a scoring stage and changes pagination |
| Which sources: follows only, or groups, pages, recommendations, ads? | More sources means more candidate generators and a blending step |
| Daily users, feed opens per day, page size? | Drives requests per second and the ranking budget |
| Freshness target for a new post? | Seconds pushes you toward fan-out on write; a minute allows cheaper batch work |
| Is there an existing ranking model and feature store? | Decides whether you design ML infrastructure or just call a scoring service |
| Privacy rules: audiences, blocks, deleted posts? | These must be applied at read time, because they change after a post was fanned out |

## 3. Requirements

**Functional**

- A user opens the feed and gets the first page of posts from people, pages and groups they follow, ordered by predicted relevance.
- Scrolling loads further pages with no duplicates and no gaps.
- Posts already seen are not shown again at the top next time.
- New posts that arrive while you scroll are announced ("2 new posts"), not spliced into the middle.

**Non-functional**

- p99 latency for the first page around a few hundred milliseconds.
- 300 million daily active users (assumption), high availability; a slightly stale feed is acceptable, an empty one is not.
- A new post from a close friend shows up within about a minute.

## 4. Capacity Estimate

Assumptions: 300M daily users, 10 feed opens per user per day, peak traffic 3x the average, 500 candidate posts considered per request. The example computes:

| Quantity | Calculation | Result |
| :--- | :--- | ---: |
| Feed requests per day | 300M x 10 | 3,000,000,000 |
| Average requests per second | 3B / 86,400 | 34,722 |
| Peak requests per second | 34,722 x 3 | 104,166 |
| Candidates scored per second at peak | 104,166 x 500 | 52,083,000 |
| Heavy-model scores per second if a light stage keeps 50 | 104,166 x 50 | 5,208,300 |
| Cached candidate ids | 300M x 500 x 8 bytes | 1,200 GB |

The striking number is the 52 million candidate scores per second. That is why real feeds rank in **stages**: a cheap model or heuristic narrows 500 candidates to about 50, and only those 50 go through the expensive model. Meta describes this scale in its own feed: more than a thousand candidate posts per person, thousands of signals, and ranking done in the second or so the feed takes to load (Meta Engineering, "News Feed ranking", January 2021). The id cache, by contrast, is small: 1.2 TB fits in a modest in-memory cluster.

## 5. API

~~~http
GET  /v1/feed?cursor=<opaque>&limit=20      -> { posts: [...], next_cursor, new_posts_count }
POST /v1/feed/impressions   body: [{ post_id, position, ms_visible }]   (seen-state, async)
POST /v1/posts              body: { text, media_ids, audience }          -> { post_id }
~~~

The cursor is **opaque**: the client cannot read or construct it. Inside it the server stores a feed-session id and a position, which is what makes snapshot pagination (section 8) possible. See [REST vs GraphQL](/interview-question/what-is-the-difference-between-rest-and-graphql) for how the same shape looks as a GraphQL connection.

## 6. Data Model

| Store | Key | Holds | Why this store |
| :--- | :--- | :--- | :--- |
| Posts | \`post_id\` (sharded by author) | author, text, media refs, audience, created_at | Durable source of truth; read by id during hydration |
| Social graph | \`user_id\` | who you follow, close-friend flags | Read by candidate generation; huge but simple |
| Candidate inbox | \`user_id\` | recent post ids pushed by fan-out (capped list) | In-memory cache; ids only, 8 bytes each |
| Feed session | \`session_id\` | the ranked list of ids for this scroll session, TTL 30 min | Makes pagination stable |
| Seen-state | \`user_id\` | recently shown post ids (or a Bloom filter of them) | Dedup across sessions and ranking feature |
| Counters | \`post_id\` | likes, comments, shares (aggregated) | Updated asynchronously; read as ranking features |

📌 **Interview term: hydration** — turning a list of post ids into full posts (text, author name, media URLs, counts) by batch-reading the post store and caches just before returning the page. Feed caches hold only ids so a post edit or deletion is reflected everywhere at once.

For the seen-state, a [Bloom filter](/interview-question/what-is-a-bloom-filter-and-when-is-it-useful) per user is a common trick: it answers "probably seen" in a few hundred bytes, and a false positive only hides one post that was probably not important.

## 7. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 820 300" role="img" aria-label="Feed request flows through candidate generation, two ranking stages, filtering and hydration">
  <defs>
    <marker id="sd15q1-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="130" height="70" rx="10"/>
  <text class="d-text" x="85" y="72" text-anchor="middle">feed API</text>
  <text class="d-sub" x="85" y="94" text-anchor="middle">opaque cursor</text>
  <rect class="d-box" x="200" y="40" width="150" height="70" rx="10"/>
  <text class="d-text" x="275" y="72" text-anchor="middle">candidates</text>
  <text class="d-sub" x="275" y="94" text-anchor="middle">about 500 ids</text>
  <rect class="d-box-accent" x="400" y="40" width="150" height="70" rx="10"/>
  <text class="d-text" x="475" y="72" text-anchor="middle">stage 1 rank</text>
  <text class="d-sub" x="475" y="94" text-anchor="middle">cheap, keeps 50</text>
  <rect class="d-box-accent" x="600" y="40" width="190" height="70" rx="10"/>
  <text class="d-text" x="695" y="72" text-anchor="middle">stage 2 rank</text>
  <text class="d-sub" x="695" y="94" text-anchor="middle">heavy model</text>
  <line class="d-edge" x1="150" y1="75" x2="196" y2="75" marker-end="url(#sd15q1-arrow)"/>
  <line class="d-edge" x1="350" y1="75" x2="396" y2="75" marker-end="url(#sd15q1-arrow)"/>
  <line class="d-edge" x1="550" y1="75" x2="596" y2="75" marker-end="url(#sd15q1-arrow)"/>
  <rect class="d-box" x="600" y="190" width="190" height="70" rx="10"/>
  <text class="d-text" x="695" y="222" text-anchor="middle">filter</text>
  <text class="d-sub" x="695" y="244" text-anchor="middle">privacy, blocks, seen</text>
  <rect class="d-box" x="360" y="190" width="190" height="70" rx="10"/>
  <text class="d-text" x="455" y="222" text-anchor="middle">feed session</text>
  <text class="d-sub" x="455" y="244" text-anchor="middle">ranked ids, TTL</text>
  <rect class="d-box" x="120" y="190" width="190" height="70" rx="10"/>
  <text class="d-text" x="215" y="222" text-anchor="middle">hydrate page</text>
  <text class="d-sub" x="215" y="244" text-anchor="middle">posts, counts, media</text>
  <line class="d-edge" x1="695" y1="110" x2="695" y2="186" marker-end="url(#sd15q1-arrow)"/>
  <line class="d-edge" x1="600" y1="225" x2="554" y2="225" marker-end="url(#sd15q1-arrow)"/>
  <line class="d-edge" x1="360" y1="225" x2="314" y2="225" marker-end="url(#sd15q1-arrow)"/>
</svg>

A request gathers about 500 candidate ids, ranks them in two stages, filters what the viewer may not or need not see, stores the ordered list as a feed session, and hydrates only the page being returned.

- **Candidate generators** each return post ids with a few cheap features: the push inbox (posts fanned out on write from friends), a pull path for very popular pages, groups, and recommendation sources. Fan-out mechanics are on the [Twitter timeline page](/interview-question/how-would-you-design-twitter-s-timeline-at-scale).
- **Stage 1 ranking** uses a light model or a formula over cached features to cut 500 to about 50.
- **Stage 2 ranking** calls a heavier model (served on a separate fleet) that predicts probabilities such as like, comment, share and hide, and combines them into one score.
- **Filtering and blending**: drop posts the viewer may no longer see (audience changed, blocked, deleted), drop already-seen ones, enforce diversity (not five posts from one page in a row), insert ads at fixed slots.
- **Write path**: a new post is stored, then an event goes onto a [message queue](/interview-question/what-is-a-message-queue-and-why-use-one) so fan-out workers push its id into followers' candidate inboxes, and counters and indexes update asynchronously.

## 8. Deep Dive 1: Ranking Without Melting the Fleet

📌 **Interview term: candidate generation** — the first step of a feed or recommender: cheaply gather a few hundred items that could be shown. Its job is recall (do not miss good items), not order.

📌 **Interview term: multi-stage ranking** — scoring candidates in passes of increasing cost: a cheap pass over everything, an expensive model over the survivors. It is what turns 52 million scores per second into 5.2 million heavy ones in the estimate.

📌 **Interview term: engagement prediction** — what a ranking model outputs: the probability that this viewer likes, comments on, shares, or hides this post. The final score is a weighted sum chosen by the product team.

The example uses a hand-written score so the mechanics are visible:

~~~js
const score = (p) => Math.floor(affinity[p.author] * typeW[p.type] * 10000 / (p.age + 120)) + p.likes;
~~~

Affinity (how much you interact with the author) times a content-type weight, decayed by age, plus popularity. On ten posts it reorders the feed completely:

~~~text
chronological: p1 p2 p3 p5 p6 p7 p9 p4 p10 p8
ranked:        p3(12040) p4(7515) p6(6674) p2(4617) p10(4310) p9(3762) p1(2800) p8(2503) p5(1819) p7(1376)
~~~

The newest post (p1, a brand video five minutes old) drops to seventh because the viewer rarely interacts with that brand, while a four-hour-old photo from a close family member (p4) is second. That reordering is the whole point of ranking, and it is also what breaks normal pagination.

## 9. Deep Dive 2: Pagination on a Ranked Feed

In a chronological feed a cursor such as "posts older than timestamp T" works forever, because a post's timestamp never changes. In a ranked feed **the sort key changes between requests**: posts get older, likes arrive, new posts appear. The example asks for page 2 thirty minutes after page 1, while post p9 suddenly gains 1,500 likes and two new posts arrive:

~~~text
re-ranked now: n2(22500) n1(15000) p3(10040) p4(6938) p6(5722) p9(4845) p10(4025) p2(3752) p8(2403) p1(2335) p5(1539) p7(1316)
page1 (all methods)     [p3 p4 p6 p2]
offset re-query         page2=[p6 p9 p10 p2] duplicates=2 never shown=none
keyset cursor on score  page2=[p10 p2 p8 p1] duplicates=1 never shown=p9
session snapshot        page2=[p10 p9 p1 p8] duplicates=0 never shown=none
~~~

- **Offset pagination** re-runs the ranking and skips 4. The two new posts push everything down, so page 2 repeats p6 and p2.
- **Keyset pagination** (📌 a cursor that says "items after this sort key", here the score and id of the last item) is the right tool for chronological feeds, but here p2's score fell below the old cursor, so it shows again, and p9 jumped above the cursor, so the user never sees it.
- **A feed session snapshot** ranks once when the session starts, stores the ordered list of ids with a TTL, and pages by position. Page 2 is exactly positions 5-8 of what the user would have seen; new posts are counted and shown at the top on refresh.

📌 **Interview term: feed session (snapshot)** — the ranked list of post ids computed when a user opens the feed, stored server-side for the length of a scroll session, so every page comes from one consistent ordering.

📌 **Interview term: seen-state** — the record of which posts were actually displayed (from client impression events). The next session filters them:

~~~text
seen=8 next feed: n2(22500) n1(15000) p5(1539) p7(1316)
~~~

Cost of the snapshot: one small write per session (about 500 ids, 4 KB) and a cache read per page. At 104,166 peak requests per second that is cheap compared to re-ranking for every page.

## 10. Deep Dive 3: Freshness, Deletes and Privacy

- **Fresh posts mid-session** are not spliced in; the API returns \`new_posts_count\` and the client shows a banner. Splicing would reorder what the user is reading.
- **Deletes and audience changes** happen after fan-out, so ids in inboxes and snapshots can point at posts the viewer may no longer see. The filter step and hydration must check the post store (or a fast "tombstone" cache) on every read; never trust that an id in a cache is still visible.
- **Counters** (likes, comments) are written to a log and aggregated in batches; ranking reads slightly stale counts, which is fine. Exact counts on the post page come from the aggregated store.
- **Cold start**: a new user with no follows has an empty push inbox, so recommendation and trending sources must fill the candidate set.

## 11. What Breaks First at 10x

| At 30 billion feed opens per day (10x) | Fix |
| :--- | :--- |
| Heavy-model scoring cost | Cache scores for a short time per user, shrink stage 2 to fewer candidates, distil the model |
| Candidate inbox writes from fan-out | Hybrid fan-out: pull large pages and celebrities at read time |
| Feature store reads per candidate | Batch reads per request, co-locate features with the ranking fleet |
| Hot posts (a viral post read by millions) | Hydration cache in front of the post store; [read replicas vs cache](/interview-question/when-do-you-use-a-read-replica-vs-a-cache) |
| Impression event volume | Sample impressions for training, keep a compact seen filter per user for dedup |

## 12. Verified: Running the Code

The example **"Ranked news feed: capacity, scoring candidates, and offset vs keyset vs snapshot pagination when scores change between pages"** simulates one viewer: ten candidate posts with an author, type, age and likes; a scoring function; three pagination methods run against the same re-ranked list; and a seen filter for the next session. What it stands for: the candidate inbox and feed session would be a cache cluster, the scoring a model-serving fleet. What it leaves out: real ML models, the fan-out workers, ads and diversity rules.

Full output (identical in Node and Python):

~~~text
== 1. Capacity (assumptions: 300M DAU, 10 feed opens/day, peak = 3x avg, 500 candidates/request) ==
feed requests/day   3,000,000,000
avg requests/s      34,722
peak requests/s     104,166
candidates scored/s 52,083,000 at peak (one heavy model on all of them is too costly)
stage 2 scores/s    5,208,300 if a light stage 1 keeps the top 50
feed id cache       1,200 GB (500 post ids x 8 bytes per user)

== 2. Ranking: score = affinity x type weight x 10000 / (age_min + 120) + likes ==
chronological: p1 p2 p3 p5 p6 p7 p9 p4 p10 p8
ranked:        p3(12040) p4(7515) p6(6674) p2(4617) p10(4310) p9(3762) p1(2800) p8(2503) p5(1819) p7(1376)

== 3. Page 2 is requested 30 min later: ages grow, p9 gains 1500 likes, 2 new posts (page size 4) ==
re-ranked now: n2(22500) n1(15000) p3(10040) p4(6938) p6(5722) p9(4845) p10(4025) p2(3752) p8(2403) p1(2335) p5(1539) p7(1316)
page1 (all methods)     [p3 p4 p6 p2]
offset re-query         page2=[p6 p9 p10 p2] duplicates=2 never shown=none
keyset cursor on score  page2=[p10 p2 p8 p1] duplicates=1 never shown=p9
session snapshot        page2=[p10 p9 p1 p8] duplicates=0 never shown=none
snapshot banner: 2 new posts (shown at top on refresh)

== 4. Next session: seen posts filtered, new posts ranked in ==
seen=8 next feed: n2(22500) n1(15000) p5(1539) p7(1316)
~~~

## 13. Edge Cases Worth Knowing

- **A user follows nobody** (or only inactive accounts): candidate generation returns too few posts; fall back to recommendations and say so in the design.
- **Session expiry mid-scroll**: when the snapshot TTL expires, re-rank, and filter out ids already returned in this session (track them in the cursor or the seen-state) to avoid duplicates.
- **Multiple devices**: seen-state is per user, not per device, or the phone shows what the laptop already showed.
- **Edited posts**: ids stay the same, hydration shows the new text; ranking features may be stale for a moment.
- **Ranking model outage**: serve the stage 1 order or a chronological order; a worse feed beats an error page.

## Common Pitfalls

- **Offset pagination on a ranked list.** The run showed 2 duplicates on page 2 after two new posts arrived.
- **A score cursor on a score that changes.** The same run showed a duplicate and a post (p9) that could never be shown.
- **Running the heavy model on every candidate.** 52 million scores per second at peak in the estimate; rank in stages.
- **Storing post bodies in feed caches.** Edits and deletes then need to touch millions of copies; store ids and hydrate.
- **Trusting fanned-out ids for privacy.** Audiences and blocks change after fan-out; filter at read time.
- **Forgetting seen-state.** Without it every app open shows the same top posts.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify and size:</strong> <span style="color:#f0e2c8;">I would confirm it is ranked, which sources feed it, and freshness. At 300M daily users opening 10 times a day that is 104,166 peak feed requests per second; with 500 candidates each that is 52 million candidate scores per second, so ranking must be staged.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Pipeline:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Candidate generation</strong> from a push inbox of followed accounts plus a pull path for big pages and a recommendation source, then <strong style="color:#ffca28;">stage 1</strong> cheap ranking to about 50, <strong style="color:#ffca28;">stage 2</strong> heavy model, then filtering for privacy, blocks and seen posts, then <strong style="color:#ffca28;">hydration</strong> of only the returned page.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Pagination:</strong> <span style="color:#f0e2c8;">A ranked feed cannot use offsets or a score cursor, because scores change between pages. I rank once per session, store the ordered ids as a <strong style="color:#ffca28;">feed session</strong> with a TTL, and page by position behind an opaque cursor. New posts show as a banner.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Storage:</strong> <span style="color:#f0e2c8;">Posts sharded by author in a durable store; feed caches and sessions hold ids only; counters are aggregated asynchronously; seen-state is a compact per-user record from impression events.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Scale and failure:</strong> <span style="color:#f0e2c8;">At 10x the first costs are the heavy model and fan-out writes: cache scores briefly, shrink stage 2, use hybrid fan-out. If the ranking service is down, serve the stage 1 or chronological order rather than an error.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just sort by time?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Time order is simple and predictable, and some products offer it as an option, but it rewards whoever posts most often and buries rare posts from close friends. In the example the newest post, from a brand the viewer ignores, ranked seventh while a four-hour-old family photo ranked second.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid duplicates across pages?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Rank once per session and store the ordered list of ids server-side with a TTL; the cursor carries the session id and position. The run showed offset paging repeating 2 posts and a score cursor repeating 1 and losing 1, while the snapshot repeated none.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does a post from a friend get into my feed within a minute?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">On write the post id goes onto a queue and fan-out workers push it into each follower inbox, a capped list of ids in an in-memory store. Accounts with huge audiences are pulled at read time instead. Details are the same as the timeline design.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do the ranking features come from?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A feature store fed by event streams: interaction counts between viewer and author, post engagement so far, content type, viewer history. Features are batch-read per request for all candidates at once, and the model serving fleet is separate from the feed API so it can scale on its own.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if a post is deleted after it was ranked into my session?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Hydration checks the post store, or a tombstone cache of recent deletions, for every id on the page and drops anything missing or no longer visible to the viewer. Feed caches are never trusted as the authority for visibility.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Candidate generation | Cheaply gathering a few hundred items that could be shown |
| Multi-stage ranking | Scoring in passes of increasing cost over fewer items |
| Engagement prediction | Model output: probability of like, comment, share or hide |
| Hydration | Turning post ids into full posts just before returning a page |
| Keyset pagination | A cursor of "items after this sort key"; stable only if the key never changes |
| Feed session (snapshot) | The ranked id list for one scroll session, stored with a TTL |
| Seen-state | Record of posts actually displayed, used for dedup and ranking |

**Conclusion:** A news feed is a pipeline: collect about 500 candidates cheaply, rank them in stages so the heavy model sees only about 50, filter for privacy and seen posts, and hydrate only the page you return. The capacity math (104,166 peak requests per second, 52 million candidate scores per second) explains the staged ranking, and the pagination run explains the snapshot: when scores change between pages, offsets repeated 2 posts and a score cursor lost one, while a per-session ranked list gave clean pages. Fan-out details live on the Twitter timeline page; the ranked feed adds scoring, sessions and seen-state on top.`,
    examples: [
      {
        label: `Ranked news feed: capacity, scoring candidates, and offset vs keyset vs snapshot pagination when scores change between pages`,
        variants: [
          { tech: "node", code: `// News feed: capacity, ranking candidates, and why ranked feeds paginate from a snapshot.
const fmt = (n) => n.toLocaleString("en-US");

console.log("== 1. Capacity (assumptions: 300M DAU, 10 feed opens/day, peak = 3x avg, 500 candidates/request) ==");
const dau = 300_000_000, opens = 10, cands = 500;
const perDay = dau * opens;
const avg = Math.floor(perDay / 86400);
const peak = avg * 3;
console.log("feed requests/day   " + fmt(perDay));
console.log("avg requests/s      " + fmt(avg));
console.log("peak requests/s     " + fmt(peak));
console.log("candidates scored/s " + fmt(peak * cands) + " at peak (one heavy model on all of them is too costly)");
console.log("stage 2 scores/s    " + fmt(peak * 50) + " if a light stage 1 keeps the top 50");
console.log("feed id cache       " + fmt(dau * cands * 8 / 1e9) + " GB (500 post ids x 8 bytes per user)");

console.log("\\n== 2. Ranking: score = affinity x type weight x 10000 / (age_min + 120) + likes ==");
const affinity = { mom: 90, ana: 60, bob: 30, brand: 10 };
const typeW = { photo: 3, video: 3, link: 1, text: 2 };
// [id, author, type, age in minutes at session start, likes]
const posts = [
  ["p1", "brand", "video", 5, 400], ["p2", "bob", "text", 10, 2], ["p3", "ana", "photo", 30, 40],
  ["p4", "mom", "photo", 240, 15], ["p5", "bob", "link", 45, 1], ["p6", "ana", "text", 60, 8],
  ["p7", "brand", "link", 90, 900], ["p8", "mom", "text", 600, 3], ["p9", "bob", "photo", 120, 12],
  ["p10", "ana", "video", 300, 25],
].map(([id, author, type, age, likes]) => ({ id, author, type, age, likes }));
const score = (p) => Math.floor(affinity[p.author] * typeW[p.type] * 10000 / (p.age + 120)) + p.likes;
for (const p of posts) p.score = score(p);
const byTime = [...posts].sort((a, b) => a.age - b.age || (a.id < b.id ? -1 : 1));
const byScore = [...posts].sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
console.log("chronological: " + byTime.map((p) => p.id).join(" "));
console.log("ranked:        " + byScore.map((p) => p.id + "(" + p.score + ")").join(" "));

console.log("\\n== 3. Page 2 is requested 30 min later: ages grow, p9 gains 1500 likes, 2 new posts (page size 4) ==");
const fresh = [{ id: "n1", author: "ana", type: "photo", age: 0, likes: 0 }, { id: "n2", author: "mom", type: "photo", age: 0, likes: 0 }];
const later = posts.map((p) => ({ ...p, age: p.age + 30, likes: p.likes + (p.id === "p9" ? 1500 : 0) })).concat(fresh);
for (const p of later) p.score = score(p);
const rankedLater = [...later].sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
console.log("re-ranked now: " + rankedLater.map((p) => p.id + "(" + p.score + ")").join(" "));
const page1 = byScore.slice(0, 4).map((p) => p.id);
const report = (name, p2, unreachable) => {
  const dup = p2.filter((id) => page1.includes(id));
  console.log(name.padEnd(24) + "page2=[" + p2.join(" ") + "] duplicates=" + dup.length + " never shown=" + (unreachable.join(" ") || "none"));
};
console.log("page1 (all methods)     [" + page1.join(" ") + "]");
// offset pagination: re-run the ranking, skip the first 4
const offsetP2 = rankedLater.slice(4, 8).map((p) => p.id);
report("offset re-query", offsetP2, rankedLater.slice(0, 4).filter((p) => !page1.includes(p.id) && !p.id.startsWith("n")).map((p) => p.id));
// keyset cursor on (score, id) of the last item on page 1
const cur = byScore[3];
const below = (p) => p.score < cur.score || (p.score === cur.score && p.id > cur.id);
const keyP2 = rankedLater.filter(below).slice(0, 4).map((p) => p.id);
report("keyset cursor on score", keyP2, rankedLater.filter((p) => !below(p) && !page1.includes(p.id) && !p.id.startsWith("n")).map((p) => p.id));
// snapshot: rank once at session start, store the ordered ids, page by position
const snapshot = byScore.map((p) => p.id);
report("session snapshot", snapshot.slice(4, 8), []);
console.log("snapshot banner: " + fresh.length + " new posts (shown at top on refresh)");

console.log("\\n== 4. Next session: seen posts filtered, new posts ranked in ==");
const seen = new Set(snapshot.slice(0, 8));
const next = rankedLater.filter((p) => !seen.has(p.id));
console.log("seen=" + seen.size + " next feed: " + next.map((p) => p.id + "(" + p.score + ")").join(" "));` },
          { tech: "python", code: `# News feed: capacity, ranking candidates, and why ranked feeds paginate from a snapshot.
def fmt(n):
    return f"{n:,}"

print("== 1. Capacity (assumptions: 300M DAU, 10 feed opens/day, peak = 3x avg, 500 candidates/request) ==")
dau, opens, cands = 300_000_000, 10, 500
per_day = dau * opens
avg = per_day // 86400
peak = avg * 3
print("feed requests/day   " + fmt(per_day))
print("avg requests/s      " + fmt(avg))
print("peak requests/s     " + fmt(peak))
print("candidates scored/s " + fmt(peak * cands) + " at peak (one heavy model on all of them is too costly)")
print("stage 2 scores/s    " + fmt(peak * 50) + " if a light stage 1 keeps the top 50")
print("feed id cache       " + fmt(dau * cands * 8 // 10**9) + " GB (500 post ids x 8 bytes per user)")

print("\\n== 2. Ranking: score = affinity x type weight x 10000 / (age_min + 120) + likes ==")
affinity = {"mom": 90, "ana": 60, "bob": 30, "brand": 10}
type_w = {"photo": 3, "video": 3, "link": 1, "text": 2}
raw = [("p1", "brand", "video", 5, 400), ("p2", "bob", "text", 10, 2), ("p3", "ana", "photo", 30, 40),
       ("p4", "mom", "photo", 240, 15), ("p5", "bob", "link", 45, 1), ("p6", "ana", "text", 60, 8),
       ("p7", "brand", "link", 90, 900), ("p8", "mom", "text", 600, 3), ("p9", "bob", "photo", 120, 12),
       ("p10", "ana", "video", 300, 25)]
posts = [dict(id=i, author=a, type=t, age=g, likes=l) for i, a, t, g, l in raw]


def score(p):
    return affinity[p["author"]] * type_w[p["type"]] * 10000 // (p["age"] + 120) + p["likes"]


def by_rank(lst):
    return sorted(lst, key=lambda p: (-p["score"], p["id"]))


for p in posts:
    p["score"] = score(p)
by_time = sorted(posts, key=lambda p: (p["age"], p["id"]))
by_score = by_rank(posts)
print("chronological: " + " ".join(p["id"] for p in by_time))
print("ranked:        " + " ".join(f"{p['id']}({p['score']})" for p in by_score))

print("\\n== 3. Page 2 is requested 30 min later: ages grow, p9 gains 1500 likes, 2 new posts (page size 4) ==")
fresh = [dict(id="n1", author="ana", type="photo", age=0, likes=0), dict(id="n2", author="mom", type="photo", age=0, likes=0)]
later = [dict(p, age=p["age"] + 30, likes=p["likes"] + (1500 if p["id"] == "p9" else 0)) for p in posts] + fresh
for p in later:
    p["score"] = score(p)
ranked_later = by_rank(later)
print("re-ranked now: " + " ".join(f"{p['id']}({p['score']})" for p in ranked_later))
page1 = [p["id"] for p in by_score[:4]]


def report(name, p2, unreachable):
    dup = [i for i in p2 if i in page1]
    print(name.ljust(24) + "page2=[" + " ".join(p2) + "] duplicates=" + str(len(dup)) + " never shown=" + (" ".join(unreachable) or "none"))


print("page1 (all methods)     [" + " ".join(page1) + "]")
offset_p2 = [p["id"] for p in ranked_later[4:8]]
report("offset re-query", offset_p2, [p["id"] for p in ranked_later[:4] if p["id"] not in page1 and not p["id"].startswith("n")])
cur = by_score[3]


def below(p):
    return p["score"] < cur["score"] or (p["score"] == cur["score"] and p["id"] > cur["id"])


key_p2 = [p["id"] for p in ranked_later if below(p)][:4]
report("keyset cursor on score", key_p2, [p["id"] for p in ranked_later if not below(p) and p["id"] not in page1 and not p["id"].startswith("n")])
snapshot = [p["id"] for p in by_score]
report("session snapshot", snapshot[4:8], [])
print("snapshot banner: " + str(len(fresh)) + " new posts (shown at top on refresh)")

print("\\n== 4. Next session: seen posts filtered, new posts ranked in ==")
seen = set(snapshot[:8])
nxt = [p for p in ranked_later if p["id"] not in seen]
print("seen=" + str(len(seen)) + " next feed: " + " ".join(f"{p['id']}({p['score']})" for p in nxt))` },
        ],
      },
    ],
  },
  {
    title: `How would you design Twitter's timeline at scale?`,
    difficulty: "hard",
    seoDescription: `Design Twitter's home timeline: fan-out on write vs read vs hybrid, celebrity accounts, capped Redis timelines and hydration, with counted costs.`,
    description: `**Question presented to candidate:**
"Design the home timeline for Twitter, the list of recent tweets from everyone you follow. Reads vastly outnumber writes, some accounts have tens of millions of followers, and a tweet should show up for followers within a few seconds."

**What a strong answer should cover:**
- The read/write asymmetry (Twitter reported roughly 300K timeline reads per second against about 6,000 tweet writes per second in 2012) and why that favours precomputing timelines
- **Fan-out on write** (push tweet ids into every follower timeline) vs **fan-out on read** (merge followees at read time), with the cost of each counted, not just named
- The **celebrity problem** and the **hybrid**: push for normal accounts, pull high-follower accounts at read time and merge, with a threshold chosen from numbers
- Timeline storage: capped in-memory lists of tweet ids, **hydration** from the tweet store, rebuilding a timeline for an inactive user on demand
- Edge cases: deletes, unfollows, protected accounts, timeline cap and scrolling past it; what breaks first at 10x

**Clarifying questions expected:**
- Chronological only, or ranked? (This answer is chronological; ranking is the news feed question.)
- How many users, follows per user, tweets and timeline reads per day? What is the largest follower count?
- How quickly must a tweet appear for followers, and how far back can a user scroll?

**Code / implementation expected:** Optional — counting writes and reads for push, pull and hybrid on a skewed follower graph, and showing all three produce the same timeline; the example does both.`,
    answer: `**Target Audience:** Engineers preparing for a system design round. You know what a cache and a database are; the timeline-specific ideas are defined as we go.
**Difficulty:** Hard
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Twitter figures are from published talks and write-ups cited inline, checked in October 2026.

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts with the precise vocabulary. The cost table is computed by the example program and quoted in full in the **Verified** section. This page is about the chronological home timeline and its fan-out; the ranked version (scoring, sessions, seen-state) is [How would you design a news feed system?](/interview-question/how-would-you-design-a-news-feed-system).

## 1. Why This Even Matters — A Story First

A school has a noticeboard outside every classroom. When a teacher writes an announcement, there are two ways to get it to students.

- **Copy it onto every noticeboard** of every class that follows that teacher. Writing is slow (one copy per board), but a student just glances at their own board: reading is instant.
- **Pin it only on the teacher's own board.** Writing is instant, but each student must walk to the boards of every teacher they follow and combine what they find: reading is slow.

Most teachers have a few classes, so copying is fine. But the head teacher addresses the whole school of 2,000 classes; copying that would take all afternoon. So the school copies normal announcements and asks students to also glance at the head teacher board. That is exactly the hybrid fan-out Twitter uses, and the interview is about choosing it with numbers.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Chronological or ranked? | Chronological is a merge of sorted lists; ranked adds a scoring service |
| Users, average follows, tweets per day, timeline reads per day? | Decides whether write cost or read cost dominates |
| Largest follower count and how skewed the graph is? | The tail decides whether pure push is even possible |
| Delivery latency target? | A tweet visible within 5 s limits how long fan-out may take |
| How far back can users scroll? | Sets the cap of the precomputed list and what happens past it |
| Protected accounts, blocks, deletes? | These change visibility after fan-out and must be enforced on read |

## 3. Requirements

**Functional**: post a tweet; read your home timeline (newest first, paginated); follow and unfollow; delete a tweet.

**Non-functional**: home timeline p99 well under 200 ms; a new tweet visible to most followers within about 5 seconds; very read-heavy; eventual consistency is fine (a follower seeing a tweet one second later than another is acceptable).

Public numbers give the shape: in Raffi Krikorian's 2012 "Timelines at Scale" talk, Twitter served about 300K requests per second reading timelines against about 6,000 per second writing tweets, with fan-out inserting tweet ids into per-user timelines kept in Redis (as summarised by High Scalability, "The Architecture Twitter Uses to Deal with 150M Active Users"). A write-up of the same talk says timelines were capped at 800 entries; we could not check that figure against the slides, so treat the exact cap as a product choice.

## 4. Capacity Estimate on a Skewed Graph

The example builds a graph of 1,000,000 users in tiers: 10 accounts with 500,000 followers, 990 with 50,000, 99,000 with 1,000 and 900,000 with 100. Each user tweets 2 times and reads the timeline 10 times a day.

~~~text
== 1. Graph: 1,000,000 users, 243,500,000 follow edges, avg 243 followees per user ==
top account followers 500,000, median account followers 100
per day: 2,000,000 tweets, 10,000,000 timeline reads

strategy          timeline writes/day  fetches/read     fetches/day  largest fan-out
push (on write)           487,000,000             1      10,000,000          500,000
pull (on read)                      0           243   2,430,000,000                0
hybrid T=100,000          477,000,000             6      60,000,000           50,000
                  (10 accounts above T are pulled at read time)
hybrid T=10,000           378,000,000            56     560,000,000            1,000
                  (1,000 accounts above T are pulled at read time)

push: one tweet by the top account at 10,000 inserts/s (one fan-out worker) takes 50 s to reach every follower
~~~

How to read it:

- **Push** makes every read one list fetch (10 million per day) but costs 487 million timeline inserts per day, and one tweet from a top account is 500,000 inserts. At 10,000 inserts per second on one worker that is 50 seconds, breaking the 5-second target unless you spread it over many workers, and those inserts compete with everyone else's tweets.
- **Pull** writes nothing, but every read fetches 243 lists and merges them: 2.43 billion fetches per day, and read latency grows with how many people you follow.
- **Hybrid with T = 100,000** pulls only the 10 biggest accounts. Writes barely drop (477 vs 487 million) but the **worst single fan-out falls from 500,000 to 50,000**, and a read costs 6 fetches. That worst case, not the total, is what the hybrid buys.
- **Hybrid with T = 10,000** pulls 1,000 accounts: fewer writes (378 million) but 56 fetches per read. Lowering the threshold moves cost from writes to reads; pick T where read latency is still within budget.

📌 **Interview term: fan-out on write (push)** — when a tweet is posted, insert its id into the precomputed timeline of every follower. Cheap reads, expensive writes proportional to follower count.

📌 **Interview term: fan-out on read (pull)** — store tweets only in the author list and build the timeline at read time by merging the lists of everyone the reader follows. Cheap writes, expensive reads proportional to followee count.

📌 **Interview term: hybrid fan-out** — push for accounts below a follower threshold, pull for accounts above it, and merge the two at read time.

📌 **Interview term: write amplification** — one logical write (a tweet) causing many physical writes (one per follower timeline).

Memory for push timelines: if each timeline holds 800 ids of 8 bytes, that is 6,400 bytes per user; for 1,000,000 users about 6.4 GB, plus list overhead and replicas. For hundreds of millions of users it is terabytes of RAM, which is why inactive users are often not fanned out to at all (see section 9).

## 5. API

~~~http
POST /v1/tweets                    body: { text, media_ids }      -> { tweet_id }
GET  /v1/timeline/home?max_id=<id>&count=20                      -> { tweets: [...], next_max_id }
POST /v1/follows                   body: { followee_id }
DELETE /v1/tweets/{tweet_id}
~~~

Because the home timeline is chronological and tweet ids are time-ordered (see [unique ID generator](/interview-question/how-would-you-design-a-unique-id-generator-at-scale-5739)), the cursor can simply be the **smallest id already returned**: "give me tweets with id below \`max_id\`". A tweet id never changes, so this keyset cursor is stable, unlike in a ranked feed.

## 6. Data Model

| Store | Key | Value | Notes |
| :--- | :--- | :--- | :--- |
| Tweets | \`tweet_id\` | author, text, media, created_at | Sharded by tweet id; durable |
| User tweets | \`user_id\` | list of that user tweet ids, newest first | Used by the pull path and for rebuilding |
| Social graph | \`user_id\` | followers list, followees list | Both directions, sharded by user |
| Home timeline | \`user_id\` | capped list of tweet ids (and author ids) | In-memory, replicated; can be rebuilt |

Timelines store ids, not tweets. Hydration fetches the tweet bodies and author profiles in a batch, mostly from a cache, so an edit or delete needs one change instead of millions.

## 7. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 800 260" role="img" aria-label="Write path: tweet service to queue to fan-out workers to timeline cache, followers from the graph service">
  <defs>
    <marker id="sd15q2-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="60" width="130" height="70" rx="10"/>
  <text class="d-text" x="85" y="92" text-anchor="middle">tweet API</text>
  <text class="d-sub" x="85" y="114" text-anchor="middle">store tweet</text>
  <rect class="d-box" x="200" y="60" width="130" height="70" rx="10"/>
  <text class="d-text" x="265" y="92" text-anchor="middle">queue</text>
  <text class="d-sub" x="265" y="114" text-anchor="middle">tweet events</text>
  <rect class="d-box-accent" x="380" y="60" width="160" height="70" rx="10"/>
  <text class="d-text" x="460" y="92" text-anchor="middle">fan-out workers</text>
  <text class="d-sub" x="460" y="114" text-anchor="middle">skip if above T</text>
  <rect class="d-box" x="600" y="60" width="180" height="70" rx="10"/>
  <text class="d-text" x="690" y="92" text-anchor="middle">timeline cache</text>
  <text class="d-sub" x="690" y="114" text-anchor="middle">capped id lists</text>
  <rect class="d-box-muted" x="380" y="180" width="160" height="60" rx="10"/>
  <text class="d-text" x="460" y="215" text-anchor="middle">graph service</text>
  <line class="d-edge" x1="150" y1="95" x2="196" y2="95" marker-end="url(#sd15q2-arrow)"/>
  <line class="d-edge" x1="330" y1="95" x2="376" y2="95" marker-end="url(#sd15q2-arrow)"/>
  <line class="d-edge-accent" x1="540" y1="95" x2="596" y2="95" marker-end="url(#sd15q2-arrow)"/>
  <line class="d-edge-dashed" x1="460" y1="180" x2="460" y2="134" marker-end="url(#sd15q2-arrow)"/>
</svg>

Write path: the tweet is stored, an event is queued, and fan-out workers look up followers from the graph service and insert the id into each follower timeline, unless the author is above the threshold.

<svg class="iq-diagram" width="100%" viewBox="0 0 800 240" role="img" aria-label="Read path: timeline service merges the cached list with celebrity tweet lists, then hydrates">
  <defs>
    <marker id="sd15q2-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="80" width="130" height="70" rx="10"/>
  <text class="d-text" x="85" y="112" text-anchor="middle">client</text>
  <text class="d-sub" x="85" y="134" text-anchor="middle">max_id cursor</text>
  <rect class="d-box-accent" x="220" y="80" width="170" height="70" rx="10"/>
  <text class="d-text" x="305" y="112" text-anchor="middle">timeline service</text>
  <text class="d-sub" x="305" y="134" text-anchor="middle">k-way merge</text>
  <rect class="d-box" x="470" y="20" width="170" height="60" rx="10"/>
  <text class="d-text" x="555" y="55" text-anchor="middle">cached timeline</text>
  <rect class="d-box" x="470" y="150" width="170" height="60" rx="10"/>
  <text class="d-text" x="555" y="185" text-anchor="middle">celebrity lists</text>
  <rect class="d-box-muted" x="680" y="80" width="100" height="70" rx="10"/>
  <text class="d-text" x="730" y="112" text-anchor="middle">hydrate</text>
  <text class="d-sub" x="730" y="134" text-anchor="middle">tweet cache</text>
  <line class="d-edge" x1="150" y1="115" x2="216" y2="115" marker-end="url(#sd15q2-arrow2)"/>
  <line class="d-edge" x1="390" y1="100" x2="466" y2="55" marker-end="url(#sd15q2-arrow2)"/>
  <line class="d-edge" x1="390" y1="130" x2="466" y2="180" marker-end="url(#sd15q2-arrow2)"/>
  <line class="d-edge-dashed" x1="640" y1="115" x2="676" y2="115" marker-end="url(#sd15q2-arrow2)"/>
</svg>

Read path: one fetch of the cached list, one fetch per followed celebrity, a merge, then hydration of the 20 ids returned.

## 8. Deep Dive 1: The Merge and the Cap

The read path is a **k-way merge** of lists that are each already sorted newest-first: take the newest head among the lists, repeat until you have a page. The example builds one user timeline three ways:

~~~text
pull    b4 s3 c3 b3 c2
push    b4 s3 c3 b3 c2
hybrid  b4 s3 c3 b3 c2
writes into alice timeline: push=10 hybrid=7; reads fetch 1 list (push), 2 lists (hybrid), 3 lists (pull)
~~~

All three agree; the hybrid saves the 3 writes for the celebrity account at the price of one more list on read. In production the merge uses a heap of size k, so a page of n items costs about n log k comparisons.

📌 **Interview term: k-way merge** — combining k sorted lists into one sorted list by repeatedly taking the best head; with a heap it is O(n log k).

📌 **Interview term: timeline cap** — the maximum number of ids kept per precomputed timeline. Inserts trim the oldest. Scrolling past the cap falls back to the pull path:

~~~text
scroll past the cap: fall back to pull for tweets older than t=6: s2 b2 c1 s1 b1
~~~

Few users scroll that far, so paying the pull cost only for them is a good trade.

## 9. Deep Dive 2: Who Gets Fanned Out To

- **Inactive users.** Pushing into the timeline of someone who has not opened the app in a month wastes writes and RAM. Fan-out skips users inactive beyond a window, and their timeline is **rebuilt on demand** (pull path, then cached) when they return. The first load is slower, which is acceptable for a returning user.
- **The threshold is per author, not global truth.** Follower count changes; an account that goes viral can be promoted to "pulled" when it crosses T, which must be safe in both directions: readers merge the pulled list, and recent pushed ids already in timelines simply stay.
- **Fan-out priority.** Tweets from accounts with few followers finish in milliseconds; split large fan-outs into batches across many workers so one big account does not delay everyone, and spread workers across timeline cache shards.

## 10. Deep Dive 3: Deletes, Unfollows, Visibility

- **Delete**: mark the tweet deleted in the tweet store (a tombstone); hydration drops it immediately. A background job removes the id from timelines, but correctness does not depend on that job finishing.
- **Unfollow**: stop future fan-out at once; remove existing ids lazily, or filter at read time by checking the author against the current followee set.
- **Protected accounts and blocks**: check at read time during hydration, because they can change after the id was pushed.
- **Ordering**: ids are time-ordered, so sorting ids is sorting by time. Clock skew between id generators can misorder tweets by a few milliseconds, which nobody notices.

## 11. What Breaks First at 10x

| At 10x users and tweets | Fix |
| :--- | :--- |
| Fan-out insert rate (4.87 billion per day in the scaled example) | Raise T, skip inactive users, batch inserts per cache shard |
| RAM for timelines | Lower the cap, store compact ids, keep only active users |
| Celebrity read merges | Cache each celebrity recent list on every timeline service node (it is the same for everyone) |
| Hot timeline cache shards | Consistent hashing of user ids over more nodes (see [consistent hashing](/interview-question/what-is-consistent-hashing)) |
| Fan-out lag after a big event | Prioritise small fan-outs; measure lag from tweet creation to the last insert |

## 12. Verified: Running the Code

The example **"Home timeline fan-out: push vs pull vs hybrid on a skewed follower graph, and the same timeline from all three via a k-way merge"** counts the costs analytically from follower tiers (no random graph) and then builds one small timeline three ways. What it stands for: the timeline lists would be Redis lists or a similar in-memory store, the queue a durable log. What it leaves out: the queue itself, replication, real latency, and the clustering of follows (real users do not follow uniformly at random; the program only counts edges per tier, which is what the costs depend on).

Full output (identical in Node and Python):

~~~text
== 1. Graph: 1,000,000 users, 243,500,000 follow edges, avg 243 followees per user ==
top account followers 500,000, median account followers 100
per day: 2,000,000 tweets, 10,000,000 timeline reads

strategy          timeline writes/day  fetches/read     fetches/day  largest fan-out
push (on write)           487,000,000             1      10,000,000          500,000
pull (on read)                      0           243   2,430,000,000                0
hybrid T=100,000          477,000,000             6      60,000,000           50,000
                  (10 accounts above T are pulled at read time)
hybrid T=10,000           378,000,000            56     560,000,000            1,000
                  (1,000 accounts above T are pulled at read time)

push: one tweet by the top account at 10,000 inserts/s (one fan-out worker) takes 50 s to reach every follower

== 2. Same timeline from all three strategies (cap = 5 ids per cached timeline) ==
pull    b4 s3 c3 b3 c2
push    b4 s3 c3 b3 c2
hybrid  b4 s3 c3 b3 c2
writes into alice timeline: push=10 hybrid=7; reads fetch 1 list (push), 2 lists (hybrid), 3 lists (pull)
scroll past the cap: fall back to pull for tweets older than t=6: s2 b2 c1 s1 b1
~~~

## 13. Edge Cases Worth Knowing

- **A user follows thousands of accounts above T.** Their read fetches many lists; cap the number of pulled sources per read, or push for those specific readers.
- **Cache loss.** A timeline cache node dies: rebuild timelines on demand from user tweet lists; this is why timelines are treated as a cache, not the source of truth.
- **Retweets and replies.** Fan out a retweet as an id pointing at the original; deduplicate so a viral tweet retweeted by five followees shows once.
- **Backfill on follow.** Following someone should show their recent tweets: merge their recent list into your timeline once, at follow time.

## Common Pitfalls

- **Naming push and pull without numbers.** In the run, push meant 487 million inserts per day and pull 2.43 billion fetches per day; say which one your workload can afford.
- **Thinking the hybrid is about total writes.** At T = 100,000 total writes fell only from 487 to 477 million; the win is the worst fan-out dropping from 500,000 to 50,000.
- **Storing full tweets in timelines.** Deletes and edits then touch millions of copies.
- **Fanning out to inactive users.** It wastes most of the writes and memory.
- **Using offsets for paging.** New tweets shift offsets; use \`max_id\`.
- **Treating the timeline cache as durable.** Design the rebuild path.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify and the asymmetry:</strong> <span style="color:#f0e2c8;">I would confirm chronological, the follower distribution and the latency target. Reads dominate: Twitter reported about 300K timeline reads per second against about 6,000 tweet writes in 2012, so precomputing timelines pays off.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Fan-out on write:</strong> <span style="color:#f0e2c8;">On a tweet, workers look up followers and insert the tweet id into each follower capped timeline list in an in-memory store. A read is then one list fetch plus hydration of 20 ids.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. The celebrity problem:</strong> <span style="color:#f0e2c8;">On my test graph, push cost 487 million inserts a day and one tweet from a 500,000-follower account took 50 s on one worker. Pull would cost 243 fetches per read. So I use a <strong style="color:#ffca28;">hybrid</strong>: accounts above a threshold are not fanned out, their recent tweets are merged in at read time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Choosing the threshold:</strong> <span style="color:#f0e2c8;">At 100,000 followers only 10 accounts are pulled, reads cost 6 fetches and the worst fan-out falls to 50,000. At 10,000 writes drop to 378 million but reads cost 56 fetches. I pick the lowest threshold whose read latency still fits the budget.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Edges:</strong> <span style="color:#f0e2c8;">Timelines store ids and are a rebuildable cache; inactive users are not fanned out and get rebuilt on return; deletes and blocks are enforced at hydration; paging uses <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_id</code> because ids are time-ordered.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not fan out on read for everyone?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every read would fetch and merge one list per followee, 243 on average in my graph, which is 2.43 billion fetches a day and a latency that grows with how many people you follow. Reads are the hot path, so we move work to the write side wherever the follower count allows.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep a tweet visible within 5 seconds for a 500,000-follower account?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either do not fan it out (pull it on read, the hybrid) or split the fan-out into batches across many workers so 500,000 inserts at 10,000 per second per worker finish in about a second on 50 workers. Most designs do the pull, because big accounts tweet often.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when the timeline cache loses a node?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The affected timelines are rebuilt on demand from user tweet lists by the pull path, then cached again. The tweet store and the graph are the sources of truth; the timeline is derived data.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a tweet deletion?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Write a tombstone in the tweet store so hydration drops it immediately for every reader, then remove the id from timelines in the background. Correctness relies on the read-time check, not on the cleanup finishing.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Ranked timeline instead of chronological?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Fan-out still produces candidates, but a ranking service scores them at read time and paging must use a per-session snapshot rather than <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">max_id</code>, because scores change between pages. That is the news feed design.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Fan-out on write (push) | Insert a new tweet id into every follower timeline |
| Fan-out on read (pull) | Build the timeline at read time by merging followee lists |
| Hybrid fan-out | Push below a follower threshold, pull above it |
| Write amplification | One logical write causing many physical writes |
| k-way merge | Merging k sorted lists by repeatedly taking the best head |
| Timeline cap | Maximum ids kept per precomputed timeline |

**Conclusion:** The home timeline is a choice of when to merge. Push makes reads one fetch but costs a write per follower; pull writes nothing but makes every read a 243-way merge in the example graph. The hybrid pushes for ordinary accounts and pulls the few very large ones, and the numbers show what it really buys: the worst single fan-out dropped from 500,000 to 50,000 at a cost of 6 fetches per read. Add capped id lists, hydration, on-demand rebuilds for inactive users and read-time visibility checks, and you have the design Twitter described publicly.`,
    examples: [
      {
        label: `Home timeline fan-out: push vs pull vs hybrid on a skewed follower graph, and the same timeline from all three via a k-way merge`,
        variants: [
          { tech: "node", code: `// Twitter-style home timelines: push vs pull vs hybrid fan-out, counted on a skewed follower graph.
const fmt = (n) => n.toLocaleString("en-US");
const USERS = 1_000_000, TWEETS_PER_USER = 2, READS_PER_USER = 10;
// skewed tiers: [accounts, followers each]
const tiers = [[10, 500_000], [990, 50_000], [99_000, 1_000], [900_000, 100]];
const followers = [];
for (const [n, f] of tiers) for (let i = 0; i < n; i++) followers.push(f);
const edges = followers.reduce((a, b) => a + b, 0);
console.log("== 1. Graph: " + fmt(USERS) + " users, " + fmt(edges) + " follow edges, avg " + Math.floor(edges / USERS) + " followees per user ==");
console.log("top account followers " + fmt(followers[0]) + ", median account followers " + fmt(followers[USERS / 2]));
const tweets = USERS * TWEETS_PER_USER, reads = USERS * READS_PER_USER;
console.log("per day: " + fmt(tweets) + " tweets, " + fmt(reads) + " timeline reads\\n");

console.log("strategy          timeline writes/day  fetches/read     fetches/day  largest fan-out");
const row = (name, writes, perRead, worst) =>
  console.log(name.padEnd(18) + fmt(writes).padStart(19) + String(perRead).padStart(14) + fmt(perRead * reads).padStart(16) + fmt(worst).padStart(17));
row("push (on write)", TWEETS_PER_USER * edges, 1, followers[0]);
row("pull (on read)", 0, Math.floor(edges / USERS), 0);
for (const T of [100_000, 10_000]) {
  let pushedEdges = 0, celebEdges = 0, celebs = 0, worst = 0;
  for (const f of followers) { if (f > T) { celebEdges += f; celebs++; } else { pushedEdges += f; worst = Math.max(worst, f); } }
  // a read = 1 precomputed list + one fetch per followed celebrity (average)
  const perRead = 1 + Math.ceil(celebEdges / USERS);
  row("hybrid T=" + fmt(T), TWEETS_PER_USER * pushedEdges, perRead, worst);
  console.log("                  (" + fmt(celebs) + " accounts above T are pulled at read time)");
}
const rate = 10_000;
console.log("\\npush: one tweet by the top account at " + fmt(rate) + " inserts/s (one fan-out worker) takes " + followers[0] / rate + " s to reach every follower");

console.log("\\n== 2. Same timeline from all three strategies (cap = 5 ids per cached timeline) ==");
const CAP = 5;
const follows = { alice: ["bob", "carol", "star"] };
const isCeleb = { star: true };
// [time, author, id]; ids are what the timeline stores, tweet bodies are hydrated later
const posted = [[1, "bob", "b1"], [2, "star", "s1"], [3, "carol", "c1"], [4, "bob", "b2"], [5, "star", "s2"],
  [6, "carol", "c2"], [7, "bob", "b3"], [8, "carol", "c3"], [9, "star", "s3"], [10, "bob", "b4"]];
const userTweets = {}, home = { alice: [] };
for (const [t, author, id] of posted) {
  (userTweets[author] ||= []).unshift({ t, id }); // each author keeps their own list, newest first
}
const mergeLists = (lists, limit) => { // k-way merge of newest-first lists
  const idx = lists.map(() => 0), out = [];
  while (out.length < limit) {
    let best = -1;
    for (let i = 0; i < lists.length; i++)
      if (idx[i] < lists[i].length && (best < 0 || lists[i][idx[i]].t > lists[best][idx[best]].t)) best = i;
    if (best < 0) break;
    out.push(lists[best][idx[best]++]);
  }
  return out;
};
const show = (name, list) => console.log(name.padEnd(8) + list.map((x) => x.id).join(" "));
// pull: merge every followee list at read time
show("pull", mergeLists(follows.alice.map((a) => userTweets[a]), CAP));
// push: each tweet is written into every follower list at post time, list trimmed to CAP
let writes = 0;
for (const [t, author, id] of posted) if (follows.alice.includes(author)) { home.alice.unshift({ t, id }); writes++; }
home.alice = home.alice.slice(0, CAP);
show("push", home.alice);
// hybrid: only non-celebrities are pushed; celebrities are merged in at read time
let hybridList = [], hybridWrites = 0;
for (const [t, author, id] of posted) if (follows.alice.includes(author) && !isCeleb[author]) { hybridList.unshift({ t, id }); hybridWrites++; }
hybridList = hybridList.slice(0, CAP);
show("hybrid", mergeLists([hybridList, ...follows.alice.filter((a) => isCeleb[a]).map((a) => userTweets[a])], CAP));
console.log("writes into alice timeline: push=" + writes + " hybrid=" + hybridWrites + "; reads fetch 1 list (push), 2 lists (hybrid), 3 lists (pull)");
const older = mergeLists(follows.alice.map((a) => userTweets[a].filter((x) => x.t < home.alice[CAP - 1].t)), CAP);
console.log("scroll past the cap: fall back to pull for tweets older than t=" + home.alice[CAP - 1].t + ": " + older.map((x) => x.id).join(" "));` },
          { tech: "python", code: `# Twitter-style home timelines: push vs pull vs hybrid fan-out, counted on a skewed follower graph.
def fmt(n):
    return f"{n:,}"


USERS, TWEETS_PER_USER, READS_PER_USER = 1_000_000, 2, 10
# skewed tiers: [accounts, followers each]
tiers = [(10, 500_000), (990, 50_000), (99_000, 1_000), (900_000, 100)]
followers = [f for n, f in tiers for _ in range(n)]
edges = sum(followers)
print("== 1. Graph: " + fmt(USERS) + " users, " + fmt(edges) + " follow edges, avg " + str(edges // USERS) + " followees per user ==")
print("top account followers " + fmt(followers[0]) + ", median account followers " + fmt(followers[USERS // 2]))
tweets, reads = USERS * TWEETS_PER_USER, USERS * READS_PER_USER
print("per day: " + fmt(tweets) + " tweets, " + fmt(reads) + " timeline reads\\n")

print("strategy          timeline writes/day  fetches/read     fetches/day  largest fan-out")


def row(name, writes, per_read, worst):
    print(name.ljust(18) + fmt(writes).rjust(19) + str(per_read).rjust(14) + fmt(per_read * reads).rjust(16) + fmt(worst).rjust(17))


row("push (on write)", TWEETS_PER_USER * edges, 1, followers[0])
row("pull (on read)", 0, edges // USERS, 0)
for T in (100_000, 10_000):
    pushed = celeb_edges = celebs = worst = 0
    for f in followers:
        if f > T:
            celeb_edges += f
            celebs += 1
        else:
            pushed += f
            worst = max(worst, f)
    per_read = 1 + -(-celeb_edges // USERS)
    row("hybrid T=" + fmt(T), TWEETS_PER_USER * pushed, per_read, worst)
    print("                  (" + fmt(celebs) + " accounts above T are pulled at read time)")
rate = 10_000
secs = followers[0] / rate
print("\\npush: one tweet by the top account at " + fmt(rate) + " inserts/s (one fan-out worker) takes " + (str(int(secs)) if secs == int(secs) else str(secs)) + " s to reach every follower")

print("\\n== 2. Same timeline from all three strategies (cap = 5 ids per cached timeline) ==")
CAP = 5
follows = {"alice": ["bob", "carol", "star"]}
is_celeb = {"star": True}
posted = [(1, "bob", "b1"), (2, "star", "s1"), (3, "carol", "c1"), (4, "bob", "b2"), (5, "star", "s2"),
          (6, "carol", "c2"), (7, "bob", "b3"), (8, "carol", "c3"), (9, "star", "s3"), (10, "bob", "b4")]
user_tweets = {}
for t, author, id_ in posted:
    user_tweets.setdefault(author, []).insert(0, {"t": t, "id": id_})


def merge_lists(lists, limit):  # k-way merge of newest-first lists
    idx = [0] * len(lists)
    out = []
    while len(out) < limit:
        best = -1
        for i, l in enumerate(lists):
            if idx[i] < len(l) and (best < 0 or l[idx[i]]["t"] > lists[best][idx[best]]["t"]):
                best = i
        if best < 0:
            break
        out.append(lists[best][idx[best]])
        idx[best] += 1
    return out


def show(name, lst):
    print(name.ljust(8) + " ".join(x["id"] for x in lst))


show("pull", merge_lists([user_tweets[a] for a in follows["alice"]], CAP))
home, writes = [], 0
for t, author, id_ in posted:
    if author in follows["alice"]:
        home.insert(0, {"t": t, "id": id_})
        writes += 1
home = home[:CAP]
show("push", home)
hybrid, hybrid_writes = [], 0
for t, author, id_ in posted:
    if author in follows["alice"] and not is_celeb.get(author):
        hybrid.insert(0, {"t": t, "id": id_})
        hybrid_writes += 1
hybrid = hybrid[:CAP]
show("hybrid", merge_lists([hybrid] + [user_tweets[a] for a in follows["alice"] if is_celeb.get(a)], CAP))
print("writes into alice timeline: push=" + str(writes) + " hybrid=" + str(hybrid_writes) + "; reads fetch 1 list (push), 2 lists (hybrid), 3 lists (pull)")
cut = home[CAP - 1]["t"]
older = merge_lists([[x for x in user_tweets[a] if x["t"] < cut] for a in follows["alice"]], CAP)
print("scroll past the cap: fall back to pull for tweets older than t=" + str(cut) + ": " + " ".join(x["id"] for x in older))` },
        ],
      },
    ],
  },
  {
    title: `How would you design a real-time chat system?`,
    difficulty: "hard",
    seoDescription: `Design real-time chat like WhatsApp or Slack: gateways, per-conversation sequence numbers, idempotent sends, offline sync, gap repair and storage math.`,
    description: `**Question presented to candidate:**
"Design a chat app like WhatsApp or Messenger: one-to-one and group conversations, messages delivered in real time when the other person is online, nothing lost when they are offline, and history synced across a user's devices."

**What a strong answer should cover:**
- Requirements and capacity: messages per second, storage per day, concurrent connections and how many gateway servers they need
- Persistent connections (WebSocket) to a **gateway** tier, a **session registry** mapping users to gateways, and routing a message to the recipient gateway; the message is **stored before it is acknowledged**
- **Per-conversation sequence numbers** for ordering, **client message ids** so a retried send is stored once, and **sync from the last sequence seen** for offline users and new devices
- Gap detection on the client (held messages, gap timer, fetch the missing range) and push notifications for offline users
- Storage keyed by conversation and sequence in a wide-column store, group fan-out per gateway rather than per member, and what breaks at 10x (very large groups, hot conversations, reconnect storms)

**Clarifying questions expected:**
- One-to-one only, or groups too? How large can a group be?
- Must history be stored on the server and synced to many devices, or only relayed (store-and-forward until delivered)?
- Which receipts are needed: sent, delivered, read? Typing indicators and presence?

**Code / implementation expected:** Optional — a simulation of the delivery protocol: sequence numbers, a lost ack and a deduplicated retry, offline sync, a delayed and a dropped message repaired by the client; the example does that.`,
    answer: `**Target Audience:** Engineers preparing for a system design round. You know HTTP and what a database is; persistent connections, sequencing and sync are explained from scratch.
**Difficulty:** Hard
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Product facts are cited inline, checked in October 2026.

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts with the vocabulary an interviewer expects. The capacity numbers and the delivery trace come from the example program, quoted in full in the **Verified** section. Connection-level topics have their own pages: [WebSockets vs polling vs SSE](/interview-question/when-would-you-use-websockets-vs-polling-vs-sse), [presence and sticky sessions](/interview-question/websocket-presence-sticky-sessions-and-resume-do-you-need-sticky-lb) and [scaling to 1M WebSocket connections](/interview-question/how-do-you-scale-websockets-to-1m-connections-with-redis-pub-sub). This page is about the messages: ordering, delivery and sync.

## 1. Why This Even Matters — A Story First

Think of two friends passing numbered notes through a row of classmates. Each note gets a number on the back: 1, 2, 3. If note 4 arrives before note 3, the reader knows to wait. If note 3 never comes, the reader asks the teacher, who keeps a copy of every note in a folder, for "everything after 2". If the writer is not sure the first attempt got through and sends the same note again, the teacher sees it has the same label and does not file it twice.

That is a chat system. The **teacher's folder** is the message store, the **numbers** are per-conversation sequence numbers, the **labels** are client message ids, and "everything after 2" is sync. The fast path (classmates passing notes) is the live connection; the folder is what makes it reliable when the fast path fails.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| 1:1 only, or groups? Maximum group size? | Groups of 1,000 or 100,000 change fan-out completely |
| Server-side history synced to many devices, or relay until delivered? | Decides whether storage is permanent and how sync works |
| Daily users and messages per user? | Drives message rate, storage and connection count |
| Receipts (delivered, read), typing, presence? | Each is extra traffic; presence is often the largest volume |
| Media (photos, voice)? | Media goes through object storage and a CDN, not the chat path |
| End-to-end encryption? | The server then stores ciphertext it cannot read or search |

## 3. Requirements

**Functional**: send and receive messages in 1:1 and group conversations; delivery in real time when online; offline delivery on reconnect plus a push notification; history on every device; sent/delivered/read receipts.

**Non-functional**: delivery latency under a few hundred milliseconds when both are online; **no acknowledged message is ever lost**; messages appear in the same order for everyone in a conversation; highly available; scales to hundreds of millions of daily users.

## 4. Capacity Estimate

Assumptions: 500M daily users, 40 messages per user per day, 300 bytes stored per message (text plus ids, timestamps and indexes), replication factor 3, 30% of daily users connected at peak, 500,000 sockets per gateway server.

~~~text
== 1. Capacity (assumptions: 500M DAU, 40 messages/user/day, 300 bytes stored per message, RF 3) ==
messages/day 20,000,000,000, avg 231,481/s, peak (x3) 694,443/s
storage/day 6 TB raw, 18 TB with 3 replicas
peak concurrent sockets 150,000,000 (30% of DAU) -> 300 gateways at 500,000 sockets each
~~~

Two conclusions: the store must absorb close to 700,000 writes per second at peak and grow by 18 TB a day, which points to a horizontally partitioned, write-optimised store; and the connection tier is hundreds of machines whose main job is holding idle sockets. A year of history at this rate is 18 x 365 = 6,570 TB, so retention policy and tiering old history to cheaper storage matter.

## 5. API

Over the WebSocket (JSON frames shown for clarity; production apps often use a compact binary encoding):

~~~json
{ "type": "send",  "conv": "dm1", "client_id": "a-2", "text": "lunch?" }
{ "type": "ack",   "conv": "dm1", "client_id": "a-2", "seq": 2 }
{ "type": "msg",   "conv": "dm1", "seq": 2, "from": "alice", "text": "lunch?" }
{ "type": "sync",  "conv": "dm1", "after": 2 }
{ "type": "read",  "conv": "dm1", "up_to": 8 }
~~~

Plus ordinary HTTP endpoints for history pages (\`GET /conversations/{id}/messages?before_seq=...\`), conversation lists and media upload.

## 6. Data Model

| Table | Partition key | Clustering | Columns |
| :--- | :--- | :--- | :--- |
| messages | \`conversation_id\` | \`seq\` descending | sender, client_id, body, created_at |
| conversation_members | \`conversation_id\` | \`user_id\` | role, last_read_seq |
| user_conversations | \`user_id\` | \`last_activity\` | conversation_id, unread count |
| dedup (TTL a few days) | \`conversation_id + client_id\` | | seq |

Partitioning by conversation and clustering by sequence makes the two hot queries ("append to this conversation", "give me messages after seq N") single-partition reads and writes. That is the shape of wide-column stores such as Cassandra and ScyllaDB. Discord, for example, stores trillions of messages this way and moved from a 177-node Cassandra cluster to 72 ScyllaDB nodes, citing garbage-collection pauses and hot partitions (ScyllaDB, "How Discord Stores Trillions of Messages", 2023). Very busy conversations grow huge partitions, so the partition key often adds a time bucket: \`(conversation_id, month)\`.

## 7. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 820 320" role="img" aria-label="Clients on gateways, chat service stores the message, looks up the session registry and routes to the recipient gateway or a push service">
  <defs>
    <marker id="sd15q3-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="110" height="60" rx="10"/>
  <text class="d-text" x="75" y="76" text-anchor="middle">alice</text>
  <rect class="d-box" x="20" y="220" width="110" height="60" rx="10"/>
  <text class="d-text" x="75" y="256" text-anchor="middle">bob</text>
  <rect class="d-box-accent" x="190" y="40" width="130" height="60" rx="10"/>
  <text class="d-text" x="255" y="76" text-anchor="middle">gateway 1</text>
  <rect class="d-box-accent" x="190" y="220" width="130" height="60" rx="10"/>
  <text class="d-text" x="255" y="256" text-anchor="middle">gateway 2</text>
  <rect class="d-box" x="400" y="120" width="150" height="80" rx="10"/>
  <text class="d-text" x="475" y="155" text-anchor="middle">chat service</text>
  <text class="d-sub" x="475" y="178" text-anchor="middle">assign seq</text>
  <rect class="d-box-muted" x="630" y="20" width="170" height="60" rx="10"/>
  <text class="d-text" x="715" y="55" text-anchor="middle">message store</text>
  <rect class="d-box-muted" x="630" y="130" width="170" height="60" rx="10"/>
  <text class="d-text" x="715" y="165" text-anchor="middle">session registry</text>
  <rect class="d-box-muted" x="630" y="240" width="170" height="60" rx="10"/>
  <text class="d-text" x="715" y="275" text-anchor="middle">push service</text>
  <line class="d-edge" x1="130" y1="70" x2="186" y2="70" marker-end="url(#sd15q3-arrow)"/>
  <line class="d-edge" x1="186" y1="250" x2="134" y2="250" marker-end="url(#sd15q3-arrow)"/>
  <line class="d-edge" x1="320" y1="80" x2="396" y2="140" marker-end="url(#sd15q3-arrow)"/>
  <line class="d-edge-accent" x1="400" y1="185" x2="324" y2="240" marker-end="url(#sd15q3-arrow)"/>
  <line class="d-edge" x1="550" y1="135" x2="626" y2="60" marker-end="url(#sd15q3-arrow)"/>
  <line class="d-edge-dashed" x1="550" y1="160" x2="626" y2="160" marker-end="url(#sd15q3-arrow)"/>
  <line class="d-edge-dashed" x1="550" y1="185" x2="626" y2="260" marker-end="url(#sd15q3-arrow)"/>
</svg>

The send path: alice gateway forwards to the chat service, which assigns the next sequence number, writes to the message store, then looks up where bob is connected and routes to that gateway, or to the push service if bob is offline.

📌 **Interview term: gateway (connection server)** — a server whose job is holding many long-lived client connections (WebSockets), authenticating them and moving frames in and out. It keeps no message state, so it can crash and clients simply reconnect elsewhere.

📌 **Interview term: session registry** — a fast key-value map from user (or device) to the gateway currently holding its connection, updated on connect and disconnect, with a TTL refreshed by heartbeats.

The order of operations matters: **store, then acknowledge, then deliver**. If the chat service crashes after storing but before delivering, bob gets the message at his next sync. If it crashes before storing, alice never got an ack and will retry.

## 8. Deep Dive 1: Ordering and Idempotent Sends

📌 **Interview term: per-conversation sequence number** — a counter per conversation, assigned by the service that owns that conversation when it stores a message: 1, 2, 3. It defines one order that every member sees, and lets a client detect a gap.

To assign sequence numbers without races, each conversation has one owner at a time: route all writes for a conversation to one chat-service instance (by hashing the conversation id), or use a conditional write / atomic increment in the store. Wall-clock timestamps are not used for order; two devices clocks disagree.

📌 **Interview term: client message id** — a unique id the sender generates for each message (\`a-2\`). The server keeps a mapping from (conversation, client id) to sequence, so a retry after a lost acknowledgement returns the original sequence instead of storing a second copy. This is [idempotency](/interview-question/what-is-idempotency-and-why-does-it-matter) applied to chat.

From the run:

~~~text
  alice a-2 'lunch?' -> seq 2 (ack lost) | bob shows seq 2
  alice retry a-2 -> already stored as seq 2, nothing re-sent
  stored messages in dm1: 2
~~~

## 9. Deep Dive 2: Offline Users, Sync and Gap Repair

Each client remembers, per conversation, the last sequence it has applied. On reconnect it asks for everything after that:

~~~text
  bob goes offline
  alice a-3 '12:30?' -> seq 3 acked | recipient offline, push queued
  alice a-4 'or 13:00' -> seq 4 acked | recipient offline, push queued
  bob reconnects to gw1, sync(after=2) returns seq 3,4
~~~

Note bob reconnected to a **different gateway**. Because messages live in the store and the registry is updated on connect, nothing depends on which gateway he lands on, so a plain load balancer works; see the [sticky sessions page](/interview-question/websocket-presence-sticky-sessions-and-resume-do-you-need-sticky-lb).

📌 **Interview term: sync cursor (last seen sequence)** — the per-conversation position a device has applied. New devices start at 0 (or at a recent point and page back on demand), which is how history appears on a new phone.

Live delivery can still misbehave: a copy can arrive late or be lost when a gateway restarts. The client applies messages strictly in sequence and holds anything after a gap:

~~~text
  alice a-5 'booked' -> seq 5 acked | bob (delayed)
  alice a-6 'see you' -> seq 6 acked | bob holds seq 6 (expected 5, gap)
  bob shows seq 5, then held seq 6   (delayed copy arrives)
  alice a-7 'bring id' -> seq 7 acked | bob (dropped in transit)
  alice a-8 'thanks' -> seq 8 acked | bob holds seq 8 (expected 7, gap)
  bob gap timer fires: fetch after seq 6 -> seq 7
  bob shows seq 7, then held seq 8
~~~

📌 **Interview term: gap detection** — noticing a missing sequence number (received 8 while expecting 7), holding later messages briefly, and fetching the missing range from the store if it does not arrive within a short timer.

Push notifications for offline users go through the [notification system](/interview-question/how-would-you-design-a-notification-system). In the run two notifications were queued for two messages; a real system collapses them into one per conversation ("2 new messages from alice") to avoid buzzing a phone repeatedly.

## 10. Deep Dive 3: Groups and Fan-Out

A group message is stored **once** (one sequence in the group conversation) and delivered to each online member. The router groups recipients by gateway, so the network cost is one publish per gateway, and each gateway writes to its local sockets:

~~~text
  recipients 5, gateway publishes 3, stored copies 1
~~~

📌 **Interview term: pub/sub backplane** — a [publish-subscribe](/interview-question/what-is-the-publish-subscribe-pattern) layer (for example Redis Pub/Sub or a log such as Kafka) that lets the chat service send to "whichever gateways hold members of conversation X" without knowing every socket.

Large groups change the math: a 100,000-member channel posting once a second would mean 100,000 deliveries per second from one conversation. Designs for that cap group size, deliver only to members currently viewing the channel, and let others sync lazily when they open it, with unread counts computed from \`last_read_seq\`.

📌 **Interview term: read receipt** — a member reporting the highest sequence it has read (\`last_read_seq\`); one number per member per conversation, not one flag per message.

## 11. What Breaks First at 10x

| At 10x message volume | Fix |
| :--- | :--- |
| 7 million writes per second to the store | More partitions; batch writes per conversation owner |
| Reconnect storms after a gateway deploy or outage | Drain gateways slowly, jittered client backoff, sync with \`after\` so reconnects are cheap |
| Hot conversations (huge groups) | Lazy delivery for non-viewers, separate tier for broadcast channels |
| Session registry churn | Shard it, keep TTL heartbeats coarse, tolerate brief staleness (a miss only means a sync later) |
| Storage growth (65,700 TB a year) | Tier old history to object storage, compress, retention per plan |

## 12. Verified: Running the Code

The example **"Chat delivery: per-conversation sequence numbers, idempotent retries, offline sync, gap repair and per-gateway group fan-out"** simulates one chat service: an array per conversation is the message store, a map is the session registry, another map is the dedup table, and the "network" is a function that can deliver, delay or drop a copy. What it leaves out: real sockets, persistence and replication, concurrency between chat-service instances, receipts and encryption.

Full output (identical in Node and Python):

~~~text
== 1. Capacity (assumptions: 500M DAU, 40 messages/user/day, 300 bytes stored per message, RF 3) ==
messages/day 20,000,000,000, avg 231,481/s, peak (x3) 694,443/s
storage/day 6 TB raw, 18 TB with 3 replicas
peak concurrent sockets 150,000,000 (30% of DAU) -> 300 gateways at 500,000 sockets each

== 2. Delivery simulation (store = append-only log per conversation) ==
  alice a-1 'hi' -> seq 1 acked | bob shows seq 1
  alice a-2 'lunch?' -> seq 2 (ack lost) | bob shows seq 2
  alice retry a-2 -> already stored as seq 2, nothing re-sent
  stored messages in dm1: 2
  bob goes offline
  alice a-3 '12:30?' -> seq 3 acked | recipient offline, push queued
  alice a-4 'or 13:00' -> seq 4 acked | recipient offline, push queued
  bob reconnects to gw1, sync(after=2) returns seq 3,4
  bob shows seq 3
  bob shows seq 4
  alice a-5 'booked' -> seq 5 acked | bob (delayed)
  alice a-6 'see you' -> seq 6 acked | bob holds seq 6 (expected 5, gap)
  bob shows seq 5, then held seq 6   (delayed copy arrives)
  alice a-7 'bring id' -> seq 7 acked | bob (dropped in transit)
  alice a-8 'thanks' -> seq 8 acked | bob holds seq 8 (expected 7, gap)
  bob gap timer fires: fetch after seq 6 -> seq 7
  bob shows seq 7, then held seq 8
  bob screen: 1:hi | 2:lunch? | 3:12:30? | 4:or 13:00 | 5:booked | 6:see you | 7:bring id | 8:thanks
  push notifications queued: 2 (bob:dm1, bob:dm1)

== 3. Group of 6: fan-out is per gateway, not per member ==
  alice a-1 'standup in 5' -> seq 1 acked | bob shows seq 1; carl shows seq 1; dana shows seq 1; eve shows seq 1; fay shows seq 1
  recipients 5, gateway publishes 3, stored copies 1
~~~

## 13. Edge Cases Worth Knowing

- **Multiple devices per user.** The registry maps each device, deliveries go to all of them, and each device keeps its own sync cursor.
- **Edits and deletes** are new events with their own sequence numbers that refer to the original message, so sync replays them in order.
- **Clock-based ordering** breaks when phones have wrong clocks; only server-assigned sequence numbers define order.
- **Dedup table retention**: keep client ids long enough to cover the longest retry window (days, for a phone that was offline), then expire.
- **End-to-end encryption**: the server stores and routes ciphertext; search and server-side moderation are no longer possible, and multi-device needs per-device keys.

## Common Pitfalls

- **Delivering before storing.** A crash then loses an acknowledged message; store first, then ack, then deliver.
- **No client message id.** A lost ack makes the retry a duplicate; the run stored 2 messages, not 3, because of dedup.
- **Ordering by timestamps.** Device clocks disagree; use per-conversation sequence numbers.
- **Relying only on the live path.** The run lost one copy in transit; only gap detection plus sync repaired it.
- **Fanning out per member across the network.** Group by gateway: 5 recipients became 3 publishes.
- **Requiring sticky load balancing.** Gateways are stateless relays; reconnecting to any gateway works because state is in the store and registry.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify and size:</strong> <span style="color:#f0e2c8;">Groups and their size, server history and multi-device, receipts and presence. At 500M daily users sending 40 messages each that is 20 billion messages a day, about 694,000 per second at peak, 18 TB a day with three replicas, and 150 million sockets needing about 300 gateways.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Architecture:</strong> <span style="color:#f0e2c8;">Clients hold a WebSocket to a stateless <strong style="color:#ffca28;">gateway</strong>. A <strong style="color:#ffca28;">session registry</strong> maps each device to its gateway. The chat service assigns the next <strong style="color:#ffca28;">per-conversation sequence number</strong>, writes to a store partitioned by conversation and clustered by sequence, acks the sender, and routes to the recipient gateway or the push service.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Reliability:</strong> <span style="color:#f0e2c8;">Store, then ack, then deliver. Each send carries a <strong style="color:#ffca28;">client message id</strong>, so a retry after a lost ack returns the same sequence instead of a duplicate. Every device keeps a sync cursor and on reconnect asks for messages after its last sequence.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Live path repairs:</strong> <span style="color:#f0e2c8;">The client applies messages in order, holds anything after a gap and fetches the missing range if it does not arrive. In my simulation a delayed copy was reordered and a dropped one was fetched on the gap timer, so the screen ended with 1 to 8 in order.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Scale:</strong> <span style="color:#f0e2c8;">Group messages are stored once and published once per gateway; huge groups deliver only to active viewers. At 10x the first problems are store write rate, reconnect storms and hot conversations.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you guarantee ordering in a group chat?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One owner assigns sequence numbers per conversation, either by routing all writes for that conversation to one service instance or with an atomic increment in the store. Clients display by sequence, not by arrival or device time, and hold anything after a gap.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the recipient is offline for a week?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Messages are already stored. A push notification goes out, collapsed per conversation. When the device reconnects it sends its last sequence for each conversation and pulls everything newer, paging if there is a lot.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Do you need sticky sessions on the load balancer?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">No. The gateway holds only the socket. All message state is in the store and the session registry is updated on connect, so a client can reconnect to any gateway; in the run bob moved from gateway 2 to gateway 1 and synced without loss.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why a wide-column store rather than a relational database?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The access pattern is append to one conversation and read a range by sequence, at hundreds of thousands of writes per second. Partitioning by conversation and clustering by sequence makes both single-partition operations that scale out by adding nodes. Discord runs trillions of messages on this model.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do read receipts scale in a 500-member group?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Store one number per member per conversation, the highest sequence read, and send it as an event. Unread counts and the read-by list are computed from those numbers instead of a flag per message per member.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Gateway (connection server) | Stateless server holding client WebSockets |
| Session registry | Map from user or device to its current gateway |
| Per-conversation sequence number | Server-assigned order within one conversation |
| Client message id | Sender-generated id that makes retries idempotent |
| Sync cursor | Last sequence a device has applied per conversation |
| Gap detection | Holding messages after a missing sequence and fetching the gap |
| Pub/sub backplane | Layer that routes messages to the gateways holding recipients |
| Read receipt | Highest sequence a member has read |

**Conclusion:** A chat system is a fast path and a safety net. The fast path is stateless gateways, a session registry and routing to the recipient gateway; the safety net is a store partitioned by conversation, server-assigned sequence numbers, client message ids for idempotent retries and sync from the last sequence seen. The simulation shows each piece earning its place: a lost ack produced no duplicate, an offline week becomes one sync call, and a dropped copy was repaired by gap detection. At 20 billion messages a day the numbers (694,000 writes per second at peak, 18 TB a day) explain the choice of store and the size of the gateway tier.`,
    examples: [
      {
        label: `Chat delivery: per-conversation sequence numbers, idempotent retries, offline sync, gap repair and per-gateway group fan-out`,
        variants: [
          { tech: "node", code: `// Chat delivery: per-conversation sequence numbers, idempotent sends, offline sync, gap repair, group fan-out.
const fmt = (n) => n.toLocaleString("en-US");
console.log("== 1. Capacity (assumptions: 500M DAU, 40 messages/user/day, 300 bytes stored per message, RF 3) ==");
const msgsDay = 500_000_000 * 40;
console.log("messages/day " + fmt(msgsDay) + ", avg " + fmt(Math.floor(msgsDay / 86400)) + "/s, peak (x3) " + fmt(Math.floor(msgsDay / 86400) * 3) + "/s");
console.log("storage/day " + fmt(msgsDay * 300 / 1e12) + " TB raw, " + fmt(msgsDay * 300 * 3 / 1e12) + " TB with 3 replicas");
const online = 500_000_000 * 30 / 100, perGw = 500_000;
console.log("peak concurrent sockets " + fmt(online) + " (30% of DAU) -> " + fmt(online / perGw) + " gateways at " + fmt(perGw) + " sockets each");

console.log("\\n== 2. Delivery simulation (store = append-only log per conversation) ==");
const store = {}, seqOf = {}, dedup = {}, registry = {}, pushes = [];
let gatewaySends = 0;
const clients = {};
const client = (u) => (clients[u] ||= { lastSeq: {}, held: {}, shown: [] });
function apply(u, conv, m) { // client side: apply in order, hold anything after a gap
  const c = client(u), want = (c.lastSeq[conv] || 0) + 1;
  if (m.seq < want) return u + " ignores duplicate seq " + m.seq;
  if (m.seq > want) { c.held[m.seq] = m; return u + " holds seq " + m.seq + " (expected " + want + ", gap)"; }
  c.shown.push(m.seq + ":" + m.text); c.lastSeq[conv] = m.seq;
  let note = u + " shows seq " + m.seq;
  while (c.held[c.lastSeq[conv] + 1]) { const h = c.held[c.lastSeq[conv] + 1]; delete c.held[h.seq]; c.shown.push(h.seq + ":" + h.text); c.lastSeq[conv] = h.seq; note += ", then held seq " + h.seq; }
  return note;
}
function send(conv, members, from, clientId, text, opts = {}) {
  const key = conv + "/" + clientId;
  if (dedup[key]) return console.log("  " + from + " retry " + clientId + " -> already stored as seq " + dedup[key] + ", nothing re-sent");
  const seq = (seqOf[conv] = (seqOf[conv] || 0) + 1);
  const m = { seq, text };
  (store[conv] ||= []).push(m); dedup[key] = seq;
  const byGw = {};
  for (const u of members) if (u !== from) {
    if (!registry[u]) { pushes.push(u + ":" + conv); continue; }
    (byGw[registry[u]] ||= []).push(u);
  }
  const notes = [];
  for (const gw of Object.keys(byGw).sort()) {
    gatewaySends++; // one publish per gateway, which then writes to each local socket
    for (const u of byGw[gw]) {
      if (opts.drop === u) notes.push(u + " (dropped in transit)");
      else if (opts.delay === u) notes.push(u + " (delayed)");
      else notes.push(apply(u, conv, m));
    }
  }
  console.log("  " + from + " " + clientId + " '" + text + "' -> seq " + seq + (opts.ackLost ? " (ack lost)" : " acked") + (notes.length ? " | " + notes.join("; ") : " | recipient offline, push queued"));
  return m;
}
const dm = ["alice", "bob"];
registry.alice = "gw1"; registry.bob = "gw2";
send("dm1", dm, "alice", "a-1", "hi");
send("dm1", dm, "alice", "a-2", "lunch?", { ackLost: true });
send("dm1", dm, "alice", "a-2", "lunch?");
console.log("  stored messages in dm1: " + store.dm1.length);
delete registry.bob; console.log("  bob goes offline");
send("dm1", dm, "alice", "a-3", "12:30?");
send("dm1", dm, "alice", "a-4", "or 13:00");
registry.bob = "gw1";
const missed = store.dm1.filter((m) => m.seq > client("bob").lastSeq.dm1);
console.log("  bob reconnects to gw1, sync(after=" + client("bob").lastSeq.dm1 + ") returns seq " + missed.map((m) => m.seq).join(","));
for (const m of missed) console.log("  " + apply("bob", "dm1", m));
const late = send("dm1", dm, "alice", "a-5", "booked", { delay: "bob" });
send("dm1", dm, "alice", "a-6", "see you");
console.log("  " + apply("bob", "dm1", late) + "   (delayed copy arrives)");
send("dm1", dm, "alice", "a-7", "bring id", { drop: "bob" });
send("dm1", dm, "alice", "a-8", "thanks");
const gapFrom = client("bob").lastSeq.dm1;
const repair = store.dm1.filter((m) => m.seq > gapFrom && !client("bob").held[m.seq]);
console.log("  bob gap timer fires: fetch after seq " + gapFrom + " -> seq " + repair.map((m) => m.seq).join(","));
for (const m of repair) console.log("  " + apply("bob", "dm1", m));
console.log("  bob screen: " + client("bob").shown.join(" | "));
console.log("  push notifications queued: " + pushes.length + " (" + pushes.join(", ") + ")");

console.log("\\n== 3. Group of 6: fan-out is per gateway, not per member ==");
const group = ["alice", "bob", "carl", "dana", "eve", "fay"];
registry.carl = "gw2"; registry.dana = "gw2"; registry.eve = "gw3"; registry.fay = "gw3";
gatewaySends = 0;
send("g1", group, "alice", "a-1", "standup in 5");
console.log("  recipients 5, gateway publishes " + gatewaySends + ", stored copies " + store.g1.length);` },
          { tech: "python", code: `# Chat delivery: per-conversation sequence numbers, idempotent sends, offline sync, gap repair, group fan-out.
def fmt(n):
    return f"{n:,}"


print("== 1. Capacity (assumptions: 500M DAU, 40 messages/user/day, 300 bytes stored per message, RF 3) ==")
msgs_day = 500_000_000 * 40
print("messages/day " + fmt(msgs_day) + ", avg " + fmt(msgs_day // 86400) + "/s, peak (x3) " + fmt(msgs_day // 86400 * 3) + "/s")
print("storage/day " + fmt(msgs_day * 300 // 10**12) + " TB raw, " + fmt(msgs_day * 300 * 3 // 10**12) + " TB with 3 replicas")
online, per_gw = 500_000_000 * 30 // 100, 500_000
print("peak concurrent sockets " + fmt(online) + " (30% of DAU) -> " + fmt(online // per_gw) + " gateways at " + fmt(per_gw) + " sockets each")

print("\\n== 2. Delivery simulation (store = append-only log per conversation) ==")
store, seq_of, dedup, registry, pushes, clients = {}, {}, {}, {}, [], {}
gateway_sends = 0


def client(u):
    return clients.setdefault(u, {"last": {}, "held": {}, "shown": []})


def apply(u, conv, m):
    c = client(u)
    want = c["last"].get(conv, 0) + 1
    if m["seq"] < want:
        return f"{u} ignores duplicate seq {m['seq']}"
    if m["seq"] > want:
        c["held"][m["seq"]] = m
        return f"{u} holds seq {m['seq']} (expected {want}, gap)"
    c["shown"].append(f"{m['seq']}:{m['text']}")
    c["last"][conv] = m["seq"]
    note = f"{u} shows seq {m['seq']}"
    while c["last"][conv] + 1 in c["held"]:
        h = c["held"].pop(c["last"][conv] + 1)
        c["shown"].append(f"{h['seq']}:{h['text']}")
        c["last"][conv] = h["seq"]
        note += f", then held seq {h['seq']}"
    return note


def send(conv, members, frm, client_id, text, ack_lost=False, drop=None, delay=None):
    global gateway_sends
    key = conv + "/" + client_id
    if key in dedup:
        print(f"  {frm} retry {client_id} -> already stored as seq {dedup[key]}, nothing re-sent")
        return None
    seq = seq_of[conv] = seq_of.get(conv, 0) + 1
    m = {"seq": seq, "text": text}
    store.setdefault(conv, []).append(m)
    dedup[key] = seq
    by_gw = {}
    for u in members:
        if u == frm:
            continue
        if u not in registry:
            pushes.append(u + ":" + conv)
            continue
        by_gw.setdefault(registry[u], []).append(u)
    notes = []
    for gw in sorted(by_gw):
        gateway_sends += 1
        for u in by_gw[gw]:
            if drop == u:
                notes.append(u + " (dropped in transit)")
            elif delay == u:
                notes.append(u + " (delayed)")
            else:
                notes.append(apply(u, conv, m))
    status = " (ack lost)" if ack_lost else " acked"
    tail = " | " + "; ".join(notes) if notes else " | recipient offline, push queued"
    print(f"  {frm} {client_id} '{text}' -> seq {seq}{status}{tail}")
    return m


dm = ["alice", "bob"]
registry["alice"], registry["bob"] = "gw1", "gw2"
send("dm1", dm, "alice", "a-1", "hi")
send("dm1", dm, "alice", "a-2", "lunch?", ack_lost=True)
send("dm1", dm, "alice", "a-2", "lunch?")
print("  stored messages in dm1: " + str(len(store["dm1"])))
del registry["bob"]
print("  bob goes offline")
send("dm1", dm, "alice", "a-3", "12:30?")
send("dm1", dm, "alice", "a-4", "or 13:00")
registry["bob"] = "gw1"
missed = [m for m in store["dm1"] if m["seq"] > client("bob")["last"]["dm1"]]
print(f"  bob reconnects to gw1, sync(after={client('bob')['last']['dm1']}) returns seq " + ",".join(str(m["seq"]) for m in missed))
for m in missed:
    print("  " + apply("bob", "dm1", m))
late = send("dm1", dm, "alice", "a-5", "booked", delay="bob")
send("dm1", dm, "alice", "a-6", "see you")
print("  " + apply("bob", "dm1", late) + "   (delayed copy arrives)")
send("dm1", dm, "alice", "a-7", "bring id", drop="bob")
send("dm1", dm, "alice", "a-8", "thanks")
gap_from = client("bob")["last"]["dm1"]
repair = [m for m in store["dm1"] if m["seq"] > gap_from and m["seq"] not in client("bob")["held"]]
print(f"  bob gap timer fires: fetch after seq {gap_from} -> seq " + ",".join(str(m["seq"]) for m in repair))
for m in repair:
    print("  " + apply("bob", "dm1", m))
print("  bob screen: " + " | ".join(client("bob")["shown"]))
print(f"  push notifications queued: {len(pushes)} (" + ", ".join(pushes) + ")")

print("\\n== 3. Group of 6: fan-out is per gateway, not per member ==")
group = ["alice", "bob", "carl", "dana", "eve", "fay"]
registry.update({"carl": "gw2", "dana": "gw2", "eve": "gw3", "fay": "gw3"})
gateway_sends = 0
send("g1", group, "alice", "a-1", "standup in 5")
print(f"  recipients 5, gateway publishes {gateway_sends}, stored copies {len(store['g1'])}")` },
        ],
      },
    ],
  },
  {
    title: `How would you design Instagram?`,
    difficulty: "hard",
    seoDescription: `Design Instagram: direct-to-storage photo uploads, async resizing, CDN delivery, sharded metadata with Instagram-style 64-bit IDs, and capacity math.`,
    description: `**Question presented to candidate:**
"Design Instagram. Users upload photos with captions, follow other users, see a feed of photos from people they follow, and like and comment. Assume a hundred million uploads a day and a few hundred million daily viewers."

**What a strong answer should cover:**
- Capacity: uploads per second, storage per day and per year for several resized variants, and image views per second, which shows the system is a read-heavy media delivery problem
- The upload path: client uploads **directly to object storage** with a presigned URL, an event triggers **asynchronous processing** (resize into variants, strip metadata, moderation), and the post becomes visible when processing finishes
- Serving images through a **CDN** with immutable, content-addressed URLs, and keeping the origin out of the read path
- Metadata (users, posts, follows, likes) in a **sharded relational store** with **logical shards** mapped onto fewer physical servers, and IDs that embed time and shard (Instagram published a 41-bit time, 13-bit shard, 10-bit sequence layout)
- The feed built by fan-out as in the timeline design, like counters aggregated asynchronously, and what breaks at 10x (hot posts, celebrity accounts, storage cost)

**Clarifying questions expected:**
- Photos only, or video and stories too? (Stories add expiry; video is the YouTube problem.)
- Which features are in scope: feed, likes, comments, search, explore?
- What is the read to write ratio and latency target for the feed?

**Code / implementation expected:** Optional — an ID generator that embeds time and logical shard, routing a post to its database from its id, and the effect of doubling the servers; the example does that and computes the capacity numbers.`,
    answer: `**Target Audience:** Engineers preparing for a system design round. You know what a server, a database and HTTP are; storage, CDN and sharding ideas are defined as we go.
**Difficulty:** Hard
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 (all four print identical output). Instagram engineering facts are cited inline, checked in October 2026.

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts. Numbers come from the example program and are quoted in full in the **Verified** section. The feed itself is covered by [the news feed design](/interview-question/how-would-you-design-a-news-feed-system) and [Twitter timeline fan-out](/interview-question/how-would-you-design-twitter-s-timeline-at-scale); this page focuses on what is special about Instagram: photos and the metadata around them.

## 1. Why This Even Matters — A Story First

Picture a huge photo lab. People drop off films all day; the lab develops each one, makes prints in four sizes, files a card in a cabinet saying whose photo it is and when it was taken, and then puts copies of the prints in shop windows all over town so anyone can look without coming to the lab.

Three things make the lab work. The **developing** happens in the back room, not at the counter, so the queue at the counter stays short. The **cabinet cards** are split across many drawers, and each card number says which drawer it lives in. And almost nobody visits the lab itself: they look at the **shop windows**. Instagram is that lab: asynchronous processing, sharded metadata with smart ids, and a CDN.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Photos only, or video and stories? | Video needs transcoding and adaptive streaming; stories need expiry |
| Uploads per day and viewers per day? | Storage grows with uploads; bandwidth grows with views |
| Which features: feed, likes, comments, search, explore? | Each is its own subsystem; agree on scope |
| Feed latency target and freshness? | Decides fan-out strategy and caching |
| Global users? | Drives CDN footprint and where metadata lives |
| Must deleted photos disappear from caches quickly? | Affects CDN URL design and purge strategy |

## 3. Requirements

**Functional**: upload a photo with a caption; view a post; follow users; home feed of followed accounts; like and comment; view a profile grid.

**Non-functional**: uploads feel instant (the post appears within seconds); images load fast worldwide; never lose an uploaded original; highly available reads; eventual consistency is fine for likes and feeds.

## 4. Capacity Estimate

Assumptions: 100M uploads per day; each photo stored as four variants (1080 px 300 KB, 640 px 120 KB, 320 px 40 KB, 150 px thumbnail 10 KB); 500M daily viewers each loading 100 images a day.

~~~text
== 1. Capacity (assumptions: 100M uploads/day, 500M DAU viewing 100 images/day) ==
variants 1080px=300KB 640px=120KB 320px=40KB 150px=10KB -> 470 KB per photo
uploads avg 1,157/s; new storage 47 TB/day, 17,155 TB/year before replication
image views avg 578,703/s -> served by the CDN, not the origin
~~~

| What the numbers say | Consequence |
| :--- | :--- |
| 1,157 uploads per second on average | Modest write rate; processing is the heavy part, done asynchronously |
| 47 TB per day, about 17 PB a year | Object storage, not databases or local disks; lifecycle rules move old originals to colder tiers |
| 578,703 image views per second on average | 500 views per upload: a CDN must absorb almost all reads |

Image bytes and metadata are completely different problems: petabytes of immutable blobs that are read constantly, and a few small rows per post that are read and updated (likes, comments) constantly. Keep them in different systems.

## 5. API

~~~http
POST /v1/uploads                       -> { upload_id, presigned_url }        (step 1)
PUT  <presigned_url>                   body: image bytes, straight to object storage (step 2)
POST /v1/posts   body: { upload_id, caption }                  -> { post_id, status: "processing" }
GET  /v1/posts/{post_id}               -> { author, caption, image_urls: { 1080, 640, 320, 150 }, like_count }
GET  /v1/feed?cursor=...               -> { posts: [...], next_cursor }
POST /v1/posts/{post_id}/likes
~~~

## 6. Upload and Processing Path

<svg class="iq-diagram" width="100%" viewBox="0 0 820 300" role="img" aria-label="Client gets a presigned URL, uploads to object storage, an event triggers resize workers, variants are written and the post is published">
  <defs>
    <marker id="sd15q4-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="120" height="70" rx="10"/>
  <text class="d-text" x="80" y="72" text-anchor="middle">client</text>
  <text class="d-sub" x="80" y="94" text-anchor="middle">phone app</text>
  <rect class="d-box" x="210" y="40" width="150" height="70" rx="10"/>
  <text class="d-text" x="285" y="72" text-anchor="middle">post API</text>
  <text class="d-sub" x="285" y="94" text-anchor="middle">presigned URL</text>
  <rect class="d-box-accent" x="210" y="190" width="150" height="70" rx="10"/>
  <text class="d-text" x="285" y="222" text-anchor="middle">object storage</text>
  <text class="d-sub" x="285" y="244" text-anchor="middle">original</text>
  <rect class="d-box" x="430" y="190" width="150" height="70" rx="10"/>
  <text class="d-text" x="505" y="222" text-anchor="middle">resize workers</text>
  <text class="d-sub" x="505" y="244" text-anchor="middle">4 variants</text>
  <rect class="d-box" x="650" y="190" width="150" height="70" rx="10"/>
  <text class="d-text" x="725" y="222" text-anchor="middle">variants</text>
  <text class="d-sub" x="725" y="244" text-anchor="middle">CDN origin</text>
  <rect class="d-box-muted" x="430" y="40" width="150" height="70" rx="10"/>
  <text class="d-text" x="505" y="72" text-anchor="middle">metadata DB</text>
  <text class="d-sub" x="505" y="94" text-anchor="middle">post row</text>
  <line class="d-edge" x1="140" y1="75" x2="206" y2="75" marker-end="url(#sd15q4-arrow)"/>
  <line class="d-edge-accent" x1="100" y1="110" x2="206" y2="215" marker-end="url(#sd15q4-arrow)"/>
  <line class="d-edge" x1="360" y1="225" x2="426" y2="225" marker-end="url(#sd15q4-arrow)"/>
  <line class="d-edge" x1="580" y1="225" x2="646" y2="225" marker-end="url(#sd15q4-arrow)"/>
  <line class="d-edge-dashed" x1="505" y1="190" x2="505" y2="114" marker-end="url(#sd15q4-arrow)"/>
  <line class="d-edge" x1="360" y1="75" x2="426" y2="75" marker-end="url(#sd15q4-arrow)"/>
</svg>

The app asks the API for an upload URL, sends the bytes straight to object storage, and the storage event starts resize workers; when all variants exist, the workers mark the post row as published.

📌 **Interview term: presigned URL** — a time-limited URL, signed by the server, that lets the client upload one object directly to object storage without the bytes passing through the application servers. App servers stay small; storage handles the bandwidth. Large or flaky uploads use multipart; see [resumable browser uploads](/interview-question/resumable-browser-uploads-to-s3-presigned-multipart-with-checksums).

📌 **Interview term: asynchronous processing** — doing slow work (resizing, stripping location metadata, content moderation, generating a blur placeholder) in background workers fed by a queue, so the user request returns at once. The post has a \`status\` of processing until the workers finish.

Workers must be **idempotent**: the storage event can be delivered twice, so writing variants to deterministic keys (\`/p/{post_id}/640.jpg\`) and setting \`status = published\` only if it was \`processing\` makes a repeat harmless.

The phone usually shows the photo instantly from its local copy, so the user does not notice the seconds of processing. Followers see it only after it is published.

## 7. Serving Images: the CDN Does the Work

📌 **Interview term: CDN (content delivery network)** — many cache servers close to users that store copies of static content. With 578,703 image views per second, the origin should see only cache misses. See [what a CDN is](/interview-question/what-is-a-cdn-and-how-does-it-work).

📌 **Interview term: immutable, content-addressed URL** — a URL that includes the post id and variant (or a hash of the bytes), so its content never changes. It can be cached for a year with \`Cache-Control: public, max-age=31536000, immutable\`, and an edited photo simply gets a new URL. No cache invalidation is ever needed for edits.

Deletion is the exception: removing the post row hides it from feeds and the API at once, the objects are deleted, and CDN copies are purged or expire. If copies must vanish immediately, use signed, short-lived image URLs instead of public ones, at the cost of a lower CDN hit rate.

The client picks the variant that fits the screen: the 150 px thumbnail for the profile grid, 640 px for the feed on most phones, 1080 px when the photo is opened. This is why multiple variants pay for themselves in bandwidth.

## 8. Metadata: Sharded Relational Storage and Smart IDs

The metadata is small but busy: users, posts, follows, likes, comments. It fits a relational model, and Instagram famously scaled it on sharded PostgreSQL. The trick, described in the Instagram Engineering post "Sharding and IDs at Instagram" (2012), has two parts.

📌 **Interview term: logical shard** — a fixed, large number of small partitions (the post example uses 2,000) that data is hashed into, mapped onto a much smaller number of physical database servers. Adding servers moves whole logical shards; nothing is re-hashed.

📌 **Interview term: shard-embedding ID** — a 64-bit id built from 41 bits of milliseconds since a custom epoch, 13 bits of logical shard, and 10 bits of a per-shard sequence (Instagram layout). Sorting ids sorts by time, and the id itself tells you which shard holds the row.

A user's posts all go to the logical shard of that user (\`user_id % 2000\`), so "all posts by this user, newest first" is a single-shard query. The example generates ids for two users:

~~~text
user 31341 t=1760000000000 id=1528095676826973184 -> shard 1341 seq 0 ms 1760000000000
user 31341 t=1760000000000 id=1528095676826973185 -> shard 1341 seq 1 ms 1760000000000
user 7     t=1760000000000 id=1528095676825607168 -> shard 7 seq 0 ms 1760000000000
user 31341 t=1760000000001 id=1528095676835361794 -> shard 1341 seq 2 ms 1760000000001
user 7     t=1760000000005 id=1528095676867550209 -> shard 7 seq 1 ms 1760000000005
sorting ids gives time order: 0,0,0,1,5 (ms after t0)
~~~

The bit budget: 41 bits of milliseconds last 69 years from the epoch, 13 bits allow 8,192 logical shards, and 10 bits allow 1024 ids per shard per millisecond. Within one millisecond, ids from different shards sort by shard number rather than true order, which is fine for a feed.

Then routing and growth:

~~~text
id 1528095676826973184 -> logical 1341 -> db1 of 4
id 1528095676825607168 -> logical 7 -> db3 of 4
4 -> 8 servers: 1000 of 2000 logical shards move (copied whole); ids never change
id 1528095676826973184 now -> db5 of 8
~~~

Doubling from 4 to 8 servers with \`logical % servers\` moves exactly half of the logical shards, each copied as a unit (for example by setting up a replica of it and switching over). The ids stored in feeds, likes and URLs never change. Compare a plain auto-increment id, which tells you nothing about location, or a random UUID, which does not sort by time. The general trade-offs are on the [unique ID generator page](/interview-question/how-would-you-design-a-unique-id-generator-at-scale-5739) and [database sharding](/interview-question/what-is-database-sharding).

**Tables (each on the owner's shard):**

| Table | Shard by | Key columns |
| :--- | :--- | :--- |
| users | user_id | username, profile photo |
| posts | author user_id | post_id (shard-embedding), caption, status, variant keys |
| follows | follower user_id (plus a reverse table by followee) | follower, followee, created_at |
| likes | post_id | post_id, user_id; plus a counter row |
| comments | post_id | comment_id, user_id, text |

## 9. Feed, Likes and Hot Posts

- **Feed**: the same fan-out design as the [Twitter timeline](/interview-question/how-would-you-design-twitter-s-timeline-at-scale): push post ids into followers' feed lists, pull for huge accounts, rank as in the [news feed](/interview-question/how-would-you-design-a-news-feed-system). Only ids travel; hydration reads post rows and builds CDN URLs.
- **Like counts**: a celebrity post can receive thousands of likes a second, which would make one counter row a hot spot. Record each like (for "did I like this" and to prevent double likes), and update the visible count from an aggregated stream every few seconds, or with a counter split into several sub-rows that are summed on read.
- **Hot posts on read**: a viral post row is read millions of times; cache hydrated posts in memory with a short TTL, so the shard sees one read per TTL instead of millions.

## 10. What Breaks First at 10x

| At 1 billion uploads a day | Fix |
| :--- | :--- |
| Storage at 170 PB a year | Store fewer variants, generate rare sizes on demand, move originals to colder tiers, use newer image formats |
| Resize fleet | Autoscale on queue depth; process the variant needed for the feed first, the rest later |
| CDN egress cost | Better formats and compression, right-size variants per device |
| Hot shards (one huge account) | More logical shards per server for that range, read replicas, aggressive post caching |
| Metadata write rate | More physical servers; move logical shards, ids unchanged |

## 11. Verified: Running the Code

The example **"Instagram-style 64-bit IDs (41-bit time, 13-bit logical shard, 10-bit sequence), routing by ID and doubling the database servers"** uses a fixed clock reading and a per-shard counter in place of a database sequence; the "database servers" are just names computed from the logical shard. It computes the capacity table too. What it leaves out: the actual data copy when a logical shard moves, clock rollback handling, and the object storage and CDN.

Core of the generator:

~~~js
const s = ((seq.get(shard) ?? -1n) + 1n) % 1024n; // per-shard counter, like a table sequence mod 1024
return ((nowMs - EPOCH) << 23n) | (shard << 10n) | s;
~~~

Full output (identical in Node, Python, Go and Java):

~~~text
== 1. Capacity (assumptions: 100M uploads/day, 500M DAU viewing 100 images/day) ==
variants 1080px=300KB 640px=120KB 320px=40KB 150px=10KB -> 470 KB per photo
uploads avg 1,157/s; new storage 47 TB/day, 17,155 TB/year before replication
image views avg 578,703/s -> served by the CDN, not the origin

== 2. Bit budget ==
41-bit ms field lasts 69 years from the epoch
13-bit shard field: 8,192 logical shards possible, 2,000 used
10-bit sequence: 1024 ids per shard per millisecond

== 3. Generate ids inside the shard that owns the user ==
user 31341 t=1760000000000 id=1528095676826973184 -> shard 1341 seq 0 ms 1760000000000
user 31341 t=1760000000000 id=1528095676826973185 -> shard 1341 seq 1 ms 1760000000000
user 7     t=1760000000000 id=1528095676825607168 -> shard 7 seq 0 ms 1760000000000
user 31341 t=1760000000001 id=1528095676835361794 -> shard 1341 seq 2 ms 1760000000001
user 7     t=1760000000005 id=1528095676867550209 -> shard 7 seq 1 ms 1760000000005
sorting ids gives time order: 0,0,0,1,5 (ms after t0)

== 4. Route by id, then double the database servers ==
id 1528095676826973184 -> logical 1341 -> db1 of 4
id 1528095676825607168 -> logical 7 -> db3 of 4
4 -> 8 servers: 1000 of 2000 logical shards move (copied whole); ids never change
id 1528095676826973184 now -> db5 of 8
~~~

## 12. Edge Cases Worth Knowing

- **Upload succeeded, post call never came** (app killed): orphaned objects; a lifecycle rule deletes uploads not linked to a post within a day.
- **Processing fails for one variant**: retry with backoff; after repeated failures mark the post failed and tell the user, rather than leaving it in processing forever.
- **Sequence overflow**: more than 1024 ids in one millisecond on one shard would wrap; Instagram uses a per-table sequence modulo 1024, so in practice the limit is far above the per-shard write rate, but a generator should wait for the next millisecond rather than reuse a value.
- **Clock moving backwards** on a database server can produce out-of-order ids; generators should refuse to issue ids until the clock passes the last one used.
- **Privacy**: strip location metadata from uploaded photos before publishing variants.

## Common Pitfalls

- **Uploading through the app servers.** 47 TB a day of bytes would need a huge fleet; use presigned direct uploads.
- **Resizing in the request.** Users wait and timeouts lose posts; process asynchronously and make workers idempotent.
- **Storing images in the database.** Blobs belong in object storage; the database holds keys.
- **Mutable image URLs.** They force CDN invalidation on every edit; use immutable, versioned URLs.
- **Re-hashing users when adding servers.** Use many logical shards mapped to fewer servers so growth moves whole shards; in the run 1000 of 2000 moved and no id changed.
- **One counter row for a viral post.** Aggregate likes asynchronously or split the counter.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Scope and size:</strong> <span style="color:#f0e2c8;">Photos, feed, likes, comments. At 100M uploads a day with four variants totalling 470 KB, that is 1,157 uploads per second, 47 TB a day and about 17 PB a year, while 500M viewers loading 100 images each is 578,703 image views per second. It is a media delivery problem with a small, busy metadata layer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Upload path:</strong> <span style="color:#f0e2c8;">The client gets a <strong style="color:#ffca28;">presigned URL</strong> and uploads straight to object storage. A storage event queues <strong style="color:#ffca28;">asynchronous processing</strong>: resize into variants, strip metadata, moderate. Workers are idempotent and mark the post published when done.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Serving:</strong> <span style="color:#f0e2c8;">Images are served by a <strong style="color:#ffca28;">CDN</strong> from immutable URLs keyed by post id and variant, cached for a year; the client picks the variant for its screen. The origin sees only misses.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Metadata:</strong> <span style="color:#f0e2c8;">Sharded PostgreSQL with thousands of <strong style="color:#ffca28;">logical shards</strong> mapped onto fewer servers, and 64-bit ids of 41 bits time, 13 bits shard and 10 bits sequence, as Instagram published. Ids sort by time and route to their shard; doubling servers moved half the logical shards and changed no id.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Feed and scale:</strong> <span style="color:#f0e2c8;">The feed is fan-out of post ids as in the timeline design, hydrated from cached post rows. Like counts are aggregated asynchronously. At 10x the costs are storage and egress: fewer or on-demand variants, colder tiers, better formats.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not upload through your API servers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every byte would cross the app fleet twice, about 47 TB a day in my estimate, so the fleet would be sized for bandwidth instead of logic. A presigned URL lets the client write one specific object directly to storage for a limited time, and the API only handles small JSON calls.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you find the shard for a post id?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Shift the id right by 10 bits and keep the low 13 bits: that is the logical shard. A small config table maps logical shard to physical server. No lookup service is needed on the hot path.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when you add database servers?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You move whole logical shards to the new servers, by replicating each one and switching over, then update the mapping. With modulo mapping from 4 to 8 servers exactly half of the 2,000 logical shards moved, and because ids embed the logical shard, no stored id changes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle a celebrity post getting thousands of likes a second?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Record each like row on the post shard for dedup, but do not update one counter row synchronously. Stream likes into an aggregator that updates the visible count every few seconds, or split the counter into many sub-rows summed on read. Users accept a count that lags by seconds.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would stories differ?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Stories expire after a day, so they get a TTL in metadata and a lifecycle rule on storage, are fetched as a small per-followee list rather than fanned into a ranked feed, and are often video, which brings in transcoding and adaptive streaming from the YouTube design.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Presigned URL | Time-limited signed URL for uploading one object directly to storage |
| Asynchronous processing | Slow work done by background workers fed by a queue |
| CDN | Edge caches near users serving static content |
| Immutable, content-addressed URL | A URL whose content never changes, cacheable forever |
| Logical shard | One of many fixed partitions, mapped onto fewer physical servers |
| Shard-embedding ID | 64-bit id of time, logical shard and sequence |

**Conclusion:** Instagram splits into two very different systems. Image bytes are petabytes of immutable blobs: upload them directly with presigned URLs, process them asynchronously into variants, and let a CDN serve 578,703 views per second from immutable URLs. Metadata is small and hot: shard it into thousands of logical shards over fewer servers and give every row a 64-bit id that carries its time and shard, so ids sort by time, route without lookups and survive resharding unchanged, as the run showed when half the shards moved and no id did. The feed reuses fan-out and ranking from the timeline and news feed designs.`,
    examples: [
      {
        label: `Instagram-style 64-bit IDs (41-bit time, 13-bit logical shard, 10-bit sequence), routing by ID and doubling the database servers`,
        variants: [
          { tech: "node", code: `// Instagram-style 64-bit IDs: 41 bits time | 13 bits logical shard | 10 bits sequence, plus shard routing.
const fmt = (n) => n.toLocaleString("en-US");
const EPOCH = 1577836800000n; // 2020-01-01T00:00:00Z, our custom epoch
const LOGICAL = 2000;

console.log("== 1. Capacity (assumptions: 100M uploads/day, 500M DAU viewing 100 images/day) ==");
const variants = [["1080px", 300], ["640px", 120], ["320px", 40], ["150px", 10]];
const perPhotoKB = variants.reduce((a, v) => a + v[1], 0);
console.log("variants " + variants.map((v) => v[0] + "=" + v[1] + "KB").join(" ") + " -> " + perPhotoKB + " KB per photo");
console.log("uploads avg " + fmt(Math.floor(100_000_000 / 86400)) + "/s; new storage " + fmt(100_000_000 * perPhotoKB / 1_000_000_000) + " TB/day, " + fmt(100_000_000 * perPhotoKB * 365 / 1_000_000_000) + " TB/year before replication");
console.log("image views avg " + fmt(Math.floor(500_000_000 * 100 / 86400)) + "/s -> served by the CDN, not the origin");

console.log("\\n== 2. Bit budget ==");
const maxMs = (1n << 41n) - 1n;
console.log("41-bit ms field lasts " + (maxMs / (1000n * 86400n * 365n)) + " years from the epoch");
console.log("13-bit shard field: " + fmt(1 << 13) + " logical shards possible, " + fmt(LOGICAL) + " used");
console.log("10-bit sequence: " + (1 << 10) + " ids per shard per millisecond");

console.log("\\n== 3. Generate ids inside the shard that owns the user ==");
const seq = new Map();
function nextId(userId, nowMs) {
  const shard = BigInt(userId % LOGICAL);
  const s = ((seq.get(shard) ?? -1n) + 1n) % 1024n; // per-shard counter, like a table sequence mod 1024
  seq.set(shard, s);
  return ((nowMs - EPOCH) << 23n) | (shard << 10n) | s;
}
const decode = (id) => ({ ms: (id >> 23n) + EPOCH, shard: Number((id >> 10n) & 8191n), seq: Number(id & 1023n) });
const t0 = 1760000000000n; // a fixed clock reading
const uploads = [[31341, t0], [31341, t0], [7, t0], [31341, t0 + 1n], [7, t0 + 5n]];
const ids = [];
for (const [user, t] of uploads) {
  const id = nextId(user, t); ids.push(id);
  const d = decode(id);
  console.log("user " + String(user).padEnd(6) + "t=" + t + " id=" + id + " -> shard " + d.shard + " seq " + d.seq + " ms " + d.ms);
}
const sorted = [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
console.log("sorting ids gives time order: " + sorted.map((id) => decode(id).ms - t0).join(",") + " (ms after t0)");

console.log("\\n== 4. Route by id, then double the database servers ==");
const server = (shard, n) => "db" + (shard % n);
for (const id of [ids[0], ids[2]]) console.log("id " + id + " -> logical " + decode(id).shard + " -> " + server(decode(id).shard, 4) + " of 4");
let moved = 0;
for (let s = 0; s < LOGICAL; s++) if (server(s, 4) !== server(s, 8)) moved++;
console.log("4 -> 8 servers: " + moved + " of " + LOGICAL + " logical shards move (copied whole); ids never change");
console.log("id " + ids[0] + " now -> " + server(decode(ids[0]).shard, 8) + " of 8");` },
          { tech: "python", code: `# Instagram-style 64-bit IDs: 41 bits time | 13 bits logical shard | 10 bits sequence, plus shard routing.
def fmt(n):
    return f"{n:,}"


EPOCH = 1577836800000  # 2020-01-01T00:00:00Z, our custom epoch
LOGICAL = 2000

print("== 1. Capacity (assumptions: 100M uploads/day, 500M DAU viewing 100 images/day) ==")
variants = [("1080px", 300), ("640px", 120), ("320px", 40), ("150px", 10)]
per_photo_kb = sum(v[1] for v in variants)
print("variants " + " ".join(f"{n}={k}KB" for n, k in variants) + f" -> {per_photo_kb} KB per photo")
print("uploads avg " + fmt(100_000_000 // 86400) + "/s; new storage " + fmt(100_000_000 * per_photo_kb // 10**9) + " TB/day, " + fmt(100_000_000 * per_photo_kb * 365 // 10**9) + " TB/year before replication")
print("image views avg " + fmt(500_000_000 * 100 // 86400) + "/s -> served by the CDN, not the origin")

print("\\n== 2. Bit budget ==")
max_ms = (1 << 41) - 1
print(f"41-bit ms field lasts {max_ms // (1000 * 86400 * 365)} years from the epoch")
print("13-bit shard field: " + fmt(1 << 13) + " logical shards possible, " + fmt(LOGICAL) + " used")
print(f"10-bit sequence: {1 << 10} ids per shard per millisecond")

print("\\n== 3. Generate ids inside the shard that owns the user ==")
seq = {}


def next_id(user_id, now_ms):
    shard = user_id % LOGICAL
    s = (seq.get(shard, -1) + 1) % 1024  # per-shard counter, like a table sequence mod 1024
    seq[shard] = s
    return ((now_ms - EPOCH) << 23) | (shard << 10) | s


def decode(i):
    return {"ms": (i >> 23) + EPOCH, "shard": (i >> 10) & 8191, "seq": i & 1023}


t0 = 1760000000000  # a fixed clock reading
uploads = [(31341, t0), (31341, t0), (7, t0), (31341, t0 + 1), (7, t0 + 5)]
ids = []
for user, t in uploads:
    i = next_id(user, t)
    ids.append(i)
    d = decode(i)
    print(f"user {str(user).ljust(6)}t={t} id={i} -> shard {d['shard']} seq {d['seq']} ms {d['ms']}")
print("sorting ids gives time order: " + ",".join(str(decode(i)["ms"] - t0) for i in sorted(ids)) + " (ms after t0)")

print("\\n== 4. Route by id, then double the database servers ==")


def server(shard, n):
    return f"db{shard % n}"


for i in (ids[0], ids[2]):
    print(f"id {i} -> logical {decode(i)['shard']} -> {server(decode(i)['shard'], 4)} of 4")
moved = sum(1 for s in range(LOGICAL) if server(s, 4) != server(s, 8))
print(f"4 -> 8 servers: {moved} of {LOGICAL} logical shards move (copied whole); ids never change")
print(f"id {ids[0]} now -> {server(decode(ids[0])['shard'], 8)} of 8")` },
          { tech: "go", code: `// Instagram-style 64-bit IDs: 41 bits time | 13 bits logical shard | 10 bits sequence, plus shard routing.
package main

import (
	"fmt"
	"sort"
	"strconv"
	"strings"
)

const EPOCH int64 = 1577836800000 // 2020-01-01T00:00:00Z, our custom epoch
const LOGICAL = 2000

func fmtN(n int64) string {
	s := strconv.FormatInt(n, 10)
	var b strings.Builder
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(c)
	}
	return b.String()
}

var seq = map[int64]int64{}

func nextID(userID int64, nowMs int64) int64 {
	shard := userID % LOGICAL
	prev, ok := seq[shard]
	if !ok {
		prev = -1
	}
	s := (prev + 1) % 1024 // per-shard counter, like a table sequence mod 1024
	seq[shard] = s
	return ((nowMs - EPOCH) << 23) | (shard << 10) | s
}

func decode(id int64) (int64, int64, int64) { return (id >> 23) + EPOCH, (id >> 10) & 8191, id & 1023 }

func server(shard int64, n int64) string { return "db" + strconv.FormatInt(shard%n, 10) }

func main() {
	fmt.Println("== 1. Capacity (assumptions: 100M uploads/day, 500M DAU viewing 100 images/day) ==")
	names := []string{"1080px", "640px", "320px", "150px"}
	kbs := []int64{300, 120, 40, 10}
	var per int64
	parts := []string{}
	for i, n := range names {
		per += kbs[i]
		parts = append(parts, fmt.Sprintf("%s=%dKB", n, kbs[i]))
	}
	fmt.Printf("variants %s -> %d KB per photo\\n", strings.Join(parts, " "), per)
	fmt.Println("uploads avg " + fmtN(100_000_000/86400) + "/s; new storage " + fmtN(100_000_000*per/1_000_000_000) + " TB/day, " + fmtN(100_000_000*per*365/1_000_000_000) + " TB/year before replication")
	fmt.Println("image views avg " + fmtN(500_000_000*100/86400) + "/s -> served by the CDN, not the origin")

	fmt.Println("\\n== 2. Bit budget ==")
	maxMs := int64(1)<<41 - 1
	fmt.Printf("41-bit ms field lasts %d years from the epoch\\n", maxMs/(1000*86400*365))
	fmt.Println("13-bit shard field: " + fmtN(1<<13) + " logical shards possible, " + fmtN(LOGICAL) + " used")
	fmt.Printf("10-bit sequence: %d ids per shard per millisecond\\n", 1<<10)

	fmt.Println("\\n== 3. Generate ids inside the shard that owns the user ==")
	t0 := int64(1760000000000) // a fixed clock reading
	uploads := [][2]int64{{31341, t0}, {31341, t0}, {7, t0}, {31341, t0 + 1}, {7, t0 + 5}}
	ids := []int64{}
	for _, u := range uploads {
		id := nextID(u[0], u[1])
		ids = append(ids, id)
		ms, sh, sq := decode(id)
		fmt.Printf("user %-6dt=%d id=%d -> shard %d seq %d ms %d\\n", u[0], u[1], id, sh, sq, ms)
	}
	sorted := append([]int64{}, ids...)
	sort.Slice(sorted, func(i, j int) bool { return sorted[i] < sorted[j] })
	offs := []string{}
	for _, id := range sorted {
		ms, _, _ := decode(id)
		offs = append(offs, strconv.FormatInt(ms-t0, 10))
	}
	fmt.Println("sorting ids gives time order: " + strings.Join(offs, ",") + " (ms after t0)")

	fmt.Println("\\n== 4. Route by id, then double the database servers ==")
	for _, id := range []int64{ids[0], ids[2]} {
		_, sh, _ := decode(id)
		fmt.Printf("id %d -> logical %d -> %s of 4\\n", id, sh, server(sh, 4))
	}
	moved := 0
	for s := int64(0); s < LOGICAL; s++ {
		if server(s, 4) != server(s, 8) {
			moved++
		}
	}
	fmt.Printf("4 -> 8 servers: %d of %d logical shards move (copied whole); ids never change\\n", moved, LOGICAL)
	_, sh0, _ := decode(ids[0])
	fmt.Printf("id %d now -> %s of 8\\n", ids[0], server(sh0, 8))
}` },
          { tech: "java", code: `// Instagram-style 64-bit IDs: 41 bits time | 13 bits logical shard | 10 bits sequence, plus shard routing.
import java.util.*;

public class Main {
    static final long EPOCH = 1577836800000L; // 2020-01-01T00:00:00Z, our custom epoch
    static final int LOGICAL = 2000;
    static final Map<Long, Long> seq = new HashMap<>();

    static String fmt(long n) { return String.format(Locale.US, "%,d", n); }

    static long nextId(long userId, long nowMs) {
        long shard = userId % LOGICAL;
        long s = (seq.getOrDefault(shard, -1L) + 1) % 1024; // per-shard counter, like a table sequence mod 1024
        seq.put(shard, s);
        return ((nowMs - EPOCH) << 23) | (shard << 10) | s;
    }

    static long ms(long id) { return (id >> 23) + EPOCH; }
    static long shard(long id) { return (id >> 10) & 8191; }
    static long sq(long id) { return id & 1023; }
    static String server(long shard, long n) { return "db" + (shard % n); }

    public static void main(String[] args) {
        System.out.println("== 1. Capacity (assumptions: 100M uploads/day, 500M DAU viewing 100 images/day) ==");
        String[] names = {"1080px", "640px", "320px", "150px"};
        long[] kbs = {300, 120, 40, 10};
        long per = 0;
        List<String> parts = new ArrayList<>();
        for (int i = 0; i < names.length; i++) { per += kbs[i]; parts.add(names[i] + "=" + kbs[i] + "KB"); }
        System.out.println("variants " + String.join(" ", parts) + " -> " + per + " KB per photo");
        System.out.println("uploads avg " + fmt(100_000_000L / 86400) + "/s; new storage " + fmt(100_000_000L * per / 1_000_000_000L) + " TB/day, " + fmt(100_000_000L * per * 365 / 1_000_000_000L) + " TB/year before replication");
        System.out.println("image views avg " + fmt(500_000_000L * 100 / 86400) + "/s -> served by the CDN, not the origin");

        System.out.println("\\n== 2. Bit budget ==");
        long maxMs = (1L << 41) - 1;
        System.out.println("41-bit ms field lasts " + (maxMs / (1000L * 86400 * 365)) + " years from the epoch");
        System.out.println("13-bit shard field: " + fmt(1 << 13) + " logical shards possible, " + fmt(LOGICAL) + " used");
        System.out.println("10-bit sequence: " + (1 << 10) + " ids per shard per millisecond");

        System.out.println("\\n== 3. Generate ids inside the shard that owns the user ==");
        long t0 = 1760000000000L; // a fixed clock reading
        long[][] uploads = {{31341, t0}, {31341, t0}, {7, t0}, {31341, t0 + 1}, {7, t0 + 5}};
        List<Long> ids = new ArrayList<>();
        for (long[] u : uploads) {
            long id = nextId(u[0], u[1]);
            ids.add(id);
            System.out.println("user " + String.format("%-6d", u[0]) + "t=" + u[1] + " id=" + id + " -> shard " + shard(id) + " seq " + sq(id) + " ms " + ms(id));
        }
        List<Long> sorted = new ArrayList<>(ids);
        Collections.sort(sorted);
        List<String> offs = new ArrayList<>();
        for (long id : sorted) offs.add(String.valueOf(ms(id) - t0));
        System.out.println("sorting ids gives time order: " + String.join(",", offs) + " (ms after t0)");

        System.out.println("\\n== 4. Route by id, then double the database servers ==");
        for (long id : new long[]{ids.get(0), ids.get(2)})
            System.out.println("id " + id + " -> logical " + shard(id) + " -> " + server(shard(id), 4) + " of 4");
        int moved = 0;
        for (long s = 0; s < LOGICAL; s++) if (!server(s, 4).equals(server(s, 8))) moved++;
        System.out.println("4 -> 8 servers: " + moved + " of " + LOGICAL + " logical shards move (copied whole); ids never change");
        System.out.println("id " + ids.get(0) + " now -> " + server(shard(ids.get(0)), 8) + " of 8");
    }
}` },
        ],
      },
    ],
  },
  {
    title: `How would you design YouTube?`,
    difficulty: "hard",
    seoDescription: `Design YouTube: resumable uploads, chunked parallel transcoding into a bitrate ladder, HLS/DASH segments on a CDN, adaptive bitrate and view counting.`,
    description: `**Question presented to candidate:**
"Design YouTube. Creators upload videos of any length, viewers all over the world watch them on phones, laptops and TVs with fast start and no buffering, and every video shows a view count. Assume hundreds of hours of video uploaded every minute."

**What a strong answer should cover:**
- Capacity: upload hours per day, encoded storage for a full bitrate ladder, transcoding compute, and viewer egress in Tbps, which shows delivery bandwidth is the dominant cost
- The upload path: **resumable chunked upload** to object storage, then a **transcoding pipeline** that splits the video into chunks and encodes them in parallel into a **bitrate ladder** (resolutions and bitrates), packaged as **HLS/DASH segments** with manifests
- Delivery through a **CDN** of immutable segment files, and **adaptive bitrate** on the player: choosing the rendition per segment from measured throughput and buffer level, with the trade-off between quality, stalls and switching
- Metadata, search and recommendations as separate services; **view counting** as an event stream aggregated asynchronously with abuse filtering
- What breaks at 10x: storage for rarely watched videos, encode cost, CDN egress, popular-video hot spots at the edge

**Clarifying questions expected:**
- Video on demand only, or live streaming too?
- Which devices and maximum resolution? Is there a target start time and rebuffer rate?
- How quickly must a video be watchable after upload?

**Code / implementation expected:** Optional — the capacity arithmetic and a player simulation comparing fixed, throughput-based and buffer-based bitrate choice on one bandwidth trace; the example does both.`,
    answer: `**Target Audience:** Engineers preparing for a system design round. You know what a server, a file and HTTP are; video encoding and streaming terms are defined as we go.
**Difficulty:** Hard
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Product and specification facts are cited inline, checked in October 2026.

> **How to read this doc:** Plain language first, then \`📌 Interview term:\` callouts. Every number in the capacity and player sections comes from the example program; the **Verified** section quotes its full output. Photo-sharing concerns (presigned uploads, sharded metadata, image CDN) are covered in [How would you design Instagram?](/interview-question/how-would-you-design-instagram); this page focuses on what video adds.

## 1. Why This Even Matters — A Story First

Imagine a library that lends films to the whole world. A film arrives as one giant reel. Before lending it, the library copies it at several qualities: a cinema print, a TV copy, a small travel copy. Each copy is cut into short pieces, a few seconds each, so a borrower can grab the next piece in whatever quality their connection can carry right now: cinema quality on fast home internet, travel quality on a train, switching between pieces without stopping the film.

And the library does not post every piece from its headquarters. It keeps copies of popular films in small branches in every town. YouTube is that library: transcoding makes the qualities, segmenting cuts the pieces, adaptive bitrate picks a piece at a time, and the CDN is the branches.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Video on demand only, or live too? | Live needs low-latency ingest and encoding in real time; a different pipeline |
| Upload volume and watch volume? | Upload drives encode and storage; watch drives egress, by far the biggest cost |
| Devices and maximum resolution (4K, HDR)? | Sets the top of the bitrate ladder and codecs to produce |
| Time from upload to watchable? | Decides whether to publish after the first renditions or after all of them |
| Target start time and rebuffer rate? | Decides segment length, startup rendition and buffer policy |
| Do we design recommendations and search? | Usually out of scope beyond a box; agree first |

## 3. Requirements

**Functional**: upload a video (any length, resumable); watch it on any device with seek; video page with title, description, view count, likes; search and a home page of recommendations (as boxes).

**Non-functional**: playback starts in about a second or two; rebuffering is rare; highly available reads worldwide; uploads never lost; a new video watchable within minutes; view counts eventually accurate and resistant to inflation.

Scale reference points: YouTube disclosed in 2019 that more than 500 hours of video were uploaded every minute (reported by Tubefilter, May 2019), and in 2017 that people watched over a billion hours a day (YouTube announcement, reported by The Next Web, February 2017). Both are older public figures; the estimate below uses them as assumptions.

## 4. Capacity Estimate

Assumptions: 500 hours uploaded per minute; a five-rung ladder 240p 400 kbps, 360p 800 kbps, 480p 1,400 kbps, 720p 2,800 kbps, 1080p 5,000 kbps; 1 core-hour to encode one rung of one video hour (a rough assumption; real cost depends heavily on codec and preset); 1 billion watch hours a day at an average of 2,500 kbps.

~~~text
== 1. Capacity (assumptions: 500 hours uploaded/min, 1B watch hours/day, 2,500 kbps average stream) ==
uploaded 720,000 hours/day; full ladder = 10,400 kbps = 4,680,000 kB per video hour
new encoded storage 3,369 TB/day before replication
transcode at 1 core-hour per rung per video hour: 3,600,000 core-hours/day = 150,000 cores busy
average concurrent viewers 41,666,666 -> egress 104 Tbps (CDN and edge caches carry this)
a 1-hour upload split into 10 s chunks = 360 chunks x 5 rungs = 1,800 parallel encode tasks
~~~

| What the numbers say | Consequence |
| :--- | :--- |
| 4.68 GB per video hour for the ladder, 3,369 TB a day, about 1.2 EB a year | Object storage with tiering; not every video deserves every rung forever |
| 150,000 cores busy transcoding | Encoding is a large batch fleet, scheduled by priority |
| 104 Tbps average egress, about 1,125 PB a day | Delivery is the dominant cost; a CDN with caches inside ISP networks is mandatory |

The 1,125 PB figure is 1 billion hours x 2,500 kbps x 3,600 s / 8. Compare it with 3,369 TB a day of new storage: the system moves about 330 times more bytes to viewers than it writes.

## 5. Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 820 280" role="img" aria-label="Upload path: resumable upload to object storage, transcode pipeline splits, encodes and packages, segments land in storage">
  <defs>
    <marker id="sd15q5-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="50" width="130" height="70" rx="10"/>
  <text class="d-text" x="85" y="82" text-anchor="middle">creator</text>
  <text class="d-sub" x="85" y="104" text-anchor="middle">resumable</text>
  <rect class="d-box-muted" x="200" y="50" width="130" height="70" rx="10"/>
  <text class="d-text" x="265" y="82" text-anchor="middle">raw storage</text>
  <text class="d-sub" x="265" y="104" text-anchor="middle">original file</text>
  <rect class="d-box-accent" x="380" y="50" width="130" height="70" rx="10"/>
  <text class="d-text" x="445" y="82" text-anchor="middle">split</text>
  <text class="d-sub" x="445" y="104" text-anchor="middle">10 s chunks</text>
  <rect class="d-box-accent" x="560" y="50" width="130" height="70" rx="10"/>
  <text class="d-text" x="625" y="82" text-anchor="middle">encode</text>
  <text class="d-sub" x="625" y="104" text-anchor="middle">chunk x rung</text>
  <rect class="d-box" x="560" y="180" width="130" height="70" rx="10"/>
  <text class="d-text" x="625" y="212" text-anchor="middle">package</text>
  <text class="d-sub" x="625" y="234" text-anchor="middle">HLS and DASH</text>
  <rect class="d-box-muted" x="340" y="180" width="170" height="70" rx="10"/>
  <text class="d-text" x="425" y="212" text-anchor="middle">segment storage</text>
  <text class="d-sub" x="425" y="234" text-anchor="middle">CDN origin</text>
  <line class="d-edge" x1="150" y1="85" x2="196" y2="85" marker-end="url(#sd15q5-arrow)"/>
  <line class="d-edge" x1="330" y1="85" x2="376" y2="85" marker-end="url(#sd15q5-arrow)"/>
  <line class="d-edge" x1="510" y1="85" x2="556" y2="85" marker-end="url(#sd15q5-arrow)"/>
  <line class="d-edge" x1="625" y1="120" x2="625" y2="176" marker-end="url(#sd15q5-arrow)"/>
  <line class="d-edge" x1="560" y1="215" x2="514" y2="215" marker-end="url(#sd15q5-arrow)"/>
</svg>

The upload path: the original lands in object storage, a pipeline splits it into chunks, encodes every chunk at every rung in parallel, packages the results into streaming segments and manifests, and writes them where the CDN fetches from.

<svg class="iq-diagram" width="100%" viewBox="0 0 820 240" role="img" aria-label="Watch path: player fetches manifest from API, segments from the nearest CDN edge, which fills from the origin on a miss; view events go to a stream">
  <defs>
    <marker id="sd15q5-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="80" width="130" height="70" rx="10"/>
  <text class="d-text" x="85" y="112" text-anchor="middle">player</text>
  <text class="d-sub" x="85" y="134" text-anchor="middle">picks rung</text>
  <rect class="d-box" x="230" y="20" width="150" height="60" rx="10"/>
  <text class="d-text" x="305" y="55" text-anchor="middle">video API</text>
  <rect class="d-box" x="230" y="150" width="150" height="60" rx="10"/>
  <text class="d-text" x="305" y="185" text-anchor="middle">CDN edge</text>
  <rect class="d-box-muted" x="460" y="150" width="150" height="60" rx="10"/>
  <text class="d-text" x="535" y="185" text-anchor="middle">origin</text>
  <rect class="d-box-muted" x="460" y="20" width="150" height="60" rx="10"/>
  <text class="d-text" x="535" y="55" text-anchor="middle">view events</text>
  <rect class="d-box" x="670" y="20" width="130" height="60" rx="10"/>
  <text class="d-text" x="735" y="55" text-anchor="middle">counters</text>
  <line class="d-edge" x1="150" y1="100" x2="226" y2="55" marker-end="url(#sd15q5-arrow2)"/>
  <line class="d-edge-accent" x1="150" y1="130" x2="226" y2="180" marker-end="url(#sd15q5-arrow2)"/>
  <line class="d-edge-dashed" x1="380" y1="180" x2="456" y2="180" marker-end="url(#sd15q5-arrow2)"/>
  <line class="d-edge-dashed" x1="380" y1="50" x2="456" y2="50" marker-end="url(#sd15q5-arrow2)"/>
  <line class="d-edge" x1="610" y1="50" x2="666" y2="50" marker-end="url(#sd15q5-arrow2)"/>
</svg>

The watch path: the player gets metadata and the manifest from the API, then streams segments from the nearest CDN edge, which fetches from the origin only on a miss; playback events flow into a stream that feeds counters.

Supporting services, drawn as boxes in an interview: a **metadata store** (videos, channels, titles, status) sharded by video id, a **search index** fed by change events, a **recommendation service** producing candidate lists offline and ranking online (the same staged-ranking shape as the [news feed](/interview-question/how-would-you-design-a-news-feed-system)), and comments and likes stores.

## 6. Deep Dive 1: Upload and Transcoding

**Upload.** Video files are gigabytes; mobile connections drop. The client uploads in parts and can resume from the last confirmed part, which is the pattern on [S3 multipart upload](/interview-question/how-does-s3-multipart-upload-make-5tb-uploads-resumable-and-fast). The original is kept: it is the master for any future re-encode.

📌 **Interview term: transcoding** — decoding the uploaded video and re-encoding it into the codecs, resolutions and bitrates the service streams. Uploads come in every format imaginable; output is a small, uniform set.

📌 **Interview term: bitrate ladder** — the list of renditions produced for a video, each a resolution and target bitrate (here 240p at 400 kbps up to 1080p at 5,000 kbps). More rungs give smoother adaptation but cost storage and encode time. Netflix showed in 2015 that a fixed ladder wastes bits on simple content and starves complex content, and moved to a per-title ladder (Netflix Technology Blog, "Per-Title Encode Optimization", December 2015, as summarised by Streaming Media).

📌 **Interview term: chunked parallel encoding** — splitting the source at keyframes into short chunks (10 s here), encoding each chunk at each rung as an independent task, then joining. A one-hour upload becomes 1,800 tasks that run at once, so the wall-clock time is close to the time of one chunk, not one hour times five rungs.

The pipeline is a **DAG** (a graph of steps with dependencies): validate, extract audio, split, encode video chunks, encode audio, package, generate thumbnails, run content checks, publish. A workflow engine runs it, retries failed tasks, and records progress so a crashed worker loses only its own chunk.

**Publish early.** Encode the low rungs first (240p, 360p) and mark the video watchable; higher rungs are added to the manifest as they finish. Popular channels can get a higher priority in the encode queue.

## 7. Deep Dive 2: Segments, Manifests and the CDN

📌 **Interview term: HLS and DASH** — the two standard HTTP streaming formats. Each rendition is cut into short **segments** (a few seconds of video each) and a **manifest** (playlist) lists the renditions and their segments. Apple's HLS authoring specification recommends a target segment duration of 6 seconds (quoted in secondary sources; we could not open Apple's page directly). Segments are plain files served over HTTP, so any CDN can cache them.

Segments never change once written, so their URLs can be cached for a year at the edge. The manifest changes only while new rungs are being added. Popular videos are served almost entirely from edge caches; the long tail of rarely watched videos is fetched from the origin and may not be worth caching at all. See [what a CDN is](/interview-question/what-is-a-cdn-and-how-does-it-work) for hit ratios and cache hierarchy.

Seeking is just requesting the segment that contains the target time, which is why keyframes must start every segment.

## 8. Deep Dive 3: Adaptive Bitrate in the Player

📌 **Interview term: adaptive bitrate (ABR)** — the player chooses, segment by segment, which rendition to download, based on measured network throughput and how much video is already buffered.

📌 **Interview term: rebuffering (stall)** — playback stopping because the buffer ran empty. Viewers hate stalls far more than a slightly lower resolution.

The example plays 30 segments of 4 s each over a connection that runs at 6,000 kbps, then drops to 2,500, then to 900, then recovers to 4,000, with a 20-second maximum buffer:

~~~text
policy        startup ms  stalls  stall ms  avg kbps  switches  rungs used
fixed 1080p         3333      21    138663      5000         0  1080p
fixed 360p           533       0         0       800         0  360p
throughput           266       0         0      1800         4  240p,480p,720p
buffer-based         266       1       601      2733        18  240p,360p,480p,720p,1080p
~~~

- **Fixed 1080p** takes 3.3 s to start and then stalls 21 times for a total of 138,663 ms, longer than the 120 s video itself. Never stream one fixed high quality.
- **Fixed 360p** never stalls but averages 800 kbps on a connection that could carry much more.
- **Throughput rule** (highest rung under 80% of the slowest of the last three downloads) starts at 240p in 266 ms, never stalls, averages 1,800 kbps and switches only 4 times.
- **Buffer-based rule** (lowest rung below 5 s of buffer, highest above 15 s, linear between) reaches a higher average, 2,733 kbps, but stalls once for 601 ms and switches 18 times, because its choice reacts only to the buffer and keeps bouncing between rungs.

Real players combine both signals (throughput for the estimate, buffer as a safety margin) and add hysteresis to stop oscillation. The point for an interview: ABR trades **quality against stalls against switching**, and the start rung trades startup time against initial quality.

## 9. View Counts

📌 **Interview term: view event stream** — the player sends playback events (started, watched 30 s, completed) to an ingestion endpoint; they go onto a log, are deduplicated and filtered for bots, and are aggregated per video into counters.

Incrementing a database row per view would melt on a viral video, and many views are not genuine. So counts are **approximate in real time** (sharded in-memory counters summed every few seconds) and **corrected later** by a batch job after abuse filtering. That is why a view count can freeze or drop after a video goes viral. The aggregation pattern is the same as [ad click event aggregation](/interview-question/how-would-you-design-ad-click-event-aggregation-5733).

## 10. What Breaks First at 10x

| At 5,000 hours uploaded per minute | Fix |
| :--- | :--- |
| Storage: about 12 EB a year for full ladders | Encode high rungs only for videos that get views; tier cold renditions; keep originals in archive storage |
| Encode fleet of 1.5 million cores | Better codecs on hardware encoders, per-title ladders, encode on demand for the long tail |
| CDN egress | Edge caches inside ISP networks, more efficient codecs for popular videos (worth the extra encode cost) |
| Hot new videos at the edge | Pre-warm edges for big launches, request coalescing so one miss fetches from origin once |
| Metadata and counters | Shard by video id; counters aggregated in streams, never synchronous writes |

## 11. Verified: Running the Code

The example **"Video delivery: capacity math, then fixed, throughput-based and buffer-based bitrate selection on one bandwidth trace"** does the capacity arithmetic in integers, then simulates a player: for each 4 s segment, download time is bitrate x 4,000 ms / bandwidth; if it exceeds the buffer the player stalls for the difference; the buffer grows by 4 s per segment up to 20 s. What it leaves out: real network variance within a segment, request latency, audio, seeking, and the player startup threshold (playback begins after the first segment).

The core of the throughput rule:

~~~js
const est = Math.min(...hist.slice(-3)) * 8 / 10;
let r = 0; for (let i = 0; i < ladder.length; i++) if (ladder[i][1] <= est) r = i;
~~~

Full output (identical in Node and Python):

~~~text
== 1. Capacity (assumptions: 500 hours uploaded/min, 1B watch hours/day, 2,500 kbps average stream) ==
uploaded 720,000 hours/day; full ladder = 10,400 kbps = 4,680,000 kB per video hour
new encoded storage 3,369 TB/day before replication
transcode at 1 core-hour per rung per video hour: 3,600,000 core-hours/day = 150,000 cores busy
average concurrent viewers 41,666,666 -> egress 104 Tbps (CDN and edge caches carry this)
a 1-hour upload split into 10 s chunks = 360 chunks x 5 rungs = 1,800 parallel encode tasks

== 2. Adaptive bitrate: 4 s segments, 20 s max buffer, bandwidth trace in kbps ==
trace: 8 x 6000, 6 x 2500, 6 x 900, 10 x 4000 (30 segments = 120 s of video)
policy        startup ms  stalls  stall ms  avg kbps  switches  rungs used
fixed 1080p         3333      21    138663      5000         0  1080p
fixed 360p           533       0         0       800         0  360p
throughput           266       0         0      1800         4  240p,480p,720p
buffer-based         266       1       601      2733        18  240p,360p,480p,720p,1080p
~~~

## 12. Edge Cases Worth Knowing

- **Upload interrupted at 90%**: resumable parts mean only the missing parts are re-sent.
- **Corrupt or unsupported source**: validation is the first DAG step; fail fast and tell the creator.
- **Copyright and content checks** run in the pipeline before publishing, and can also take a video down later; deleting must remove manifests first so players stop at once.
- **Live streaming** is a different pipeline: ingest over a streaming protocol, encode in real time, short segments, and a latency target of seconds, not minutes.
- **Very long videos** (10-hour streams): chunked encoding keeps them practical; manifests can be large, so players fetch them incrementally.

## Common Pitfalls

- **Encoding the whole file on one machine.** A one-hour video at five rungs is hours of work; split into chunks: 1,800 parallel tasks in the estimate.
- **Serving video from your own servers.** 104 Tbps of average egress needs a CDN with caches near viewers.
- **One fixed quality.** In the run fixed 1080p stalled for 138,663 ms on a 120 s video.
- **ABR on the buffer alone.** It switched 18 times and still stalled once in the run; combine signals and add hysteresis.
- **Counting views with synchronous database writes.** Use an event stream, approximate live counts, batch-corrected totals.
- **Keeping every rung of every video forever.** Most videos are rarely watched; tier or drop high rungs for the long tail.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Clarify and size:</strong> <span style="color:#f0e2c8;">VOD only, devices up to 1080p, watchable within minutes. At 500 hours uploaded a minute that is 720,000 hours a day; a five-rung ladder at 10,400 kbps total is 4.68 GB per video hour, about 3,369 TB a day. A billion watch hours a day at 2,500 kbps is 104 Tbps of average egress, so delivery dominates.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Upload and transcode:</strong> <span style="color:#f0e2c8;">Resumable chunked upload to object storage keeps the original. A DAG pipeline splits at keyframes into 10 s chunks and encodes each chunk at each rung in parallel, 1,800 tasks for a one-hour video, then packages <strong style="color:#ffca28;">HLS and DASH</strong> segments and manifests. Low rungs publish first.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Delivery:</strong> <span style="color:#f0e2c8;">Segments are immutable files cached at a <strong style="color:#ffca28;">CDN</strong> edge for a year; the origin sees only misses and the long tail. The player fetches the manifest from the API and segments from the nearest edge.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Adaptive bitrate:</strong> <span style="color:#f0e2c8;">The player picks a rung per segment. In my simulation fixed 1080p stalled 21 times, while a throughput rule never stalled and averaged 1,800 kbps with 4 switches; a buffer-only rule got 2,733 kbps but stalled once and switched 18 times. Real players combine both with hysteresis.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Counts and scale:</strong> <span style="color:#f0e2c8;">Views are events on a log, deduplicated and filtered, aggregated into approximate live counters and corrected by batch. At 10x the costs are storage, encode and egress: tier the long tail, encode high rungs only for watched videos, better codecs for popular ones.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why split videos into segments at all?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Segments make streaming plain HTTP: the CDN caches small immutable files, seeking fetches one segment, and the player can switch rendition at every segment boundary. Without segments you would need a stateful streaming server per viewer.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make a long upload watchable quickly?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Chunked parallel encoding turns one long job into many short ones, and the pipeline publishes as soon as the lowest rungs are done, adding higher rungs to the manifest later. Priority queues put popular channels and short videos first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the CDN do on a miss for a new viral video?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Many edges miss at once and would all hit the origin. Request coalescing lets one request per edge, or per regional tier, fetch the segment while others wait for it, and a tiered cache hierarchy means only a few parent caches talk to the origin. Big launches can be pre-warmed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you count views accurately?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Do not write a row per view. Send playback events to a log, dedupe by session, drop bots and short plays, and aggregate per video in a stream into sharded counters for the live number, then recompute totals in batch after abuse filtering. The public count lags and is sometimes corrected.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Would you store every rendition of every video?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not forever. View counts are extremely skewed, so the long tail can keep only low rungs plus the original, with higher rungs encoded on demand if a video starts getting views. Popular videos get extra, more expensive encodes because the bandwidth savings repay them.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Transcoding | Re-encoding uploads into the codecs, resolutions and bitrates the service streams |
| Bitrate ladder | The set of renditions (resolution plus bitrate) produced per video |
| Chunked parallel encoding | Encoding short chunks of a video as independent parallel tasks |
| HLS and DASH | HTTP streaming formats of segments plus a manifest |
| Adaptive bitrate (ABR) | Player choosing the rendition per segment from throughput and buffer |
| Rebuffering (stall) | Playback stopping because the buffer ran empty |
| View event stream | Playback events logged, filtered and aggregated into counts |

**Conclusion:** YouTube is a write-once, read-billions pipeline. Uploads are resumable and kept as masters; a DAG of chunked, parallel encodes turns each into a bitrate ladder packaged as HLS and DASH segments; a CDN serves those immutable segments, because at a billion watch hours a day delivery (104 Tbps on average) dwarfs everything else; and the player adapts bitrate segment by segment, which the simulation shows matters: fixed 1080p stalled for longer than the video, while a throughput-based rule never stalled. View counts are a stream aggregation problem, and at 10x the levers are storage tiering for the long tail, smarter encodes and edge caching.`,
    examples: [
      {
        label: `Video delivery: capacity math, then fixed, throughput-based and buffer-based bitrate selection on one bandwidth trace`,
        variants: [
          { tech: "node", code: `// YouTube-style delivery: capacity math, then four bitrate policies played against one bandwidth trace.
const fmt = (n) => n.toLocaleString("en-US");
const ladder = [["240p", 400], ["360p", 800], ["480p", 1400], ["720p", 2800], ["1080p", 5000]]; // kbps
const sumKbps = ladder.reduce((a, r) => a + r[1], 0);

console.log("== 1. Capacity (assumptions: 500 hours uploaded/min, 1B watch hours/day, 2,500 kbps average stream) ==");
const hoursDay = 500 * 60 * 24;
const kBPerHour = sumKbps * 3600 / 8; // kbit/s x s / 8 = kB
console.log("uploaded " + fmt(hoursDay) + " hours/day; full ladder = " + fmt(sumKbps) + " kbps = " + fmt(kBPerHour) + " kB per video hour");
console.log("new encoded storage " + fmt(Math.floor(hoursDay * kBPerHour / 1_000_000_000)) + " TB/day before replication");
console.log("transcode at 1 core-hour per rung per video hour: " + fmt(hoursDay * ladder.length) + " core-hours/day = " + fmt(hoursDay * ladder.length / 24) + " cores busy");
const concurrent = Math.floor(1_000_000_000 / 24);
console.log("average concurrent viewers " + fmt(concurrent) + " -> egress " + fmt(Math.floor(concurrent * 2500 / 1_000_000_000)) + " Tbps (CDN and edge caches carry this)");
const chunks = 3600 / 10;
console.log("a 1-hour upload split into 10 s chunks = " + chunks + " chunks x " + ladder.length + " rungs = " + fmt(chunks * ladder.length) + " parallel encode tasks");

console.log("\\n== 2. Adaptive bitrate: 4 s segments, 20 s max buffer, bandwidth trace in kbps ==");
const SEG = 4000, MAXBUF = 20000;
const trace = [].concat(Array(8).fill(6000), Array(6).fill(2500), Array(6).fill(900), Array(10).fill(4000));
console.log("trace: 8 x 6000, 6 x 2500, 6 x 900, 10 x 4000 (" + trace.length + " segments = " + trace.length * SEG / 1000 + " s of video)");
const policies = {
  "fixed 1080p": () => 4,
  "fixed 360p": () => 1,
  "throughput": (hist) => { // highest rung under 80% of the slowest of the last 3 downloads
    if (hist.length === 0) return 0;
    const est = Math.min(...hist.slice(-3)) * 8 / 10;
    let r = 0; for (let i = 0; i < ladder.length; i++) if (ladder[i][1] <= est) r = i;
    return r;
  },
  "buffer-based": (hist, buf) => { // below 5 s: lowest rung; above 15 s: highest; linear between
    if (buf < 5000) return 0;
    return Math.min(4, Math.floor((buf - 5000) * 5 / 10000));
  },
};
console.log("policy        startup ms  stalls  stall ms  avg kbps  switches  rungs used");
for (const [name, pick] of Object.entries(policies)) {
  let buf = 0, startup = 0, stalls = 0, stallMs = 0, kbpsSum = 0, switches = 0, prev = -1;
  const hist = [], used = new Set();
  for (let i = 0; i < trace.length; i++) {
    const r = pick(hist, buf);
    const dl = Math.floor(ladder[r][1] * SEG / trace[i]); // ms to download this segment
    if (i === 0) startup = dl;
    else if (dl > buf) { stalls++; stallMs += dl - buf; buf = 0; }
    else buf -= dl;
    buf = Math.min(buf + SEG, MAXBUF); // the player pauses fetching when the buffer is full
    hist.push(trace[i]); kbpsSum += ladder[r][1]; used.add(ladder[r][0]);
    if (prev >= 0 && r !== prev) switches++;
    prev = r;
  }
  console.log(name.padEnd(14) + String(startup).padStart(10) + String(stalls).padStart(8) + String(stallMs).padStart(10) +
    String(Math.floor(kbpsSum / trace.length)).padStart(10) + String(switches).padStart(10) + "  " + ladder.filter((l) => used.has(l[0])).map((l) => l[0]).join(","));
}` },
          { tech: "python", code: `# YouTube-style delivery: capacity math, then four bitrate policies played against one bandwidth trace.
def fmt(n):
    return f"{n:,}"


ladder = [("240p", 400), ("360p", 800), ("480p", 1400), ("720p", 2800), ("1080p", 5000)]  # kbps
sum_kbps = sum(r[1] for r in ladder)

print("== 1. Capacity (assumptions: 500 hours uploaded/min, 1B watch hours/day, 2,500 kbps average stream) ==")
hours_day = 500 * 60 * 24
kb_per_hour = sum_kbps * 3600 // 8  # kbit/s x s / 8 = kB
print("uploaded " + fmt(hours_day) + " hours/day; full ladder = " + fmt(sum_kbps) + " kbps = " + fmt(kb_per_hour) + " kB per video hour")
print("new encoded storage " + fmt(hours_day * kb_per_hour // 1_000_000_000) + " TB/day before replication")
print("transcode at 1 core-hour per rung per video hour: " + fmt(hours_day * len(ladder)) + " core-hours/day = " + fmt(hours_day * len(ladder) // 24) + " cores busy")
concurrent = 1_000_000_000 // 24
print("average concurrent viewers " + fmt(concurrent) + " -> egress " + fmt(concurrent * 2500 // 1_000_000_000) + " Tbps (CDN and edge caches carry this)")
chunks = 3600 // 10
print(f"a 1-hour upload split into 10 s chunks = {chunks} chunks x {len(ladder)} rungs = " + fmt(chunks * len(ladder)) + " parallel encode tasks")

print("\\n== 2. Adaptive bitrate: 4 s segments, 20 s max buffer, bandwidth trace in kbps ==")
SEG, MAXBUF = 4000, 20000
trace = [6000] * 8 + [2500] * 6 + [900] * 6 + [4000] * 10
print(f"trace: 8 x 6000, 6 x 2500, 6 x 900, 10 x 4000 ({len(trace)} segments = {len(trace) * SEG // 1000} s of video)")


def throughput(hist, buf):  # highest rung under 80% of the slowest of the last 3 downloads
    if not hist:
        return 0
    est = min(hist[-3:]) * 8 / 10
    r = 0
    for i, (_, k) in enumerate(ladder):
        if k <= est:
            r = i
    return r


def buffer_based(hist, buf):  # below 5 s: lowest rung; above 15 s: highest; linear between
    if buf < 5000:
        return 0
    return min(4, (buf - 5000) * 5 // 10000)


policies = [("fixed 1080p", lambda h, b: 4), ("fixed 360p", lambda h, b: 1), ("throughput", throughput), ("buffer-based", buffer_based)]
print("policy        startup ms  stalls  stall ms  avg kbps  switches  rungs used")
for name, pick in policies:
    buf = startup = stalls = stall_ms = kbps_sum = switches = 0
    prev = -1
    hist, used = [], set()
    for i, bw in enumerate(trace):
        r = pick(hist, buf)
        dl = ladder[r][1] * SEG // bw  # ms to download this segment
        if i == 0:
            startup = dl
        elif dl > buf:
            stalls += 1
            stall_ms += dl - buf
            buf = 0
        else:
            buf -= dl
        buf = min(buf + SEG, MAXBUF)  # the player pauses fetching when the buffer is full
        hist.append(bw)
        kbps_sum += ladder[r][1]
        used.add(ladder[r][0])
        if prev >= 0 and r != prev:
            switches += 1
        prev = r
    print(name.ljust(14) + str(startup).rjust(10) + str(stalls).rjust(8) + str(stall_ms).rjust(10) +
          str(kbps_sum // len(trace)).rjust(10) + str(switches).rjust(10) + "  " + ",".join(l[0] for l in ladder if l[0] in used))` },
        ],
      },
    ],
  },
];

export default augments;
