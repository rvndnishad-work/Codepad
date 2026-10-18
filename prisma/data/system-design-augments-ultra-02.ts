/**
 * SYSTEM DESIGN ULTRA — batch 02: Networking and the edge of the system. Every example was run by
 * scripts/verify-variant-examples.ts (node, python, go, java); quoted output is that run's output.
 */
import type { SystemDesignUltraAugment } from "./system-design-augments.types";

const augments: SystemDesignUltraAugment[] = [
  {
    title: `How does DNS resolution work?`,
    difficulty: "easy",
    seoDescription: `How a name like www.example.com becomes an IP address: stub and recursive resolvers, root, TLD and authoritative servers, TTL caching and failure modes.`,
    description: `**Question presented to candidate:**
"When I type www.example.com into a browser, how does my computer find out which IP address to connect to? Walk me through every server involved, and tell me where caching happens and what that means when we change a DNS record."

**What a strong answer should cover:**
- The cast: the **stub resolver** on the device, a **recursive resolver** (ISP, company, or public such as 1.1.1.1 or 8.8.8.8), and the **root**, **TLD** and **authoritative** name servers, each answering with a **referral** or an answer
- **Iterative** queries from the recursive resolver down the hierarchy versus the **recursive** query the stub sends to it
- **Caching at every layer** (browser, OS, recursive resolver) governed by the record **TTL**, including **negative caching** of NXDOMAIN; a warm cache answers in zero upstream queries
- Record types that matter in design: **A/AAAA**, **CNAME** (and why CDNs use it), **NS**, plus **TTL strategy** before a migration (lower it in advance)
- Transport: UDP port 53 by default, TCP fallback for large answers, EDNS(0), and encrypted DNS (DoT, DoH)
- DNS as a system-design tool and risk: GeoDNS and weighted records for traffic steering, and DNS as a single point of failure

**Code / implementation expected:** No — a clear walk-through of the lookup path and caching is the answer; the example simulates a resolver for anyone who wants to see it step by step.`,
    answer: `**Target Audience:** Beginners to system design — you have used a browser; no networking background assumed.
**Difficulty:** Easy
**Verified with:** Node 22.22 and Python 3.12 (both print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Behaviour claims come from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

You want to call a friend, but you only know their name. You ask the receptionist at your office. The receptionist does not know either, so she calls the national directory, which says "I do not keep individual numbers, but the directory for that city is at this number." The city directory says "for that street, ask the building manager." The building manager finally gives the number. The receptionist writes it on a sticky note, gives it to you, and keeps the note for a day so the next person who asks gets the answer instantly.

That is DNS. You are the **stub resolver**, the receptionist is the **recursive resolver**, the national directory is a **root server**, the city directory is a **TLD server**, and the building manager is the **authoritative server**. The sticky note is the **cache**, and "keep it for a day" is the **TTL**.

Computers connect to IP addresses like \`203.0.113.10\`, while people remember names. Every web request, API call and database connection string that uses a hostname starts with this lookup, so it affects latency, failover speed and availability of everything you design.

📌 **Interview term: DNS (Domain Name System)** — a distributed, hierarchical, heavily cached database that maps names to records such as IP addresses. No single server holds all names; each zone is managed by its own **authoritative** servers.

## 2. The Cast of Servers

📌 **Interview term: stub resolver** — the small resolver built into the operating system (and often the browser). It does not walk the hierarchy; it sends one question to a recursive resolver and waits for the final answer.

📌 **Interview term: recursive resolver** — the server that does the work: it asks other servers in turn until it has the answer, then caches it. Your ISP, your company, or a public service (Cloudflare 1.1.1.1, Google 8.8.8.8, Quad9) runs it.

📌 **Interview term: root name servers** — the top of the hierarchy. They do not know \`www.example.com\`; they know which servers handle each top-level domain. There are 13 root server identities, \`a.root-servers.net\` through \`m.root-servers.net\`, run by 12 independent organisations (Verisign runs A and J), per root-servers.org. Each identity is many machines sharing one address through **anycast**: root-servers.org listed 1,843 instances in April 2024, and the count keeps growing.

📌 **Interview term: TLD (top-level domain) servers** — the servers for \`com.\`, \`org.\`, \`uk.\` and so on. They know which name servers are authoritative for each domain registered under them.

📌 **Interview term: authoritative name server** — the server that holds the actual records for a zone such as \`example.com.\` It gives final answers, not referrals. Route 53, Cloudflare DNS or your own BIND servers play this role.

📌 **Interview term: referral** — an answer that says "I do not have it, ask these name servers instead" (NS records, plus their IP addresses as *glue* when needed).

<svg class="iq-diagram" width="100%" viewBox="0 0 760 360" role="img" aria-label="A stub resolver asks a recursive resolver, which asks the root, then the TLD server, then the authoritative server">
  <defs>
    <marker id="sd02q1-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="150" width="140" height="64" rx="10"/>
  <text class="d-text" x="90" y="178" text-anchor="middle">Your device</text>
  <text class="d-sub" x="90" y="200" text-anchor="middle">stub resolver</text>
  <rect class="d-box-accent" x="250" y="150" width="170" height="64" rx="10"/>
  <text class="d-text" x="335" y="178" text-anchor="middle">Recursive resolver</text>
  <text class="d-sub" x="335" y="200" text-anchor="middle">caches answers</text>
  <rect class="d-box" x="560" y="20" width="180" height="64" rx="10"/>
  <text class="d-text" x="650" y="48" text-anchor="middle">Root server</text>
  <text class="d-sub" x="650" y="70" text-anchor="middle">refers to com.</text>
  <rect class="d-box" x="560" y="150" width="180" height="64" rx="10"/>
  <text class="d-text" x="650" y="178" text-anchor="middle">TLD server com.</text>
  <text class="d-sub" x="650" y="200" text-anchor="middle">refers to example.com.</text>
  <rect class="d-box" x="560" y="280" width="180" height="64" rx="10"/>
  <text class="d-text" x="650" y="308" text-anchor="middle">Authoritative</text>
  <text class="d-sub" x="650" y="330" text-anchor="middle">answers with the IP</text>
  <path class="d-edge-accent" d="M 160 182 L 244 182" marker-end="url(#sd02q1-arrow)"/>
  <path class="d-edge" d="M 420 164 L 554 60" marker-end="url(#sd02q1-arrow)"/>
  <path class="d-edge" d="M 420 182 L 554 182" marker-end="url(#sd02q1-arrow)"/>
  <path class="d-edge" d="M 420 200 L 554 306" marker-end="url(#sd02q1-arrow)"/>
</svg>

The device asks one question and gets one final answer. The recursive resolver asks the three levels in turn, top to bottom, and remembers every answer for as long as its TTL allows.

📌 **Interview term: recursive vs iterative query** — the stub sends a *recursive* query ("give me the final answer"); the resolver sends *iterative* queries ("tell me what you know"), following each referral itself.

## 3. One Lookup, Step by Step

For \`www.example.com\` with an empty cache:

1. The browser checks its own cache, then asks the operating system, which checks its cache and the hosts file.
2. The stub sends the query over UDP port 53 to the configured recursive resolver.
3. The resolver asks a root server. The root replies with a referral to the \`com.\` servers.
4. The resolver asks a \`com.\` server. It replies with a referral to \`ns1.example.com\` (with its IP as glue, because the name server lives inside the zone it serves).
5. The resolver asks \`ns1.example.com\`, which is authoritative and answers.
6. The resolver caches every record it learned and returns the answer to the stub, which hands it to the browser. Only now can the TCP and TLS handshakes start.

Real names often add a **CNAME** hop. A site on a CDN typically has \`www.example.com CNAME shop.cdnprovider.net.\`, so the resolver starts again for the CDN name, whose authoritative server can return a different edge IP for each region (see [What is a CDN and how does it work?](/interview-question/what-is-a-cdn-and-how-does-it-work)).

📌 **Interview term: CNAME record** — an alias: "this name is really that other name, look that one up." It lets a provider change IPs without you editing your zone. A CNAME cannot sit at the zone apex (\`example.com\` itself), which is why providers offer ALIAS or "CNAME flattening" records.

📌 **Interview term: QNAME minimisation** — a privacy behaviour where the resolver tells each server only as much of the name as it needs: the root is asked about \`com.\`, not the full \`www.example.com.\` Standardised in RFC 9156 (November 2021), which replaced the experimental RFC 7816.

### Record types you will name in a design

| Record | Holds | Design use |
| :--- | :--- | :--- |
| A / AAAA | IPv4 / IPv6 address | point a name at load balancers |
| CNAME | another name | point at a CDN or managed load balancer |
| NS | the zone name servers | delegation between levels |
| MX | mail servers | email routing |
| TXT | free text | domain ownership checks, SPF and DKIM for email |
| SRV | host and port for a service | service discovery in some systems |
| SOA | zone metadata, including the negative-caching TTL | how long "does not exist" is cached |

## 4. Caching and TTLs — Where the Speed Comes From

📌 **Interview term: TTL (time to live)** — a number of seconds attached to every record. Any cache may reuse the record for that long, then must ask again. The TTL a client receives counts down: a resolver that cached a 60-second record 10 seconds ago returns it with TTL 50.

The example simulates a resolver with an in-process root, two TLDs and two authoritative servers. The first lookup is cold:

~~~text
t=0s  www.example.com. -> 198.51.100.25 (TTL 60s)  [upstream queries: 6]
    ask root               NS    com.
    ask tld-com            NS    example.com.
    ask ns1.example.com    A     www.example.com.
    CNAME -> shop.cdnprovider.net.
    ask root               NS    net.
    ask tld-net            NS    cdnprovider.net.
    ask ns.cdnprovider.net A     shop.cdnprovider.net.
~~~

Six upstream queries, because of the CNAME into a second domain. Ten seconds later:

~~~text
t=10s  www.example.com. -> 198.51.100.25 (TTL 50s)  [upstream queries: 0]
    cache hit CNAME shop.cdnprovider.net., 3590s left
    cache hit A 198.51.100.25, 50s left
t=20s  api.example.com. -> 203.0.113.10 (TTL 300s)  [upstream queries: 1]
    ask ns1.example.com    A     api.example.com.
~~~

Zero queries for the repeat, and only one for a new name in a known zone: the resolver cached the referral to \`ns1.example.com\`, so it skips the root and TLD. At t=75s the CDN record (TTL 60) has expired but the CNAME (TTL 3600) has not, so exactly one query goes out — to the CDN name server. This split is deliberate: the CDN keeps a short TTL so it can move traffic between edges quickly.

📌 **Interview term: negative caching** — caching the fact that a name does *not* exist (NXDOMAIN). RFC 2308 sets the time as the smaller of the zone SOA record TTL and its MINIMUM field. In the simulation that is \`min(3600, 900) = 900\` seconds: the lookup at t=500s is answered from cache, the one at t=1000s goes upstream again. Practical consequence: if you query a name *before* creating it, resolvers can keep saying "does not exist" for up to that long after you add it.

### TTL is a trade-off you choose

Part 2 of the example asks: after you change a record, how many caches still hold the old IP ten minutes later? It assumes 1,000 caches that fetched the record at evenly spread times before the change.

~~~text
Part 2: how long a record change takes to reach everyone
  TTL 86400s: worst case 86400s stale; 99.4% of caches still old after 10 min
  TTL  3600s: worst case 3600s stale; 83.4% of caches still old after 10 min
  TTL   300s: worst case 300s stale; 0.0% of caches still old after 10 min
  TTL    60s: worst case 60s stale; 0.0% of caches still old after 10 min
~~~

Long TTLs mean fewer queries, faster lookups and resilience if your DNS provider has an outage (caches keep answering). Short TTLs mean faster failover and migrations, at the cost of more queries and more exposure to DNS outages. The standard migration playbook: lower the TTL to 60–300 seconds at least one old TTL *before* the change, make the change, then raise it again. Some clients and resolvers ignore or clamp TTLs, so plan for a long tail even then.

## 5. Transport: UDP, TCP and Encryption

- **UDP port 53** is the default: one packet each way, no handshake. Classic DNS limited UDP answers to 512 bytes (RFC 1035).
- **EDNS(0)** lets client and server agree a larger UDP size. DNS Flag Day 2020 recommended a default of **1232 bytes**: the IPv6 minimum MTU of 1280 minus 48 bytes of IPv6 and UDP headers, chosen to avoid IP fragmentation (dnsflagday.net).
- If an answer does not fit, the server sets the **TC (truncated)** bit and the client retries over **TCP port 53**. RFC 7766 makes TCP support a requirement for implementations; blocking TCP 53 in a firewall breaks large answers such as DNSSEC-signed ones.
- **Encrypted DNS**: **DoT** (DNS over TLS, RFC 7858, TCP port 853) and **DoH** (DNS over HTTPS, RFC 8484, port 443, looks like ordinary web traffic).

📌 **Interview term: DNSSEC** — signatures on DNS records so a resolver can check an answer really came from the zone owner and was not forged. It protects integrity, not privacy (DoT and DoH handle privacy).

## 6. DNS as a System-Design Tool

<svg class="iq-diagram" width="100%" viewBox="0 0 720 260" role="img" aria-label="The authoritative server answers users in Europe with the Frankfurt address and users in the US with the Virginia address">
  <defs>
    <marker id="sd02q1-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="30" width="150" height="56" rx="10"/>
  <text class="d-text" x="95" y="63" text-anchor="middle">User in Europe</text>
  <rect class="d-box-muted" x="20" y="170" width="150" height="56" rx="10"/>
  <text class="d-text" x="95" y="203" text-anchor="middle">User in the US</text>
  <rect class="d-box-accent" x="270" y="92" width="180" height="76" rx="10"/>
  <text class="d-text" x="360" y="124" text-anchor="middle">GeoDNS</text>
  <text class="d-sub" x="360" y="148" text-anchor="middle">health checked</text>
  <rect class="d-box" x="540" y="30" width="160" height="56" rx="10"/>
  <text class="d-text" x="620" y="63" text-anchor="middle">Frankfurt LB</text>
  <rect class="d-box" x="540" y="170" width="160" height="56" rx="10"/>
  <text class="d-text" x="620" y="203" text-anchor="middle">Virginia LB</text>
  <path class="d-edge" d="M 170 58 L 264 112" marker-end="url(#sd02q1-arrow2)"/>
  <path class="d-edge" d="M 170 198 L 264 150" marker-end="url(#sd02q1-arrow2)"/>
  <path class="d-edge-accent" d="M 450 112 L 534 62" marker-end="url(#sd02q1-arrow2)"/>
  <path class="d-edge-accent" d="M 450 150 L 534 196" marker-end="url(#sd02q1-arrow2)"/>
</svg>

The authoritative server picks the answer per request, usually from the location of the recursive resolver that asked. If Frankfurt fails its health check, the server stops returning it, and users move once their cached record expires.

- **GeoDNS / latency-based routing**: different answers for different regions (Route 53 latency and geolocation routing, for example).
- **Weighted records**: send 5% of lookups to a new stack, a coarse form of canary release (see [What are blue-green and canary deployments?](/interview-question/what-are-blue-green-and-canary-deployments)).
- **Health-checked failover**: stop returning a dead region. Speed is bounded by the TTL, which is why DNS failover is minutes, not milliseconds.
- **Multiple A records**: several load balancer IPs, so clients spread across them and a single balancer is not a single point of failure ([What is a load balancer and what strategies does it use?](/interview-question/what-is-a-load-balancer-and-what-strategies-does-it-use)).

📌 **Interview term: anycast** — announcing the same IP address from many locations, so network routing delivers each packet to the nearest one. Root servers, public resolvers and CDNs use it; it fails over in seconds because it does not depend on cached DNS answers.

## 7. Verified: Running the Code

The example **"A recursive resolver: referrals, TTL cache, CNAME chain, negative caching"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
Part 1: cold, warm and partly expired lookups
t=0s  www.example.com. -> 198.51.100.25 (TTL 60s)  [upstream queries: 6]
    ask root               NS    com.
    ask tld-com            NS    example.com.
    ask ns1.example.com    A     www.example.com.
    CNAME -> shop.cdnprovider.net.
    ask root               NS    net.
    ask tld-net            NS    cdnprovider.net.
    ask ns.cdnprovider.net A     shop.cdnprovider.net.
t=10s  www.example.com. -> 198.51.100.25 (TTL 50s)  [upstream queries: 0]
    cache hit CNAME shop.cdnprovider.net., 3590s left
    cache hit A 198.51.100.25, 50s left
t=20s  api.example.com. -> 203.0.113.10 (TTL 300s)  [upstream queries: 1]
    ask ns1.example.com    A     api.example.com.
t=75s  www.example.com. -> 198.51.100.25 (TTL 60s)  [upstream queries: 1]
    cache hit CNAME shop.cdnprovider.net., 3525s left
    ask ns.cdnprovider.net A     shop.cdnprovider.net.
t=80s  nope.example.com. -> NXDOMAIN  [upstream queries: 1]
    ask ns1.example.com    A     nope.example.com.
t=500s  nope.example.com. -> NXDOMAIN  [upstream queries: 0]
    negative cache hit, 480s left
t=1000s  nope.example.com. -> NXDOMAIN  [upstream queries: 1]
    ask ns1.example.com    A     nope.example.com.
total upstream queries: 10

Part 2: how long a record change takes to reach everyone
  TTL 86400s: worst case 86400s stale; 99.4% of caches still old after 10 min
  TTL  3600s: worst case 3600s stale; 83.4% of caches still old after 10 min
  TTL   300s: worst case 300s stale; 0.0% of caches still old after 10 min
  TTL    60s: worst case 60s stale; 0.0% of caches still old after 10 min
~~~

What the simulation stands for and leaves out: the five "servers" are lookup tables and the clock is a variable, so there is no UDP, no packet loss and no retry timer. It models referrals, NS caching, QNAME minimisation, CNAME chasing, TTL countdown and RFC 2308 negative caching. Real resolvers also pick among several name servers by measured latency, validate DNSSEC, prefetch popular records before they expire and may serve stale answers when authoritative servers are unreachable.

## Edge Cases Worth Knowing

- **Clients that cache forever.** Some long-running processes (older JVM settings, connection pools) resolve a name once at startup. A DNS-based failover then does nothing until restart; configure the runtime DNS cache TTL.
- **The apex cannot be a CNAME.** \`example.com\` needs SOA and NS records, which a CNAME forbids; use your provider ALIAS/flattening feature.
- **Your DNS provider is a dependency.** If the authoritative provider is down and caches expire, your site disappears even though every server is healthy. Large sites use two providers or long TTLs on stable records.
- **Large answers need TCP.** A firewall that allows only UDP 53 breaks big DNSSEC responses in ways that look random.

## Common Pitfalls

- **Saying "the root server knows the IP".** It only knows who runs each TLD; the authoritative server gives the answer.
- **Changing a record with a 24-hour TTL and expecting it to take effect now.** The run above showed 99.4% of caches still old after ten minutes; lower the TTL a full TTL ahead.
- **Forgetting negative caching.** Looking a name up before you create it can pin "does not exist" for the SOA negative TTL.
- **Treating DNS failover as instant.** It is bounded by TTLs and by clients that ignore them; use anycast or a load balancer for second-level failover.
- **Ignoring the CNAME hop cost.** Every alias into a new domain can add a full root-TLD-authoritative walk on a cold cache (6 queries instead of 3 in the run).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The cast:</strong> <span style="color:#f0e2c8;">The OS <strong style="color:#ffca28;">stub resolver</strong> asks a <strong style="color:#ffca28;">recursive resolver</strong>, which walks the hierarchy: a <strong style="color:#ffca28;">root server</strong> refers it to the TLD servers, the <strong style="color:#ffca28;">TLD server</strong> refers it to the domain name servers, and the <strong style="color:#ffca28;">authoritative server</strong> answers.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Caching:</strong> <span style="color:#f0e2c8;">Every layer caches — browser, OS, resolver — for the record <strong style="color:#ffca28;">TTL</strong>, and negative answers are cached too. A warm resolver answers with zero upstream queries; a new name in a known zone needs just one.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Records:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">A/AAAA</strong> for addresses, <strong style="color:#ffca28;">CNAME</strong> for aliases to a CDN or managed load balancer, <strong style="color:#ffca28;">NS</strong> for delegation, <strong style="color:#ffca28;">SOA</strong> for the negative-caching time.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Transport:</strong> <span style="color:#f0e2c8;">UDP port 53 by default, <strong style="color:#ffca28;">TCP</strong> when the answer is truncated, EDNS(0) for larger UDP packets, and <strong style="color:#ffca28;">DoT</strong> or <strong style="color:#ffca28;">DoH</strong> for privacy.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. In a design:</strong> <span style="color:#f0e2c8;">DNS gives <strong style="color:#ffca28;">GeoDNS</strong>, weighted and health-checked records, but failover is only as fast as the TTL, so lower TTLs before migrations and use anycast or load balancers for fast failover.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if you change an A record that has a 24-hour TTL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Caches that already hold it keep serving the old IP until their copy expires, up to 24 hours. Lower the TTL to a few minutes at least one old TTL ahead, make the change, then raise it again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why does a CDN give you a CNAME rather than an IP address?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">So the CDN can steer each user to a nearby healthy edge and change IPs at will. Its own authoritative servers answer the CDN name with a short TTL and a per-region address; your zone never changes.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why is DNS mostly UDP, and when does it use TCP?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Most questions and answers fit one packet, so UDP avoids a handshake. When an answer is larger than the agreed size, the server sets the <strong style="color:#ffca28;">TC</strong> bit and the client retries over TCP; zone transfers also use TCP.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you make DNS itself not a single point of failure?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Several authoritative name servers on anycast, ideally from two providers, sensible TTLs so caches ride out a short outage, and several A records or anycast addresses for the load balancers behind the name.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is negative caching and why should a deployer care?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Resolvers cache "this name does not exist" for the smaller of the SOA TTL and SOA MINIMUM (RFC 2308). If a health check or a user looks up a new name before you create it, they can keep getting NXDOMAIN for that long.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| DNS | Distributed, cached database mapping names to records |
| Stub resolver | The OS client that asks one resolver for the final answer |
| Recursive resolver | Walks the hierarchy for clients and caches the results |
| Root name servers | Top of the tree; refer to TLD servers |
| TLD servers | Servers for com., org. and so on; refer to domain name servers |
| Authoritative name server | Holds the real records for a zone |
| Referral | "Ask these name servers instead" |
| Recursive vs iterative query | Final answer wanted vs "tell me what you know" |
| CNAME record | An alias to another name |
| QNAME minimisation | Sending each server only the part of the name it needs |
| TTL | How many seconds a cache may reuse a record |
| Negative caching | Caching that a name does not exist |
| DNSSEC | Signed records that prove an answer is genuine |
| Anycast | One IP announced from many places, routed to the nearest |

**Conclusion:** DNS resolution is a short conversation repeated at internet scale: the stub asks a recursive resolver, which follows referrals from the root to the TLD to the authoritative server and caches everything it learns. Caching makes it fast — the simulation went from six upstream queries cold to zero warm — and TTLs decide how quickly a change or failover reaches users. In a design, use DNS for coarse traffic steering and redundancy, lower TTLs before you need to move, and do not expect DNS alone to fail over in seconds.`,
    examples: [
      {
        label: `A recursive resolver: referrals, TTL cache, CNAME chain, negative caching`,
        variants: [
          { tech: "node", code: `// A recursive resolver walking simulated root, TLD and authoritative servers,
// with a TTL cache, QNAME minimisation, a CNAME chain and negative caching.
// Servers are in-process tables; the clock is a number we move by hand.

const SERVERS = {
  root: { zone: ".", delegations: { "com.": "tld-com", "net.": "tld-net" } },
  "tld-com": { zone: "com.", delegations: { "example.com.": "ns1.example.com" } },
  "tld-net": { zone: "net.", delegations: { "cdnprovider.net.": "ns.cdnprovider.net" } },
  "ns1.example.com": {
    zone: "example.com.",
    records: {
      "www.example.com.": { type: "CNAME", value: "shop.cdnprovider.net.", ttl: 3600 },
      "api.example.com.": { type: "A", value: "203.0.113.10", ttl: 300 },
    },
    soa: { ttl: 3600, minimum: 900 },
  },
  "ns.cdnprovider.net": {
    zone: "cdnprovider.net.",
    records: { "shop.cdnprovider.net.": { type: "A", value: "198.51.100.25", ttl: 60 } },
    soa: { ttl: 300, minimum: 300 },
  },
};
const DELEGATION_TTL = 172800; // 2 days, a typical value for TLD and domain NS records

let now = 0;
const cache = new Map(); // key -> { value, expires }
let upstream = 0;

function cacheGet(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (e.expires <= now) { cache.delete(key); return null; }
  return { value: e.value, ttlLeft: e.expires - now };
}
function cachePut(key, value, ttl) { cache.set(key, { value, expires: now + ttl }); }

function ask(server, qname, qtype, log) {
  upstream++;
  log.push(\`    ask \${server.padEnd(18)} \${qtype.padEnd(5)} \${qname}\`);
  const s = SERVERS[server];
  if (s.delegations) {
    for (const [zone, ns] of Object.entries(s.delegations)) {
      if (qname === zone || qname.endsWith("." + zone)) return { referral: zone, ns };
    }
    return { nxdomain: true, negTtl: 900 };
  }
  const r = s.records[qname];
  if (r) return { answer: r };
  return { nxdomain: true, negTtl: Math.min(s.soa.ttl, s.soa.minimum) };
}

// Find the deepest zone whose name server we already know.
function closestKnownZone(name) {
  const labels = name.split(".").filter(Boolean);
  for (let i = 0; i < labels.length; i++) {
    const zone = labels.slice(i).join(".") + ".";
    const hit = cacheGet("NS " + zone);
    if (hit) return { zone, server: hit.value };
  }
  return { zone: ".", server: "root" };
}

function resolve(name, log, depth = 0) {
  const neg = cacheGet("NX " + name);
  if (neg) { log.push(\`    negative cache hit, \${neg.ttlLeft}s left\`); return { rcode: "NXDOMAIN" }; }
  const hit = cacheGet("RR " + name);
  if (hit) {
    log.push(\`    cache hit \${hit.value.type} \${hit.value.value}, \${hit.ttlLeft}s left\`);
    if (hit.value.type === "CNAME") return resolve(hit.value.value, log, depth + 1);
    return { rcode: "NOERROR", ip: hit.value.value, ttl: hit.ttlLeft };
  }
  let { zone, server } = closestKnownZone(name);
  const labels = name.split(".").filter(Boolean);
  for (;;) {
    // QNAME minimisation: reveal only one label more than the zone we are in.
    const zoneLen = zone === "." ? 0 : zone.split(".").filter(Boolean).length;
    const minimal = labels.slice(labels.length - Math.min(labels.length, zoneLen + 1)).join(".") + ".";
    const isFull = minimal === name;
    const res = ask(server, isFull ? name : minimal, isFull ? "A" : "NS", log);
    if (res.referral) {
      cachePut("NS " + res.referral, res.ns, DELEGATION_TTL);
      zone = res.referral; server = res.ns;
      continue;
    }
    if (res.nxdomain) { cachePut("NX " + name, true, res.negTtl); return { rcode: "NXDOMAIN", negTtl: res.negTtl }; }
    cachePut("RR " + name, res.answer, res.answer.ttl);
    if (res.answer.type === "CNAME") {
      log.push(\`    CNAME -> \${res.answer.value}\`);
      return resolve(res.answer.value, log, depth + 1);
    }
    return { rcode: "NOERROR", ip: res.answer.value, ttl: res.answer.ttl };
  }
}

function query(t, name) {
  now = t;
  const before = upstream;
  const log = [];
  const r = resolve(name, log);
  const result = r.rcode === "NOERROR" ? \`\${r.ip} (TTL \${r.ttl}s)\` : "NXDOMAIN";
  console.log(\`t=\${t}s  \${name} -> \${result}  [upstream queries: \${upstream - before}]\`);
  for (const l of log) console.log(l);
}

console.log("Part 1: cold, warm and partly expired lookups");
query(0, "www.example.com.");
query(10, "www.example.com.");
query(20, "api.example.com.");
query(75, "www.example.com.");
query(80, "nope.example.com.");
query(500, "nope.example.com.");
query(1000, "nope.example.com.");
console.log(\`total upstream queries: \${upstream}\`);

console.log("\\nPart 2: how long a record change takes to reach everyone");
for (const ttl of [86400, 3600, 300, 60]) {
  const resolvers = 1000; // caches that fetched the old record at evenly spread times
  let stale = 0;
  for (let i = 0; i < resolvers; i++) {
    const fetchedAgo = (i * ttl) / resolvers; // seconds before the change
    if (ttl - fetchedAgo > 600) stale++; // still holding the old IP 10 minutes after the change
  }
  console.log(\`  TTL \${String(ttl).padStart(5)}s: worst case \${ttl}s stale; \${(stale / 10).toFixed(1)}% of caches still old after 10 min\`);
}` },
          { tech: "python", code: `# A recursive resolver walking simulated root, TLD and authoritative servers,
# with a TTL cache, QNAME minimisation, a CNAME chain and negative caching.
# Servers are in-process tables; the clock is a number we move by hand.

SERVERS = {
    "root": {"zone": ".", "delegations": {"com.": "tld-com", "net.": "tld-net"}},
    "tld-com": {"zone": "com.", "delegations": {"example.com.": "ns1.example.com"}},
    "tld-net": {"zone": "net.", "delegations": {"cdnprovider.net.": "ns.cdnprovider.net"}},
    "ns1.example.com": {
        "zone": "example.com.",
        "records": {
            "www.example.com.": {"type": "CNAME", "value": "shop.cdnprovider.net.", "ttl": 3600},
            "api.example.com.": {"type": "A", "value": "203.0.113.10", "ttl": 300},
        },
        "soa": {"ttl": 3600, "minimum": 900},
    },
    "ns.cdnprovider.net": {
        "zone": "cdnprovider.net.",
        "records": {"shop.cdnprovider.net.": {"type": "A", "value": "198.51.100.25", "ttl": 60}},
        "soa": {"ttl": 300, "minimum": 300},
    },
}
DELEGATION_TTL = 172800  # 2 days, a typical value for TLD and domain NS records

now = 0
cache = {}  # key -> (value, expires)
upstream = 0


def cache_get(key):
    e = cache.get(key)
    if e is None:
        return None
    if e[1] <= now:
        del cache[key]
        return None
    return e[0], e[1] - now


def cache_put(key, value, ttl):
    cache[key] = (value, now + ttl)


def ask(server, qname, qtype, log):
    global upstream
    upstream += 1
    log.append(f"    ask {server:<18} {qtype:<5} {qname}")
    s = SERVERS[server]
    if "delegations" in s:
        for zone, ns in s["delegations"].items():
            if qname == zone or qname.endswith("." + zone):
                return {"referral": zone, "ns": ns}
        return {"nxdomain": True, "negTtl": 900}
    r = s["records"].get(qname)
    if r:
        return {"answer": r}
    return {"nxdomain": True, "negTtl": min(s["soa"]["ttl"], s["soa"]["minimum"])}


def closest_known_zone(name):
    labels = [l for l in name.split(".") if l]
    for i in range(len(labels)):
        zone = ".".join(labels[i:]) + "."
        hit = cache_get("NS " + zone)
        if hit:
            return zone, hit[0]
    return ".", "root"


def resolve(name, log):
    neg = cache_get("NX " + name)
    if neg:
        log.append(f"    negative cache hit, {neg[1]}s left")
        return {"rcode": "NXDOMAIN"}
    hit = cache_get("RR " + name)
    if hit:
        rr, left = hit
        log.append(f"    cache hit {rr['type']} {rr['value']}, {left}s left")
        if rr["type"] == "CNAME":
            return resolve(rr["value"], log)
        return {"rcode": "NOERROR", "ip": rr["value"], "ttl": left}
    zone, server = closest_known_zone(name)
    labels = [l for l in name.split(".") if l]
    while True:
        # QNAME minimisation: reveal only one label more than the zone we are in.
        zone_len = 0 if zone == "." else len([l for l in zone.split(".") if l])
        take = min(len(labels), zone_len + 1)
        minimal = ".".join(labels[len(labels) - take:]) + "."
        is_full = minimal == name
        res = ask(server, name if is_full else minimal, "A" if is_full else "NS", log)
        if "referral" in res:
            cache_put("NS " + res["referral"], res["ns"], DELEGATION_TTL)
            zone, server = res["referral"], res["ns"]
            continue
        if "nxdomain" in res:
            cache_put("NX " + name, True, res["negTtl"])
            return {"rcode": "NXDOMAIN"}
        ans = res["answer"]
        cache_put("RR " + name, ans, ans["ttl"])
        if ans["type"] == "CNAME":
            log.append(f"    CNAME -> {ans['value']}")
            return resolve(ans["value"], log)
        return {"rcode": "NOERROR", "ip": ans["value"], "ttl": ans["ttl"]}


def query(t, name):
    global now
    now = t
    before = upstream
    log = []
    r = resolve(name, log)
    result = f"{r['ip']} (TTL {r['ttl']}s)" if r["rcode"] == "NOERROR" else "NXDOMAIN"
    print(f"t={t}s  {name} -> {result}  [upstream queries: {upstream - before}]")
    for l in log:
        print(l)


print("Part 1: cold, warm and partly expired lookups")
query(0, "www.example.com.")
query(10, "www.example.com.")
query(20, "api.example.com.")
query(75, "www.example.com.")
query(80, "nope.example.com.")
query(500, "nope.example.com.")
query(1000, "nope.example.com.")
print(f"total upstream queries: {upstream}")

print("\\nPart 2: how long a record change takes to reach everyone")
for ttl in [86400, 3600, 300, 60]:
    resolvers = 1000  # caches that fetched the old record at evenly spread times
    stale = 0
    for i in range(resolvers):
        fetched_ago = (i * ttl) / resolvers  # seconds before the change
        if ttl - fetched_ago > 600:  # still holding the old IP 10 minutes after the change
            stale += 1
    print(f"  TTL {ttl:>5}s: worst case {ttl}s stale; {stale / 10:.1f}% of caches still old after 10 min")` },
        ],
      },
    ],
  },
  {
    title: `What is a CDN and how does it work?`,
    difficulty: "medium",
    seoDescription: `A CDN caches content on edge servers near users. Learn edge routing, cache keys and TTLs, origin shield, purging, and what drives the hit ratio.`,
    description: `**Question presented to candidate:**
"We serve images, JavaScript and video to users all over the world from one region, and pages are slow far from it. What is a CDN, how does a request actually get served by one, and what do we have to get right so it helps rather than serving stale content?"

**What a strong answer should cover:**
- What it is: a network of **edge servers** in many **PoPs**, acting as a caching **reverse proxy** in front of your **origin**; users are steered to a nearby edge by **anycast** or **DNS**
- The request path: edge **cache hit** served locally; **cache miss** fetched from the origin (often through a **tiered cache / origin shield**), stored, then served
- Control: **Cache-Control** (\`max-age\`, \`s-maxage\`, \`stale-while-revalidate\`), the **cache key**, and **invalidation** by TTL, purge, or versioned file names
- What drives **cache hit ratio** and **origin offload**: popularity skew, cache size, number of PoPs, and how much traffic is cacheable at all
- Beyond static files: **request collapsing**, TLS termination near the user, DDoS absorption, and edge compute; what not to cache (personalised responses)

**Code / implementation expected:** No — the request flow, headers and trade-offs are the answer; the example simulates hit ratios and the effect of a shield.`,
    answer: `**Target Audience:** Beginners to system design — you know what a web server is; no networking background assumed.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Hit ratios and fetch counts come from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A bakery in Paris makes the best croissants in the world, and people in Tokyo want them. Flying each croissant from Paris on order takes hours. So the bakery opens small shops in Tokyo, New York and São Paulo. Each shop keeps the most popular items on its shelves, restocked from Paris. A customer in Tokyo walks into the Tokyo shop; most of the time the croissant is already there. Only for a rare item does the shop order from Paris — and when ten customers ask for the same rare item at once, it places one order, not ten.

That is a CDN. Paris is your **origin**, each shop is an **edge server** in a **point of presence**, the shelf is the **cache**, and "one order for ten customers" is **request collapsing**. The shelf has a "best before" sticker — the **TTL** — after which the shop checks with Paris again.

The physics is the reason: light in fibre covers roughly 200 km per millisecond, so a round trip from Tokyo to a server in Virginia costs well over 100 ms before any work is done, and a page needs several round trips (DNS, TCP, TLS, the request). Serving from a building in Tokyo removes most of that.

📌 **Interview term: CDN (content delivery network)** — a geographically distributed set of caching reverse proxies that serve content from locations near users, fetching from the origin only when they do not have a usable copy.

📌 **Interview term: origin** — your own server or storage bucket that holds the authoritative copy of the content.

📌 **Interview term: PoP (point of presence) / edge** — a CDN data centre in a city, holding many edge servers.

## 2. How a Request Reaches the Edge

Two mechanisms, often combined:

- **DNS-based steering.** \`www.example.com\` is a CNAME to a CDN name; the CDN authoritative DNS answers with the IP of an edge close to the resolver that asked ([How does DNS resolution work?](/interview-question/how-does-dns-resolution-work)).
- **Anycast.** Every PoP announces the same IP addresses; internet routing delivers each user to the nearest PoP by network distance. If a PoP goes offline it stops announcing, and traffic shifts within the time routing takes to converge.

Once there, the edge terminates TCP and TLS close to the user — which by itself cuts latency even for uncacheable requests, because the handshakes happen over a short distance and the edge keeps warm connections to the origin.

## 3. Hit, Miss, and the Tier in Between

<svg class="iq-diagram" width="100%" viewBox="0 0 760 270" role="img" aria-label="A user request goes to the edge PoP. On a hit the edge answers. On a miss it asks the shield, and the shield asks the origin only if it also misses">
  <defs>
    <marker id="sd02q2-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="100" width="120" height="60" rx="10"/>
  <text class="d-text" x="80" y="135" text-anchor="middle">User</text>
  <rect class="d-box-accent" x="210" y="92" width="150" height="76" rx="10"/>
  <text class="d-text" x="285" y="124" text-anchor="middle">Edge PoP</text>
  <text class="d-sub" x="285" y="148" text-anchor="middle">hit: answer here</text>
  <rect class="d-box" x="430" y="92" width="150" height="76" rx="10"/>
  <text class="d-text" x="505" y="124" text-anchor="middle">Origin shield</text>
  <text class="d-sub" x="505" y="148" text-anchor="middle">shared tier</text>
  <rect class="d-box" x="640" y="100" width="100" height="60" rx="10"/>
  <text class="d-text" x="690" y="135" text-anchor="middle">Origin</text>
  <path class="d-edge-accent" d="M 140 130 L 204 130" marker-end="url(#sd02q2-arrow)"/>
  <path class="d-edge-dashed" d="M 360 130 L 424 130" marker-end="url(#sd02q2-arrow)"/>
  <path class="d-edge-dashed" d="M 580 130 L 634 130" marker-end="url(#sd02q2-arrow)"/>
  <text class="d-sub" x="392" y="80" text-anchor="middle">miss</text>
  <text class="d-sub" x="607" y="80" text-anchor="middle">miss</text>
</svg>

Dashed arrows only carry traffic on a miss. With many PoPs, each PoP that misses on the same object would otherwise ask the origin separately; the shield turns those into one origin fetch.

📌 **Interview term: cache hit / miss** — the edge had a fresh copy and answered (hit), or it did not and had to fetch (miss). On Cloudflare the \`cf-cache-status\` response header shows values such as \`HIT\`, \`MISS\`, \`EXPIRED\`, \`STALE\`, \`REVALIDATED\`, \`BYPASS\` and \`DYNAMIC\`.

📌 **Interview term: origin shield / tiered cache** — a designated mid-tier cache that all edges ask before the origin. AWS launched CloudFront **Origin Shield** in October 2020, saying it collapses requests across regions "so as few as one request goes to your origin per object"; Cloudflare calls the idea *Tiered Cache*.

📌 **Interview term: cache hit ratio vs origin offload** — hit ratio is the share of requests the *edge* answered; offload is the share of requests that never reached the *origin* (edge hits plus shield hits). Offload is what your origin bill and capacity care about.

## 4. What Actually Drives the Hit Ratio — The Simulation

The example sends 200,000 requests for 20,000 objects whose popularity follows a Zipf curve (the k-th most popular object is requested in proportion to 1/k — a common model for web content). Each edge is an LRU cache holding a fixed number of objects. Requests are spread round-robin over 1 or 8 PoPs, standing in for users in different regions.

~~~text
Part 1: 200000 requests, 20000 objects (Zipf), spread over PoPs
  pops  edge cache  shield   edge hit   origin fetches   offload
     1        1000       -      61.4%            77201     61.4%
     1        4000       -      77.9%            44290     77.9%
     8        1000       -      60.7%            78636     60.7%
     8        4000       -      73.7%            52670     73.7%
     8        1000    8000      60.7%            28247     85.9%
     8        4000    8000      73.7%            26808     86.6%
~~~

What the run shows:

- **A small cache goes a long way, then flattens.** Holding 5% of the catalogue (1,000 objects) already gives 61.4%, because the head of a Zipf curve carries most requests. Four times the space adds 16.5 points, not four times the benefit.
- **More PoPs dilute traffic.** With 8 PoPs of 4,000 objects each, the edge hit ratio is 73.7%, not 77.9%: every PoP sees only an eighth of the requests, and each has to miss once on every object it serves. Going closer to users costs hit ratio — this is the central CDN trade-off.
- **A shield fixes the origin side.** Adding an 8,000-object shield leaves the *edge* hit ratio unchanged but cuts origin fetches from 78,636 to 28,247 — 64% fewer — because eight PoPs missing on the same object now produce one origin fetch.

The deeper tuning (cache-key normalisation, tiered cache configuration, how to push hit rate above 95%) is the subject of [Edge caching on Cloudflare — how do you get 95%+ hit rate without stale data?](/interview-question/edge-caching-on-cloudflare-how-do-you-get-95-hit-rate-without-stale-data); this page stays on how the machinery works.

## 5. Request Collapsing

A new video goes live and 500 requests hit one PoP within a second. The first misses; the origin needs 200 ms to answer.

~~~text
Part 2: a new video goes live, 500 requests reach one PoP over 1000 ms
  arrivals during the first fetch: 100, arrivals after it: 400
  without request collapsing: 100 origin fetches
  with request collapsing:    1 origin fetch, 99 requests wait for it
~~~

📌 **Interview term: request collapsing (request coalescing)** — when several requests miss on the same key at once, the cache sends one request to the origin and makes the others wait for its answer. Without it, a popular object expiring causes a burst of identical origin requests — a **thundering herd** or **cache stampede**.

## 6. Controlling What Is Cached and for How Long

The origin tells caches what to do with HTTP headers:

~~~http
Cache-Control: public, max-age=60, s-maxage=86400, stale-while-revalidate=30
ETag: "v42-7f3a"
Vary: Accept-Encoding
~~~

- \`max-age=60\` — any cache, including the browser, may reuse it for 60 seconds.
- \`s-maxage=86400\` — **shared** caches (CDNs, proxies) use this instead of \`max-age\`; browsers ignore it. Lets the CDN hold a copy for a day while browsers check every minute.
- \`stale-while-revalidate=30\` (RFC 5861) — after expiry, serve the stale copy immediately for up to 30 more seconds while refreshing it in the background; \`stale-if-error\` does the same when the origin is failing.
- \`ETag\` — lets the edge revalidate with a conditional request (\`If-None-Match\`); the origin answers \`304 Not Modified\` with no body if nothing changed.
- \`private\` or \`no-store\` — never cache in a shared cache. Use it for anything personal.

📌 **Interview term: cache key** — what the CDN uses to decide whether two requests are "the same object": by default host + path + query string, plus any headers named in \`Vary\`. Tracking parameters (\`?utm_source=...\`) or a \`Vary: Cookie\` split one object into thousands of keys and wreck the hit ratio.

### Freshness: TTL, purge, or a new name

~~~text
Part 3: object changes at t=100s, cached with max-age=300 at t=0s
  t= 50s  TTL only: old (cached copy still fresh)  TTL + purge: old
  t=150s  TTL only: old (cached copy still fresh)  TTL + purge: new (purged at t=100s)
  t=299s  TTL only: old (cached copy still fresh)  TTL + purge: new (purged at t=100s)
  t=301s  TTL only: new (expired, refetched)       TTL + purge: new (purged at t=100s)
~~~

📌 **Interview term: purge (invalidation)** — telling the CDN to drop a cached object (by URL, prefix or tag) before its TTL ends. Fast, but it is an extra API call in your deploy and a burst of misses afterwards.

📌 **Interview term: cache busting (versioned assets)** — putting a content hash in the file name (\`app.3f9c2b.js\`), so a new version is a new URL. The old one can be cached for a year with \`immutable\`; no purge is ever needed. This is the default for JS, CSS and images.

## 7. What Belongs on a CDN

| Content | Cache at edge? | How |
| :--- | :--- | :--- |
| Versioned JS, CSS, fonts, images | yes, for a year | hashed file names, \`max-age=31536000, immutable\` |
| Video segments (HLS/DASH) | yes | segments never change; short TTL on the playlist |
| Public HTML, product pages | yes, briefly | short \`s-maxage\` plus \`stale-while-revalidate\`, or purge on publish |
| Public API responses (prices, catalogue) | sometimes | seconds of TTL can absorb huge read load |
| Logged-in pages, carts, account data | no | \`private\`; the edge still helps through TLS termination and connection reuse |
| Uploads and writes | pass through | the edge forwards them to the origin |

Beyond caching, CDNs absorb DDoS traffic across their whole network, run WAF rules, and run code at the edge (Cloudflare Workers, Lambda@Edge) — see [How would you design an edge-native app on Cloudflare Workers + R2?](/interview-question/how-would-you-design-an-edge-native-app-on-cloudflare-workers-r2).

## 8. Verified: Running the Code

The example **"CDN edge caches: hit ratio, origin shield, request collapsing, TTL vs purge"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
Part 1: 200000 requests, 20000 objects (Zipf), spread over PoPs
  pops  edge cache  shield   edge hit   origin fetches   offload
     1        1000       -      61.4%            77201     61.4%
     1        4000       -      77.9%            44290     77.9%
     8        1000       -      60.7%            78636     60.7%
     8        4000       -      73.7%            52670     73.7%
     8        1000    8000      60.7%            28247     85.9%
     8        4000    8000      73.7%            26808     86.6%

Part 2: a new video goes live, 500 requests reach one PoP over 1000 ms
  arrivals during the first fetch: 100, arrivals after it: 400
  without request collapsing: 100 origin fetches
  with request collapsing:    1 origin fetch, 99 requests wait for it

Part 3: object changes at t=100s, cached with max-age=300 at t=0s
  t= 50s  TTL only: old (cached copy still fresh)  TTL + purge: old
  t=150s  TTL only: old (cached copy still fresh)  TTL + purge: new (purged at t=100s)
  t=299s  TTL only: old (cached copy still fresh)  TTL + purge: new (purged at t=100s)
  t=301s  TTL only: new (expired, refetched)       TTL + purge: new (purged at t=100s)
~~~

What the simulation stands for and leaves out: each PoP and the shield are LRU maps sized in objects, not bytes; the origin is a counter; popularity is Zipf with s = 1 drawn from a fixed-seed LCG so both languages make the same requests. It ignores object sizes, TTL expiry inside Part 1, regional differences in what is popular, and real CDN eviction policies, so treat the percentages as shapes, not predictions for your traffic.

## Edge Cases Worth Knowing

- **Caching an error.** If the origin returns a 500 with a cacheable header, the CDN can serve that error worldwide. Set explicit short TTLs for error responses.
- **Personal data in a shared cache.** A response that varies by cookie but lacks \`private\` (or the right \`Vary\`) can show one user data to another — the worst CDN incident type.
- **Cold PoPs.** A new region or a full purge starts at 0% hit ratio; the shield and request collapsing are what keep the origin alive.
- **The long tail.** If most of your catalogue is rarely requested (user uploads), edge hit ratio is low no matter what; offload then depends on the shield and on cheap origin storage.

## Common Pitfalls

- **Saying a CDN is "just for static files".** It also terminates TLS near users, absorbs attacks and can cache API responses for seconds.
- **Quoting edge hit ratio as origin load.** In the run, the shield left edge hit ratio at 60.7% but cut origin fetches by 64%.
- **Assuming more PoPs always means more hits.** Spreading the same traffic over eight PoPs lowered the hit ratio from 77.9% to 73.7%.
- **Relying on purge for every deploy** instead of versioned asset names.
- **A cache key that includes junk** — tracking query parameters or \`Vary: Cookie\` on public content.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. What it is:</strong> <span style="color:#f0e2c8;">A CDN is a network of caching <strong style="color:#ffca28;">reverse proxies</strong> in many <strong style="color:#ffca28;">PoPs</strong>. <strong style="color:#ffca28;">Anycast</strong> or DNS sends each user to a nearby edge, which serves from cache or fetches from the <strong style="color:#ffca28;">origin</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The path:</strong> <span style="color:#f0e2c8;">On a <strong style="color:#ffca28;">hit</strong> the edge answers in a few milliseconds; on a <strong style="color:#ffca28;">miss</strong> it asks an <strong style="color:#ffca28;">origin shield</strong> or the origin, stores the response and serves it. <strong style="color:#ffca28;">Request collapsing</strong> turns many simultaneous misses into one fetch.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Control:</strong> <span style="color:#f0e2c8;">The origin controls caching with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Cache-Control</code>: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s-maxage</code> for shared caches, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stale-while-revalidate</code> to hide refreshes, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">private</code> for personal data. The <strong style="color:#ffca28;">cache key</strong> decides what counts as the same object.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Freshness:</strong> <span style="color:#f0e2c8;">Use <strong style="color:#ffca28;">versioned file names</strong> for assets so they cache for a year, short TTLs plus <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stale-while-revalidate</code> for HTML, and <strong style="color:#ffca28;">purge</strong> for urgent changes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Trade-offs:</strong> <span style="color:#f0e2c8;">More PoPs bring content closer but split traffic and lower the hit ratio; a shield restores <strong style="color:#ffca28;">origin offload</strong>. Measure offload, not just edge hit ratio.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between a CDN and a reverse proxy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A CDN is many reverse proxies run by one provider in many cities, with routing to the nearest one and a shared purge and configuration system. A single reverse proxy such as nginx sits in one place in front of your servers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you deploy a new JavaScript bundle without users getting a stale one?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Put a content hash in the file name and reference it from HTML that has a short TTL. The new HTML points to a new URL, so nothing needs purging, and old bundles stay cacheable for anyone still on the old page.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Your hit ratio is 40% on static images. Where do you look?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The cache key (query strings, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Vary</code> headers, cookies), the TTLs the origin sends, whether responses are marked <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">private</code>, and the long tail of rarely requested objects. Then add tiered caching to raise offload.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can you put an API behind a CDN?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes. Public, read-heavy responses can be cached for seconds with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">s-maxage</code>, which absorbs spikes; authenticated responses pass through but still gain from TLS termination at the edge and pooled connections to the origin.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when a popular object expires at 1,000 edges at once?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Without protection each edge refetches it. Request collapsing at each edge, a shield in front of the origin, and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">stale-while-revalidate</code> (serve the old copy while one request refreshes it) keep that from becoming a stampede.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| CDN | Distributed caching reverse proxies close to users |
| Origin | Your server or bucket with the authoritative content |
| PoP / edge | A CDN location and its servers |
| Cache hit / miss | Served from the edge vs fetched from upstream |
| Origin shield / tiered cache | A mid-tier cache all edges ask before the origin |
| Hit ratio vs origin offload | Share answered by the edge vs share that never reached the origin |
| Request collapsing | One upstream fetch for many simultaneous misses |
| Cache key | What makes two requests the same cached object |
| Purge | Removing an object from the cache before its TTL ends |
| Cache busting | A new file name for every new version |

**Conclusion:** A CDN puts caching reverse proxies near your users and steers each user to one of them by anycast or DNS. Hits are answered locally; misses go through a shield to the origin, and request collapsing keeps bursts of misses from becoming bursts of origin traffic. The simulation showed the core trade-off: more PoPs mean shorter distances but lower hit ratios, and a shield wins back origin offload (64% fewer origin fetches in the run). Get the headers, the cache key and asset versioning right, keep personal data \`private\`, and measure origin offload rather than edge hit ratio alone.`,
    examples: [
      {
        label: `CDN edge caches: hit ratio, origin shield, request collapsing, TTL vs purge`,
        variants: [
          { tech: "node", code: `// A CDN in miniature: edge PoPs with LRU caches, an optional origin shield,
// request collapsing, and what a TTL means for freshness after an update.
// Objects follow a Zipf popularity curve; randomness is a fixed-seed LCG.

let seed = 42;
function rand() { // 32-bit LCG, identical in every language
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}

const OBJECTS = 20000;
const cdf = [];
let sum = 0;
for (let k = 1; k <= OBJECTS; k++) { sum += 1 / k; cdf.push(sum); }
function pick() { // Zipf(s=1): object k is requested with weight 1/k
  const u = rand() * sum;
  let lo = 0, hi = OBJECTS - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < u) lo = mid + 1; else hi = mid; }
  return lo;
}

class LRU {
  constructor(cap) { this.cap = cap; this.map = new Map(); }
  get(k) {
    if (!this.map.has(k)) return false;
    this.map.delete(k); this.map.set(k, true); return true;
  }
  put(k) {
    if (this.map.has(k)) this.map.delete(k);
    else if (this.map.size >= this.cap) this.map.delete(this.map.keys().next().value);
    this.map.set(k, true);
  }
}

function simulate(edgeCap, pops, shieldCap) {
  seed = 42;
  const edges = Array.from({ length: pops }, () => new LRU(edgeCap));
  const shield = shieldCap ? new LRU(shieldCap) : null;
  let edgeHits = 0, origin = 0;
  const N = 200000;
  for (let i = 0; i < N; i++) {
    const obj = pick();
    const edge = edges[i % pops]; // users in different regions reach different PoPs
    if (edge.get(obj)) { edgeHits++; continue; }
    if (shield && shield.get(obj)) { edge.put(obj); continue; }
    origin++;
    if (shield) shield.put(obj);
    edge.put(obj);
  }
  return { edgeHit: (100 * edgeHits) / N, origin, offload: (100 * (N - origin)) / N };
}

console.log("Part 1: 200000 requests, 20000 objects (Zipf), spread over PoPs");
console.log("  pops  edge cache  shield   edge hit   origin fetches   offload");
for (const [pops, cap, sh] of [[1, 1000, 0], [1, 4000, 0], [8, 1000, 0], [8, 4000, 0], [8, 1000, 8000], [8, 4000, 8000]]) {
  const r = simulate(cap, pops, sh);
  console.log(\`  \${String(pops).padStart(4)}  \${String(cap).padStart(10)}  \${String(sh || "-").padStart(6)}  \${r.edgeHit.toFixed(1).padStart(8)}%  \${String(r.origin).padStart(15)}  \${r.offload.toFixed(1).padStart(7)}%\`);
}

console.log("\\nPart 2: a new video goes live, 500 requests reach one PoP over 1000 ms");
const fetchMs = 200; // the origin takes 200 ms to answer the first miss
let naive = 0, collapsed = 0, waited = 0, hits = 0;
for (let i = 0; i < 500; i++) {
  const t = Math.floor((i * 1000) / 500); // arrival time in ms
  if (t >= fetchMs) { hits++; continue; } // the object is cached once the first fetch returns
  naive++; // without collapsing, every request during the fetch is another miss
  if (i === 0) collapsed++; else waited++; // with collapsing they wait for the one fetch
}
console.log(\`  arrivals during the first fetch: \${naive}, arrivals after it: \${hits}\`);
console.log(\`  without request collapsing: \${naive} origin fetches\`);
console.log(\`  with request collapsing:    \${collapsed} origin fetch, \${waited} requests wait for it\`);

console.log("\\nPart 3: object changes at t=100s, cached with max-age=300 at t=0s");
const timeline = [50, 150, 299, 301];
for (const t of timeline) {
  const ttlServe = t < 300 ? "old (cached copy still fresh)" : "new (expired, refetched)";
  const purgeServe = t < 100 ? "old" : "new (purged at t=100s)";
  console.log(\`  t=\${String(t).padStart(3)}s  TTL only: \${ttlServe.padEnd(30)} TTL + purge: \${purgeServe}\`);
}` },
          { tech: "python", code: `# A CDN in miniature: edge PoPs with LRU caches, an optional origin shield,
# request collapsing, and what a TTL means for freshness after an update.
# Objects follow a Zipf popularity curve; randomness is a fixed-seed LCG.

seed = 42


def rand():  # 32-bit LCG, identical in every language
    global seed
    seed = (seed * 1664525 + 1013904223) & 0xFFFFFFFF
    return seed / 4294967296


OBJECTS = 20000
cdf = []
total = 0.0
for k in range(1, OBJECTS + 1):
    total += 1 / k
    cdf.append(total)


def pick():  # Zipf(s=1): object k is requested with weight 1/k
    u = rand() * total
    lo, hi = 0, OBJECTS - 1
    while lo < hi:
        mid = (lo + hi) >> 1
        if cdf[mid] < u:
            lo = mid + 1
        else:
            hi = mid
    return lo


class LRU:
    def __init__(self, cap):
        self.cap = cap
        self.map = {}

    def get(self, k):
        if k not in self.map:
            return False
        del self.map[k]
        self.map[k] = True
        return True

    def put(self, k):
        if k in self.map:
            del self.map[k]
        elif len(self.map) >= self.cap:
            del self.map[next(iter(self.map))]
        self.map[k] = True


def simulate(edge_cap, pops, shield_cap):
    global seed
    seed = 42
    edges = [LRU(edge_cap) for _ in range(pops)]
    shield = LRU(shield_cap) if shield_cap else None
    edge_hits = origin = 0
    n = 200000
    for i in range(n):
        obj = pick()
        edge = edges[i % pops]  # users in different regions reach different PoPs
        if edge.get(obj):
            edge_hits += 1
            continue
        if shield and shield.get(obj):
            edge.put(obj)
            continue
        origin += 1
        if shield:
            shield.put(obj)
        edge.put(obj)
    return 100 * edge_hits / n, origin, 100 * (n - origin) / n


print("Part 1: 200000 requests, 20000 objects (Zipf), spread over PoPs")
print("  pops  edge cache  shield   edge hit   origin fetches   offload")
for pops, cap, sh in [(1, 1000, 0), (1, 4000, 0), (8, 1000, 0), (8, 4000, 0), (8, 1000, 8000), (8, 4000, 8000)]:
    hit, origin, offload = simulate(cap, pops, sh)
    print(f"  {pops:>4}  {cap:>10}  {str(sh or '-'):>6}  {hit:>8.1f}%  {origin:>15}  {offload:>7.1f}%")

print("\\nPart 2: a new video goes live, 500 requests reach one PoP over 1000 ms")
fetch_ms = 200  # the origin takes 200 ms to answer the first miss
naive = collapsed = waited = hits = 0
for i in range(500):
    t = (i * 1000) // 500  # arrival time in ms
    if t >= fetch_ms:  # the object is cached once the first fetch returns
        hits += 1
        continue
    naive += 1  # without collapsing, every request during the fetch is another miss
    if i == 0:  # with collapsing they wait for the one fetch
        collapsed += 1
    else:
        waited += 1
print(f"  arrivals during the first fetch: {naive}, arrivals after it: {hits}")
print(f"  without request collapsing: {naive} origin fetches")
print(f"  with request collapsing:    {collapsed} origin fetch, {waited} requests wait for it")

print("\\nPart 3: object changes at t=100s, cached with max-age=300 at t=0s")
for t in [50, 150, 299, 301]:
    ttl_serve = "old (cached copy still fresh)" if t < 300 else "new (expired, refetched)"
    purge_serve = "old" if t < 100 else "new (purged at t=100s)"
    print(f"  t={t:>3}s  TTL only: {ttl_serve:<30} TTL + purge: {purge_serve}")` },
        ],
      },
    ],
  },
  {
    title: `What is the difference between a reverse proxy and a forward proxy?`,
    difficulty: "easy",
    seoDescription: `A forward proxy acts for clients, a reverse proxy acts for servers. See who each hides, what each is used for, and how to read X-Forwarded-For safely.`,
    description: `**Question presented to candidate:**
"People use the word 'proxy' for two quite different things. Explain the difference between a forward proxy and a reverse proxy — who sets each one up, who it protects, and what you would use each for. Then tell me how a backend behind a reverse proxy finds out the real client IP."

**What a strong answer should cover:**
- The core distinction: a **forward proxy** acts on behalf of **clients** (the server sees the proxy, not the user); a **reverse proxy** acts on behalf of **servers** (the client sees the proxy, not the backends)
- Who configures it: clients are configured to use a forward proxy (browser settings, \`HTTPS_PROXY\`, PAC files); a reverse proxy is invisible to clients, who just resolve the site name to it
- Uses: forward — egress filtering, auditing, shared caching, a fixed egress IP; reverse — **load balancing**, **TLS termination**, caching, compression, routing, hiding and protecting backends
- **HTTPS through a forward proxy** uses the \`CONNECT\` method to tunnel, so the proxy sees the host name but not the content unless it intercepts TLS
- Client identity behind a reverse proxy: **X-Forwarded-For** / RFC 7239 **Forwarded**, why the left-most entry is spoofable, and trusting only known proxy hops

**Code / implementation expected:** No — a clear contrast with examples is enough; the example shows who sees which address and how to parse X-Forwarded-For safely.`,
    answer: `**Target Audience:** Beginners to system design — you know a browser talks to a server; no networking background assumed.
**Difficulty:** Easy
**Verified with:** Node 22.22 and Python 3.12 (both print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Behaviour shown comes from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

Two people both called "the assistant":

- **Your personal shopper.** You tell them what you want; they go to the shops for you. The shops only ever see the shopper. Your company might give every employee the same shopper so it can check nobody buys anything forbidden. The shopper works **for you, the customer**.
- **A restaurant front desk.** You speak to the host; you never see which cook prepares your meal, how many cooks there are, or that one called in sick. The host works **for the restaurant**.

The personal shopper is a **forward proxy**. The front desk is a **reverse proxy**. Both stand in the middle and pass messages along — the difference is whose side they are on, and therefore who is hidden from whom.

📌 **Interview term: proxy** — an intermediary that receives a request, possibly inspects or changes it, opens its *own* connection to the next hop and forwards it. Because it opens its own connection, the next hop sees the proxy IP address, not the original sender.

## 2. Side by Side

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="Forward proxy: several clients inside a company send traffic through one proxy out to many internet sites">
  <defs>
    <marker id="sd02q3-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="130" height="50" rx="10"/>
  <text class="d-text" x="85" y="50" text-anchor="middle">Laptop A</text>
  <rect class="d-box-muted" x="20" y="150" width="130" height="50" rx="10"/>
  <text class="d-text" x="85" y="180" text-anchor="middle">Laptop B</text>
  <rect class="d-box-accent" x="260" y="72" width="180" height="76" rx="10"/>
  <text class="d-text" x="350" y="104" text-anchor="middle">Forward proxy</text>
  <text class="d-sub" x="350" y="128" text-anchor="middle">acts for clients</text>
  <rect class="d-box" x="550" y="20" width="150" height="50" rx="10"/>
  <text class="d-text" x="625" y="50" text-anchor="middle">news.example</text>
  <rect class="d-box" x="550" y="150" width="150" height="50" rx="10"/>
  <text class="d-text" x="625" y="180" text-anchor="middle">any website</text>
  <path class="d-edge" d="M 150 45 L 254 96" marker-end="url(#sd02q3-arrow)"/>
  <path class="d-edge" d="M 150 175 L 254 126" marker-end="url(#sd02q3-arrow)"/>
  <path class="d-edge-accent" d="M 440 96 L 544 45" marker-end="url(#sd02q3-arrow)"/>
  <path class="d-edge-accent" d="M 440 126 L 544 175" marker-end="url(#sd02q3-arrow)"/>
</svg>

The forward proxy sits at the edge of the *client* network. Websites only see the proxy address, and the company sees every site its users visit.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 220" role="img" aria-label="Reverse proxy: many internet clients reach one public address, which forwards to several private backend servers">
  <defs>
    <marker id="sd02q3-arrow2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="130" height="50" rx="10"/>
  <text class="d-text" x="85" y="50" text-anchor="middle">Any user</text>
  <rect class="d-box-muted" x="20" y="150" width="130" height="50" rx="10"/>
  <text class="d-text" x="85" y="180" text-anchor="middle">Any user</text>
  <rect class="d-box-accent" x="260" y="72" width="180" height="76" rx="10"/>
  <text class="d-text" x="350" y="104" text-anchor="middle">Reverse proxy</text>
  <text class="d-sub" x="350" y="128" text-anchor="middle">acts for servers</text>
  <rect class="d-box" x="550" y="20" width="150" height="50" rx="10"/>
  <text class="d-text" x="625" y="50" text-anchor="middle">app-1</text>
  <rect class="d-box" x="550" y="150" width="150" height="50" rx="10"/>
  <text class="d-text" x="625" y="180" text-anchor="middle">app-2</text>
  <path class="d-edge" d="M 150 45 L 254 96" marker-end="url(#sd02q3-arrow2)"/>
  <path class="d-edge" d="M 150 175 L 254 126" marker-end="url(#sd02q3-arrow2)"/>
  <path class="d-edge-accent" d="M 440 96 L 544 45" marker-end="url(#sd02q3-arrow2)"/>
  <path class="d-edge-accent" d="M 440 126 L 544 175" marker-end="url(#sd02q3-arrow2)"/>
</svg>

Same shape, mirrored meaning. The reverse proxy sits at the edge of the *server* network. Users only see one public address and never learn how many backends exist or where they are.

| | Forward proxy | Reverse proxy |
| :--- | :--- | :--- |
| Acts for | clients | servers |
| Who configures it | the client side (browser settings, \`HTTPS_PROXY\`, PAC file, or transparent interception) | the site owner; clients just resolve the site name to it |
| Who is hidden | the client from the servers | the backends from the clients |
| Typical owner | a company IT team, a school, a privacy service | the team running the website or API |
| Typical uses | egress filtering, auditing, shared download cache, a fixed outbound IP for partner allowlists | load balancing, TLS termination, caching, compression, path routing, rate limiting, WAF |
| Examples | Squid, a corporate secure web gateway | nginx, HAProxy, Envoy, a CDN, cloud load balancers |

📌 **Interview term: forward proxy** — a proxy chosen by the client to reach arbitrary servers on its behalf.

📌 **Interview term: reverse proxy** — a proxy placed in front of specific servers to receive their traffic on their behalf. Load balancers, [API gateways](/interview-question/what-is-an-api-gateway) and [CDNs](/interview-question/what-is-a-cdn-and-how-does-it-work) are all specialised reverse proxies.

## 3. What Each Side Actually Sees

The example models each hop as a function that only knows its TCP peer address and the headers it was handed.

~~~text
Part 1: forward proxy (in front of the clients)
  10.0.0.5 -> news.example  200  origin sees client 198.51.100.7
  10.0.0.6 -> news.example  200  origin sees client 198.51.100.7
  10.0.0.6 -> games.example 403  blocked by company policy
~~~

Two different employees look identical to the website: both appear as the proxy egress address \`198.51.100.7\`. The proxy, which knows each user, enforces the company policy.

~~~text
Part 2: reverse proxy (in front of the servers)
  GET /api/orders       200 -> app-1   X-Forwarded-For: 203.0.113.9
  GET /api/users        200 -> app-2   X-Forwarded-For: 203.0.113.9
  GET /static/logo.png  200 -> files-1 X-Forwarded-For: 203.0.113.9
  GET /admin            404 -> -       X-Forwarded-For: -
~~~

One public address routes by path to different pools, balances inside a pool, and refuses a path it has no route for — the backends are never reachable directly.

### HTTPS through a forward proxy

📌 **Interview term: CONNECT tunnel** — for an \`https://\` URL, the client asks the forward proxy \`CONNECT news.example:443\`; the proxy opens a TCP connection to that host, replies \`200\`, and then just relays encrypted bytes. The proxy learns the host name and port but not the URL path or content. Squid, for example, by default allows \`CONNECT\` only to known TLS ports.

To inspect content, corporate proxies do **TLS interception**: they install their own root certificate on company devices and terminate TLS themselves. That is a policy and privacy decision, and it breaks certificate pinning.

### TLS at a reverse proxy

📌 **Interview term: TLS termination** — the reverse proxy holds the certificate and decrypts HTTPS, so it can read paths and headers to route, cache and compress. Traffic to the backends is then plain HTTP on a private network, or re-encrypted (TLS re-origination) where policy requires encryption everywhere.

## 4. Who Is the Real Client? — X-Forwarded-For

A backend behind a reverse proxy sees the *proxy* as its TCP peer. To keep the client address, each proxy appends the address it saw to a header.

📌 **Interview term: X-Forwarded-For (XFF)** — a de facto header listing the client and every proxy hop, left to right: \`client, proxy1, proxy2\`. It was never formally standardised; RFC 7239 (June 2014) defines the structured \`Forwarded\` header (\`for=\`, \`by=\`, \`proto=\`, \`host=\`) as the standard version.

The catch: the *client* can send its own \`X-Forwarded-For\`, and proxies append to it rather than replacing it. So the left-most entry is whatever the client typed.

~~~text
Part 3: reading the client IP behind two proxies (edge 172.16.0.4, then 10.1.0.2)
  honest client: header at app = "203.0.113.9, 172.16.0.4", TCP peer = 10.1.0.2
    leftmost entry:         203.0.113.9
    rightmost untrusted:    203.0.113.9
  spoofing client: header at app = "1.2.3.4, 192.0.2.66, 172.16.0.4", TCP peer = 10.1.0.2
    leftmost entry:         1.2.3.4
    rightmost untrusted:    192.0.2.66
~~~

For the honest client both rules agree. For the spoofer, the left-most rule believes the invented \`1.2.3.4\` — so a per-IP rate limit or an IP ban could be bypassed by changing a header. The safe rule walks from the right, skipping only hops you operate, and stops at the first address you do not trust:

~~~js
function rightmostUntrusted(xff, peer) {
  const hops = [...xff.split(",").map((s) => s.trim()), peer];
  for (let i = hops.length - 1; i >= 0; i--) if (!TRUSTED.includes(hops[i])) return hops[i];
  return hops[0];
}
~~~

nginx implements exactly this with its \`realip\` module: \`set_real_ip_from\` lists the trusted proxy addresses, \`real_ip_header X-Forwarded-For\` names the header, and \`real_ip_recursive on\` walks right to left past trusted addresses (per the nginx \`ngx_http_realip_module\` docs). For L4 proxies that do not speak HTTP, the **PROXY protocol** prepends the client address to the TCP stream instead.

## 5. Verified: Running the Code

The example **"Forward vs reverse proxy: who sees which IP, and reading X-Forwarded-For safely"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
Part 1: forward proxy (in front of the clients)
  10.0.0.5 -> news.example  200  origin sees client 198.51.100.7
  10.0.0.6 -> news.example  200  origin sees client 198.51.100.7
  10.0.0.6 -> games.example 403  blocked by company policy

Part 2: reverse proxy (in front of the servers)
  GET /api/orders       200 -> app-1   X-Forwarded-For: 203.0.113.9
  GET /api/users        200 -> app-2   X-Forwarded-For: 203.0.113.9
  GET /static/logo.png  200 -> files-1 X-Forwarded-For: 203.0.113.9
  GET /admin            404 -> -       X-Forwarded-For: -

Part 3: reading the client IP behind two proxies (edge 172.16.0.4, then 10.1.0.2)
  honest client: header at app = "203.0.113.9, 172.16.0.4", TCP peer = 10.1.0.2
    leftmost entry:         203.0.113.9
    rightmost untrusted:    203.0.113.9
  spoofing client: header at app = "1.2.3.4, 192.0.2.66, 172.16.0.4", TCP peer = 10.1.0.2
    leftmost entry:         1.2.3.4
    rightmost untrusted:    192.0.2.66
~~~

What the simulation stands for and leaves out: requests are plain objects passed between functions, and "the IP a hop sees" is a field the previous hop sets, which is exactly what a new TCP connection does in reality. There is no real networking, TLS, \`CONNECT\` tunnel or caching; the addresses are documentation ranges.

## Edge Cases Worth Knowing

- **One box, both roles.** The same nginx or Envoy binary can be configured as either; the role is about *whose traffic it handles*, not the software.
- **Service meshes do both.** A sidecar proxy is a forward proxy for its own service outgoing calls and a reverse proxy for incoming ones.
- **Transparent proxies.** Some forward proxies intercept traffic at the network level, so clients are not configured at all; they still act for the clients.
- **Egress allowlists.** Partners that allowlist your IP need a fixed outbound address — a forward proxy or NAT gateway gives every server the same one.

## Common Pitfalls

- **Defining them by placement in a diagram** ("forward is on the left"). Define them by whom they serve and who is hidden.
- **Trusting the left-most X-Forwarded-For entry** for rate limits, fraud checks or audit logs — the run showed it returning a forged \`1.2.3.4\`.
- **Letting backends be reachable directly**, which bypasses everything the reverse proxy enforces; keep them on a private network.
- **Assuming a forward proxy sees HTTPS content.** With \`CONNECT\` it sees only the host name unless it intercepts TLS.
- **Forgetting the reverse proxy is a single point of failure** — run it redundantly, as with any [load balancer](/interview-question/what-is-a-load-balancer-and-what-strategies-does-it-use).

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The distinction:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">forward proxy</strong> acts for <strong style="color:#ffca28;">clients</strong> and hides them from servers; a <strong style="color:#ffca28;">reverse proxy</strong> acts for <strong style="color:#ffca28;">servers</strong> and hides them from clients. Both forward requests on their own connection, so the next hop sees the proxy address.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Forward uses:</strong> <span style="color:#f0e2c8;">Configured on the client side: egress filtering and auditing, shared caching, and a fixed outbound IP. HTTPS goes through it as a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CONNECT</code> tunnel, so it sees host names, not content, unless it intercepts TLS.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Reverse uses:</strong> <span style="color:#f0e2c8;">Set up by the site owner, invisible to users: <strong style="color:#ffca28;">load balancing</strong>, <strong style="color:#ffca28;">TLS termination</strong>, caching, compression, path routing and rate limiting. Load balancers, API gateways and CDNs are all reverse proxies.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Client identity:</strong> <span style="color:#f0e2c8;">Behind a reverse proxy the backend sees the proxy IP, so proxies add <strong style="color:#ffca28;">X-Forwarded-For</strong> or the standard <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Forwarded</code> header. The left-most entry is client-controlled.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Doing it safely:</strong> <span style="color:#f0e2c8;">Read the client IP by walking the header from the right past only your own proxies, as nginx <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">real_ip_recursive</code> does, and keep backends unreachable except through the proxy.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Is a load balancer a reverse proxy?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An L7 load balancer is a reverse proxy whose main job is spreading requests over a pool. An L4 balancer forwards TCP connections without parsing HTTP, but it still stands in for the servers from the client point of view.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can a forward proxy cache HTTPS content?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not through a plain <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CONNECT</code> tunnel, because it only relays encrypted bytes. It can only cache if it intercepts TLS with its own certificate trusted on the client devices.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does the backend know the request came over HTTPS if the proxy terminates TLS?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The proxy adds <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">X-Forwarded-Proto: https</code> or <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Forwarded: proto=https</code>. The application must trust that header only from its own proxies, or redirects and secure-cookie logic will be wrong.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">A user rotates fake X-Forwarded-For values to dodge your per-IP rate limit. Fix?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Only trust entries added by your proxies: take the right-most address that is not one of your known hops. In the run that returned the real <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">192.0.2.66</code>, not the forged <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">1.2.3.4</code>.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">When would you put a forward proxy in a backend architecture?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For egress control: all outbound calls from servers go through one proxy that allowlists destinations, logs them and gives partners one fixed source IP to allowlist.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Proxy | An intermediary that forwards requests on its own connection |
| Forward proxy | Acts for clients; servers see the proxy |
| Reverse proxy | Acts for servers; clients see the proxy |
| CONNECT tunnel | How HTTPS passes through a forward proxy as relayed bytes |
| TLS termination | Decrypting HTTPS at the proxy |
| X-Forwarded-For | De facto header listing client and proxy addresses |

**Conclusion:** Forward and reverse proxies are the same mechanism — an intermediary that re-sends requests on its own connection — serving opposite sides. A forward proxy is the client agent: it filters, audits and anonymises outgoing traffic. A reverse proxy is the server agent: it gives one public face to many backends and handles TLS, routing, caching and load balancing. Because both hide the original sender, identity has to travel in headers like X-Forwarded-For, and the run showed why you read that header from the right, trusting only the hops you run.`,
    examples: [
      {
        label: `Forward vs reverse proxy: who sees which IP, and reading X-Forwarded-For safely`,
        variants: [
          { tech: "node", code: `// Forward proxy vs reverse proxy, as packets passing through in-process hops.
// Each hop sees only the TCP peer address (src) and the headers it was given.
// No real network: a "request" is an object, a "hop" is a function.

function forwardProxy(req, policy) {
  // Acts for the CLIENTS: knows every user, enforces their company policy.
  if (policy.blocked.includes(req.host)) return { status: 403, seenBy: "proxy", note: "blocked by company policy" };
  const outbound = { ...req, src: "198.51.100.7" }; // the proxy opens its own connection
  return origin(outbound);
}

function origin(req) {
  return { status: 200, seenBy: req.host, note: \`origin sees client \${req.src}\` };
}

console.log("Part 1: forward proxy (in front of the clients)");
const policy = { blocked: ["games.example"] };
for (const [user, host] of [["10.0.0.5", "news.example"], ["10.0.0.6", "news.example"], ["10.0.0.6", "games.example"]]) {
  const r = forwardProxy({ src: user, host, headers: {} }, policy);
  console.log(\`  \${user} -> \${host.padEnd(13)} \${r.status}  \${r.note}\`);
}

// Reverse proxy: acts for the SERVERS. Clients only know its public address.
const BACKENDS = { "/api/": ["app-1", "app-2"], "/static/": ["files-1"] };
let rr = 0;
function reverseProxy(req, proxyIp) {
  const prefix = Object.keys(BACKENDS).find((p) => req.path.startsWith(p));
  if (!prefix) return { status: 404, backend: "-", xff: "-" };
  const pool = BACKENDS[prefix];
  const backend = pool[rr++ % pool.length];
  const prior = req.headers["x-forwarded-for"];
  const xff = prior ? \`\${prior}, \${req.src}\` : req.src; // append the peer it saw
  return { status: 200, backend, src: proxyIp, xff };
}

console.log("\\nPart 2: reverse proxy (in front of the servers)");
for (const path of ["/api/orders", "/api/users", "/static/logo.png", "/admin"]) {
  const r = reverseProxy({ src: "203.0.113.9", path, headers: {} }, "10.1.0.2");
  console.log(\`  GET \${path.padEnd(17)} \${r.status} -> \${r.backend.padEnd(7)} X-Forwarded-For: \${r.xff}\`);
}

// Who is the real client? Walk X-Forwarded-For from the right, skipping hops we trust.
const TRUSTED = ["10.1.0.2", "172.16.0.4"]; // our CDN edge and our reverse proxy
function leftmost(xff) { return xff.split(",")[0].trim(); }
function rightmostUntrusted(xff, peer) {
  const hops = [...xff.split(",").map((s) => s.trim()), peer];
  for (let i = hops.length - 1; i >= 0; i--) if (!TRUSTED.includes(hops[i])) return hops[i];
  return hops[0];
}

console.log("\\nPart 3: reading the client IP behind two proxies (edge 172.16.0.4, then 10.1.0.2)");
const cases = [
  ["honest client", "203.0.113.9", ""],
  ["spoofing client", "192.0.2.66", "1.2.3.4"],
];
for (const [name, clientIp, forged] of cases) {
  let headers = forged ? { "x-forwarded-for": forged } : {};
  const atEdge = reverseProxy({ src: clientIp, path: "/api/login", headers }, "172.16.0.4");
  headers = { "x-forwarded-for": atEdge.xff };
  const atProxy = reverseProxy({ src: "172.16.0.4", path: "/api/login", headers }, "10.1.0.2");
  console.log(\`  \${name}: header at app = "\${atProxy.xff}", TCP peer = \${atProxy.src}\`);
  console.log(\`    leftmost entry:         \${leftmost(atProxy.xff)}\`);
  console.log(\`    rightmost untrusted:    \${rightmostUntrusted(atProxy.xff, atProxy.src)}\`);
}` },
          { tech: "python", code: `# Forward proxy vs reverse proxy, as packets passing through in-process hops.
# Each hop sees only the TCP peer address (src) and the headers it was given.
# No real network: a "request" is a dict, a "hop" is a function.


def forward_proxy(req, policy):
    # Acts for the CLIENTS: knows every user, enforces their company policy.
    if req["host"] in policy["blocked"]:
        return {"status": 403, "note": "blocked by company policy"}
    outbound = {**req, "src": "198.51.100.7"}  # the proxy opens its own connection
    return origin(outbound)


def origin(req):
    return {"status": 200, "note": f"origin sees client {req['src']}"}


print("Part 1: forward proxy (in front of the clients)")
policy = {"blocked": ["games.example"]}
for user, host in [("10.0.0.5", "news.example"), ("10.0.0.6", "news.example"), ("10.0.0.6", "games.example")]:
    r = forward_proxy({"src": user, "host": host, "headers": {}}, policy)
    print(f"  {user} -> {host:<13} {r['status']}  {r['note']}")

# Reverse proxy: acts for the SERVERS. Clients only know its public address.
BACKENDS = {"/api/": ["app-1", "app-2"], "/static/": ["files-1"]}
rr = 0


def reverse_proxy(req, proxy_ip):
    global rr
    prefix = next((p for p in BACKENDS if req["path"].startswith(p)), None)
    if prefix is None:
        return {"status": 404, "backend": "-", "xff": "-"}
    pool = BACKENDS[prefix]
    backend = pool[rr % len(pool)]
    rr += 1
    prior = req["headers"].get("x-forwarded-for")
    xff = f"{prior}, {req['src']}" if prior else req["src"]  # append the peer it saw
    return {"status": 200, "backend": backend, "src": proxy_ip, "xff": xff}


print("\\nPart 2: reverse proxy (in front of the servers)")
for path in ["/api/orders", "/api/users", "/static/logo.png", "/admin"]:
    r = reverse_proxy({"src": "203.0.113.9", "path": path, "headers": {}}, "10.1.0.2")
    print(f"  GET {path:<17} {r['status']} -> {r['backend']:<7} X-Forwarded-For: {r['xff']}")

# Who is the real client? Walk X-Forwarded-For from the right, skipping hops we trust.
TRUSTED = ["10.1.0.2", "172.16.0.4"]  # our CDN edge and our reverse proxy


def leftmost(xff):
    return xff.split(",")[0].strip()


def rightmost_untrusted(xff, peer):
    hops = [s.strip() for s in xff.split(",")] + [peer]
    for h in reversed(hops):
        if h not in TRUSTED:
            return h
    return hops[0]


print("\\nPart 3: reading the client IP behind two proxies (edge 172.16.0.4, then 10.1.0.2)")
for name, client_ip, forged in [("honest client", "203.0.113.9", ""), ("spoofing client", "192.0.2.66", "1.2.3.4")]:
    headers = {"x-forwarded-for": forged} if forged else {}
    at_edge = reverse_proxy({"src": client_ip, "path": "/api/login", "headers": headers}, "172.16.0.4")
    headers = {"x-forwarded-for": at_edge["xff"]}
    at_proxy = reverse_proxy({"src": "172.16.0.4", "path": "/api/login", "headers": headers}, "10.1.0.2")
    print(f"  {name}: header at app = \\"{at_proxy['xff']}\\", TCP peer = {at_proxy['src']}")
    print(f"    leftmost entry:         {leftmost(at_proxy['xff'])}")
    print(f"    rightmost untrusted:    {rightmost_untrusted(at_proxy['xff'], at_proxy['src'])}")` },
        ],
      },
    ],
  },
  {
    title: `What is an API gateway?`,
    difficulty: "medium",
    seoDescription: `An API gateway is the single entry point to your services: routing, auth, rate limiting, aggregation. See the request pipeline run, plus BFFs and pitfalls.`,
    description: `**Question presented to candidate:**
"We are splitting our backend into a dozen services, and the mobile and web apps are starting to call all of them directly. What is an API gateway, what would you put in it, what would you keep out of it, and how does it differ from a plain load balancer?"

**What a strong answer should cover:**
- Definition: a **reverse proxy** that is the single entry point for external API clients, applying **cross-cutting concerns** once instead of in every service
- The pipeline: **routing** (path, host, version), **authentication** (validating tokens or keys), coarse **authorisation**, **rate limiting / quotas**, request and response transformation, TLS termination, logging and metrics
- **Aggregation** and the **Backend for Frontend (BFF)** pattern: one call from a slow mobile network instead of many, with worked latency numbers
- How it differs from a **load balancer** (L7 routing and policy vs spreading traffic) and from a **service mesh** (north-south vs east-west traffic)
- Risks: single point of failure and extra hop, a "smart gateway" that accumulates business logic, and gateway timeouts and limits (for example, Amazon API Gateway defaults)

**Clarifying questions expected:**
- Who are the clients — first-party apps, third-party developers, or both?
- How many services and teams, and who will own the gateway configuration?

**Code / implementation expected:** Optional — describing the pipeline is enough; sketching a route table or a token-bucket check is a plus.`,
    answer: `**Target Audience:** Beginners to system design — you know what an HTTP API is; no microservices background assumed.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Behaviour and latency numbers come from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

A large office building has forty companies inside. Without a reception desk, every company has to put its own guard at its own door, each checking badges in its own way — some strictly, some not at all. Visitors wander the corridors looking for the right floor.

So the building puts one reception desk in the lobby. It checks every visitor ID once, turns away people with no appointment, limits how many couriers one company can send in an hour, and tells each visitor which floor to go to. The companies upstairs can trust that anyone who reaches their door was already checked.

That reception desk is an **API gateway**. The companies are your **services**, the ID check is **authentication**, the courier limit is **rate limiting**, and "which floor" is **routing**.

📌 **Interview term: API gateway** — a reverse proxy that is the single entry point for API clients. It routes each request to the right backend service and applies **cross-cutting concerns** — policies every service needs — in one place. (For what a reverse proxy is, see [What is the difference between a reverse proxy and a forward proxy?](/interview-question/what-is-the-difference-between-a-reverse-proxy-and-a-forward-proxy).)

📌 **Interview term: cross-cutting concern** — a requirement that applies to many services and is not part of any one of them: authentication, rate limiting, TLS, logging, metrics, CORS.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Who calls the API: our own apps, partners, public developers? | Public APIs need API keys, quotas, usage plans and a developer portal; first-party apps mainly need auth and aggregation |
| How many services and teams? | With three services a gateway may be overkill; with thirty, consistent auth and routing pay off |
| Do mobile and web need different response shapes? | Points towards one gateway per client type (BFF) |
| What latency budget, and is traffic bursty? | The gateway adds a hop; rate limits and timeouts must fit the budget |
| Managed or self-hosted? | Amazon API Gateway, Apigee or Azure API Management vs Kong, Envoy, NGINX or Tyk, with very different limits and costs |

## 3. Where It Sits

<svg class="iq-diagram" width="100%" viewBox="0 0 760 300" role="img" aria-label="Web and mobile clients call one API gateway, which routes to orders, users and content services">
  <defs>
    <marker id="sd02q4-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="60" width="130" height="56" rx="10"/>
  <text class="d-text" x="85" y="93" text-anchor="middle">Web app</text>
  <rect class="d-box-muted" x="20" y="184" width="130" height="56" rx="10"/>
  <text class="d-text" x="85" y="217" text-anchor="middle">Mobile app</text>
  <rect class="d-box-accent" x="260" y="96" width="200" height="108" rx="10"/>
  <text class="d-text" x="360" y="130" text-anchor="middle">API gateway</text>
  <text class="d-sub" x="360" y="156" text-anchor="middle">auth and rate limit</text>
  <text class="d-sub" x="360" y="180" text-anchor="middle">route by path</text>
  <rect class="d-box" x="580" y="20" width="160" height="56" rx="10"/>
  <text class="d-text" x="660" y="53" text-anchor="middle">orders-svc</text>
  <rect class="d-box" x="580" y="122" width="160" height="56" rx="10"/>
  <text class="d-text" x="660" y="155" text-anchor="middle">users-svc</text>
  <rect class="d-box" x="580" y="224" width="160" height="56" rx="10"/>
  <text class="d-text" x="660" y="257" text-anchor="middle">content-svc</text>
  <path class="d-edge" d="M 150 88 L 254 124" marker-end="url(#sd02q4-arrow)"/>
  <path class="d-edge" d="M 150 212 L 254 176" marker-end="url(#sd02q4-arrow)"/>
  <path class="d-edge-accent" d="M 460 120 L 574 50" marker-end="url(#sd02q4-arrow)"/>
  <path class="d-edge-accent" d="M 460 150 L 574 150" marker-end="url(#sd02q4-arrow)"/>
  <path class="d-edge-accent" d="M 460 180 L 574 250" marker-end="url(#sd02q4-arrow)"/>
</svg>

Clients know one host name. The services behind the gateway can be split, merged, moved or rewritten without clients noticing, as long as the gateway routes stay the same.

📌 **Interview term: north-south vs east-west traffic** — north-south is traffic between outside clients and your system (the gateway job); east-west is service-to-service traffic inside it (usually a service mesh or direct calls).

## 4. The Request Pipeline

A gateway runs each request through a chain of filters (Kong calls them plugins, Envoy calls them filters). The order matters: cheap rejections first.

1. **TLS termination** and basic request validation (size limits, malformed headers).
2. **Routing** — match host, path, method or version to a backend.
3. **Authentication** — validate an API key, a session, or a signed token such as a JWT (signature, expiry, issuer).
4. **Coarse authorisation** — "admin routes need the admin role". Fine-grained rules ("may this user see order 42?") stay in the service that owns the data.
5. **Rate limiting and quotas** — per API key, user or IP.
6. **Transformation** — add headers such as the verified user ID, strip internal headers, translate protocols (REST to gRPC).
7. **Forward**, with timeouts, retries and circuit breaking; then response transformation, caching, and logging and metrics with a request ID.

📌 **Interview term: JWT (JSON Web Token)** — a signed token carrying claims such as user ID, role and expiry. The gateway can verify it with a key, without calling the auth service on every request.

📌 **Interview term: rate limiting / quota** — capping requests per caller per time window, answering \`429 Too Many Requests\` with a \`Retry-After\` header beyond it. The algorithms are compared in [Token bucket vs sliding window vs fixed window](/interview-question/token-bucket-vs-sliding-window-vs-fixed-window-which-rate-limiter-when); designing one across many gateway nodes is [How would you design a rate limiter?](/interview-question/how-would-you-design-a-rate-limiter)

### The pipeline, running

The example implements steps 2–6 with a route table (longest prefix wins), a simplified signed token (payload plus HMAC-SHA256, standing in for a JWT), a role check, and a token bucket per caller (burst 3, refill 1 per second):

~~~text
Part 1: one gateway, many checks
  t=    0ms  /api/orders/42             200 -> orders-svc (X-User-Id: alice added)
  t=  100ms  /api/orders/43             200 -> orders-svc (X-User-Id: alice added)
  t=  200ms  /api/users/me              200 -> users-svc (X-User-Id: alice added)
  t=  300ms  /api/orders/44             429 rate limited, Retry-After 1s
  t= 1400ms  /api/orders/45             200 -> orders-svc (X-User-Id: alice added)
  t= 1500ms  /api/orders/admin/refund   403 role user may not call admin route
  t= 1600ms  /api/orders/admin/refund   401 bad signature
  t= 1700ms  /api/orders/admin/refund   200 -> orders-svc (X-User-Id: root added)
  t= 1800ms  /api/users/me              401 bad signature
  t=61000ms  /api/users/me              401 token expired
  t=61100ms  /api/users/me              401 missing token
  t=61200ms  /public/home               200 -> content-svc (public route, no identity)
  t=61300ms  /internal/metrics          404 no route
~~~

Read it line by line:

- The fourth call in 300 ms exhausts alice's burst of 3 and gets \`429\`; by 1,400 ms the bucket has refilled enough to allow one more.
- At 1,600 ms alice edits her token to say \`role=admin\`. The HMAC no longer matches, so the gateway rejects it — this is why claims must be signed, and why the comparison uses a constant-time function (\`timingSafeEqual\` / \`hmac.compare_digest\`).
- \`/internal/metrics\` has no route, so it is unreachable from outside even though the service exists.
- Every service behind the gateway receives \`X-User-Id\` from the gateway and must **only** accept it from the gateway — otherwise any caller could set it.

## 5. Aggregation and the BFF Pattern

A mobile home screen needs data from three services that take 40, 70 and 55 ms. On a mobile network each round trip from the phone costs 150 ms; inside the data centre a hop costs 2 ms.

~~~text
Part 2: one screen needs 3 backend calls (40, 70, 55 ms); mobile RTT 150 ms
  client calls each service in turn:   615 ms
  gateway calls them in turn:          321 ms
  gateway calls them in parallel:      222 ms
~~~

The arithmetic: 3 × 150 + 40 + 70 + 55 = 615 ms when the phone makes each call; 150 + 3 × 2 + 165 = 321 ms when the gateway makes them one after another; 150 + 2 + max(40, 70, 55) = 222 ms when it makes them in parallel. Moving the fan-out next to the services removes two slow round trips.

📌 **Interview term: API composition (aggregation)** — the gateway, or a service behind it, calls several services and merges their results into one response.

📌 **Interview term: Backend for Frontend (BFF)** — one thin backend per client type (web, iOS, Android, partners), each shaping responses for its client. Sam Newman described the pattern in 2015 and credits Phil Calçado and SoundCloud with the name (per InfoQ coverage). Each BFF is owned by the team that owns the client, which keeps a single shared gateway from becoming everybody bottleneck. GraphQL is another answer to the same problem; see [What is the difference between REST and GraphQL?](/interview-question/what-is-the-difference-between-rest-and-graphql)

## 6. Gateway vs Load Balancer vs Service Mesh

| | Load balancer | API gateway | Service mesh |
| :--- | :--- | :--- | :--- |
| Main job | spread traffic over identical servers | one front door for many different services, with policy | secure and observe service-to-service calls |
| Traffic | any (L4 or L7) | north-south API calls | east-west calls |
| Knows about | servers and health | routes, API keys, users, quotas, versions | service identities (mTLS), retries, timeouts |
| Typical products | AWS ALB/NLB, HAProxy | Amazon API Gateway, Kong, Apigee, Envoy Gateway | Istio, Linkerd |

In practice they stack: a load balancer in front of a fleet of gateway instances, the gateway routing to services, and a mesh between services. See [What is a load balancer and what strategies does it use?](/interview-question/what-is-a-load-balancer-and-what-strategies-does-it-use) and [What are the trade-offs of microservices vs a monolith?](/interview-question/what-are-the-trade-offs-of-microservices-vs-a-monolith)

## 7. Limits of a Managed Gateway — A Real Example

Managed gateways come with quotas you have to design around. Amazon API Gateway documents an account-level throttle of **10,000 requests per second per Region**, with burst handled by a token bucket of **5,000** requests (raisable on request; some newer Regions default to 2,500 RPS and 1,250 burst). The integration timeout defaults to a maximum of **29 seconds**; since a June 2024 AWS announcement, Regional and private REST APIs can raise it above 29 seconds, which may require lowering the account throttle quota, while the quotas page still lists 29 seconds for WebSocket APIs. The design consequence: long-running work should not sit behind a synchronous gateway call even where the timeout can be raised — return \`202 Accepted\` with a job ID and let the client poll or receive a callback, using a [message queue](/interview-question/what-is-a-message-queue-and-why-use-one) behind it. These numbers change; check the current AWS quotas page before quoting them as fixed.

## 8. Verified: Running the Code

The example **"An API gateway pipeline: routing, signed tokens, roles, per-caller rate limit, aggregation"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
Part 1: one gateway, many checks
  t=    0ms  /api/orders/42             200 -> orders-svc (X-User-Id: alice added)
  t=  100ms  /api/orders/43             200 -> orders-svc (X-User-Id: alice added)
  t=  200ms  /api/users/me              200 -> users-svc (X-User-Id: alice added)
  t=  300ms  /api/orders/44             429 rate limited, Retry-After 1s
  t= 1400ms  /api/orders/45             200 -> orders-svc (X-User-Id: alice added)
  t= 1500ms  /api/orders/admin/refund   403 role user may not call admin route
  t= 1600ms  /api/orders/admin/refund   401 bad signature
  t= 1700ms  /api/orders/admin/refund   200 -> orders-svc (X-User-Id: root added)
  t= 1800ms  /api/users/me              401 bad signature
  t=61000ms  /api/users/me              401 token expired
  t=61100ms  /api/users/me              401 missing token
  t=61200ms  /public/home               200 -> content-svc (public route, no identity)
  t=61300ms  /internal/metrics          404 no route

Part 2: one screen needs 3 backend calls (40, 70, 55 ms); mobile RTT 150 ms
  client calls each service in turn:   615 ms
  gateway calls them in turn:          321 ms
  gateway calls them in parallel:      222 ms
~~~

What the simulation stands for and leaves out: services are names, not processes; the clock is a parameter; the token is a simplified \`payload.signature\` format rather than a real JWT (no base64url, no header, no key rotation). The rate limiter lives in one process — a fleet of gateway nodes would share counters in Redis or accept approximate per-node limits. Latencies in Part 2 are assumed inputs, not measurements.

## Edge Cases Worth Knowing

- **Header spoofing.** If a service can be reached without going through the gateway, anyone can send \`X-User-Id: admin\`. Lock services to the private network or verify a gateway-signed header or mTLS.
- **Retries at two layers.** Gateway retries on top of client retries multiply load on a failing service; retry only idempotent requests and add a [circuit breaker](/interview-question/what-is-the-circuit-breaker-pattern).
- **Long-lived connections.** WebSockets and server-sent events through a gateway hit idle timeouts and per-connection limits ([When would you use WebSockets vs polling vs SSE?](/interview-question/when-would-you-use-websockets-vs-polling-vs-sse)).
- **Versioning.** Routing \`/v1/\` and \`/v2/\` to different services lets you migrate gradually; removing a version is a client-communication problem, not a gateway one.

## Common Pitfalls

- **Putting business logic in the gateway.** Transformations grow into rules only one team understands, and every release depends on the gateway team. Keep it to policy and routing.
- **Fine-grained authorisation at the gateway.** It does not own the data; check "may this user see order 42" in the orders service.
- **A single gateway instance.** It is on every request path; run several behind a load balancer across zones.
- **Ignoring the added hop.** Each hop costs latency and is another place to time out; budget for it and measure it.
- **One shared gateway owned by one team for every client.** It becomes a bottleneck; BFFs or team-owned route configuration spread the ownership.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Definition:</strong> <span style="color:#f0e2c8;">An <strong style="color:#ffca28;">API gateway</strong> is a reverse proxy that is the single entry point for external clients. It routes requests to services and applies <strong style="color:#ffca28;">cross-cutting concerns</strong> once, so services do not each reimplement them.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. The pipeline:</strong> <span style="color:#f0e2c8;">TLS termination, <strong style="color:#ffca28;">routing</strong> by path or host, <strong style="color:#ffca28;">authentication</strong> of keys or JWTs, coarse authorisation, <strong style="color:#ffca28;">rate limiting</strong> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">429</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Retry-After</code>, header and protocol transformation, then logging and metrics.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Aggregation:</strong> <span style="color:#f0e2c8;">It can fan out to several services and merge the results, which saves mobile round trips: in the worked example, 615 ms from the phone versus 222 ms with a parallel fan-out in the gateway. A <strong style="color:#ffca28;">BFF</strong> gives each client type its own such layer.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Versus others:</strong> <span style="color:#f0e2c8;">A <strong style="color:#ffca28;">load balancer</strong> spreads traffic over identical servers; a gateway fronts many different services with policy; a <strong style="color:#ffca28;">service mesh</strong> handles east-west calls between services.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Risks:</strong> <span style="color:#f0e2c8;">It is on every request, so run it redundantly; keep business logic and fine-grained authorisation out of it; respect its limits, such as the default 29-second integration timeout on Amazon API Gateway.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What should never live in the gateway?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Business rules and data-level authorisation. The gateway can say "this caller is alice with role user"; whether alice may refund order 42 belongs to the orders service, which owns that data.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you rate limit when you run 20 gateway instances?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Either keep counters in a shared store such as Redis with an atomic script, or give each instance a share of the limit and accept some imprecision. The shared store is exact but adds a network call per request.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does a service behind the gateway know who the user is?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The gateway validates the token and forwards a trusted header such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">X-User-Id</code>, or passes the verified JWT on. Services must accept that header only from the gateway, using network isolation or mTLS.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">API gateway versus BFF — are they different?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A BFF is a gateway-like layer dedicated to one client type and owned by that client team. Many systems have a general gateway for auth and rate limits, with BFFs behind it for client-specific aggregation.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">A request needs 2 minutes of processing. How do you expose it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not as a synchronous call through the gateway, which times out (29 seconds by default on Amazon API Gateway, raisable only for Regional and private REST APIs since 2024), and a user should not wait 2 minutes on one request anyway. Accept it with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">202 Accepted</code> and a job ID, process it from a queue, and let the client poll or get a webhook.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| API gateway | Single entry point that routes API calls and applies shared policy |
| Cross-cutting concern | A requirement every service has, such as auth or rate limiting |
| North-south vs east-west | Client-to-system traffic vs service-to-service traffic |
| JWT | A signed token carrying claims the gateway can verify locally |
| Rate limiting / quota | Capping requests per caller; \`429\` beyond the cap |
| API composition | One call fanning out to several services, merged into one response |
| Backend for Frontend (BFF) | A dedicated backend per client type |

**Conclusion:** An API gateway is the front door of a service-based system: one address for clients, one place to terminate TLS, route, authenticate, rate limit and observe every request. The example showed the pipeline rejecting a forged token, an expired one, a missing route and a burst over the limit before any service saw them, and showed aggregation cutting a three-call mobile screen from 615 ms to 222 ms. Keep it thin — policy and routing, not business logic — run it redundantly, and design around its limits.`,
    examples: [
      {
        label: `An API gateway pipeline: routing, signed tokens, roles, per-caller rate limit, aggregation`,
        variants: [
          { tech: "node", code: `// An API gateway as a pipeline: route -> authenticate -> authorise -> rate limit
// -> forward. Backends are in-process functions and the clock is simulated.
// The token is a simplified signed token (payload + HMAC), standing in for a JWT.
const crypto = require("crypto");

const SECRET = "gateway-demo-secret";
function sign(payload) {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 16);
}
function makeToken(sub, role, exp) {
  const payload = \`sub=\${sub};role=\${role};exp=\${exp}\`;
  return \`\${payload}.\${sign(payload)}\`;
}

const ROUTES = [ // longest matching prefix wins
  { prefix: "/api/orders/admin", service: "orders-svc", role: "admin" },
  { prefix: "/api/orders", service: "orders-svc", role: "user" },
  { prefix: "/api/users", service: "users-svc", role: "user" },
  { prefix: "/public", service: "content-svc", role: null },
];

const buckets = new Map(); // token bucket per caller: 3 requests burst, 1 per second refill
function allow(key, nowMs) {
  const cap = 3, perMs = 1 / 1000;
  const b = buckets.get(key) ?? { tokens: cap, at: nowMs };
  b.tokens = Math.min(cap, b.tokens + (nowMs - b.at) * perMs);
  b.at = nowMs;
  buckets.set(key, b);
  if (b.tokens >= 1) { b.tokens -= 1; return { ok: true }; }
  return { ok: false, retryAfterMs: Math.ceil((1 - b.tokens) / perMs) };
}

function handle(nowMs, path, token) {
  const route = ROUTES.filter((r) => path.startsWith(r.prefix)).sort((a, b) => b.prefix.length - a.prefix.length)[0];
  if (!route) return "404 no route";
  let caller = "anonymous";
  if (route.role) {
    if (!token) return "401 missing token";
    const dot = token.lastIndexOf(".");
    const payload = token.slice(0, dot), sig = token.slice(dot + 1);
    const good = sign(payload);
    if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return "401 bad signature";
    const claims = Object.fromEntries(payload.split(";").map((kv) => kv.split("=")));
    if (Number(claims.exp) * 1000 <= nowMs) return "401 token expired";
    if (route.role === "admin" && claims.role !== "admin") return "403 role user may not call admin route";
    caller = claims.sub;
  }
  const limit = allow(caller, nowMs);
  if (!limit.ok) return \`429 rate limited, Retry-After \${Math.ceil(limit.retryAfterMs / 1000)}s\`;
  return caller === "anonymous" ? \`200 -> \${route.service} (public route, no identity)\` : \`200 -> \${route.service} (X-User-Id: \${caller} added)\`;
}

const alice = makeToken("alice", "user", 1800);
const root = makeToken("root", "admin", 1800);
const forged = alice.replace("role=user", "role=admin");
const oldTok = makeToken("bob", "user", 60);

console.log("Part 1: one gateway, many checks");
const calls = [
  [0, "/api/orders/42", alice], [100, "/api/orders/43", alice], [200, "/api/users/me", alice],
  [300, "/api/orders/44", alice], [1400, "/api/orders/45", alice],
  [1500, "/api/orders/admin/refund", alice], [1600, "/api/orders/admin/refund", forged],
  [1700, "/api/orders/admin/refund", root], [1800, "/api/users/me", oldTok.slice(0, -1) + "0"],
  [61000, "/api/users/me", oldTok], [61100, "/api/users/me", null], [61200, "/public/home", null],
  [61300, "/internal/metrics", null],
];
for (const [t, path, tok] of calls) {
  console.log(\`  t=\${String(t).padStart(5)}ms  \${path.padEnd(26)} \${handle(t, path, tok)}\`);
}

console.log("\\nPart 2: one screen needs 3 backend calls (40, 70, 55 ms); mobile RTT 150 ms");
const backend = [40, 70, 55], rtt = 150, hop = 2; // hop = gateway to service RTT in the data centre
const direct = backend.reduce((s, b) => s + rtt + b, 0);
const viaGatewaySeq = rtt + backend.reduce((s, b) => s + hop + b, 0);
const viaGatewayPar = rtt + hop + Math.max(...backend);
console.log(\`  client calls each service in turn:   \${direct} ms\`);
console.log(\`  gateway calls them in turn:          \${viaGatewaySeq} ms\`);
console.log(\`  gateway calls them in parallel:      \${viaGatewayPar} ms\`);` },
          { tech: "python", code: `# An API gateway as a pipeline: route -> authenticate -> authorise -> rate limit
# -> forward. Backends are in-process functions and the clock is simulated.
# The token is a simplified signed token (payload + HMAC), standing in for a JWT.
import hashlib
import hmac
import math

SECRET = b"gateway-demo-secret"


def sign(payload):
    return hmac.new(SECRET, payload.encode(), hashlib.sha256).hexdigest()[:16]


def make_token(sub, role, exp):
    payload = f"sub={sub};role={role};exp={exp}"
    return f"{payload}.{sign(payload)}"


ROUTES = [  # longest matching prefix wins
    {"prefix": "/api/orders/admin", "service": "orders-svc", "role": "admin"},
    {"prefix": "/api/orders", "service": "orders-svc", "role": "user"},
    {"prefix": "/api/users", "service": "users-svc", "role": "user"},
    {"prefix": "/public", "service": "content-svc", "role": None},
]

buckets = {}  # token bucket per caller: 3 requests burst, 1 per second refill


def allow(key, now_ms):
    cap, per_ms = 3, 1 / 1000
    b = buckets.get(key, {"tokens": cap, "at": now_ms})
    b["tokens"] = min(cap, b["tokens"] + (now_ms - b["at"]) * per_ms)
    b["at"] = now_ms
    buckets[key] = b
    if b["tokens"] >= 1:
        b["tokens"] -= 1
        return True, 0
    return False, math.ceil((1 - b["tokens"]) / per_ms)


def handle(now_ms, path, token):
    matches = sorted((r for r in ROUTES if path.startswith(r["prefix"])), key=lambda r: -len(r["prefix"]))
    if not matches:
        return "404 no route"
    route = matches[0]
    caller = "anonymous"
    if route["role"]:
        if not token:
            return "401 missing token"
        dot = token.rindex(".")
        payload, sig = token[:dot], token[dot + 1:]
        if not hmac.compare_digest(sig, sign(payload)):
            return "401 bad signature"
        claims = dict(kv.split("=") for kv in payload.split(";"))
        if int(claims["exp"]) * 1000 <= now_ms:
            return "401 token expired"
        if route["role"] == "admin" and claims["role"] != "admin":
            return "403 role user may not call admin route"
        caller = claims["sub"]
    ok, retry_ms = allow(caller, now_ms)
    if not ok:
        return f"429 rate limited, Retry-After {math.ceil(retry_ms / 1000)}s"
    if caller == "anonymous":
        return f"200 -> {route['service']} (public route, no identity)"
    return f"200 -> {route['service']} (X-User-Id: {caller} added)"


alice = make_token("alice", "user", 1800)
root = make_token("root", "admin", 1800)
forged = alice.replace("role=user", "role=admin")
old_tok = make_token("bob", "user", 60)

print("Part 1: one gateway, many checks")
calls = [
    (0, "/api/orders/42", alice), (100, "/api/orders/43", alice), (200, "/api/users/me", alice),
    (300, "/api/orders/44", alice), (1400, "/api/orders/45", alice),
    (1500, "/api/orders/admin/refund", alice), (1600, "/api/orders/admin/refund", forged),
    (1700, "/api/orders/admin/refund", root), (1800, "/api/users/me", old_tok[:-1] + "0"),
    (61000, "/api/users/me", old_tok), (61100, "/api/users/me", None), (61200, "/public/home", None),
    (61300, "/internal/metrics", None),
]
for t, path, tok in calls:
    print(f"  t={t:>5}ms  {path:<26} {handle(t, path, tok)}")

print("\\nPart 2: one screen needs 3 backend calls (40, 70, 55 ms); mobile RTT 150 ms")
backend, rtt, hop = [40, 70, 55], 150, 2  # hop = gateway to service RTT in the data centre
direct = sum(rtt + b for b in backend)
via_gateway_seq = rtt + sum(hop + b for b in backend)
via_gateway_par = rtt + hop + max(backend)
print(f"  client calls each service in turn:   {direct} ms")
print(f"  gateway calls them in turn:          {via_gateway_seq} ms")
print(f"  gateway calls them in parallel:      {via_gateway_par} ms")` },
        ],
      },
    ],
  },
  {
    title: `What is the difference between REST and GraphQL?`,
    difficulty: "medium",
    seoDescription: `REST exposes resources at many URLs; GraphQL serves client-shaped queries from one schema. Compare round trips, caching, N+1 queries and when to use each.`,
    description: `**Question presented to candidate:**
"Our mobile app makes six or seven REST calls to draw its profile screen, and someone has proposed moving to GraphQL. Explain how REST and GraphQL differ, what GraphQL would actually fix for us, and what new problems it would bring."

**What a strong answer should cover:**
- REST models **resources** at URLs with HTTP methods and status codes; GraphQL exposes one **typed schema** at one endpoint and the client sends a **query** naming exactly the fields it wants
- What GraphQL fixes: **over-fetching**, **under-fetching** and extra **round trips**, one schema as a contract across many clients; quantified with a worked example
- What it costs: **HTTP caching** by URL no longer works by default (POST to one URL), so you need **persisted queries** or client caches; errors arrive inside a \`200\` response
- Server-side risks: the **N+1 problem** in resolvers (fixed with batching such as **DataLoader**), expensive or deeply nested queries (depth limits, **query cost analysis**, rate limits by cost)
- When each fits: REST for public, cacheable, simple resource APIs and file transfer; GraphQL for many clients with different data needs over a rich, connected domain; both can live behind the same gateway

**Code / implementation expected:** Optional — sketching a query and its resolvers helps; the example counts requests, bytes and resolver calls for one screen.`,
    answer: `**Target Audience:** Beginners to system design — you have called an HTTP API; no GraphQL experience assumed.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the exact words an interviewer expects. Request counts and byte sizes come from running the example; the **Verified** section quotes the full output.

## 1. Why This Even Matters — A Story First

Two ways to shop for a recipe.

**The supermarket with fixed aisles (REST).** Every product has its own shelf with a clear label. You go to the dairy aisle for milk, the bakery for bread, the produce section for lemons. Each trip is simple and the store can stock popular shelves near the door. But for one recipe you walk to five aisles, and the eggs only come in boxes of twelve when you needed two.

**The personal shopper with a list (GraphQL).** You hand over one list — "two eggs, one lemon, 200 g of butter" — and get back exactly that in one bag. One trip, nothing extra. But the shopper now has to understand every list anyone writes, someone could hand in a list of ten thousand items, and the store can no longer keep "the usual bag" ready by the door, because every list is different.

That is the whole trade-off: REST gives fixed, simple, cacheable resources; GraphQL gives the client exactly the shape it asks for, and moves complexity to the server.

📌 **Interview term: REST (Representational State Transfer)** — an architectural style where the API exposes **resources** at URLs (\`/users/1\`, \`/users/1/posts\`) and clients act on them with HTTP methods (\`GET\`, \`POST\`, \`PUT\`, \`PATCH\`, \`DELETE\`), status codes and headers. The server decides the shape of each response.

📌 **Interview term: GraphQL** — a query language and runtime for APIs: the server publishes a typed **schema**, and clients send **queries** to one endpoint naming exactly the fields they want. Facebook built it internally from 2012 and open-sourced it in 2015; it moved to the GraphQL Foundation under the Linux Foundation, announced in November 2018.

## 2. One Screen, Two Ways

The profile screen shows a user name, their posts, each post comments and each commenter name.

With REST the client walks resources:

~~~http
GET /users/1
GET /users/1/posts
GET /posts/10/comments
GET /posts/11/comments
GET /posts/12/comments
GET /users/2
GET /users/3
~~~

With GraphQL it sends one query:

~~~graphql
{ user(id: 1) { name posts { title comments { text author { name } } } } }
~~~

and the response has exactly that shape:

~~~json
{"data":{"user":{"name":"Asha","posts":[{"title":"Indexes 101","comments":[{"text":"Great intro","author":{"name":"Ben"}},{"text":"What about LSM trees?","author":{"name":"Chen"}}]},{"title":"Replication lag","comments":[{"text":"We hit this in prod","author":{"name":"Chen"}}]},{"title":"Why queues","comments":[{"text":"Kafka or SQS?","author":{"name":"Ben"}},{"text":"Backpressure matters","author":{"name":"Chen"}}]}]}}}
~~~

The example counts both:

~~~text
REST
  requests: 7, sequential round trips: 4, bytes received: 1544
GraphQL, naive resolvers
  requests: 1, round trips: 1, bytes received: 424, db calls on server: 10
~~~

📌 **Interview term: over-fetching** — receiving fields you do not use. \`GET /users/1\` returned email, bio and join date; \`GET /users/1/posts\` returned full post bodies, when the screen needs only titles. Most of the 1,544 REST bytes are unused.

📌 **Interview term: under-fetching** — one response does not contain enough, so the client must make more requests. Comments need the post IDs, and commenter names need the comment author IDs, so the REST client needs **4 sequential round trips** (the calls within a step can run in parallel). On a 150 ms mobile link that is 4 × 150 = 600 ms of waiting versus 150 ms for the single GraphQL request.

<svg class="iq-diagram" width="100%" viewBox="0 0 720 300" role="img" aria-label="REST client makes four sequential rounds of requests to several endpoints while a GraphQL client makes one request to one endpoint">
  <defs>
    <marker id="sd02q5-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-muted" x="20" y="20" width="140" height="50" rx="10"/>
  <text class="d-text" x="90" y="50" text-anchor="middle">REST client</text>
  <rect class="d-box" x="250" y="20" width="100" height="40" rx="8"/>
  <text class="d-sub" x="300" y="45" text-anchor="middle">round 1</text>
  <rect class="d-box" x="370" y="20" width="100" height="40" rx="8"/>
  <text class="d-sub" x="420" y="45" text-anchor="middle">round 2</text>
  <rect class="d-box" x="490" y="20" width="100" height="40" rx="8"/>
  <text class="d-sub" x="540" y="45" text-anchor="middle">round 3</text>
  <rect class="d-box" x="610" y="20" width="100" height="40" rx="8"/>
  <text class="d-sub" x="660" y="45" text-anchor="middle">round 4</text>
  <text class="d-sub" x="480" y="100" text-anchor="middle">7 requests, 1544 bytes</text>
  <path class="d-edge" d="M 160 42 L 244 40" marker-end="url(#sd02q5-arrow)"/>
  <rect class="d-box-muted" x="20" y="190" width="140" height="50" rx="10"/>
  <text class="d-text" x="90" y="220" text-anchor="middle">GraphQL client</text>
  <rect class="d-box-accent" x="250" y="180" width="220" height="70" rx="10"/>
  <text class="d-text" x="360" y="210" text-anchor="middle">POST /graphql</text>
  <text class="d-sub" x="360" y="234" text-anchor="middle">1 request, 424 bytes</text>
  <path class="d-edge-accent" d="M 160 215 L 244 215" marker-end="url(#sd02q5-arrow)"/>
</svg>

GraphQL moves the stitching from the client to the server. The round trips do not disappear; they move into the data centre, where they cost a millisecond instead of a mobile round trip.

## 3. How a GraphQL Server Works

📌 **Interview term: schema** — the typed description of everything a client may ask for:

~~~graphql
type Query { user(id: ID!): User }
type User { id: ID! name: String! posts: [Post!]! }
type Post { id: ID! title: String! comments: [Comment!]! }
type Comment { id: ID! text: String! author: User! }
~~~

📌 **Interview term: resolver** — a function that produces one field: \`posts\` for a user, \`author\` for a comment. The engine walks the query tree and calls the resolver for each field of each object. Queries read; **mutations** write; **subscriptions** push updates, usually over WebSockets.

The schema doubles as a contract: clients can be type-checked against it, tools can generate code from it, and fields can be marked \`@deprecated\` instead of creating \`/v2/\` endpoints.

### The N+1 problem

The "naive resolvers" line above shows 10 database calls for one request. The example resolver for \`comments\` runs once per post and \`author\` runs once per comment: 1 (user) + 1 (posts) + 3 (comments) + 5 (authors) = 10. With 50 posts and 20 comments each, it would be over a thousand.

📌 **Interview term: N+1 problem** — one query to fetch a list, then one more query per item in it. GraphQL makes it easy to write by accident, because each resolver only sees its own parent object.

📌 **Interview term: DataLoader (batching)** — collect all the keys requested at one level of the tree, then fetch them in one call (\`WHERE post_id IN (10, 11, 12)\`), usually with a per-request cache. The example passes the whole list of parents to each resolver:

~~~js
else if (batched) values = resolvers[f.name](parents, f.args);
else values = parents.map((p) => resolvers[f.name]([p], f.args)[0]); // one call per parent: N+1
~~~

~~~text
GraphQL, batched resolvers (DataLoader style)
  requests: 1, round trips: 1, bytes received: 424, db calls on server: 4
~~~

Four calls — one per level of the query — regardless of how many posts or comments there are.

## 4. What You Give Up with GraphQL

### HTTP caching

A REST \`GET /users/1\` has its own URL, so browsers, CDNs and proxies can cache it with ordinary \`Cache-Control\` headers ([What is a CDN and how does it work?](/interview-question/what-is-a-cdn-and-how-does-it-work)). GraphQL requests are usually \`POST /graphql\` with the query in the body, so every request looks different to an HTTP cache.

📌 **Interview term: persisted queries** — the client sends a hash or ID of a query registered in advance instead of the full text. The request can then be a \`GET\` with a stable URL that CDNs can cache, and the server can refuse any query not on its allowlist. The GraphQL-over-HTTP draft specification makes \`POST\` required and \`GET\` optional for servers, and names \`application/graphql-response+json\` as the preferred response media type.

Client libraries such as Apollo Client and Relay compensate with a normalised cache keyed by type and ID on the device.

### Errors and status codes

REST uses HTTP status codes: \`404\`, \`403\`, \`429\`. A GraphQL response can carry partial \`data\` *and* an \`errors\` array; under the GraphQL-over-HTTP draft, a \`200\` with the new media type means the request was valid and execution was attempted, even if some fields failed. Monitoring that counts \`5xx\` responses misses those failures — you have to inspect the body.

### Cost control

A client can write a deeply nested or huge query in one request. Rate limiting by *request count* is meaningless when one request can cost a million rows.

📌 **Interview term: query cost analysis** — compute a cost for each query before running it (based on fields and list sizes) and reject or rate limit by cost. GitHub GraphQL API, for example, limits users to 5,000 *points* per hour, where each query cost is calculated from the connections it requests, and notes that 5,000 points is not 5,000 calls (GitHub docs, *Rate limits and query limits for the GraphQL API*). Depth limits and timeouts complete the defence.

## 5. Side by Side

| | REST | GraphQL |
| :--- | :--- | :--- |
| Shape of response | fixed by the server per endpoint | chosen by the client per query |
| Endpoints | many URLs, one per resource | usually one, \`/graphql\` |
| Round trips for nested data | often several | one |
| HTTP caching | natural (\`GET\` + URL + \`Cache-Control\`) | needs persisted queries or client caches |
| Errors | HTTP status codes | \`errors\` array, often inside a \`200\` |
| Contract | OpenAPI (optional, separate) | the schema is required and introspectable |
| Versioning | \`/v1/\`, \`/v2/\` or headers | evolve the schema, deprecate fields |
| Server risks | under/over-fetching | N+1 resolvers, expensive queries |
| File upload / download | simple | awkward; usually done with plain HTTP alongside |
| Good fit | public APIs, simple CRUD, cacheable reads, webhooks | many clients with different needs, connected data, fast-moving frontends |

📌 **Interview term: OpenAPI** — a standard description format for REST APIs (endpoints, parameters, response schemas), the REST counterpart of a GraphQL schema for documentation and code generation.

## 6. Choosing, and Not Choosing Only One

- **Prefer REST** for a public API that third parties integrate with, simple resource CRUD, heavily cached reads, file transfer and webhooks. Its simplicity and HTTP caching are real advantages.
- **Prefer GraphQL** when several clients (web, iOS, Android, partners) need different slices of a connected domain, and frontend teams iterate faster than backend teams can add endpoints.
- **Fix REST without switching**: an aggregated endpoint for the screen, sparse fieldsets (\`?fields=name,title\`), embedding (\`?include=comments\`), or a BFF per client ([What is an API gateway?](/interview-question/what-is-an-api-gateway)). For internal service-to-service calls, gRPC is a third option.
- **Mix them**: a GraphQL layer that resolves fields by calling existing REST or gRPC services is common, and the gateway in front can serve both.

## 7. Verified: Running the Code

The example **"One screen via REST vs GraphQL: requests, bytes, and N+1 resolvers vs batching"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
REST
  requests: 7, sequential round trips: 4, bytes received: 1544
GraphQL, naive resolvers
  requests: 1, round trips: 1, bytes received: 424, db calls on server: 10
GraphQL, batched resolvers (DataLoader style)
  requests: 1, round trips: 1, bytes received: 424, db calls on server: 4
  response: {"data":{"user":{"name":"Asha","posts":[{"title":"Indexes 101","comments":[{"text":"Great intro","author":{"name":"Ben"}},{"text":"What about LSM trees?","author":{"name":"Chen"}}]},{"title":"Replication lag","comments":[{"text":"We hit this in prod","author":{"name":"Chen"}}]},{"title":"Why queues","comments":[{"text":"Kafka or SQS?","author":{"name":"Ben"}},{"text":"Backpressure matters","author":{"name":"Chen"}}]}]}}}
~~~

What the simulation stands for and leaves out: arrays stand in for the database, and "requests" and "db calls" are counters, not network or SQL calls. The GraphQL engine is a small parser and executor that supports nested fields and integer arguments only — no variables, fragments, types or validation. Byte counts are compact JSON bodies without HTTP headers or compression; real numbers depend on your payloads.

## Edge Cases Worth Knowing

- **Introspection in production.** GraphQL can describe its own schema to anyone who asks; many teams disable introspection publicly or restrict it to persisted queries.
- **Authorisation per field.** One query can touch many types, so access checks must live in the resolvers or business layer, not only at the endpoint.
- **Batching hides N+1 in a different place.** DataLoader collapses calls per level, but a resolver that calls a slow downstream service still multiplies latency across levels.
- **Subscriptions are stateful.** They need long-lived connections and a pub/sub backbone, which is a different scaling problem ([How do you scale WebSockets to 1M connections with Redis Pub/Sub?](/interview-question/how-do-you-scale-websockets-to-1m-connections-with-redis-pub-sub)).

## Common Pitfalls

- **"GraphQL is faster."** It saves client round trips and bytes (7 requests and 1,544 bytes down to 1 and 424 in the run), but a naive server can do more database work — 10 calls in the run.
- **Forgetting HTTP caching disappears** with \`POST /graphql\`; plan persisted queries or accept the load.
- **Rate limiting by request count** on a GraphQL API instead of by query cost.
- **Treating \`200\` as success** in monitoring when the body carries \`errors\`.
- **Rewriting a working REST API** when one aggregated endpoint or a BFF would fix the screen in question.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. The core difference:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">REST</strong> exposes resources at many URLs and the server fixes each response shape; <strong style="color:#ffca28;">GraphQL</strong> exposes one typed <strong style="color:#ffca28;">schema</strong> at one endpoint and the client sends a query naming exactly the fields it needs.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. What GraphQL fixes:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Over-fetching</strong>, <strong style="color:#ffca28;">under-fetching</strong> and round trips. In the worked example one screen took 7 REST requests in 4 sequential rounds and 1,544 bytes, versus 1 GraphQL request and 424 bytes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. What it costs:</strong> <span style="color:#f0e2c8;">URL-based <strong style="color:#ffca28;">HTTP caching</strong> stops working with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">POST /graphql</code>, so you add <strong style="color:#ffca28;">persisted queries</strong> or client caches; errors arrive in the body, often with a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">200</code>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Server risks:</strong> <span style="color:#f0e2c8;">Resolvers invite the <strong style="color:#ffca28;">N+1 problem</strong> — 10 database calls in the example — fixed with <strong style="color:#ffca28;">DataLoader</strong> batching (4 calls); and clients can send expensive queries, so add depth limits and <strong style="color:#ffca28;">query cost analysis</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. When to choose:</strong> <span style="color:#f0e2c8;">REST for public, simple, cacheable APIs and files; GraphQL for many clients with different needs over connected data. Often both, behind one gateway.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you cache GraphQL responses at a CDN?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Use <strong style="color:#ffca28;">persisted queries</strong>: register queries ahead of time, send their ID with variables in a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">GET</code> request, and the URL becomes stable and cacheable. Otherwise caching happens in the client normalised cache or in the resolvers.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the N+1 problem and how does DataLoader fix it?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">One query for a list, then one per item, because each resolver only sees its own parent. DataLoader collects the keys requested within one tick and fetches them in one batched call, with a per-request cache to deduplicate.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop a client from sending a query that takes down the database?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Depth limits, maximum list sizes, a cost calculated before execution, rate limiting by cost (as GitHub does with points per hour), timeouts, and in first-party apps an allowlist of persisted queries.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you version a GraphQL API?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Usually you do not create versions: add new fields, mark old ones <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">@deprecated</code>, watch usage, and remove them when no client asks for them. Breaking changes are rare because clients only receive fields they request.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Could you fix our seven-call screen without GraphQL?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes: an aggregated endpoint or a BFF for that screen, or REST options such as <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?fields=</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">?include=</code>. GraphQL pays off when many screens and clients each need different shapes.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| REST | Resources at URLs, acted on with HTTP methods; server-defined shapes |
| GraphQL | One typed schema; clients query exactly the fields they need |
| Over-fetching | Receiving fields you do not use |
| Under-fetching | Needing more requests because one response is not enough |
| Schema | Typed description of everything a GraphQL client may ask for |
| Resolver | Function that produces one field |
| N+1 problem | One query for a list plus one per item |
| DataLoader | Batches the keys requested at one level into one fetch |
| Persisted queries | Pre-registered queries sent by ID, cacheable as \`GET\` |
| Query cost analysis | Scoring a query before running it, to limit by cost |
| OpenAPI | Standard description format for REST APIs |

**Conclusion:** REST and GraphQL put the responsibility for response shape in different places. REST keeps the server simple and the responses cacheable, at the cost of extra round trips and unused fields for screens that need connected data. GraphQL lets each client ask for exactly what it needs in one request — 1 request and 424 bytes instead of 7 requests and 1,544 bytes in the example — but the server must batch its resolvers to avoid N+1 queries (10 calls down to 4), control query cost, and find another way to cache. Pick by who your clients are and how varied their needs are, and remember you can run both.`,
    examples: [
      {
        label: `One screen via REST vs GraphQL: requests, bytes, and N+1 resolvers vs batching`,
        variants: [
          { tech: "node", code: `// One screen fetched two ways: REST endpoints vs a tiny GraphQL engine.
// Data lives in arrays (standing in for a database); "requests" and "db calls"
// are counted, not sent. The GraphQL part parses a real query string.

const USERS = [
  { id: 1, name: "Asha", email: "asha@example.com", bio: "Writes about databases and distributed systems.", joined: "2021-04-02" },
  { id: 2, name: "Ben", email: "ben@example.com", bio: "Frontend engineer.", joined: "2022-01-15" },
  { id: 3, name: "Chen", email: "chen@example.com", bio: "SRE, coffee, bikes.", joined: "2020-09-30" },
];
const POSTS = [
  { id: 10, authorId: 1, title: "Indexes 101", body: "A B-tree keeps keys sorted so a lookup touches few pages. ".repeat(4), tags: ["db"] },
  { id: 11, authorId: 1, title: "Replication lag", body: "Asynchronous replicas trail the primary by some delay. ".repeat(4), tags: ["db"] },
  { id: 12, authorId: 1, title: "Why queues", body: "A queue absorbs bursts so producers and consumers decouple. ".repeat(4), tags: ["arch"] },
  { id: 13, authorId: 2, title: "CSS grid", body: "Grid lays out two dimensions. ".repeat(4), tags: ["css"] },
];
const COMMENTS = [
  { id: 100, postId: 10, authorId: 2, text: "Great intro" }, { id: 101, postId: 10, authorId: 3, text: "What about LSM trees?" },
  { id: 102, postId: 11, authorId: 3, text: "We hit this in prod" }, { id: 103, postId: 12, authorId: 2, text: "Kafka or SQS?" },
  { id: 104, postId: 12, authorId: 3, text: "Backpressure matters" },
];

// ---- REST: fixed resources, the client stitches them together ----
const rest = {
  "/users/1": () => USERS[0],
  "/users/1/posts": () => POSTS.filter((p) => p.authorId === 1),
};
let restCalls = 0, restBytes = 0;
function get(url) {
  restCalls++;
  const m = url.match(/^\\/posts\\/(\\d+)\\/comments$/), u = url.match(/^\\/users\\/(\\d+)$/);
  const data = rest[url] ? rest[url]() : m ? COMMENTS.filter((c) => c.postId === Number(m[1])) : USERS.find((x) => x.id === Number(u[1]));
  restBytes += JSON.stringify(data).length;
  return data;
}
const user = get("/users/1");                               // round trip 1
const posts = get("/users/1/posts");                        // round trip 2
const comments = posts.map((p) => get(\`/posts/\${p.id}/comments\`)); // round trip 3 (parallel)
const authorIds = [...new Set(comments.flat().map((c) => c.authorId))].sort((a, b) => a - b);
authorIds.forEach((id) => get(\`/users/\${id}\`));              // round trip 4 (parallel)
console.log("REST");
console.log(\`  requests: \${restCalls}, sequential round trips: 4, bytes received: \${restBytes}\`);

// ---- GraphQL: one query, the server resolves the shape ----
const query = "{ user(id: 1) { name posts { title comments { text author { name } } } } }";
function parse(src) {
  const toks = src.match(/[A-Za-z_]\\w*|\\d+|[{}():]/g);
  let i = 0;
  function selection() {
    i++; // {
    const fields = [];
    while (toks[i] !== "}") {
      const f = { name: toks[i++], args: {}, sub: null };
      if (toks[i] === "(") { i++; while (toks[i] !== ")") { f.args[toks[i]] = Number(toks[i + 2]); i += 3; } i++; }
      if (toks[i] === "{") f.sub = selection();
      fields.push(f);
    }
    i++; // }
    return fields;
  }
  return selection();
}

let dbCalls = 0;
const resolvers = { // each takes the LIST of parents, so a batched engine calls it once per level
  user: (parents, args) => { dbCalls++; return parents.map(() => USERS.find((u) => u.id === args.id)); },
  posts: (parents) => { dbCalls++; return parents.map((u) => POSTS.filter((p) => p.authorId === u.id)); },
  comments: (parents) => { dbCalls++; return parents.map((p) => COMMENTS.filter((c) => c.postId === p.id)); },
  author: (parents) => { dbCalls++; return parents.map((c) => USERS.find((u) => u.id === c.authorId)); },
};
function execute(fields, parents, batched) {
  const out = parents.map(() => ({}));
  for (const f of fields) {
    let values;
    if (!resolvers[f.name]) values = parents.map((p) => p[f.name]);
    else if (batched) values = resolvers[f.name](parents, f.args);
    else values = parents.map((p) => resolvers[f.name]([p], f.args)[0]); // one call per parent: N+1
    if (f.sub) {
      const flat = values.flatMap((v) => (Array.isArray(v) ? v : [v]));
      const done = execute(f.sub, flat, batched);
      let k = 0;
      values = values.map((v) => (Array.isArray(v) ? v.map(() => done[k++]) : done[k++]));
    }
    out.forEach((o, j) => { o[f.name] = values[j]; });
  }
  return out;
}
const ast = parse(query);
for (const batched of [false, true]) {
  dbCalls = 0;
  const data = { data: execute(ast, [{}], batched)[0] };
  const body = JSON.stringify(data);
  console.log(\`GraphQL, \${batched ? "batched resolvers (DataLoader style)" : "naive resolvers"}\`);
  console.log(\`  requests: 1, round trips: 1, bytes received: \${body.length}, db calls on server: \${dbCalls}\`);
  if (batched) console.log(\`  response: \${body}\`);
}` },
          { tech: "python", code: `# One screen fetched two ways: REST endpoints vs a tiny GraphQL engine.
# Data lives in lists (standing in for a database); "requests" and "db calls"
# are counted, not sent. The GraphQL part parses a real query string.
import json
import re

USERS = [
    {"id": 1, "name": "Asha", "email": "asha@example.com", "bio": "Writes about databases and distributed systems.", "joined": "2021-04-02"},
    {"id": 2, "name": "Ben", "email": "ben@example.com", "bio": "Frontend engineer.", "joined": "2022-01-15"},
    {"id": 3, "name": "Chen", "email": "chen@example.com", "bio": "SRE, coffee, bikes.", "joined": "2020-09-30"},
]
POSTS = [
    {"id": 10, "authorId": 1, "title": "Indexes 101", "body": "A B-tree keeps keys sorted so a lookup touches few pages. " * 4, "tags": ["db"]},
    {"id": 11, "authorId": 1, "title": "Replication lag", "body": "Asynchronous replicas trail the primary by some delay. " * 4, "tags": ["db"]},
    {"id": 12, "authorId": 1, "title": "Why queues", "body": "A queue absorbs bursts so producers and consumers decouple. " * 4, "tags": ["arch"]},
    {"id": 13, "authorId": 2, "title": "CSS grid", "body": "Grid lays out two dimensions. " * 4, "tags": ["css"]},
]
COMMENTS = [
    {"id": 100, "postId": 10, "authorId": 2, "text": "Great intro"}, {"id": 101, "postId": 10, "authorId": 3, "text": "What about LSM trees?"},
    {"id": 102, "postId": 11, "authorId": 3, "text": "We hit this in prod"}, {"id": 103, "postId": 12, "authorId": 2, "text": "Kafka or SQS?"},
    {"id": 104, "postId": 12, "authorId": 3, "text": "Backpressure matters"},
]


def dumps(x):
    return json.dumps(x, separators=(",", ":"))


# ---- REST: fixed resources, the client stitches them together ----
rest_calls = rest_bytes = 0


def get(url):
    global rest_calls, rest_bytes
    rest_calls += 1
    if url == "/users/1/posts":
        data = [p for p in POSTS if p["authorId"] == 1]
    elif m := re.match(r"^/posts/(\\d+)/comments$", url):
        data = [c for c in COMMENTS if c["postId"] == int(m.group(1))]
    else:
        uid = int(re.match(r"^/users/(\\d+)$", url).group(1))
        data = next(u for u in USERS if u["id"] == uid)
    rest_bytes += len(dumps(data))
    return data


user = get("/users/1")  # round trip 1
posts = get("/users/1/posts")  # round trip 2
comments = [get(f"/posts/{p['id']}/comments") for p in posts]  # round trip 3 (parallel)
author_ids = sorted({c["authorId"] for cs in comments for c in cs})
for aid in author_ids:  # round trip 4 (parallel)
    get(f"/users/{aid}")
print("REST")
print(f"  requests: {rest_calls}, sequential round trips: 4, bytes received: {rest_bytes}")

# ---- GraphQL: one query, the server resolves the shape ----
query = "{ user(id: 1) { name posts { title comments { text author { name } } } } }"


def parse(src):
    toks = re.findall(r"[A-Za-z_]\\w*|\\d+|[{}():]", src)
    pos = 0

    def selection():
        nonlocal pos
        pos += 1  # {
        fields = []
        while toks[pos] != "}":
            f = {"name": toks[pos], "args": {}, "sub": None}
            pos += 1
            if toks[pos] == "(":
                pos += 1
                while toks[pos] != ")":
                    f["args"][toks[pos]] = int(toks[pos + 2])
                    pos += 3
                pos += 1
            if toks[pos] == "{":
                f["sub"] = selection()
            fields.append(f)
        pos += 1  # }
        return fields

    return selection()


db_calls = 0


def r_user(parents, args):
    global db_calls
    db_calls += 1
    return [next(u for u in USERS if u["id"] == args["id"]) for _ in parents]


def r_posts(parents, args):
    global db_calls
    db_calls += 1
    return [[p for p in POSTS if p["authorId"] == u["id"]] for u in parents]


def r_comments(parents, args):
    global db_calls
    db_calls += 1
    return [[c for c in COMMENTS if c["postId"] == p["id"]] for p in parents]


def r_author(parents, args):
    global db_calls
    db_calls += 1
    return [next(u for u in USERS if u["id"] == c["authorId"]) for c in parents]


# each takes the LIST of parents, so a batched engine calls it once per level
RESOLVERS = {"user": r_user, "posts": r_posts, "comments": r_comments, "author": r_author}


def execute(fields, parents, batched):
    out = [{} for _ in parents]
    for f in fields:
        r = RESOLVERS.get(f["name"])
        if r is None:
            values = [p[f["name"]] for p in parents]
        elif batched:
            values = r(parents, f["args"])
        else:
            values = [r([p], f["args"])[0] for p in parents]  # one call per parent: N+1
        if f["sub"]:
            flat = [x for v in values for x in (v if isinstance(v, list) else [v])]
            done = iter(execute(f["sub"], flat, batched))
            values = [[next(done) for _ in v] if isinstance(v, list) else next(done) for v in values]
        for o, v in zip(out, values):
            o[f["name"]] = v
    return out


ast = parse(query)
for batched in [False, True]:
    db_calls = 0
    body = dumps({"data": execute(ast, [{}], batched)[0]})
    print(f"GraphQL, {'batched resolvers (DataLoader style)' if batched else 'naive resolvers'}")
    print(f"  requests: 1, round trips: 1, bytes received: {len(body)}, db calls on server: {db_calls}")
    if batched:
        print(f"  response: {body}")` },
        ],
      },
    ],
  },
];

export default augments;
