import type { SystemDesignAugment } from "./system-design-augments.types";

/**
 * System-design augments — batch 4 (the "design X" systems + capacity estimation).
 * Conventions: answer = double-quoted prose ("\n"-joined) + inline
 * <svg class='iq-diagram'> (single-quote attrs, no backticks; use &gt;/&lt;
 * inside <text>) + GFM tables. Prose avoids bare < or > (rehype-raw is on).
 * Code variants: template literals, backtick-free, no ${}.
 */
const augments: SystemDesignAugment[] = [
  {
    title: "How do you approach back-of-the-envelope capacity estimation?",
    answer:
      "## Back-of-the-envelope estimation\n\n" +
      "The goal isn't precision — it's an **order-of-magnitude** sanity check that tells you whether you need one box or a thousand, and where the bottleneck is. Work top-down from users to load:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 150' role='img' aria-label='From daily users to peak QPS'>" +
      "<defs><marker id='ah-cap' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='10' y='52' width='86' height='44' rx='6'/><text class='d-sub' x='53' y='78' text-anchor='middle'>DAU</text>" +
      "<rect class='d-box' x='140' y='52' width='100' height='44' rx='6'/><text class='d-sub' x='190' y='72' text-anchor='middle'>requests</text><text class='d-sub' x='190' y='86' text-anchor='middle'>per day</text>" +
      "<rect class='d-box' x='284' y='52' width='86' height='44' rx='6'/><text class='d-sub' x='327' y='78' text-anchor='middle'>avg QPS</text>" +
      "<rect class='d-box-accent' x='400' y='52' width='74' height='44' rx='6'/><text class='d-sub' x='437' y='78' text-anchor='middle'>peak QPS</text>" +
      "<line class='d-edge' x1='96' y1='74' x2='138' y2='74' marker-end='url(#ah-cap)'/><text class='d-sub' x='117' y='44' text-anchor='middle'>x actions</text>" +
      "<line class='d-edge' x1='240' y1='74' x2='282' y2='74' marker-end='url(#ah-cap)'/><text class='d-sub' x='261' y='44' text-anchor='middle'>/ 86,400</text>" +
      "<line class='d-edge' x1='370' y1='74' x2='398' y2='74' marker-end='url(#ah-cap)'/><text class='d-sub' x='385' y='44' text-anchor='middle'>x 2-3</text>" +
      "</svg>\n\n" +
      "Estimate four things: **QPS** (read vs write separately), **storage** (per-item size × items × retention), **bandwidth** (QPS × payload), and **memory** (working set you want cached).\n\n" +
      "| Handy number | Value |\n" +
      "|---|---|\n" +
      "| 1 day | about 86,400 s (round to 100k) |\n" +
      "| Powers | 2^10 = ~thousand (KB), 2^20 (MB), 2^30 (GB), 2^40 (TB) |\n" +
      "| Sizes | char = 1 B, UUID = 16 B, typical row 0.1-1 KB |\n" +
      "| Latency | mem read ~100 ns, SSD ~100 us, disk seek ~10 ms, same-DC RTT ~0.5 ms |\n" +
      "| Peak | about 2-3x the daily average |\n\n" +
      "**Worked example:** 100M DAU each making 20 requests/day = 2x10^9 req/day. Divide by ~10^5 s/day = **~20k QPS average**, so **~50k peak**. If you store 1M new 1 KB items/day for 5 years: 1M x 1 KB x 365 x 5 = **~1.8 TB**.\n\n" +
      "**Interview tip:** state assumptions out loud, round aggressively to powers of ten, and split **read vs write** QPS (read:write ratios drive caching/replication). The number itself matters less than showing you can find the bottleneck and justify the component sizes that follow.",
    examples: [
      {
        label: "Quick capacity calculator",
        tech: "python",
        code: `DAU = 100_000_000
actions_per_user = 20
seconds_per_day = 86_400
peak_factor = 3

requests_per_day = DAU * actions_per_user
avg_qps  = requests_per_day / seconds_per_day
peak_qps = avg_qps * peak_factor

new_items_per_day = 1_000_000
bytes_per_item = 1_000                       # ~1 KB
storage_5y_tb = new_items_per_day * bytes_per_item * 365 * 5 / 1e12

print("avg QPS        :", round(avg_qps))
print("peak QPS       :", round(peak_qps))
print("5-year storage :", round(storage_5y_tb, 1), "TB")`,
      },
    ],
  },
  {
    title: "Design a URL shortener (TinyURL)",
    answer:
      "## URL shortener — core design\n\n" +
      "**Requirements:** create a short code for a long URL, then redirect on access. It is extremely **read-heavy** (about 100 reads per write), and codes must be **short, unique, and hard to guess in bulk**.\n\n" +
      "**Capacity:** say 100M new URLs/month (about 40 writes/s) and 100x that in reads (about 4k QPS). Storage for 5 years at ~0.5 KB/record is only a few TB — trivial; the challenge is **read throughput and latency**.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 205' role='img' aria-label='URL shortener write and read paths'>" +
      "<defs><marker id='ah-url' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<text class='d-sub' x='240' y='15' text-anchor='middle'>Write: create a code (rare)</text>" +
      "<rect class='d-box' x='14' y='28' width='78' height='38' rx='6'/><text class='d-sub' x='53' y='51' text-anchor='middle'>Client</text>" +
      "<rect class='d-box-accent' x='150' y='26' width='112' height='42' rx='6'/><text class='d-sub' x='206' y='46' text-anchor='middle'>Create API</text><text class='d-sub' x='206' y='60' text-anchor='middle'>base62(id)</text>" +
      "<rect class='d-box' x='320' y='28' width='150' height='38' rx='6'/><text class='d-sub' x='395' y='51' text-anchor='middle'>KV: code -&gt; URL</text>" +
      "<line class='d-edge' x1='92' y1='47' x2='148' y2='47' marker-end='url(#ah-url)'/>" +
      "<line class='d-edge' x1='262' y1='47' x2='318' y2='47' marker-end='url(#ah-url)'/>" +
      "<text class='d-sub' x='240' y='110' text-anchor='middle'>Read: redirect (about 100x the traffic)</text>" +
      "<rect class='d-box' x='14' y='126' width='78' height='38' rx='6'/><text class='d-sub' x='53' y='149' text-anchor='middle'>Client</text>" +
      "<rect class='d-box-accent' x='150' y='124' width='96' height='42' rx='6'/><text class='d-sub' x='198' y='149' text-anchor='middle'>Redirect</text>" +
      "<rect class='d-box' x='300' y='126' width='72' height='38' rx='6'/><text class='d-sub' x='336' y='149' text-anchor='middle'>Cache</text>" +
      "<rect class='d-box' x='398' y='126' width='66' height='38' rx='6'/><text class='d-sub' x='431' y='149' text-anchor='middle'>KV</text>" +
      "<line class='d-edge' x1='92' y1='145' x2='148' y2='145' marker-end='url(#ah-url)'/>" +
      "<line class='d-edge' x1='246' y1='145' x2='298' y2='145' marker-end='url(#ah-url)'/>" +
      "<line class='d-edge-dashed' x1='372' y1='145' x2='396' y2='145' marker-end='url(#ah-url)'/>" +
      "<text class='d-sub' x='240' y='194' text-anchor='middle'>cache hot codes; KV (code -&gt; URL) scales horizontally</text>" +
      "</svg>\n\n" +
      "**Key generation** is the heart of it. The clean approach: take a unique **auto-increment id** (or a range handed out by a counter service / Snowflake-style id) and **base62-encode** it (`0-9a-zA-Z`). 7 base62 chars = 62^7 = ~3.5 trillion codes. This is collision-free by construction; the alternative (hash the URL + take a prefix) needs **collision checks** on insert.\n\n" +
      "| Decision | Pick | Why |\n" +
      "|---|---|---|\n" +
      "| Code generation | base62 of a unique id | no collisions, short |\n" +
      "| Redirect status | 302 (found) | keeps control + lets you log clicks (301 is cached by browsers) |\n" +
      "| Store | KV / sharded SQL | simple code -&gt; URL lookups |\n\n" +
      "**Interview tip:** lead with the **read-heavy** ratio (so caching + the redirect path dominate), justify **base62-of-an-id** over hashing (no collision handling), and use **302** so you can still record analytics. Custom aliases need a uniqueness check; expiration needs a TTL + cleanup job.",
    examples: [
      {
        label: "base62 encode / decode",
        variants: [
          {
            tech: "python",
            code: `ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

def encode(n):                 # unique id -> short code
    if n == 0:
        return ALPHABET[0]
    out = []
    while n > 0:
        n, rem = divmod(n, 62)
        out.append(ALPHABET[rem])
    return "".join(reversed(out))

def decode(code):              # short code -> id (then look up the URL)
    n = 0
    for ch in code:
        n = n * 62 + ALPHABET.index(ch)
    return n

for id in [1, 1000, 123456789]:
    code = encode(id)
    print(id, "->", code, "->", decode(code))`,
          },
          {
            tech: "go",
            code: `package main

import (
	"fmt"
	"strings"
)

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

func encode(n int) string {
	if n == 0 {
		return string(alphabet[0])
	}
	var b []byte
	for n > 0 {
		b = append([]byte{alphabet[n%62]}, b...)
		n /= 62
	}
	return string(b)
}

func decode(code string) int {
	n := 0
	for _, ch := range code {
		n = n*62 + strings.IndexRune(alphabet, ch)
	}
	return n
}

func main() {
	for _, id := range []int{1, 1000, 123456789} {
		code := encode(id)
		fmt.Println(id, "->", code, "->", decode(code))
	}
}`,
          },
          {
            tech: "java",
            code: `public class Main {
    static final String A = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    static String encode(long n) {
        if (n == 0) return String.valueOf(A.charAt(0));
        StringBuilder sb = new StringBuilder();
        while (n > 0) { sb.append(A.charAt((int)(n % 62))); n /= 62; }
        return sb.reverse().toString();
    }

    static long decode(String code) {
        long n = 0;
        for (char c : code.toCharArray()) n = n * 62 + A.indexOf(c);
        return n;
    }

    public static void main(String[] args) {
        for (long id : new long[]{1, 1000, 123456789}) {
            String code = encode(id);
            System.out.println(id + " -> " + code + " -> " + decode(code));
        }
    }
}`,
          },
        ],
      },
    ],
  },
  {
    title: "How would you design a URL shortener like TinyURL?",
    answer:
      "## URL shortener — scaling the read path\n\n" +
      "(Key generation uses **base62 of a unique id** — collision-free; see the core design. This answer focuses on the part that actually decides the architecture: serving **billions of redirects** fast and cheap.)\n\n" +
      "Because reads outnumber writes ~100:1 and a redirect must be near-instant, you build **layers of caching** in front of a simple, replicated store:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Layered caching for redirect reads, async analytics'>" +
      "<defs><marker id='ah-url2' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='10' y='78' width='66' height='40' rx='6'/><text class='d-sub' x='43' y='102' text-anchor='middle'>User</text>" +
      "<rect class='d-box' x='100' y='78' width='70' height='40' rx='6'/><text class='d-sub' x='135' y='102' text-anchor='middle'>CDN edge</text>" +
      "<rect class='d-box-accent' x='194' y='76' width='84' height='44' rx='6'/><text class='d-sub' x='236' y='101' text-anchor='middle'>Redis cache</text>" +
      "<rect class='d-box' x='300' y='78' width='80' height='40' rx='6'/><text class='d-sub' x='340' y='102' text-anchor='middle'>KV replicas</text>" +
      "<rect class='d-box' x='300' y='150' width='170' height='34' rx='6'/><text class='d-sub' x='385' y='172' text-anchor='middle'>Queue -&gt; analytics</text>" +
      "<line class='d-edge' x1='76' y1='98' x2='98' y2='98' marker-end='url(#ah-url2)'/>" +
      "<line class='d-edge' x1='170' y1='98' x2='192' y2='98' marker-end='url(#ah-url2)'/>" +
      "<line class='d-edge-dashed' x1='278' y1='98' x2='298' y2='98' marker-end='url(#ah-url2)'/>" +
      "<line class='d-edge-dashed' x1='236' y1='120' x2='320' y2='150' marker-end='url(#ah-url2)'/>" +
      "<text class='d-sub' x='240' y='40' text-anchor='middle'>most redirects served from cache; KV is the fallback</text>" +
      "</svg>\n\n" +
      "The store itself can be a partitioned KV (DynamoDB/Cassandra) or sharded SQL keyed by code — lookups are single-key, so it scales out linearly with **read replicas**. Click **analytics** is written **asynchronously** (emit an event to a queue) so it never slows the redirect. For a global audience, run the cache + read replicas **multi-region**.\n\n" +
      "| Layer | Hit serves | Purpose |\n" +
      "|---|---|---|\n" +
      "| CDN / edge | popular links | absorb traffic near users |\n" +
      "| Redis (cache-aside) | hot codes | sub-ms lookups, offload KV |\n" +
      "| KV + read replicas | everything | durable source of truth |\n\n" +
      "**Interview tip:** the whole game is **read scaling** — cache-aside with a high hit rate, async analytics off the hot path, and horizontal read replicas. Mention **cache stampede** protection for a suddenly-viral link, and that 302 (not 301) keeps requests flowing through you so analytics stay accurate.",
    examples: [
      {
        label: "Cache-aside redirect lookup",
        variants: [
          {
            tech: "python",
            code: `cache = {}   # Redis in production (code -> url, with a TTL)

def resolve(code, kv):
    if code in cache:               # hot code -> served from memory
        return cache[code]
    url = kv.get(code)              # miss -> fall back to the KV store
    if url:
        cache[code] = url           # populate for next time
    return url

kv = {"abc": "https://example.com/a/very/long/path"}
print(resolve("abc", kv))   # miss -> KV, then cached
print(resolve("abc", kv))   # hit  -> cache`,
          },
          {
            tech: "go",
            code: `package main

import "fmt"

var cache = map[string]string{}

func resolve(code string, kv map[string]string) string {
	if u, ok := cache[code]; ok { // hot code -> memory
		return u
	}
	if u, ok := kv[code]; ok { // miss -> KV store
		cache[code] = u // populate
		return u
	}
	return ""
}

func main() {
	kv := map[string]string{"abc": "https://example.com/a/very/long/path"}
	fmt.Println(resolve("abc", kv)) // miss -> KV, cached
	fmt.Println(resolve("abc", kv)) // hit  -> cache
}`,
          },
        ],
      },
    ],
  },
  {
    title: "How would you design Twitter's timeline at scale?",
    answer:
      "## Twitter timeline\n\n" +
      "The core tension: a user's home timeline is the **merge of recent tweets from everyone they follow**, and reads vastly outnumber writes. Computing that merge on every read is too slow, so the trick is **when** you do the fan-out.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Fan-out on write into per-user timeline caches'>" +
      "<defs><marker id='ah-tw' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='14' y='38' width='96' height='42' rx='6'/><text class='d-sub' x='62' y='64' text-anchor='middle'>Post tweet</text>" +
      "<rect class='d-box-accent' x='158' y='34' width='120' height='50' rx='8'/><text class='d-text' x='218' y='56' text-anchor='middle'>Fan-out svc</text><text class='d-sub' x='218' y='72' text-anchor='middle'>push to followers</text>" +
      "<rect class='d-box' x='330' y='24' width='140' height='32' rx='6'/><text class='d-sub' x='400' y='44' text-anchor='middle'>timeline:A (Redis)</text>" +
      "<rect class='d-box' x='330' y='64' width='140' height='32' rx='6'/><text class='d-sub' x='400' y='84' text-anchor='middle'>timeline:B (Redis)</text>" +
      "<line class='d-edge' x1='110' y1='59' x2='156' y2='59' marker-end='url(#ah-tw)'/>" +
      "<line class='d-edge' x1='278' y1='54' x2='328' y2='40' marker-end='url(#ah-tw)'/>" +
      "<line class='d-edge' x1='278' y1='66' x2='328' y2='80' marker-end='url(#ah-tw)'/>" +
      "<rect class='d-box' x='14' y='142' width='96' height='40' rx='6'/><text class='d-sub' x='62' y='167' text-anchor='middle'>Read feed</text>" +
      "<line class='d-edge' x1='330' y1='150' x2='112' y2='162' marker-end='url(#ah-tw)'/>" +
      "<text class='d-sub' x='250' y='150' text-anchor='middle'>read = pre-merged list (fast)</text>" +
      "<text class='d-sub' x='240' y='194' text-anchor='middle'>celebrities: skip fan-out, MERGE their tweets at read time (hybrid)</text>" +
      "</svg>\n\n" +
      "| Approach | On write | On read | Best for |\n" +
      "|---|---|---|---|\n" +
      "| Fan-out on write (push) | write tweet id into every follower's timeline list | cheap (read the list) | the vast majority of users |\n" +
      "| Fan-out on read (pull) | cheap | merge followees' tweets live | inactive users |\n" +
      "| Hybrid | push for normal users, skip for celebrities | merge a few celebrity feeds in | what Twitter actually does |\n\n" +
      "Pure push breaks on **celebrities** (one tweet = tens of millions of list writes — a 'fan-out storm'). So you **don't** fan out their tweets; instead you **pull** them at read time and merge into the precomputed timeline. Timelines live in **Redis** (capped lists of tweet ids), tweets in a sharded store, the social graph in its own service.\n\n" +
      "**Interview tip:** the headline answer is **hybrid fan-out** and *why*: push gives cheap reads for most users, but the celebrity fan-out storm forces a pull path for high-follower accounts. Mention storing **ids not full tweets** in the timeline (hydrate on read), capping list length, and async fan-out via a queue.",
  },
  {
    title: "How would you design a news feed system?",
    answer:
      "## News feed\n\n" +
      "A news feed is a generalization of the Twitter timeline with one big addition: the feed is usually **ranked**, not purely chronological. Two concerns: **feed generation** (gathering candidate posts) and **ranking** (ordering them).\n\n" +
      "Generation uses the same **fan-out** trade-off (push/pull/hybrid). Ranking then scores each candidate post and returns the top N:\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 175' role='img' aria-label='Candidate posts are ranked into a paginated feed'>" +
      "<defs><marker id='ah-feed' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='14' y='58' width='120' height='52' rx='6'/><text class='d-sub' x='74' y='80' text-anchor='middle'>Candidates</text><text class='d-sub' x='74' y='95' text-anchor='middle'>(from follows)</text>" +
      "<rect class='d-box-accent' x='180' y='56' width='120' height='56' rx='8'/><text class='d-text' x='240' y='78' text-anchor='middle'>Ranking</text><text class='d-sub' x='240' y='94' text-anchor='middle'>score each post</text>" +
      "<rect class='d-box' x='348' y='58' width='118' height='52' rx='6'/><text class='d-sub' x='407' y='80' text-anchor='middle'>Feed (top N)</text><text class='d-sub' x='407' y='95' text-anchor='middle'>paginated</text>" +
      "<line class='d-edge' x1='134' y1='84' x2='178' y2='84' marker-end='url(#ah-feed)'/>" +
      "<line class='d-edge' x1='300' y1='84' x2='346' y2='84' marker-end='url(#ah-feed)'/>" +
      "<text class='d-sub' x='240' y='150' text-anchor='middle'>signals: recency, author affinity, predicted engagement</text>" +
      "</svg>\n\n" +
      "| Concern | Options |\n" +
      "|---|---|\n" +
      "| Generation | fan-out on write / read / hybrid (as in timelines) |\n" +
      "| Ordering | chronological vs ranked (ML model scoring) |\n" +
      "| Ranking signals | recency, affinity to author, content type, predicted likes/comments |\n" +
      "| Pagination | cursor-based (stable under inserts), not offset |\n\n" +
      "**Interview tip:** call out that **ranked** feeds change the architecture — you precompute candidates (fan-out) but apply a **ranking service** (often an ML model) at read time, with **cursor pagination** for stability. Mention **dedup**, filtering already-seen posts, and that the feed store holds **post ids** hydrated on read.",
  },
  {
    title: "How would you design a notification system?",
    answer:
      "## Notification system\n\n" +
      "A notification service takes **events** (from many services) and reliably delivers messages across **multiple channels** — push, email, SMS, in-app — honoring user preferences. The backbone is a **queue** between accepting an event and delivering it, so spikes are buffered and delivery can retry.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 205' role='img' aria-label='Event to notification service to queue to per-channel workers and providers'>" +
      "<defs><marker id='ah-notif' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='8' y='86' width='66' height='40' rx='6'/><text class='d-sub' x='41' y='110' text-anchor='middle'>Event</text>" +
      "<rect class='d-box-accent' x='110' y='78' width='112' height='56' rx='8'/><text class='d-text' x='166' y='100' text-anchor='middle'>Notif svc</text><text class='d-sub' x='166' y='116' text-anchor='middle'>prefs + dedupe</text>" +
      "<rect class='d-box' x='256' y='88' width='64' height='38' rx='6'/><text class='d-sub' x='288' y='111' text-anchor='middle'>Queue</text>" +
      "<rect class='d-box' x='356' y='28' width='118' height='34' rx='6'/><text class='d-sub' x='415' y='50' text-anchor='middle'>Push (APNs/FCM)</text>" +
      "<rect class='d-box' x='356' y='90' width='118' height='34' rx='6'/><text class='d-sub' x='415' y='112' text-anchor='middle'>Email (SES)</text>" +
      "<rect class='d-box' x='356' y='152' width='118' height='34' rx='6'/><text class='d-sub' x='415' y='174' text-anchor='middle'>SMS (Twilio)</text>" +
      "<line class='d-edge' x1='74' y1='106' x2='108' y2='106' marker-end='url(#ah-notif)'/>" +
      "<line class='d-edge' x1='222' y1='106' x2='254' y2='106' marker-end='url(#ah-notif)'/>" +
      "<line class='d-edge' x1='320' y1='100' x2='354' y2='48' marker-end='url(#ah-notif)'/>" +
      "<line class='d-edge' x1='320' y1='107' x2='354' y2='107' marker-end='url(#ah-notif)'/>" +
      "<line class='d-edge' x1='320' y1='114' x2='354' y2='166' marker-end='url(#ah-notif)'/>" +
      "</svg>\n\n" +
      "Per-channel **workers** pull from the queue and call the right provider (APNs/FCM, SES, Twilio). The hard parts are all about **reliability and respect**: retries with backoff + a **dead-letter queue**, **idempotency/dedup** so a retried event doesn't double-notify, user **preferences/opt-out** and quiet hours, **rate limiting** per user, and **templating/localization**.\n\n" +
      "| Concern | How |\n" +
      "|---|---|\n" +
      "| Reliability | queue + retries + DLQ |\n" +
      "| No duplicates | idempotency key per (user, event) + dedupe window |\n" +
      "| Respect users | preferences, opt-out, quiet hours, per-user rate limit |\n" +
      "| Scale spikes | queue buffers; workers scale horizontally |\n\n" +
      "**Interview tip:** frame it as an **async, queue-backed** pipeline with **at-least-once + idempotent** delivery. Channels differ (push needs device tokens; SMS/email have provider limits + bounces), so isolate them as independent workers with their own retry policy. Track delivery status for observability.",
  },
  {
    title: "How would you design a real-time chat system?",
    answer:
      "## Real-time chat\n\n" +
      "Clients hold a **persistent WebSocket** to a gateway so messages flow both ways instantly. Because connections are **stateful** and spread across many gateway nodes, a message from a user on one gateway must reach a recipient on another — solved with a **pub/sub backplane**.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 205' role='img' aria-label='Clients connect to WebSocket gateways linked by a pub/sub backplane'>" +
      "<defs><marker id='ah-chat' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='12' y='34' width='70' height='36' rx='6'/><text class='d-sub' x='47' y='56' text-anchor='middle'>User A</text>" +
      "<rect class='d-box' x='12' y='140' width='70' height='36' rx='6'/><text class='d-sub' x='47' y='162' text-anchor='middle'>User B</text>" +
      "<rect class='d-box-accent' x='150' y='32' width='104' height='40' rx='6'/><text class='d-sub' x='202' y='56' text-anchor='middle'>WS gateway 1</text>" +
      "<rect class='d-box-accent' x='150' y='138' width='104' height='40' rx='6'/><text class='d-sub' x='202' y='162' text-anchor='middle'>WS gateway 2</text>" +
      "<rect class='d-box' x='322' y='84' width='92' height='40' rx='6'/><text class='d-sub' x='368' y='108' text-anchor='middle'>Pub/Sub</text>" +
      "<rect class='d-box' x='318' y='150' width='150' height='36' rx='6'/><text class='d-sub' x='393' y='173' text-anchor='middle'>Message store</text>" +
      "<line class='d-edge' x1='82' y1='52' x2='148' y2='52' marker-end='url(#ah-chat)'/>" +
      "<line class='d-edge' x1='82' y1='158' x2='148' y2='158' marker-end='url(#ah-chat)'/>" +
      "<line class='d-edge-dashed' x1='254' y1='56' x2='320' y2='98' marker-end='url(#ah-chat)'/>" +
      "<line class='d-edge-dashed' x1='254' y1='158' x2='320' y2='112' marker-end='url(#ah-chat)'/>" +
      "<text class='d-sub' x='240' y='202' text-anchor='middle'>gateways relay via pub/sub so cross-node users still connect</text>" +
      "</svg>\n\n" +
      "Flow: A sends to gateway 1 -&gt; chat service **persists** the message and **publishes** to the conversation's channel -&gt; gateway 2 (where B is connected) pushes it down B's socket. If B is **offline**, fall back to a **push notification** and deliver on reconnect. Messages get a **sequence number** per conversation for ordering and read receipts; storage is a write-heavy store like **Cassandra** keyed by conversation id.\n\n" +
      "| Concern | Approach |\n" +
      "|---|---|\n" +
      "| Transport | WebSocket (sticky sessions to a gateway) |\n" +
      "| Cross-node delivery | pub/sub backplane (Redis/Kafka) |\n" +
      "| Offline users | persist + push notification, deliver on reconnect |\n" +
      "| Ordering | per-conversation sequence numbers |\n\n" +
      "**Interview tip:** the two things interviewers want: **WebSockets are stateful**, so you need **sticky routing + a pub/sub backplane** to scale gateways horizontally; and a clear **online vs offline** delivery path (push down the socket vs fall back to notifications). Mention message persistence, ordering per conversation, and presence/typing as a separate lightweight signal.",
  },
  {
    title: "How would you design a typeahead/autocomplete system?",
    answer:
      "## Typeahead / autocomplete\n\n" +
      "As the user types, return the top few **completions for the current prefix** in well under ~100 ms. The classic structure is a **trie (prefix tree)**, where each node caches the **top-k** completions for its prefix, so a lookup is just walking the prefix and returning the precomputed list.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 185' role='img' aria-label='A trie caching top completions per prefix node'>" +
      "<defs><marker id='ah-type' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<circle class='d-box-accent' cx='60' cy='90' r='20'/><text class='d-sub' x='60' y='95' text-anchor='middle'>root</text>" +
      "<circle class='d-box' cx='160' cy='90' r='20'/><text class='d-sub' x='160' y='95' text-anchor='middle'>c</text>" +
      "<circle class='d-box' cx='260' cy='90' r='20'/><text class='d-sub' x='260' y='95' text-anchor='middle'>a</text>" +
      "<circle class='d-box' cx='360' cy='52' r='20'/><text class='d-sub' x='360' y='57' text-anchor='middle'>t</text>" +
      "<circle class='d-box' cx='360' cy='130' r='20'/><text class='d-sub' x='360' y='135' text-anchor='middle'>r</text>" +
      "<line class='d-edge' x1='80' y1='90' x2='140' y2='90' marker-end='url(#ah-type)'/>" +
      "<line class='d-edge' x1='180' y1='90' x2='240' y2='90' marker-end='url(#ah-type)'/>" +
      "<line class='d-edge' x1='277' y1='80' x2='342' y2='58' marker-end='url(#ah-type)'/>" +
      "<line class='d-edge' x1='277' y1='100' x2='342' y2='124' marker-end='url(#ah-type)'/>" +
      "<text class='d-sub' x='420' y='56' text-anchor='middle'>cat</text>" +
      "<text class='d-sub' x='420' y='134' text-anchor='middle'>car</text>" +
      "<text class='d-sub' x='240' y='174' text-anchor='middle'>each node caches the top-k completions for its prefix</text>" +
      "</svg>\n\n" +
      "Build the trie **offline** from query/search logs (weight each term by frequency), serve it from **in-memory** nodes (or Redis), and **rebuild/refresh** periodically — typeahead tolerates slightly stale suggestions. Add **debouncing** on the client and an edge **cache** for hot prefixes.\n\n" +
      "| Approach | Trade-off |\n" +
      "|---|---|\n" +
      "| Trie + top-k per node | fast reads, more memory + offline build |\n" +
      "| Search engine (Elasticsearch) | flexible (fuzzy/typo), heavier |\n" +
      "| DB `LIKE 'prefix%'` | trivial, doesn't scale / rank |\n\n" +
      "**Interview tip:** the winning answer is a **prefix trie with precomputed top-k per node**, built **offline** from logs and served from memory — reads must be cheap because they fire on **every keystroke**. Mention **debounce + client cache**, ranking by popularity (and personalization), and that fuzzy/typo tolerance often pushes teams to a search engine.",
    examples: [
      {
        label: "Trie with cached top-k suggestions",
        variants: [
          {
            tech: "python",
            code: `class Node:
    def __init__(self):
        self.children = {}
        self.top = []                 # cached (weight, word), best first

class Trie:
    def __init__(self, k=5):
        self.root = Node()
        self.k = k
    def insert(self, word, weight):
        node = self.root
        for ch in word:
            node = node.children.setdefault(ch, Node())
            node.top = sorted(set(node.top + [(weight, word)]), reverse=True)[: self.k]
    def suggest(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node.children:
                return []
            node = node.children[ch]
        return [w for _, w in node.top]

t = Trie()
for word, freq in [("cat", 9), ("car", 7), ("cards", 3), ("dog", 5)]:
    t.insert(word, freq)
print("ca ->", t.suggest("ca"))   # ['cat', 'car', 'cards'] (by popularity)`,
          },
          {
            tech: "go",
            code: `package main

import (
	"fmt"
	"sort"
)

type pair struct {
	weight int
	word   string
}

type Node struct {
	children map[rune]*Node
	top      []pair
}

func newNode() *Node { return &Node{children: map[rune]*Node{}} }

type Trie struct {
	root *Node
	k    int
}

func (t *Trie) insert(word string, weight int) {
	node := t.root
	for _, ch := range word {
		if node.children[ch] == nil {
			node.children[ch] = newNode()
		}
		node = node.children[ch]
		node.top = append(node.top, pair{weight, word})
		sort.Slice(node.top, func(i, j int) bool { return node.top[i].weight > node.top[j].weight })
		if len(node.top) > t.k {
			node.top = node.top[:t.k]
		}
	}
}

func (t *Trie) suggest(prefix string) []string {
	node := t.root
	for _, ch := range prefix {
		if node.children[ch] == nil {
			return nil
		}
		node = node.children[ch]
	}
	out := []string{}
	for _, p := range node.top {
		out = append(out, p.word)
	}
	return out
}

func main() {
	t := &Trie{root: newNode(), k: 5}
	for _, e := range []pair{{9, "cat"}, {7, "car"}, {3, "cards"}, {5, "dog"}} {
		t.insert(e.word, e.weight)
	}
	fmt.Println("ca ->", t.suggest("ca"))
}`,
          },
        ],
      },
    ],
  },
  {
    title: "How would you design a 'nearby drivers' / proximity search?",
    answer:
      "## Proximity search (nearby drivers)\n\n" +
      "Given a rider's location, find drivers within a radius — fast, over a stream of **constantly-changing** driver positions. A naive 'compute distance to every driver' is O(n) per query; the fix is a **spatial index** that buckets the world into cells so you only examine **nearby** drivers.\n\n" +
      "The common technique is **geohashing**: encode lat/long into a short string where a **shared prefix = spatial proximity**. Index drivers by geohash cell; to answer a query, look up the rider's cell **plus its 8 neighbors**, then filter by true distance.\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 200' role='img' aria-label='Geohash grid: search the rider cell and neighbors within a radius'>" +
      "<rect class='d-box' x='110' y='25' width='260' height='150' rx='4'/>" +
      "<line class='d-edge' x1='175' y1='25' x2='175' y2='175'/><line class='d-edge' x1='240' y1='25' x2='240' y2='175'/><line class='d-edge' x1='305' y1='25' x2='305' y2='175'/>" +
      "<line class='d-edge' x1='110' y1='75' x2='370' y2='75'/><line class='d-edge' x1='110' y1='125' x2='370' y2='125'/>" +
      "<circle class='d-edge-accent' cx='240' cy='100' r='58'/>" +
      "<circle class='d-accent' cx='240' cy='100' r='6'/><text class='d-sub' x='240' y='90' text-anchor='middle'>rider</text>" +
      "<circle class='d-arrow' cx='205' cy='62' r='5'/><circle class='d-arrow' cx='298' cy='95' r='5'/><circle class='d-arrow' cx='220' cy='138' r='5'/><circle class='d-arrow' cx='340' cy='150' r='5'/>" +
      "<text class='d-sub' x='240' y='192' text-anchor='middle'>query the rider's cell + 8 neighbors, then filter by true distance</text>" +
      "</svg>\n\n" +
      "Driver location updates are **write-heavy** (every few seconds) — keep the live index in memory (e.g. **Redis GEO**, which does exactly this). Cell size is a trade-off: too large means scanning many drivers, too small means querying many cells. Alternatives are a **quadtree** (adapts to density) or Google **S2**.\n\n" +
      "| Index | Strength | Weakness |\n" +
      "|---|---|---|\n" +
      "| Geohash | simple, prefix = proximity, Redis GEO | edge effects at cell borders (check neighbors) |\n" +
      "| Quadtree | adapts to dense areas | more complex, rebalancing |\n" +
      "| S2 cells | accurate on a sphere | heavier to implement |\n\n" +
      "**Interview tip:** name **geohash (or quadtree/S2)** and the **cell + neighbors then exact-distance filter** pattern. Stress the **write-heavy** location stream (in-memory index, short TTL on positions) and the **cell-size trade-off**. Redis GEO commands (`GEOADD`/`GEOSEARCH`) are a great off-the-shelf answer.",
    examples: [
      {
        label: "Distance filter (haversine)",
        variants: [
          {
            tech: "python",
            code: `import math

def haversine(lat1, lon1, lat2, lon2):     # great-circle distance in km
    R = 6371
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dlmb/2)**2
    return 2 * R * math.asin(math.sqrt(a))

rider = (37.778, -122.415)
# In production you'd first narrow to the rider's geohash cell + neighbors,
# then compute exact distance only for that small candidate set:
drivers = {"d1": (37.776, -122.417), "d2": (37.781, -122.412), "d3": (37.760, -122.450)}

nearby = sorted(
    ((name, round(haversine(rider[0], rider[1], lat, lon), 2)) for name, (lat, lon) in drivers.items()),
    key=lambda x: x[1],
)
print("within 1 km:", [d for d in nearby if d[1] <= 1.0])`,
          },
          {
            tech: "go",
            code: `package main

import (
	"fmt"
	"math"
	"sort"
)

func haversine(lat1, lon1, lat2, lon2 float64) float64 { // km
	const R = 6371
	p1, p2 := lat1*math.Pi/180, lat2*math.Pi/180
	dphi := (lat2 - lat1) * math.Pi / 180
	dlmb := (lon2 - lon1) * math.Pi / 180
	a := math.Sin(dphi/2)*math.Sin(dphi/2) +
		math.Cos(p1)*math.Cos(p2)*math.Sin(dlmb/2)*math.Sin(dlmb/2)
	return 2 * R * math.Asin(math.Sqrt(a))
}

func main() {
	rider := [2]float64{37.778, -122.415}
	drivers := map[string][2]float64{
		"d1": {37.776, -122.417}, "d2": {37.781, -122.412}, "d3": {37.760, -122.450},
	}
	type res struct {
		name string
		km   float64
	}
	var out []res
	for n, p := range drivers {
		out = append(out, res{n, haversine(rider[0], rider[1], p[0], p[1])})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].km < out[j].km })
	for _, r := range out {
		if r.km <= 1.0 {
			fmt.Printf("%s within %.2f km\\n", r.name, r.km)
		}
	}
}`,
          },
        ],
      },
    ],
  },
  {
    title: "How would you design a distributed cache?",
    answer:
      "## Distributed cache\n\n" +
      "A distributed cache (think Redis Cluster / Memcached) spreads cached keys across **many nodes** so capacity and throughput scale beyond one machine. Two core problems: **where does a key live**, and **how do you survive a node failure**.\n\n" +
      "Keys are partitioned with **consistent hashing** so adding/removing a node only remaps a small slice of keys (not the whole cache). Each partition is **replicated** for availability, and each node evicts under memory pressure (usually **LRU**).\n\n" +
      "<svg class='iq-diagram' viewBox='0 0 480 195' role='img' aria-label='Client routes keys via consistent hashing to replicated cache nodes'>" +
      "<defs><marker id='ah-dc' markerWidth='9' markerHeight='9' refX='7' refY='4' orient='auto'><path class='d-arrow' d='M0,0 L8,4 L0,8 Z'/></marker></defs>" +
      "<rect class='d-box' x='12' y='80' width='80' height='44' rx='6'/><text class='d-sub' x='52' y='106' text-anchor='middle'>Client</text>" +
      "<rect class='d-box-accent' x='138' y='74' width='132' height='56' rx='8'/><text class='d-text' x='204' y='96' text-anchor='middle'>Consistent hash</text><text class='d-sub' x='204' y='112' text-anchor='middle'>key -&gt; node</text>" +
      "<rect class='d-box' x='330' y='26' width='140' height='34' rx='6'/><text class='d-sub' x='400' y='48' text-anchor='middle'>Node 1 (+ replica)</text>" +
      "<rect class='d-box' x='330' y='86' width='140' height='34' rx='6'/><text class='d-sub' x='400' y='108' text-anchor='middle'>Node 2 (+ replica)</text>" +
      "<rect class='d-box' x='330' y='146' width='140' height='34' rx='6'/><text class='d-sub' x='400' y='168' text-anchor='middle'>Node 3 (+ replica)</text>" +
      "<line class='d-edge' x1='92' y1='102' x2='136' y2='102' marker-end='url(#ah-dc)'/>" +
      "<line class='d-edge' x1='270' y1='96' x2='328' y2='44' marker-end='url(#ah-dc)'/>" +
      "<line class='d-edge' x1='270' y1='102' x2='328' y2='104' marker-end='url(#ah-dc)'/>" +
      "<line class='d-edge' x1='270' y1='110' x2='328' y2='162' marker-end='url(#ah-dc)'/>" +
      "</svg>\n\n" +
      "| Concern | Approach |\n" +
      "|---|---|\n" +
      "| Partitioning | consistent hashing (+ virtual nodes for balance) |\n" +
      "| Availability | replicate each shard; promote a replica on failure |\n" +
      "| Eviction | LRU / LFU + TTLs |\n" +
      "| Hot keys | replicate hot keys / client-side cache / add jitter to TTLs |\n" +
      "| Routing | smart client or a proxy (e.g. twemproxy) |\n\n" +
      "**Interview tip:** the two pillars are **consistent hashing for partitioning** (minimal reshuffle on resize — see that question) and **replication for HA**. Then discuss **eviction (LRU)**, **hot-key** mitigation, and **cache stampede** protection. Note caches are usually best-effort (a miss just falls through to the DB), so strong consistency isn't the goal — availability and latency are.",
    examples: [
      {
        label: "Per-node LRU eviction",
        tech: "python",
        code: `from collections import OrderedDict

class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.store = OrderedDict()
    def get(self, key):
        if key not in self.store:
            return None
        self.store.move_to_end(key)          # mark most-recently-used
        return self.store[key]
    def put(self, key, value):
        self.store[key] = value
        self.store.move_to_end(key)
        if len(self.store) > self.capacity:
            evicted, _ = self.store.popitem(last=False)   # drop least-recently-used
            print("evicted", evicted)

c = LRUCache(2)
c.put("a", 1); c.put("b", 2)
c.get("a")                  # 'a' is now most-recently-used
c.put("c", 3)               # over capacity -> evicts 'b'
print("a:", c.get("a"), "b:", c.get("b"), "c:", c.get("c"))`,
      },
    ],
  },
];

export default augments;
