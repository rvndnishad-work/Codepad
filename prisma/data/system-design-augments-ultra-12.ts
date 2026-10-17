/**
 * SYSTEM DESIGN ULTRA — batch 12: Observability. Every example was run by
 * scripts/verify-variant-examples.ts (node, python, go, java); quoted output is that run's output.
 */
import type { SystemDesignUltraAugment } from "./system-design-augments.types";

const augments: SystemDesignUltraAugment[] = [
  {
    title: `What are the three pillars of observability?`,
    difficulty: "medium",
    seoDescription: `Metrics, logs and traces explained on one simulated incident: what each signal answers, how they link by trace ID, what each costs, and what lies beyond.`,
    description: `**Question presented to candidate:**
"People talk about the three pillars of observability. What are they, what is each one good and bad at, and how would you use them together when checkout starts failing in production?"

**What a strong answer should cover:**
- **Metrics**: cheap numeric time series aggregated over labels; best for dashboards and **alerting**, weak at explaining one request; label **cardinality** limits the detail they can carry
- **Logs**: timestamped event records, ideally **structured** (key=value or JSON); best for the **why** of one event; expensive in volume, so levels, sampling and retention matter
- **Traces**: one request across services as a tree of **spans** sharing a **trace ID**; best for **where** time or errors happen; usually **sampled**
- **Correlation** is the point: the same trace ID in spans and logs, exemplars from metric buckets to traces, shared resource attributes (service, version) so you can pivot from an alert to a trace to its logs
- Monitoring vs observability: known questions vs new questions without shipping new code; **OpenTelemetry** as the vendor-neutral way to produce all three
- Beyond the pillars: continuous **profiles** (an OpenTelemetry signal in Alpha since March 2026), wide structured events, and SLOs as the thing the signals serve

**Code / implementation expected:** Optional — explaining a real investigation flow matters more; the example walks one simulated incident through all three signals.`,
    answer: `**Target Audience:** Beginners who have seen a dashboard or grepped a log file and want to understand what observability means, and candidates who need crisp vocabulary for an interview.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). The history of the "three pillars" phrase is from CrowdStrike's "Observability (Re)defined" article; the profiles signal status from the OpenTelemetry documentation and ClickHouse's write-up of the Alpha announcement.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. Every number comes from running the example; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

You are driving and a red warning light comes on. That light is a **metric**: one number (engine temperature) crossed a line. It tells you **that** something is wrong and **when** it started, but not why.

You pull over and plug a reader into the car. It prints the event log: "07:42:13 coolant sensor B reading 0, fan relay open circuit". That is a **log**: a detailed record of something specific that happened, with the clue you needed.

Now imagine the problem is not in your car but in a delivery that went through six warehouses and arrived three days late. Neither the warning light of one truck nor the log of one warehouse tells you which leg was slow. You need the **parcel tracking history**: every hop, when it arrived and when it left. That is a **trace**.

Modern software is the delivery network, not the single car: a click on "Pay" crosses a gateway, a checkout service, a payment service and a database. Observability is having all three kinds of evidence, linked together, so that when something goes wrong you can go from "the red light is on" to "this query, in this version, for this kind of card" in minutes.

## 2. Monitoring vs Observability

📌 **Interview term: monitoring** — watching for failures you predicted: you decided in advance which numbers to collect and which thresholds to alert on.

📌 **Interview term: observability** — how well you can understand the internal state of a system from the signals it emits, including asking **new** questions you did not plan for, without shipping new code. The term comes from control theory.

Monitoring answers "is the thing I worried about happening?". Observability answers "what is happening?", which matters because in distributed systems most incidents are failures nobody predicted.

📌 **Interview term: telemetry** — the data a system emits about itself: metrics, logs, traces and more. Each kind is called a **signal**.

## 3. The Three Signals

<svg class="iq-diagram" width="100%" viewBox="0 0 760 230" role="img" aria-label="Three boxes: metrics answer what and when, traces answer where, logs answer why">
  <rect class="d-box-accent" x="30" y="40" width="210" height="150" rx="10"/>
  <text class="d-text" x="135" y="80" text-anchor="middle">Metrics</text>
  <text class="d-sub" x="135" y="112" text-anchor="middle">numbers over time</text>
  <text class="d-sub" x="135" y="138" text-anchor="middle">cheap, aggregated</text>
  <text class="d-accent" x="135" y="168" text-anchor="middle">what and when</text>
  <rect class="d-box" x="275" y="40" width="210" height="150" rx="10"/>
  <text class="d-text" x="380" y="80" text-anchor="middle">Traces</text>
  <text class="d-sub" x="380" y="112" text-anchor="middle">one request, all hops</text>
  <text class="d-sub" x="380" y="138" text-anchor="middle">sampled</text>
  <text class="d-accent" x="380" y="168" text-anchor="middle">where</text>
  <rect class="d-box" x="520" y="40" width="210" height="150" rx="10"/>
  <text class="d-text" x="625" y="80" text-anchor="middle">Logs</text>
  <text class="d-sub" x="625" y="112" text-anchor="middle">one event, full detail</text>
  <text class="d-sub" x="625" y="138" text-anchor="middle">high volume</text>
  <text class="d-accent" x="625" y="168" text-anchor="middle">why</text>
</svg>

### Metrics

A metric is a number measured repeatedly over time: requests per second, error count, CPU usage, request duration. Each metric has **labels** (also called dimensions or attributes), such as \`service="checkout"\` and \`status="500"\`, and every distinct combination of labels is its own **time series**.

📌 **Interview term: time series** — a sequence of (timestamp, value) points for one metric name and one exact set of label values.

📌 **Interview term: counter, gauge, histogram** — the three basic metric types. A **counter** only goes up (requests served); you graph its rate. A **gauge** goes up and down (queue length, memory). A **histogram** counts observations into buckets (requests that took at most 50 ms, at most 100 ms, ...), so you can estimate percentiles like p99 later.

Metrics are cheap because they are **aggregated**: a million requests become one counter increment each, stored as a few numbers per scrape. That makes them ideal for dashboards and alerts. The price is that the individual request is gone.

📌 **Interview term: cardinality** — the number of distinct time series a metric produces, which is the product of the number of values of each label. A \`user_id\` label turns one series into millions, which is why metrics cannot carry per-request detail. The arithmetic is in [How would you design a metrics monitoring and alerting system?](/interview-question/how-would-you-design-a-metrics-monitoring-and-alerting-syste-572r).

### Logs

A log is a timestamped record of one event, written by the code: "payment failed", "db timeout after 1000ms". They carry the most detail of any signal, including error messages and parameters.

📌 **Interview term: structured logging** — writing logs as key-value pairs or JSON (\`level=ERROR service=payments card_type=amex\`) instead of free text, so a machine can filter and group them without fragile text parsing.

Logs are the most expensive signal per request, because every event is stored in full. Teams control the cost with log levels, sampling of noisy success logs, and short retention.

### Traces

A trace follows one request through every service it touches. Each unit of work (an HTTP handler, a database query, a call to another service) is a **span** with a start time, a duration, a status and attributes. Spans point to their parent, so together they form a tree.

📌 **Interview term: span** — one timed operation inside a trace, with a name, start and end time, status, attributes and a parent span ID.

📌 **Interview term: trace ID** — a random 16-byte identifier shared by every span of one request. Services pass it along in a header (the W3C \`traceparent\` header) so the spans can be joined. How that works across 200 services is the subject of [How would you design OpenTelemetry tracing for 200 microservices?](/interview-question/how-would-you-design-opentelemetry-tracing-for-200-microservices).

Traces show **where** the time and errors are: the waterfall view makes the slow hop obvious. Because they are expensive, most systems keep only a sample, which brings its own trade-offs: [Head vs tail sampling in OpenTelemetry — when does each break?](/interview-question/head-vs-tail-sampling-in-opentelemetry-when-does-each-break).

## 4. One Incident, All Three Signals

The example simulates 12 minutes of checkout traffic, 100 requests per minute. At minute 6 a new version (\`v2\`) of the payments service ships; for American Express cards it runs a slow database query that sometimes hits the 1,000 ms timeout. Each request emits a histogram observation, four spans and one or two log lines.

**Step 1: the metric fires.** The dashboard has labels \`service\`, \`route\` and \`status\`, nothing more:

~~~text
== METRICS: the dashboard (labels: service, route, status) ==
minute  requests  errors  error%  p99 bucket
     0       100       0    0.0%  <= 100 ms
     1       100       0    0.0%  <= 100 ms
     2       100       0    0.0%  <= 100 ms
     3       100       0    0.0%  <= 100 ms
     4       100       0    0.0%  <= 100 ms
     5       100       0    0.0%  <= 100 ms
     6       100      14   14.0%  <= 2500 ms
     7       100      10   10.0%  <= 2500 ms
     8       100       5    5.0%  <= 2500 ms
     9       100       6    6.0%  <= 2500 ms
    10       100      10   10.0%  <= 2500 ms
    11       100       5    5.0%  <= 2500 ms
ALERT CheckoutErrorRate (error% > 2 for 2 minutes) fired at end of minute 7
The metric says WHAT and WHEN. It cannot say which request or why.
~~~

The alert fires at the end of minute 7, two minutes after the deploy. The metric is good at **what** (errors and p99 jumped) and **when** (minute 6), and that is all.

**Step 2: a trace shows where.** Pick one failed trace:

~~~text
== TRACES: where did the time go? ==
error traces: 50 of 1200
waterfall for trace 4bf92f3577b34da6000000000000025e (1047 ms):
  gateway POST /pay    start +0 ms   1047 ms  100% of request
  checkout placeOrder  start +1 ms   1040 ms   99% of request
  payments charge      start +2 ms   1022 ms   98% of request
  payments db.query    start +3 ms   1000 ms   96% of request
slowest leaf span: payments db.query = 1000 ms (96% of the request)
~~~

The waterfall shows that 96% of the 1,047 ms request was a single database query in the payments service. Without a trace, the checkout team would see their own service as slow (1,040 ms) and might start debugging the wrong code.

**Step 3: the logs for that trace ID say why.**

~~~text
== LOGS: why? (filter by the trace_id from the trace) ==
  00:06:03 level=ERROR service=payments trace_id=4bf92f3577b34da6000000000000025e msg="db timeout after 1000ms" query=select_card_limits card_type=amex version=v2
  00:06:03 level=ERROR service=checkout trace_id=4bf92f3577b34da6000000000000025e msg="payment failed" status=502
~~~

The payments log line carries the trace ID from the trace, the error, the query name, the card type and the version. Now the cause is a hypothesis you can test.

**Step 4: pivot on attributes the metric did not have.**

~~~text
== PIVOT: slice error traces by attributes the metric does not carry ==
errors by card_type: amex=50 visa=0 mastercard=0
errors by version:   v1=0 v2=50
amex on v2: 114 requests, 50 failed
~~~

All 50 failures are \`amex\` on \`v2\`; 50 of the 114 American Express payments on v2 failed. The fix (roll back v2, or fix the query) is now obvious. Rollback strategies are in [What are blue-green and canary deployments?](/interview-question/what-are-blue-green-and-canary-deployments).

<svg class="iq-diagram" width="100%" viewBox="0 0 780 170" role="img" aria-label="Investigation flow: alert on a metric, then a dashboard slice, then one trace, then its logs, joined by the trace ID">
  <defs>
    <marker id="sd12q1-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box-accent" x="20" y="40" width="150" height="90" rx="10"/>
  <text class="d-text" x="95" y="78" text-anchor="middle">Alert</text>
  <text class="d-sub" x="95" y="104" text-anchor="middle">error rate</text>
  <rect class="d-box" x="220" y="40" width="150" height="90" rx="10"/>
  <text class="d-text" x="295" y="78" text-anchor="middle">Dashboard</text>
  <text class="d-sub" x="295" y="104" text-anchor="middle">when, which route</text>
  <rect class="d-box" x="420" y="40" width="150" height="90" rx="10"/>
  <text class="d-text" x="495" y="78" text-anchor="middle">Trace</text>
  <text class="d-sub" x="495" y="104" text-anchor="middle">slow span</text>
  <rect class="d-box" x="620" y="40" width="150" height="90" rx="10"/>
  <text class="d-text" x="695" y="78" text-anchor="middle">Logs</text>
  <text class="d-sub" x="695" y="104" text-anchor="middle">same trace ID</text>
  <path class="d-edge" d="M 170 85 L 212 85" marker-end="url(#sd12q1-arrow)"/>
  <path class="d-edge" d="M 370 85 L 412 85" marker-end="url(#sd12q1-arrow)"/>
  <path class="d-edge-accent" d="M 570 85 L 612 85" marker-end="url(#sd12q1-arrow)"/>
</svg>

Each step narrows the search, and each hop works only because the signals share identifiers: the same \`service\` and \`version\` attributes everywhere, and the same trace ID in the spans and in the log lines.

## 5. Correlation Is the Real Pillar

Three separate tools with three separate search boxes are not observability; they are three data silos. What makes them work together:

📌 **Interview term: correlation (trace-log correlation)** — putting the active trace ID and span ID into every log line written while handling a request, so a trace view can show its logs and a log line can open its trace. Many logging libraries and OpenTelemetry integrations can add them automatically.

📌 **Interview term: exemplar** — a sample trace ID attached to a metric data point (for example to the histogram bucket that counted a slow request), so a spike on a graph links to a concrete trace that caused it.

📌 **Interview term: resource attributes** — attributes that describe the thing emitting the telemetry (\`service.name\`, \`service.version\`, \`deployment.environment\`, host, pod). When all three signals carry the same ones, "errors went up on version v2" is a filter you can apply everywhere.

📌 **Interview term: OpenTelemetry (OTel)** — the vendor-neutral standard, APIs, SDKs and Collector for producing and shipping traces, metrics and logs, so instrumentation is written once and the backend can change.

## 6. What Each Signal Costs

The example also counts the volume each signal produced for the same 1,200 requests:

~~~text
== VOLUME of each signal for these 12 minutes ==
metrics: 18 series x 4 scrapes/min x 12 min = 864 samples, 13824 bytes at 16 B/sample
logs:    1250 lines, 155578 bytes
traces:  4800 spans, 1920000 bytes at an assumed 400 B/span
metric cost per request: 11.5 B; log cost: 129.6 B; trace cost: 1600 B
~~~

Per request, the metric costs about 11.5 bytes (and that cost does not grow with traffic: the 18 series cost the same at 100 or 100,000 requests per minute), the logs about 130 bytes, and the traces 1,600 bytes at an assumed 400 bytes per span. That ordering is typical, and it explains the usual design:

| Signal | Answers | Volume grows with | Typical retention | Usual cost control |
| :--- | :--- | :--- | :--- | :--- |
| Metrics | What, when, how much | Number of series (labels), not traffic | Months to a year, downsampled | Limit label cardinality |
| Logs | Why, for one event | Traffic and verbosity | Days to weeks hot, archive cold | Levels, drop or sample success logs |
| Traces | Where, across services | Traffic times spans per request | Days | Head or tail sampling |

The numbers 16 B/sample and 400 B/span are assumptions for illustration: real metric storage compresses far below 16 bytes, and span size depends on attributes.

## 7. Beyond the Three Pillars

- **Where the phrase comes from.** CrowdStrike's history of the term traces the idea to a 2017 Peter Bourgon blog post drawing metrics, logs and traces as a Venn diagram, and its popularisation to Cindy Sridharan's 2018 O'Reilly book *Distributed Systems Observability*.
- **The critique.** The same article notes that in September 2018 Charity Majors argued that "three pillars" limits the discussion: what matters is being able to ask arbitrary questions, often of **wide structured events** (one rich record per request with dozens of fields), from which metrics and traces can be derived.
- **Profiles.** Continuous profiling (which functions use CPU and memory, sampled all the time in production) is often called the fourth signal. The OpenTelemetry documentation lists profiles with status Alpha, and ClickHouse's write-up dates the public Alpha to March 2026, with Collector support from v0.148.0 and a recommendation not to rely on it for critical production workloads yet.
- **SLOs.** Signals are the means; **service level objectives** are the end. A good alert is defined on a user-facing SLI (success rate, latency) rather than on CPU. See [What latency numbers and availability targets should every engineer know?](/interview-question/what-latency-numbers-and-availability-targets-should-every-engineer-know).

📌 **Interview term: profile (continuous profiling)** — sampled stack traces showing where a program spends CPU time or allocates memory, collected continuously in production.

📌 **Interview term: SLI / SLO** — a service level indicator is a measured ratio of good events (requests under 300 ms and not 5xx); the objective is its target over a window (99.9% over 30 days).

## 8. Verified: Running the Code

The example **"One incident through all three pillars: a metric alert, a trace waterfall, the matching logs, and the cost of each signal"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
== METRICS: the dashboard (labels: service, route, status) ==
minute  requests  errors  error%  p99 bucket
     0       100       0    0.0%  <= 100 ms
     1       100       0    0.0%  <= 100 ms
     2       100       0    0.0%  <= 100 ms
     3       100       0    0.0%  <= 100 ms
     4       100       0    0.0%  <= 100 ms
     5       100       0    0.0%  <= 100 ms
     6       100      14   14.0%  <= 2500 ms
     7       100      10   10.0%  <= 2500 ms
     8       100       5    5.0%  <= 2500 ms
     9       100       6    6.0%  <= 2500 ms
    10       100      10   10.0%  <= 2500 ms
    11       100       5    5.0%  <= 2500 ms
ALERT CheckoutErrorRate (error% > 2 for 2 minutes) fired at end of minute 7
The metric says WHAT and WHEN. It cannot say which request or why.

== TRACES: where did the time go? ==
error traces: 50 of 1200
waterfall for trace 4bf92f3577b34da6000000000000025e (1047 ms):
  gateway POST /pay    start +0 ms   1047 ms  100% of request
  checkout placeOrder  start +1 ms   1040 ms   99% of request
  payments charge      start +2 ms   1022 ms   98% of request
  payments db.query    start +3 ms   1000 ms   96% of request
slowest leaf span: payments db.query = 1000 ms (96% of the request)

== LOGS: why? (filter by the trace_id from the trace) ==
  00:06:03 level=ERROR service=payments trace_id=4bf92f3577b34da6000000000000025e msg="db timeout after 1000ms" query=select_card_limits card_type=amex version=v2
  00:06:03 level=ERROR service=checkout trace_id=4bf92f3577b34da6000000000000025e msg="payment failed" status=502

== PIVOT: slice error traces by attributes the metric does not carry ==
errors by card_type: amex=50 visa=0 mastercard=0
errors by version:   v1=0 v2=50
amex on v2: 114 requests, 50 failed

== VOLUME of each signal for these 12 minutes ==
metrics: 18 series x 4 scrapes/min x 12 min = 864 samples, 13824 bytes at 16 B/sample
logs:    1250 lines, 155578 bytes
traces:  4800 spans, 1920000 bytes at an assumed 400 B/span
metric cost per request: 11.5 B; log cost: 129.6 B; trace cost: 1600 B
~~~

What the simulation stands for and leaves out: a seeded random generator replaces real traffic; the four spans are sequential children with made-up durations; the histogram, the alert rule and the log lines live in memory instead of Prometheus, a log store or a tracing backend. The trace IDs are synthetic (a fixed prefix plus a counter), not random as real ones are. Byte counts for metrics and spans are the stated assumptions, not measured storage.

## Edge Cases Worth Knowing

- **Async work.** A message consumed from a queue minutes later is part of the same user action; the producer must put the trace context in the message headers, or the trace ends at the queue.
- **Sampled traces vs complete metrics.** Never compute error rates from sampled traces without scaling; use metrics for counts and traces for examples.
- **Logs without trace IDs.** Logs written by a background thread or a library that does not see the request context carry no trace ID and cannot be correlated.
- **Clock skew.** Spans from different hosts are timed by different clocks; a child can appear to start before its parent by a few milliseconds.
- **High-cardinality in the wrong place.** \`user_id\` is fine as a span attribute or log field and dangerous as a metric label.

## Common Pitfalls

- **Treating the three as separate tools.** Without a shared trace ID and shared service and version attributes, you cannot pivot between them, and every incident becomes a manual hunt.
- **Alerting on causes instead of symptoms.** Paging on CPU at 80% wakes people for nothing; page on the user-facing SLO and use the other signals to find the cause.
- **Putting request details in metric labels.** \`user_id\`, \`order_id\` or full URLs as labels explode cardinality and memory.
- **Free-text logs.** "Payment failed for user 42 with amex" cannot be grouped by card type; structured fields can.
- **Logging everything at INFO forever.** Log volume is usually the biggest observability bill; drop or sample success logs and keep errors.
- **Computing rates from sampled traces.** A 1% sample shows patterns, not exact counts.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Define:</strong> <span style="color:#f0e2c8;">Observability is being able to ask new questions about a running system from its telemetry, without shipping new code. The three classic signals are <strong style="color:#ffca28;">metrics</strong>, <strong style="color:#ffca28;">logs</strong> and <strong style="color:#ffca28;">traces</strong>.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Metrics:</strong> <span style="color:#f0e2c8;">Numeric time series with labels: cheap, aggregated, great for dashboards and <strong style="color:#ffca28;">alerts</strong>. They say what and when, not why, and label <strong style="color:#ffca28;">cardinality</strong> limits their detail.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Logs and traces:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Structured logs</strong> give the full detail of one event: the why. <strong style="color:#ffca28;">Traces</strong> follow one request across services as a tree of <strong style="color:#ffca28;">spans</strong> sharing a trace ID: the where.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Together:</strong> <span style="color:#f0e2c8;">Correlation is what makes them useful: the trace ID in every log line, <strong style="color:#ffca28;">exemplars</strong> on metric buckets, shared <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">service.version</code> attributes. Flow: alert, dashboard slice, one trace, its logs. In my simulation that went from an error spike to amex cards on payments v2 in four steps.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Cost and beyond:</strong> <span style="color:#f0e2c8;">Per request, metrics are cheapest, then logs, then traces, so traces are sampled and logs levelled. OpenTelemetry produces all three vendor-neutrally; profiles are the emerging fourth signal (Alpha in OTel since March 2026), and SLOs decide what to alert on.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not put <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">user_id</code> on the error metric?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every label value is a new time series. With 100,000 users one metric becomes 100,000 series, each with its own memory and index entries. Put <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">user_id</code> on spans and logs, where it is one field per event.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">If I have good logs, why do I need traces?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Logs are per service. In a request crossing ten services you would have to stitch ten log streams by time and guess which lines belong together. A trace records the parent-child timing directly, so the slow hop is visible in one view.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can I derive metrics from logs or traces?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Yes, and many systems do (counting log lines, span metrics from traces). It works if you have all the events; from sampled traces you must scale by the sampling rate, and computing them from raw logs is far more expensive than incrementing a counter in the process.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What is the difference between monitoring and observability?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Monitoring checks for failures you predicted with fixed dashboards and thresholds. Observability lets you investigate failures you did not predict by slicing rich telemetry by any attribute. You need monitoring for alerts; observability is what you use after the page.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do you alert on?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">User-facing symptoms tied to SLOs, such as success rate and latency, using burn-rate alerts. Causes like CPU or queue depth go on dashboards, not pagers, unless they reliably predict user impact.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Monitoring | Watching predicted failure modes with fixed metrics and thresholds |
| Observability | Understanding internal state from telemetry, including new questions |
| Telemetry / signal | Data a system emits about itself; each kind is a signal |
| Time series | Timestamped values for one metric name and label set |
| Counter, gauge, histogram | Only-up count; up-and-down value; bucketed distribution |
| Cardinality | Number of distinct series a metric produces |
| Structured logging | Logs as key-value or JSON fields |
| Span | One timed operation inside a trace |
| Trace ID | 16-byte ID shared by every span of one request |
| Correlation | Trace and span IDs in log lines so signals link |
| Exemplar | A trace ID attached to a metric data point |
| Resource attributes | Attributes describing the emitter (service, version, host) |
| OpenTelemetry | Vendor-neutral standard and tooling for telemetry |
| Profile | Continuous sampled stack traces of CPU or memory use |
| SLI / SLO | Measured good-event ratio / its target over a window |

**Conclusion:** Metrics, logs and traces each answer a different question: metrics tell you that something is wrong and when, traces tell you where in a chain of services, and logs tell you why for one specific event. None is enough alone, and three disconnected tools are not much better; the value comes from correlation through shared trace IDs and attributes, which turned an error spike into "amex cards on payments v2" in the simulated incident. Because their cost per request differs by orders of magnitude, metrics are kept long and cheap, logs are levelled, and traces are sampled. OpenTelemetry is the common way to produce all three, profiles are joining them, and SLOs decide which of the signals should wake someone up.`,
    examples: [
      {
        label: `One incident through all three pillars: a metric alert, a trace waterfall, the matching logs, and the cost of each signal`,
        variants: [
          { tech: "node", code: `// Three pillars on one incident: metrics say WHAT, traces say WHERE, logs say WHY.
// 12 simulated minutes, 100 checkout requests per minute; payments v2 ships at minute 6.
let seed = 42;
function rand() { seed = (seed * 48271) % 2147483647; return seed / 2147483647; }
const BUCKETS = [50, 100, 250, 500, 1000, 2500];
const pad = (n, w) => String(n).padStart(w, " ");
const clock = (m, s) => \`00:\${String(m).padStart(2, "0")}:\${String(s).padStart(2, "0")}\`;

const traces = [], logs = [], perMin = [];
for (let m = 0; m < 12; m++) perMin.push({ n: 0, err: 0, hist: BUCKETS.map(() => 0) });
for (let i = 0; i < 1200; i++) {
  const minute = Math.floor(i / 100), sec = Math.floor(((i % 100) * 6) / 10);
  const traceId = "4bf92f3577b34da6" + (i + 1).toString(16).padStart(16, "0");
  const card = rand() < 0.2 ? "amex" : rand() < 0.5 ? "visa" : "mastercard";
  const version = minute >= 6 ? "v2" : "v1";
  const gw = 3 + Math.floor(rand() * 5), co = 10 + Math.floor(rand() * 10), pay = 15 + Math.floor(rand() * 10);
  let db = 8 + Math.floor(rand() * 8), error = false;
  if (version === "v2" && card === "amex") { db = 700 + Math.floor(rand() * 600); if (db > 1000) { db = 1000; error = true; } }
  const spans = [
    { name: "gateway POST /pay", start: 0, dur: gw + co + pay + db },
    { name: "checkout placeOrder", start: 1, dur: co + pay + db },
    { name: "payments charge", start: 2, dur: pay + db },
    { name: "payments db.query", start: 3, dur: db },
  ];
  traces.push({ traceId, card, version, error, total: spans[0].dur, spans });
  const pm = perMin[minute]; pm.n++; if (error) pm.err++;
  pm.hist[BUCKETS.findIndex((b) => spans[0].dur <= b)]++;
  const at = clock(minute, sec);
  if (error) {
    logs.push(\`\${at} level=ERROR service=payments trace_id=\${traceId} msg="db timeout after 1000ms" query=select_card_limits card_type=\${card} version=\${version}\`);
    logs.push(\`\${at} level=ERROR service=checkout trace_id=\${traceId} msg="payment failed" status=502\`);
  } else {
    logs.push(\`\${at} level=INFO service=payments trace_id=\${traceId} msg="charge ok" card_type=\${card} version=\${version}\`);
  }
}

console.log("== METRICS: the dashboard (labels: service, route, status) ==");
console.log("minute  requests  errors  error%  p99 bucket");
let breached = 0, fired = -1;
perMin.forEach((pm, m) => {
  const need = Math.ceil(pm.n * 0.99); let cum = 0, p99 = 0;
  for (let b = 0; b < BUCKETS.length; b++) { cum += pm.hist[b]; if (cum >= need) { p99 = BUCKETS[b]; break; } }
  const rate = (pm.err * 100) / pm.n;
  console.log(\`\${pad(m, 6)}  \${pad(pm.n, 8)}  \${pad(pm.err, 6)}  \${pad(rate.toFixed(1), 5)}%  <= \${p99} ms\`);
  breached = rate > 2 ? breached + 1 : 0;
  if (breached === 2 && fired < 0) fired = m;
});
console.log(\`ALERT CheckoutErrorRate (error% > 2 for 2 minutes) fired at end of minute \${fired}\`);
console.log("The metric says WHAT and WHEN. It cannot say which request or why.");

console.log("\\n== TRACES: where did the time go? ==");
const bad = traces.filter((t) => t.error);
console.log(\`error traces: \${bad.length} of \${traces.length}\`);
const t0 = bad[0];
console.log(\`waterfall for trace \${t0.traceId} (\${t0.total} ms):\`);
for (const s of t0.spans) {
  const share = Math.round((s.dur * 100) / t0.total);
  console.log(\`  \${s.name.padEnd(20)} start +\${s.start} ms  \${pad(s.dur, 5)} ms  \${pad(share, 3)}% of request\`);
}
const self = t0.spans[3].dur;
console.log(\`slowest leaf span: payments db.query = \${self} ms (\${Math.round((self * 100) / t0.total)}% of the request)\`);

console.log("\\n== LOGS: why? (filter by the trace_id from the trace) ==");
for (const line of logs.filter((l) => l.includes(t0.traceId))) console.log("  " + line);

console.log("\\n== PIVOT: slice error traces by attributes the metric does not carry ==");
const byCard = {}, byVer = {};
for (const t of bad) { byCard[t.card] = (byCard[t.card] || 0) + 1; byVer[t.version] = (byVer[t.version] || 0) + 1; }
console.log("errors by card_type:", ["amex", "visa", "mastercard"].map((c) => \`\${c}=\${byCard[c] || 0}\`).join(" "));
console.log("errors by version:  ", ["v1", "v2"].map((v) => \`\${v}=\${byVer[v] || 0}\`).join(" "));
const amexV2 = traces.filter((t) => t.card === "amex" && t.version === "v2");
console.log(\`amex on v2: \${amexV2.length} requests, \${amexV2.filter((t) => t.error).length} failed\`);

console.log("\\n== VOLUME of each signal for these 12 minutes ==");
const series = 2 * (BUCKETS.length + 1 + 2), samples = series * 4 * 12;
const logBytes = logs.reduce((a, l) => a + l.length + 1, 0), spanCount = traces.length * 4;
console.log(\`metrics: \${series} series x 4 scrapes/min x 12 min = \${samples} samples, \${samples * 16} bytes at 16 B/sample\`);
console.log(\`logs:    \${logs.length} lines, \${logBytes} bytes\`);
console.log(\`traces:  \${spanCount} spans, \${spanCount * 400} bytes at an assumed 400 B/span\`);
console.log(\`metric cost per request: \${((samples * 16) / traces.length).toFixed(1)} B; log cost: \${(logBytes / traces.length).toFixed(1)} B; trace cost: \${(spanCount * 400) / traces.length} B\`);` },
          { tech: "python", code: `# Three pillars on one incident: metrics say WHAT, traces say WHERE, logs say WHY.
# 12 simulated minutes, 100 checkout requests per minute; payments v2 ships at minute 6.
import math

seed = 42


def rand():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647


BUCKETS = [50, 100, 250, 500, 1000, 2500]


def pad(n, w):
    return str(n).rjust(w)


def clock(m, s):
    return f"00:{m:02d}:{s:02d}"


traces, logs = [], []
per_min = [{"n": 0, "err": 0, "hist": [0] * len(BUCKETS)} for _ in range(12)]
for i in range(1200):
    minute, sec = i // 100, ((i % 100) * 6) // 10
    trace_id = "4bf92f3577b34da6" + format(i + 1, "016x")
    card = "amex" if rand() < 0.2 else ("visa" if rand() < 0.5 else "mastercard")
    version = "v2" if minute >= 6 else "v1"
    gw, co, pay = 3 + math.floor(rand() * 5), 10 + math.floor(rand() * 10), 15 + math.floor(rand() * 10)
    db, error = 8 + math.floor(rand() * 8), False
    if version == "v2" and card == "amex":
        db = 700 + math.floor(rand() * 600)
        if db > 1000:
            db, error = 1000, True
    spans = [
        {"name": "gateway POST /pay", "start": 0, "dur": gw + co + pay + db},
        {"name": "checkout placeOrder", "start": 1, "dur": co + pay + db},
        {"name": "payments charge", "start": 2, "dur": pay + db},
        {"name": "payments db.query", "start": 3, "dur": db},
    ]
    traces.append({"traceId": trace_id, "card": card, "version": version, "error": error, "total": spans[0]["dur"], "spans": spans})
    pm = per_min[minute]
    pm["n"] += 1
    if error:
        pm["err"] += 1
    pm["hist"][next(b for b in range(len(BUCKETS)) if spans[0]["dur"] <= BUCKETS[b])] += 1
    at = clock(minute, sec)
    if error:
        logs.append(f'{at} level=ERROR service=payments trace_id={trace_id} msg="db timeout after 1000ms" query=select_card_limits card_type={card} version={version}')
        logs.append(f'{at} level=ERROR service=checkout trace_id={trace_id} msg="payment failed" status=502')
    else:
        logs.append(f'{at} level=INFO service=payments trace_id={trace_id} msg="charge ok" card_type={card} version={version}')

print("== METRICS: the dashboard (labels: service, route, status) ==")
print("minute  requests  errors  error%  p99 bucket")
breached, fired = 0, -1
for m, pm in enumerate(per_min):
    need, cum, p99 = math.ceil(pm["n"] * 0.99), 0, 0
    for b in range(len(BUCKETS)):
        cum += pm["hist"][b]
        if cum >= need:
            p99 = BUCKETS[b]
            break
    rate = pm["err"] * 100 / pm["n"]
    print(f"{pad(m, 6)}  {pad(pm['n'], 8)}  {pad(pm['err'], 6)}  {pad(f'{rate:.1f}', 5)}%  <= {p99} ms")
    breached = breached + 1 if rate > 2 else 0
    if breached == 2 and fired < 0:
        fired = m
print(f"ALERT CheckoutErrorRate (error% > 2 for 2 minutes) fired at end of minute {fired}")
print("The metric says WHAT and WHEN. It cannot say which request or why.")

print("\\n== TRACES: where did the time go? ==")
bad = [t for t in traces if t["error"]]
print(f"error traces: {len(bad)} of {len(traces)}")
t0 = bad[0]
print(f"waterfall for trace {t0['traceId']} ({t0['total']} ms):")
for s in t0["spans"]:
    share = round(s["dur"] * 100 / t0["total"])
    print(f"  {s['name'].ljust(20)} start +{s['start']} ms  {pad(s['dur'], 5)} ms  {pad(share, 3)}% of request")
leaf = t0["spans"][3]["dur"]
print(f"slowest leaf span: payments db.query = {leaf} ms ({round(leaf * 100 / t0['total'])}% of the request)")

print("\\n== LOGS: why? (filter by the trace_id from the trace) ==")
for line in [l for l in logs if t0["traceId"] in l]:
    print("  " + line)

print("\\n== PIVOT: slice error traces by attributes the metric does not carry ==")
by_card, by_ver = {}, {}
for t in bad:
    by_card[t["card"]] = by_card.get(t["card"], 0) + 1
    by_ver[t["version"]] = by_ver.get(t["version"], 0) + 1
print("errors by card_type:", " ".join(f"{c}={by_card.get(c, 0)}" for c in ["amex", "visa", "mastercard"]))
print("errors by version:  ", " ".join(f"{v}={by_ver.get(v, 0)}" for v in ["v1", "v2"]))
amex_v2 = [t for t in traces if t["card"] == "amex" and t["version"] == "v2"]
print(f"amex on v2: {len(amex_v2)} requests, {len([t for t in amex_v2 if t['error']])} failed")

print("\\n== VOLUME of each signal for these 12 minutes ==")
series = 2 * (len(BUCKETS) + 1 + 2)
samples = series * 4 * 12
log_bytes = sum(len(l) + 1 for l in logs)
span_count = len(traces) * 4
print(f"metrics: {series} series x 4 scrapes/min x 12 min = {samples} samples, {samples * 16} bytes at 16 B/sample")
print(f"logs:    {len(logs)} lines, {log_bytes} bytes")
print(f"traces:  {span_count} spans, {span_count * 400} bytes at an assumed 400 B/span")
print(f"metric cost per request: {samples * 16 / len(traces):.1f} B; log cost: {log_bytes / len(traces):.1f} B; trace cost: {span_count * 400 // len(traces)} B")` },
        ],
      },
    ],
  },
  {
    title: `How would you design OpenTelemetry tracing for 200 microservices?`,
    difficulty: "medium",
    seoDescription: `Design OpenTelemetry tracing for 200 services: W3C traceparent propagation, a two-tier Collector, trace-ID routing, sampling, capacity math and rollout.`,
    description: `**Question presented to candidate:**
"We run about 200 microservices in several languages on Kubernetes, and when a request is slow nobody can tell which service is at fault. Design distributed tracing for us with OpenTelemetry: how the data is produced, how it travels, how much of it we keep and how we roll it out."

**What a strong answer should cover:**
- **Context propagation**: the W3C \`traceparent\` header (version, 16-byte trace ID, 8-byte parent span ID, flags), carried over HTTP, gRPC **and message headers**; what happens when a hop drops it
- Instrumentation: OpenTelemetry SDKs plus **auto-instrumentation** for common libraries, a thin shared wrapper for conventions (\`service.name\`, \`service.version\`, semantic conventions), manual spans only where they add value
- Pipeline: SDK exports **OTLP** to a local **agent Collector**, which forwards to a **gateway Collector** tier; the **loadbalancing exporter** routes by trace ID so tail sampling sees whole traces
- A worked **capacity estimate** (spans per second, bytes, storage per sampling rate, number of collectors)
- **Sampling** policy (head for volume, tail for errors and slow requests) and its failure modes
- Rollout and operations: start at the edge and the most critical paths, measure propagation coverage, protect apps with bounded queues so tracing never takes production down

**Clarifying questions expected:**
- What traffic volume, and how many services does a typical request touch?
- Which languages and frameworks, and are there async paths (Kafka, queues, cron)?
- Build or buy the backend, and what retention and budget?

**Code / implementation expected:** Optional — the example builds and parses \`traceparent\`, shows a header-dropping proxy splitting a trace, and runs the capacity and routing arithmetic.`,
    answer: `**Target Audience:** Engineers who know what a trace is (see the pillars doc) and want to design tracing for a real, polyglot microservice fleet, and candidates preparing for an observability design round.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Header format from the W3C Trace Context Recommendation; Collector component behaviour from the loadbalancing exporter README on pkg.go.dev and Grafana Alloy documentation of the tail sampling processor; OTLP ports and the Operator injection mechanism from OpenTelemetry-focused guides (Honeycomb docs, OneUptime articles), which you should check against the version you deploy.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. Every number comes from running the example; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

A hospital patient sees a receptionist, a nurse, a lab, a radiologist and two doctors. Each department keeps excellent notes. The patient waited six hours in total, and every department insists its part took twenty minutes.

The fix is a **wristband with a barcode**. Every department scans it when the patient arrives and leaves. Now one report shows the whole visit: the lab result sat in an outbox for four hours. No department was lying; the delay lived **between** them.

Distributed tracing is that wristband for requests. The barcode is the **trace ID**, every department scan is a **span**, and the hard part of the design is not the scanner: it is making sure all 200 departments scan the band every time, that the band is passed along even through the pneumatic mail tubes (message queues), and that the hospital can afford to store the reports.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| What is peak request rate, and how many services and spans does a typical request touch? | Spans per second drive every cost: collectors, network, storage |
| Which languages, frameworks and protocols (HTTP, gRPC, Kafka, SQS, cron)? | Decides how much auto-instrumentation covers and where propagation must be added by hand |
| Is there an existing logging or metrics stack, and should traces link to it? | Trace-log correlation and exemplars need shared IDs and attributes from day one |
| Vendor backend or self-hosted (Jaeger, Grafana Tempo, ...)? What retention and budget? | Sets how aggressively to sample and how long to keep traces |
| What must we never lose: errors, slow requests, specific customers? | Defines tail-sampling policies |
| Are there privacy rules (PII in URLs, headers, SQL)? | Attributes must be scrubbed before data leaves the cluster |

## 3. Requirements

**Functional**
- Any request entering the system gets one trace ID, kept across **every** synchronous and asynchronous hop.
- Engineers can search traces by service, operation, status, duration and a few business attributes, and open a waterfall.
- Every error trace and every slow trace (say over 2 s) is kept; ordinary traces are kept as a sample.
- Logs carry the trace ID; metrics dashboards link to example traces.

**Non-functional**
- **Overhead**: tracing must not add noticeable latency or take a service down when the pipeline is slow. Export is asynchronous, batched and bounded.
- **Scale**: hundreds of thousands of spans per second at peak (computed below).
- **Availability**: losing some telemetry during an incident is acceptable; blocking production is not.
- **Vendor neutrality**: instrumentation written once; the backend can change.

## 4. Capacity Estimate

Assumptions (state them out loud; they are not measurements): 20,000 requests per second at peak and 10,000 on average at the edge; a request touches 8 services on average; each service hop produces 3 spans (a server span plus two client or database spans); a span is about 500 bytes on the wire; one gateway Collector replica handles 30,000 spans per second, a number you would replace with your own load test.

~~~text
== 4. Capacity for 200 services (assumptions in, arithmetic out) ==
  peak spans/s = 20000 req/s x 8 services x 3 spans = 480000
  peak ingest = 240 MB/s at 500 B/span
  spans/day at average load = 20736000000 -> 10.37 TB/day unsampled
  keep 100%: 72.58 TB for 7 days of retention
  keep  10%: 7.26 TB for 7 days of retention
  keep   1%: 0.73 TB for 7 days of retention
  gateway collectors = ceil(480000 / 30000 x 1.3 headroom) = 21
~~~

Half a million spans per second at peak and about 10 TB per day unsampled. Keeping everything for a week would be 72.58 TB; keeping 10% is 7.26 TB. This is why sampling is part of the design, not an optimisation for later. The method is the one in [How do you approach back-of-the-envelope capacity estimation?](/interview-question/how-do-you-approach-back-of-the-envelope-capacity-estimation).

## 5. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 860 210" role="img" aria-label="Pipeline: services with the OpenTelemetry SDK send OTLP to an agent collector on each node, which routes by trace ID to gateway collectors that tail sample, then to the trace backend">
  <defs>
    <marker id="sd12q2-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="50" width="140" height="100" rx="10"/>
  <text class="d-text" x="90" y="88" text-anchor="middle">Service</text>
  <text class="d-sub" x="90" y="112" text-anchor="middle">OTel SDK</text>
  <text class="d-sub" x="90" y="132" text-anchor="middle">batch, bounded</text>
  <rect class="d-box" x="200" y="50" width="140" height="100" rx="10"/>
  <text class="d-text" x="270" y="88" text-anchor="middle">Agent</text>
  <text class="d-sub" x="270" y="112" text-anchor="middle">collector</text>
  <text class="d-sub" x="270" y="132" text-anchor="middle">per node</text>
  <rect class="d-box-accent" x="380" y="50" width="140" height="100" rx="10"/>
  <text class="d-text" x="450" y="88" text-anchor="middle">Route</text>
  <text class="d-sub" x="450" y="112" text-anchor="middle">hash of</text>
  <text class="d-sub" x="450" y="132" text-anchor="middle">trace ID</text>
  <rect class="d-box" x="560" y="50" width="140" height="100" rx="10"/>
  <text class="d-text" x="630" y="88" text-anchor="middle">Gateway</text>
  <text class="d-sub" x="630" y="112" text-anchor="middle">collectors</text>
  <text class="d-sub" x="630" y="132" text-anchor="middle">tail sampling</text>
  <rect class="d-box-muted" x="740" y="50" width="110" height="100" rx="10"/>
  <text class="d-text" x="795" y="88" text-anchor="middle">Backend</text>
  <text class="d-sub" x="795" y="112" text-anchor="middle">store</text>
  <text class="d-sub" x="795" y="132" text-anchor="middle">and query</text>
  <path class="d-edge" d="M 160 100 L 192 100" marker-end="url(#sd12q2-arrow)"/>
  <path class="d-edge" d="M 340 100 L 372 100" marker-end="url(#sd12q2-arrow)"/>
  <path class="d-edge-accent" d="M 520 100 L 552 100" marker-end="url(#sd12q2-arrow)"/>
  <path class="d-edge" d="M 700 100 L 732 100" marker-end="url(#sd12q2-arrow)"/>
</svg>

The route step is the loadbalancing exporter running inside the agent tier; it is drawn separately because it is the piece that makes tail sampling possible.

📌 **Interview term: OpenTelemetry SDK** — the library in each service that creates spans, applies the head sampler, batches finished spans and exports them. Auto-instrumentation packages hook common frameworks (HTTP servers and clients, gRPC, database drivers, Kafka clients) so most spans need no hand-written code.

📌 **Interview term: OTLP** — the OpenTelemetry Protocol for sending telemetry, over gRPC (default port 4317) or HTTP (default port 4318, paths like \`/v1/traces\`).

📌 **Interview term: OpenTelemetry Collector** — a standalone process that receives, processes (batch, filter, scrub attributes, sample) and exports telemetry. Run as an **agent** next to the apps (a DaemonSet or sidecar) and as a **gateway** tier that does the heavy work centrally.

Why two tiers rather than SDKs sending straight to the backend:

- Apps export to a **local** endpoint quickly and forget; retries, buffering and backend credentials live in the Collector, not in 200 codebases.
- Attribute scrubbing (PII), enrichment with Kubernetes metadata and sampling policy change in one place, without redeploying services.
- **Tail sampling** needs all spans of a trace in one process, which only a routed gateway tier can provide (section 8).

The backend stores spans in a columnar or object-storage format with an index from trace ID to location, plus search over a handful of attributes. Options include self-hosted Jaeger or Grafana Tempo and many vendors; the design above does not change with the choice.

## 6. Deep Dive 1: Context Propagation

Tracing is only as good as its weakest hop. Every service must **extract** the incoming context, make its spans children of it, and **inject** it into every outgoing call.

📌 **Interview term: context propagation** — passing the trace ID and the current span ID from one process to the next, in request headers or message metadata, so spans from different services join one trace.

📌 **Interview term: W3C Trace Context (\`traceparent\`)** — the standard header for propagation. Under version \`00\` it has four lowercase-hex fields separated by dashes:

| Field | Size | Meaning |
| :--- | :--- | :--- |
| version | 1 byte (2 hex) | \`00\`; \`ff\` is invalid |
| trace-id | 16 bytes (32 hex) | The whole request; all zeros is invalid |
| parent-id | 8 bytes (16 hex) | The span that made this call; all zeros is invalid |
| trace-flags | 1 byte (2 hex) | Bit 0 is **sampled** (\`01\`) |

A companion header, \`tracestate\`, carries vendor-specific values.

The example creates a root span at the gateway and passes the header through HTTP calls and a Kafka message:

~~~text
== 1. One request across HTTP and a Kafka message ==
  api-gateway      trace=000a4fd2.. span=c6939d3b53ec8fec parent=(root)
  orders           trace=000a4fd2.. span=9ad63075c93b24e3 parent=c6939d3b53ec8fec
  inventory        trace=000a4fd2.. span=d720baad345fd2fc parent=9ad63075c93b24e3
  billing-worker   trace=000a4fd2.. span=a07837ebec380019 parent=9ad63075c93b24e3
  header sent by orders: traceparent: 00-000a4fd29860ce5d359fb5dc3dc474e2-9ad63075c93b24e3-01
  same trace everywhere: true
~~~

All four spans share trace \`000a4fd2...\`; each new span gets its own span ID and records the caller as its parent. The billing worker continued the trace from the **message headers**, which is the step most often forgotten.

The core of it:

~~~js
function startSpan(service, header) {
  const ctx = parse(header);                       // null if missing or invalid
  const span = { service, traceId: ctx ? ctx.traceId : newTraceId(), spanId: newSpanId(), parentId: ctx ? ctx.parentId : null };
  span.outgoing = \`00-\${span.traceId}-\${span.spanId}-01\`;  // inject into the next call
  return span;
}
~~~

Validation matters, because a receiver that cannot parse the header must start a new trace instead of crashing or joining garbage:

~~~text
== 2. Header validation (invalid means: start a new trace) ==
  valid              -> continue trace, sampled=true
  not sampled        -> continue trace, sampled=false
  all-zero trace id  -> rejected, new root span
  uppercase hex      -> rejected, new root span
  version ff         -> rejected, new root span
  missing            -> rejected, new root span
~~~

📌 **Interview term: baggage** — a separate propagated set of key-value pairs (W3C \`baggage\` header) that application code can read downstream, such as a tenant ID. It travels to every downstream service, including third parties, so keep it small and free of secrets.

**Async hops.** For a message queue, the producer injects \`traceparent\` into the message headers and the consumer extracts it. If one message triggers work much later, or one consumer batch handles messages from many traces, a consumer span can use **span links** (references to other traces) instead of a single parent.

📌 **Interview term: span link** — a reference from one span to a span in another (or the same) trace that is related but not its parent, used for batch processing and long-delayed async work.

## 7. Deep Dive 2: Rolling Out to 200 Services

The biggest risk is not throughput; it is **gaps**. One service that does not forward the header splits every trace that passes through it:

~~~text
== 3. A legacy proxy in the middle that drops headers ==
  web              trace=135b0962.. span=22ed8e4af73106c9 parent=(root)
  search           trace=155f15dc.. span=4be65d44922c78cb parent=(root)
  ranking          trace=155f15dc.. span=4f8ca82abb113ca5 parent=4be65d44922c78cb
  one user request became 2 traces; legacy-proxy broke the chain
~~~

The search and ranking spans form their own trace, and the user request looks like two unrelated requests. A practical rollout:

1. **Edge first.** Instrument the API gateway or ingress so every request gets a trace ID, then the top request paths by traffic and revenue.
2. **Auto-instrumentation everywhere.** On Kubernetes, the OpenTelemetry Operator can inject language agents into pods through an admission webhook when the pod template carries an annotation such as \`instrumentation.opentelemetry.io/inject-java\`, which turns hundreds of code changes into configuration.
3. **A thin shared library or config** per language that sets \`service.name\`, \`service.version\`, \`deployment.environment\`, the propagators and the exporter endpoint, so 200 teams do not invent 200 naming schemes.
4. **Semantic conventions.** Use the standard attribute names (for HTTP, \`http.request.method\` and \`http.response.status_code\`) so queries work across services.
5. **Measure coverage.** Count root spans per service that have a non-empty incoming \`traceparent\` from an instrumented caller; a service with many unexpected roots is breaking propagation. Legacy proxies, custom HTTP clients and thread pools that lose context are the usual culprits.

📌 **Interview term: semantic conventions** — the OpenTelemetry-specified names and meanings for common attributes and span names, so data from different services and languages is queryable the same way.

**Protecting production.** The SDK batches spans in a bounded in-memory queue and exports in the background; when the queue is full it drops spans. That is the right trade: losing telemetry during overload is acceptable, blocking a request thread on a tracing backend is not. The same idea is discussed in [What is backpressure and how do you handle it?](/interview-question/what-is-backpressure-and-how-do-you-handle-it).

## 8. Deep Dive 3: Sampling and Routing

At half a million spans per second, you sample. The usual combination:

- **Head sampling in the SDK** with a parent-based, trace-ID-ratio sampler, so the decision is made once at the root and every downstream service follows the \`sampled\` flag.
- **Tail sampling in the gateway tier**: keep every error and slow trace, plus a small share of the rest.

The full trade-off, with numbers, is in [Head vs tail sampling in OpenTelemetry — when does each break?](/interview-question/head-vs-tail-sampling-in-opentelemetry-when-does-each-break). The design consequence here is **routing**: a tail sampler can only judge a trace if it has all its spans, but the spans of one trace come from many pods on many nodes.

📌 **Interview term: loadbalancing exporter** — a Collector exporter that sends each span to a backend Collector chosen by hashing a routing key, normally the trace ID, so all spans of one trace reach the same gateway. It ships in the contrib distribution and discovers gateways through static lists, DNS (for example a headless Kubernetes service) or the Kubernetes API.

~~~text
== 5. Routing spans to tail-sampling collectors ==
  round robin, 4 collectors: an average trace is split over 4.00 collectors
  hash(traceID), 4 collectors: an average trace is split over 1.00 collectors
  scale 4 -> 5 collectors, 20000 in-flight traces change owner:
    hash mod N:        16046 (80.2%)
    consistent ring:   4386 (21.9%)
~~~

With round robin, an average 24-span trace is spread over all 4 collectors, and no collector can decide on it. With hashing, every trace lands on exactly one. When the gateway tier scales from 4 to 5 replicas, hashing modulo N would move 80.2% of in-flight traces to a new owner, while a consistent-hash ring moves 21.9%, close to the ideal 1/5. The exporter README describes the same property (only a fraction of traces move when the backend set changes) and warns that during a topology change the agents' view of the ring can briefly disagree with reality. Traces in flight during a scale event can be split, so scale the gateway tier ahead of load rather than in reaction to it. The ring itself is explained in [What is consistent hashing?](/interview-question/what-is-consistent-hashing).

## 9. What Breaks First at 10x

- **Gateway memory.** Tail sampling holds every trace for the decision wait; at 10x spans per second the buffer grows 10x. Add replicas, shorten the wait, or head-sample harder before the tail tier.
- **Backend ingest and index.** Storage scales with kept spans; indexing many attributes is the expensive part. Index few, store all.
- **Cardinality in derived metrics.** Span-derived metrics (rate, errors, duration per service and operation) are cheap only if span names are low-cardinality: \`GET /users/{id}\`, not \`GET /users/42\`.
- **Agent CPU on busy nodes.** Batch and compress at the agent, and keep heavy processors (tail sampling, regex scrubbing) in the gateway.

## 10. Verified: Running the Code

The example **"W3C traceparent propagation over HTTP and a queue, a header-dropping proxy, capacity for 200 services, and trace-ID routing to collectors"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
== 1. One request across HTTP and a Kafka message ==
  api-gateway      trace=000a4fd2.. span=c6939d3b53ec8fec parent=(root)
  orders           trace=000a4fd2.. span=9ad63075c93b24e3 parent=c6939d3b53ec8fec
  inventory        trace=000a4fd2.. span=d720baad345fd2fc parent=9ad63075c93b24e3
  billing-worker   trace=000a4fd2.. span=a07837ebec380019 parent=9ad63075c93b24e3
  header sent by orders: traceparent: 00-000a4fd29860ce5d359fb5dc3dc474e2-9ad63075c93b24e3-01
  same trace everywhere: true

== 2. Header validation (invalid means: start a new trace) ==
  valid              -> continue trace, sampled=true
  not sampled        -> continue trace, sampled=false
  all-zero trace id  -> rejected, new root span
  uppercase hex      -> rejected, new root span
  version ff         -> rejected, new root span
  missing            -> rejected, new root span

== 3. A legacy proxy in the middle that drops headers ==
  web              trace=135b0962.. span=22ed8e4af73106c9 parent=(root)
  search           trace=155f15dc.. span=4be65d44922c78cb parent=(root)
  ranking          trace=155f15dc.. span=4f8ca82abb113ca5 parent=4be65d44922c78cb
  one user request became 2 traces; legacy-proxy broke the chain

== 4. Capacity for 200 services (assumptions in, arithmetic out) ==
  peak spans/s = 20000 req/s x 8 services x 3 spans = 480000
  peak ingest = 240 MB/s at 500 B/span
  spans/day at average load = 20736000000 -> 10.37 TB/day unsampled
  keep 100%: 72.58 TB for 7 days of retention
  keep  10%: 7.26 TB for 7 days of retention
  keep   1%: 0.73 TB for 7 days of retention
  gateway collectors = ceil(480000 / 30000 x 1.3 headroom) = 21

== 5. Routing spans to tail-sampling collectors ==
  round robin, 4 collectors: an average trace is split over 4.00 collectors
  hash(traceID), 4 collectors: an average trace is split over 1.00 collectors
  scale 4 -> 5 collectors, 20000 in-flight traces change owner:
    hash mod N:        16046 (80.2%)
    consistent ring:   4386 (21.9%)
~~~

What the simulation stands for and leaves out: spans are plain objects and the "network" is passing a string; a real SDK uses the OpenTelemetry API, propagator classes and context objects. IDs come from a seeded generator, not a cryptographically random source. The parser checks the version-00 format strictly and does not implement the spec rules for future versions or \`tracestate\`. The capacity numbers are arithmetic on the stated assumptions. The hash ring uses FNV-1a with a murmur3 finalizer and 100 virtual nodes per collector; the real exporter uses its own hash and ring.

## Edge Cases Worth Knowing

- **Third-party callers sending \`traceparent\`.** Decide whether to trust an incoming sampled flag from outside; many edges start a fresh trace (and link the external one) to stop clients from forcing 100% sampling.
- **Batch consumers.** One Kafka poll may return 500 messages from 500 traces; one parent is wrong, links are right.
- **Long-running workflows.** A trace that lasts hours breaks tail-sampling wait times and UI assumptions; split it into per-step traces joined by links.
- **Clock skew.** Spans are timed by each host clock; small negative gaps between parent and child are normal.
- **PII in attributes.** URLs, SQL text and headers can contain personal data; scrub in the Collector before export.

## Common Pitfalls

- **Instrumenting services but not message headers.** Every trace ends at the queue and async work looks orphaned.
- **Each service sampling independently.** Without parent-based sampling, almost every trace is incomplete.
- **Round-robin load balancing in front of tail sampling.** Spans of one trace land on different collectors and nothing can make a correct decision.
- **High-cardinality span names.** \`GET /orders/8812\` instead of \`GET /orders/{id}\` breaks grouping and span metrics.
- **Synchronous or unbounded export.** A slow backend must cause dropped spans, never slow requests or out-of-memory crashes.
- **No ownership of conventions.** Two hundred teams each choosing \`service.name\` formats and attribute keys makes cross-service queries impossible.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Scope:</strong> <span style="color:#f0e2c8;">I would ask about traffic, fan-out and async paths. With 20,000 req/s, 8 services and 3 spans per hop that is <strong style="color:#ffca28;">480,000 spans/s</strong> and about 10 TB/day unsampled, so sampling is part of the design.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Propagation:</strong> <span style="color:#f0e2c8;">Every hop extracts and injects W3C <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">traceparent</code>: a 16-byte trace ID, the parent span ID and a sampled flag, over HTTP, gRPC <strong style="color:#ffca28;">and message headers</strong>. Missing or invalid headers start a new root, so gaps split traces; I measure coverage.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Instrumentation:</strong> <span style="color:#f0e2c8;">OpenTelemetry SDKs with <strong style="color:#ffca28;">auto-instrumentation</strong>, injected on Kubernetes by the Operator, plus a thin shared config for <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">service.name</code>, version and <strong style="color:#ffca28;">semantic conventions</strong>. Export is async, batched and bounded so tracing never blocks requests.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Pipeline:</strong> <span style="color:#f0e2c8;">SDKs send <strong style="color:#ffca28;">OTLP</strong> to an agent Collector per node; agents use the <strong style="color:#ffca28;">loadbalancing exporter</strong> to route by trace ID to a gateway tier that scrubs PII and <strong style="color:#ffca28;">tail samples</strong>: keep errors, slow traces and a small share of the rest.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Operations:</strong> <span style="color:#f0e2c8;">The gateway is the scaling bottleneck because it buffers traces for the decision wait. Consistent hashing limits reshuffles (21.9% vs 80.2% of in-flight traces moved in my simulation when going from 4 to 5 replicas), and I scale it ahead of peaks.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you trace through Kafka?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The producer injects <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">traceparent</code> into the record headers and the consumer extracts it, creating a consumer span as a child. For batch consumption or very delayed work I use span links to each producing trace instead of a single parent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when one service is not instrumented?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">If it forwards headers untouched, nothing breaks except a missing span. If it drops them, everything below starts a new trace. I find these by looking for services with unexpected root spans and fix them first.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Where do you sample, SDK or Collector?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Both. A parent-based ratio sampler in the SDK limits volume and keeps decisions consistent; tail sampling in the gateway keeps the interesting traces. Tail sampling alone requires shipping 100% of spans to the gateway tier.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop tracing from hurting latency?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Spans are recorded in memory and exported in batches by a background worker to a local agent. The queue is bounded and drops when full, so the worst case is lost telemetry, not slower requests.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do traces connect to logs and metrics?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The logging integration writes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">trace_id</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">span_id</code> into each log line, and span-derived metrics plus exemplars link dashboards to concrete traces, all sharing the same resource attributes.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Context propagation | Passing trace and span IDs between processes |
| W3C Trace Context | Standard \`traceparent\` / \`tracestate\` headers |
| Baggage | Propagated key-value pairs readable downstream |
| Span link | Reference to a related span that is not the parent |
| OpenTelemetry SDK | In-process library that creates, samples and exports spans |
| OTLP | OpenTelemetry Protocol, gRPC 4317 or HTTP 4318 by default |
| OpenTelemetry Collector | Process that receives, processes and exports telemetry |
| Semantic conventions | Standard attribute names and meanings |
| Loadbalancing exporter | Collector exporter routing spans by trace ID to one gateway |

**Conclusion:** Tracing 200 microservices is mostly a propagation and pipeline problem. Every hop, including message queues, must carry the W3C \`traceparent\` header, and auto-instrumentation plus shared conventions are how you get coverage without 200 hand-built integrations. Spans leave each service asynchronously through a local agent Collector, are routed by trace ID to a gateway tier that scrubs and tail-samples them, and land in a backend sized by the sampling rate: at an assumed half a million spans per second, the difference between keeping everything and keeping 10% is 72.58 TB versus 7.26 TB per week. Get propagation complete, keep export bounded, route by trace ID, and the slow hop in any request becomes visible in one waterfall.`,
    examples: [
      {
        label: `W3C traceparent propagation over HTTP and a queue, a header-dropping proxy, capacity for 200 services, and trace-ID routing to collectors`,
        variants: [
          { tech: "node", code: `// W3C traceparent propagation, broken propagation, capacity for 200 services, and trace-ID routing to collectors.
let seed = 7;
function rand() { seed = (seed * 48271) % 2147483647; return seed / 2147483647; }
const hex8 = () => Math.floor(rand() * 4294967296).toString(16).padStart(8, "0");
const newTraceId = () => hex8() + hex8() + hex8() + hex8();
const newSpanId = () => hex8() + hex8();
const RE = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;

function parse(header) {
  const m = RE.exec(header || "");
  if (!m) return null;
  const [, version, traceId, parentId, flags] = m;
  if (version === "ff" || /^0+$/.test(traceId) || /^0+$/.test(parentId)) return null;
  return { traceId, parentId, sampled: (parseInt(flags, 16) & 1) === 1 };
}
// Start a span: continue the incoming context if valid, else start a new trace (a new root).
function startSpan(service, header) {
  const ctx = parse(header);
  const span = { service, traceId: ctx ? ctx.traceId : newTraceId(), spanId: newSpanId(), parentId: ctx ? ctx.parentId : null };
  span.outgoing = \`00-\${span.traceId}-\${span.spanId}-01\`;
  return span;
}
const show = (s) => console.log(\`  \${s.service.padEnd(16)} trace=\${s.traceId.slice(0, 8)}.. span=\${s.spanId} parent=\${s.parentId || "(root)"}\`);

console.log("== 1. One request across HTTP and a Kafka message ==");
const gw = startSpan("api-gateway", null);
const orders = startSpan("orders", gw.outgoing);
const inv = startSpan("inventory", orders.outgoing);
const kafkaHeaders = { traceparent: orders.outgoing }; // producer injects into message headers
const billing = startSpan("billing-worker", kafkaHeaders.traceparent);
[gw, orders, inv, billing].forEach(show);
console.log(\`  header sent by orders: traceparent: \${orders.outgoing}\`);
console.log(\`  same trace everywhere: \${[orders, inv, billing].every((s) => s.traceId === gw.traceId)}\`);

console.log("\\n== 2. Header validation (invalid means: start a new trace) ==");
const tid = gw.traceId;
for (const [label, h] of [["valid", \`00-\${tid}-00f067aa0ba902b7-01\`], ["not sampled", \`00-\${tid}-00f067aa0ba902b7-00\`],
  ["all-zero trace id", \`00-\${"0".repeat(32)}-00f067aa0ba902b7-01\`], ["uppercase hex", \`00-\${tid.toUpperCase()}-00f067aa0ba902b7-01\`],
  ["version ff", \`ff-\${tid}-00f067aa0ba902b7-01\`], ["missing", null]]) {
  const c = parse(h);
  console.log(\`  \${label.padEnd(18)} -> \${c ? \`continue trace, sampled=\${c.sampled}\` : "rejected, new root span"}\`);
}

console.log("\\n== 3. A legacy proxy in the middle that drops headers ==");
const a = startSpan("web", null);
const legacy = { service: "legacy-proxy" }; // not instrumented: forwards the call, not the header
const b = startSpan("search", undefined);
const c2 = startSpan("ranking", b.outgoing);
[a, b, c2].forEach(show);
const ids = new Set([a.traceId, b.traceId, c2.traceId]);
console.log(\`  one user request became \${ids.size} traces; \${legacy.service} broke the chain\`);

console.log("\\n== 4. Capacity for 200 services (assumptions in, arithmetic out) ==");
const peakRps = 20000, avgRps = 10000, hops = 8, spansPerHop = 3, bytesPerSpan = 500, perCollector = 30000;
const peakSpans = peakRps * hops * spansPerHop, avgSpans = avgRps * hops * spansPerHop;
console.log(\`  peak spans/s = \${peakRps} req/s x \${hops} services x \${spansPerHop} spans = \${peakSpans}\`);
console.log(\`  peak ingest = \${(peakSpans * bytesPerSpan) / 1e6} MB/s at \${bytesPerSpan} B/span\`);
const perDayTB = (avgSpans * 86400 * bytesPerSpan) / 1e12;
console.log(\`  spans/day at average load = \${avgSpans * 86400} -> \${perDayTB.toFixed(2)} TB/day unsampled\`);
for (const pct of [100, 10, 1]) console.log(\`  keep \${String(pct).padStart(3)}%: \${((perDayTB * pct * 7) / 100).toFixed(2)} TB for 7 days of retention\`);
const collectors = Math.ceil((peakSpans / perCollector) * 1.3);
console.log(\`  gateway collectors = ceil(\${peakSpans} / \${perCollector} x 1.3 headroom) = \${collectors}\`);

console.log("\\n== 5. Routing spans to tail-sampling collectors ==");
function fnv1a(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0; h ^= h >>> 16; return h >>> 0; } // FNV-1a + murmur3 finalizer
const traceIds = Array.from({ length: 20000 }, newTraceId);
let rr = 0, rrSeen = 0;
for (const t of traceIds.slice(0, 1000)) { const hit = new Set(); for (let s = 0; s < 24; s++) hit.add(rr++ % 4); rrSeen += hit.size; }
console.log(\`  round robin, 4 collectors: an average trace is split over \${(rrSeen / 1000).toFixed(2)} collectors\`);
let hashSeen = 0;
for (const t of traceIds.slice(0, 1000)) { const hit = new Set(); for (let s = 0; s < 24; s++) hit.add(fnv1a(t) % 4); hashSeen += hit.size; }
console.log(\`  hash(traceID), 4 collectors: an average trace is split over \${(hashSeen / 1000).toFixed(2)} collectors\`);
function ring(n) {
  const pts = [];
  for (let k = 0; k < n; k++) for (let v = 0; v < 100; v++) pts.push([fnv1a(\`collector-\${k}#\${v}\`), k]);
  return pts.sort((x, y) => x[0] - y[0]);
}
function lookup(pts, h) { let lo = 0, hi = pts.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (pts[mid][0] < h) lo = mid + 1; else hi = mid; } return pts[lo % pts.length][1]; }
const r4 = ring(4), r5 = ring(5);
let modMoved = 0, ringMoved = 0;
for (const t of traceIds) {
  const h = fnv1a(t);
  if (h % 4 !== h % 5) modMoved++;
  if (lookup(r4, h) !== lookup(r5, h)) ringMoved++;
}
console.log(\`  scale 4 -> 5 collectors, \${traceIds.length} in-flight traces change owner:\`);
console.log(\`    hash mod N:        \${modMoved} (\${((modMoved * 100) / traceIds.length).toFixed(1)}%)\`);
console.log(\`    consistent ring:   \${ringMoved} (\${((ringMoved * 100) / traceIds.length).toFixed(1)}%)\`);` },
          { tech: "python", code: `# W3C traceparent propagation, broken propagation, capacity for 200 services, and trace-ID routing to collectors.
import bisect
import math
import re

seed = 7


def rand():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647


def hex8():
    return format(math.floor(rand() * 4294967296), "08x")


def new_trace_id():
    return hex8() + hex8() + hex8() + hex8()


def new_span_id():
    return hex8() + hex8()


RE = re.compile(r"^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$")


def parse(header):
    m = RE.match(header or "")
    if not m:
        return None
    version, trace_id, parent_id, flags = m.groups()
    if version == "ff" or re.fullmatch("0+", trace_id) or re.fullmatch("0+", parent_id):
        return None
    return {"traceId": trace_id, "parentId": parent_id, "sampled": (int(flags, 16) & 1) == 1}


def start_span(service, header):
    ctx = parse(header)
    span = {"service": service, "traceId": ctx["traceId"] if ctx else new_trace_id(), "spanId": new_span_id(),
            "parentId": ctx["parentId"] if ctx else None}
    span["outgoing"] = f"00-{span['traceId']}-{span['spanId']}-01"
    return span


def show(s):
    print(f"  {s['service'].ljust(16)} trace={s['traceId'][:8]}.. span={s['spanId']} parent={s['parentId'] or '(root)'}")


print("== 1. One request across HTTP and a Kafka message ==")
gw = start_span("api-gateway", None)
orders = start_span("orders", gw["outgoing"])
inv = start_span("inventory", orders["outgoing"])
kafka_headers = {"traceparent": orders["outgoing"]}  # producer injects into message headers
billing = start_span("billing-worker", kafka_headers["traceparent"])
for s in [gw, orders, inv, billing]:
    show(s)
print(f"  header sent by orders: traceparent: {orders['outgoing']}")
print(f"  same trace everywhere: {str(all(s['traceId'] == gw['traceId'] for s in [orders, inv, billing])).lower()}")

print("\\n== 2. Header validation (invalid means: start a new trace) ==")
tid = gw["traceId"]
for label, h in [("valid", f"00-{tid}-00f067aa0ba902b7-01"), ("not sampled", f"00-{tid}-00f067aa0ba902b7-00"),
                 ("all-zero trace id", f"00-{'0' * 32}-00f067aa0ba902b7-01"), ("uppercase hex", f"00-{tid.upper()}-00f067aa0ba902b7-01"),
                 ("version ff", f"ff-{tid}-00f067aa0ba902b7-01"), ("missing", None)]:
    c = parse(h)
    print(f"  {label.ljust(18)} -> {('continue trace, sampled=' + str(c['sampled']).lower()) if c else 'rejected, new root span'}")

print("\\n== 3. A legacy proxy in the middle that drops headers ==")
a = start_span("web", None)
legacy = {"service": "legacy-proxy"}  # not instrumented: forwards the call, not the header
b = start_span("search", None)
c2 = start_span("ranking", b["outgoing"])
for s in [a, b, c2]:
    show(s)
ids = {a["traceId"], b["traceId"], c2["traceId"]}
print(f"  one user request became {len(ids)} traces; {legacy['service']} broke the chain")

print("\\n== 4. Capacity for 200 services (assumptions in, arithmetic out) ==")
peak_rps, avg_rps, hops, spans_per_hop, bytes_per_span, per_collector = 20000, 10000, 8, 3, 500, 30000
peak_spans, avg_spans = peak_rps * hops * spans_per_hop, avg_rps * hops * spans_per_hop
print(f"  peak spans/s = {peak_rps} req/s x {hops} services x {spans_per_hop} spans = {peak_spans}")
print(f"  peak ingest = {peak_spans * bytes_per_span // 10**6} MB/s at {bytes_per_span} B/span")
per_day_tb = avg_spans * 86400 * bytes_per_span / 1e12
print(f"  spans/day at average load = {avg_spans * 86400} -> {per_day_tb:.2f} TB/day unsampled")
for pct in [100, 10, 1]:
    print(f"  keep {str(pct).rjust(3)}%: {per_day_tb * pct * 7 / 100:.2f} TB for 7 days of retention")
collectors = math.ceil(peak_spans / per_collector * 1.3)
print(f"  gateway collectors = ceil({peak_spans} / {per_collector} x 1.3 headroom) = {collectors}")

print("\\n== 5. Routing spans to tail-sampling collectors ==")


def fnv1a(s):  # FNV-1a + murmur3 finalizer
    h = 0x811C9DC5
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    h ^= h >> 16
    h = (h * 0x85EBCA6B) & 0xFFFFFFFF
    h ^= h >> 13
    h = (h * 0xC2B2AE35) & 0xFFFFFFFF
    h ^= h >> 16
    return h


trace_ids = [new_trace_id() for _ in range(20000)]
rr, rr_seen = 0, 0
for t in trace_ids[:1000]:
    hit = set()
    for _ in range(24):
        hit.add(rr % 4)
        rr += 1
    rr_seen += len(hit)
print(f"  round robin, 4 collectors: an average trace is split over {rr_seen / 1000:.2f} collectors")
hash_seen = sum(len({fnv1a(t) % 4 for _ in range(24)}) for t in trace_ids[:1000])
print(f"  hash(traceID), 4 collectors: an average trace is split over {hash_seen / 1000:.2f} collectors")


def ring(n):
    return sorted((fnv1a(f"collector-{k}#{v}"), k) for k in range(n) for v in range(100))


def lookup(pts, keys, h):
    return pts[bisect.bisect_left(keys, h) % len(pts)][1]


r4, r5 = ring(4), ring(5)
k4, k5 = [p[0] for p in r4], [p[0] for p in r5]
mod_moved = ring_moved = 0
for t in trace_ids:
    h = fnv1a(t)
    if h % 4 != h % 5:
        mod_moved += 1
    if lookup(r4, k4, h) != lookup(r5, k5, h):
        ring_moved += 1
print(f"  scale 4 -> 5 collectors, {len(trace_ids)} in-flight traces change owner:")
print(f"    hash mod N:        {mod_moved} ({mod_moved * 100 / len(trace_ids):.1f}%)")
print(f"    consistent ring:   {ring_moved} ({ring_moved * 100 / len(trace_ids):.1f}%)")` },
        ],
      },
    ],
  },
  {
    title: `Head vs tail sampling in OpenTelemetry — when does each break?`,
    difficulty: "medium",
    seoDescription: `Head vs tail trace sampling measured on 100,000 simulated traces: what each keeps, consistency, trace-ID routing, decision_wait, memory and hybrid designs.`,
    description: `**Question presented to candidate:**
"We cannot afford to store every trace. Explain head sampling and tail sampling in OpenTelemetry, when you would use each, and the specific ways each one fails in production."

**What a strong answer should cover:**
- **Head sampling**: decided when the root span starts, usually from the trace ID (\`TraceIdRatioBased\`) and propagated through the \`sampled\` flag with a **parent-based** sampler; cheap and stateless, but blind to errors and latency that have not happened yet
- Head failure modes: rare errors and slow requests mostly dropped, inconsistent decisions if services sample independently (broken traces), counts that need scaling by 1/rate
- **Tail sampling**: the Collector buffers all spans of a trace for a **decision wait**, then applies policies (errors, latency, attributes, probabilistic, rate limits)
- Tail failure modes: needs **all spans of a trace on one Collector** (trace-ID routing), spans arriving after the wait, memory proportional to spans/s times the wait, shipping 100% of spans, reshuffles when the tier scales
- The usual **hybrid**: compute request metrics before sampling, light head sampling (or none) in the SDK, tail sampling in a routed gateway tier

**Code / implementation expected:** Optional — the example compares both on 100,000 simulated traces and shows each failure mode with numbers.`,
    answer: `**Target Audience:** Engineers who have set up tracing and now have to choose a sampling strategy, and candidates who want to discuss sampling trade-offs with numbers rather than slogans.
**Difficulty:** Medium
**Verified with:** Node 22.22 and Python 3.12 (both print identical output). Tail sampling processor settings (\`decision_wait\` default 30 s described as time since the first span, \`num_traces\` default 50000) from the Grafana Alloy reference for \`otelcol.processor.tail_sampling\` (a wrapper of the upstream processor) and a third-party guide; the SDK default sampler from the OpenTelemetry .NET documentation; check the README of the Collector version you run, since defaults can change.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. Every number comes from running the example; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

A sports photographer is allowed to keep only 1% of the frames from a football match.

**Plan A:** before kick-off, pick 54 random seconds of the 90 minutes and shoot only those. Cheap and simple, but the winning goal almost certainly happens while the camera is off.

**Plan B:** record the whole match on video, watch it, then keep the goals, the red card and a few random moments. The highlights are perfect. But you needed a hard drive for the whole match, someone to watch it all, and if the goal happens in stoppage time after you stopped recording, you still miss it.

Plan A is **head sampling**: decide before anything happens. Plan B is **tail sampling**: keep everything for a while, decide after you have seen it. Each has a precise way of failing, and good tracing designs combine them.

## 2. Why Sample at All

A trace is far more expensive per request than a metric: in the companion design for 200 microservices the stated assumptions give **480,000 spans per second** and about 10 TB per day unsampled ([How would you design OpenTelemetry tracing for 200 microservices?](/interview-question/how-would-you-design-opentelemetry-tracing-for-200-microservices)). Most of those traces are identical successful requests that nobody will ever open. Sampling keeps the useful ones.

📌 **Interview term: sampling** — keeping only a subset of traces. The decision is made per **trace**, not per span, because half a trace is usually worse than no trace.

The example generates 100,000 traces of 6 spans each, with 0.3% errors and 0.5% slow requests (2 to 20 s):

~~~text
population: 100000 traces, 600000 spans, 308 with an error, 534 slower than 2000 ms
~~~

## 3. Head Sampling

<svg class="iq-diagram" width="100%" viewBox="0 0 760 290" role="img" aria-label="Head sampling decides at the root span start and the flag travels with the request; tail sampling buffers all spans, waits, then decides">
  <defs>
    <marker id="sd12q3-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <text class="d-text" x="20" y="40">Head</text>
  <rect class="d-box-accent" x="110" y="60" width="170" height="70" rx="10"/>
  <text class="d-text" x="195" y="90" text-anchor="middle">Root span starts</text>
  <text class="d-sub" x="195" y="112" text-anchor="middle">decide now</text>
  <rect class="d-box" x="340" y="60" width="170" height="70" rx="10"/>
  <text class="d-text" x="425" y="90" text-anchor="middle">Flag in header</text>
  <text class="d-sub" x="425" y="112" text-anchor="middle">children follow</text>
  <rect class="d-box-muted" x="570" y="60" width="170" height="70" rx="10"/>
  <text class="d-text" x="655" y="90" text-anchor="middle">Export or drop</text>
  <text class="d-sub" x="655" y="112" text-anchor="middle">in each SDK</text>
  <path class="d-edge" d="M 280 95 L 332 95" marker-end="url(#sd12q3-arrow)"/>
  <path class="d-edge" d="M 510 95 L 562 95" marker-end="url(#sd12q3-arrow)"/>
  <text class="d-text" x="20" y="180">Tail</text>
  <rect class="d-box" x="110" y="200" width="170" height="70" rx="10"/>
  <text class="d-text" x="195" y="230" text-anchor="middle">All spans sent</text>
  <text class="d-sub" x="195" y="252" text-anchor="middle">to one collector</text>
  <rect class="d-box" x="340" y="200" width="170" height="70" rx="10"/>
  <text class="d-text" x="425" y="230" text-anchor="middle">Buffer and wait</text>
  <text class="d-sub" x="425" y="252" text-anchor="middle">decision_wait</text>
  <rect class="d-box-accent" x="570" y="200" width="170" height="70" rx="10"/>
  <text class="d-text" x="655" y="230" text-anchor="middle">Apply policies</text>
  <text class="d-sub" x="655" y="252" text-anchor="middle">keep or drop</text>
  <path class="d-edge" d="M 280 235 L 332 235" marker-end="url(#sd12q3-arrow)"/>
  <path class="d-edge" d="M 510 235 L 562 235" marker-end="url(#sd12q3-arrow)"/>
</svg>

The head decision costs nothing to store, but it is made before the request has done anything. The tail decision sees the outcome, but every span must travel to, and wait in, a collector first.

📌 **Interview term: head sampling** — deciding whether to keep a trace when its root span is created, before the outcome is known, and propagating that decision to every downstream service.

📌 **Interview term: TraceIdRatioBased sampler** — an OpenTelemetry SDK sampler that keeps a fixed fraction of traces by comparing bits of the trace ID with a threshold. Because the trace ID is the same in every service, every service would reach the same answer.

📌 **Interview term: ParentBased sampler** — a sampler that, for a span with a parent, simply follows the parent decision (the \`sampled\` flag in \`traceparent\`), and only uses its root sampler for new traces. The OpenTelemetry .NET documentation describes the default as parent-based with an always-on root, and the environment variables \`OTEL_TRACES_SAMPLER=parentbased_traceidratio\` with \`OTEL_TRACES_SAMPLER_ARG=0.01\` select a 1% ratio at the root.

The example applies a 1% trace-ID ratio:

~~~text
== HEAD sampling 1% (decided at the root from the trace ID, before anything happens) ==
kept 1000 traces; errors kept 4 of 308; slow kept 7 of 534
estimated totals (count x 100): requests 100000 (true 100000), errors 400 (true 308)
~~~

### When head sampling breaks

**1. Rare events are lost.** It kept 4 of 308 error traces and 7 of 534 slow ones. Exactly the traces you open during an incident are the ones a uniform sample throws away. Lowering the rate to save money makes this worse in direct proportion.

**2. Counts are estimates.** Multiplying by 100 gave exactly 100,000 requests, but 400 errors against a true 308: with only 4 errors in the sample, one more or one fewer moves the estimate by 100. Use metrics for counts, traces for examples.

**3. Inconsistent decisions break traces.** If each service flips its own coin, a trace is complete only when all of them happen to say yes:

~~~text
== Why every service must follow one decision (10% rate, 6 services) ==
each service flips its own coin: complete 0, broken partial traces 46781
parent-based / same trace-ID ratio everywhere: complete 10111, partial 0
~~~

At 10% per service and 6 services, independent coins produced **0** complete traces and 46,781 fragments; a parent-based or trace-ID-based decision produced 10,111 complete traces and no fragments. This also breaks when a service in the middle uses a different SDK configuration, or when an edge trusts a \`sampled\` flag sent by an outside client.

**4. Downstream cannot rescue it.** A service deep in the call graph that hits an error cannot un-drop spans its callers already discarded; at most it can record its own spans, leaving a partial trace.

## 4. Tail Sampling

📌 **Interview term: tail sampling** — deciding after the trace is (mostly) complete, in the OpenTelemetry Collector \`tail_sampling\` processor: spans are grouped by trace ID in memory, and after a wait the trace is evaluated against policies.

📌 **Interview term: decision_wait** — how long the processor waits, measured from the first span of a trace, before deciding. The Alloy reference lists a default of 30 s.

📌 **Interview term: sampling policy** — one rule in the tail sampler: keep on error status, keep when latency exceeds a threshold, keep on an attribute value (a VIP customer), keep a probabilistic share, or cap traces per second; policies can be combined.

The example keeps errors, keeps root spans of 2 s or more, and keeps 1% of everything else:

~~~text
== TAIL sampling: keep errors, keep >= 2 s, keep 1% of the rest ==
with whole traces: kept 1831 (1.8% of traffic); errors kept 308 of 308; slow kept 534 of 534
~~~

With whole traces available, tail sampling kept **all 308 errors and all 534 slow traces** while storing only 1.8% of traffic. That is the whole appeal.

### When tail sampling breaks

**1. Spans of one trace are on different collectors.** The spans of a request come from many pods on many nodes. If they reach the gateway tier round robin, each collector sees a fragment:

~~~text
== TAIL break 1: spans not routed by trace ID (round robin over 4 collectors) ==
error traces kept whole 4, kept as fragments 304; 28.4% of their spans survived
~~~

Only the collector that happened to receive the error span keeps its fragment; the others see a healthy-looking piece and drop it. 304 of 308 error traces survived only as fragments, with 28.4% of their spans. The fix is the trace-ID-routing loadbalancing exporter in front of the tail tier, covered in the 200-microservices design.

**2. Spans arrive after the decision.** The decision is made \`decision_wait\` after the first span. Slow requests, and async consumer spans that finish long after the request, may not have arrived yet:

~~~text
== TAIL break 2: decision_wait vs spans that arrive late ==
wait     errors caught  slow caught  kept but incomplete  buffer at 480k spans/s x 500 B
 1 s        306/308         7/534              29              0.24 GB
 5 s        306/308       135/534              29              1.20 GB
10 s        306/308       301/534              30              2.40 GB
30 s        307/308       534/534              22              7.20 GB
~~~

With a 1 s wait, the latency policy caught only 7 of 534 slow traces (the 7 kept by the probabilistic policy anyway), because their root spans arrived after the decision. At 10 s it caught 301, and only at 30 s all 534. Errors are mostly caught early because most error spans finish quickly; the one or two missed live in a late async span. Around 22 to 30 kept traces were incomplete at every setting: their async consumer span arrived after the decision.

**3. Memory is spans per second times the wait.** The last column is the buffer the gateway tier needs at the assumed 480,000 spans per second and 500 bytes per span: 0.24 GB at 1 s, 7.20 GB at 30 s, before overhead. Longer waits catch more slow traces and cost proportionally more memory. When traces exceed the configured trace count limit (\`num_traces\`, default 50000 per a third-party guide; the meaning is traces held in memory), older traces are dropped before a decision, which in an incident (more errors, slower requests, longer traces) happens exactly when you need them.

**4. You ship 100% of spans to the gateway.** Head sampling at 1% means apps export 1% of spans. Tail sampling means every span crosses the network and is processed by the gateway, even though 98% will be dropped; the CPU and network cost of the tier scales with total traffic, not with kept traffic.

**5. Scaling the tier reshuffles traces.** Adding a collector moves a share of trace IDs to a new owner, so traces in flight at that moment are split. Consistent hashing keeps that share small but not zero.

**6. Biased samples.** A tail sample is deliberately not representative: it is full of errors. Request rates and error ratios computed from it are wrong, so compute those **before** sampling.

📌 **Interview term: span metrics (RED metrics from spans)** — rate, errors and duration per service and operation computed from all spans before sampling, in the SDK or Collector, so dashboards stay exact while traces are sampled.

## 5. Head vs Tail at a Glance

| | Head sampling | Tail sampling |
| :--- | :--- | :--- |
| When decided | At the root span, before the outcome | After \`decision_wait\`, with the outcome |
| Where | SDK in every service | Gateway Collector tier |
| Keeps rare errors and slow requests | Only at the sample rate (4 of 308 in the run) | Yes (308 of 308 with whole traces) |
| Cost in apps and network | Proportional to kept traffic | All spans exported |
| State | None | Every in-flight trace in memory |
| Needs trace-ID routing | No | Yes |
| Breaks when | Services decide independently; you need the rare trace | Spans split across collectors; spans arrive after the wait; memory limit hit |
| Counts from the sample | Scale by 1/rate | Not representative; use pre-sampling metrics |

## 6. A Design That Uses Both

1. **Compute RED metrics from 100% of spans** in the SDK or the agent Collector, before any sampling.
2. **Head-sample lightly or not at all** with a parent-based ratio sampler, to cut the volume that reaches the gateway (for example keep 25%, and always keep traces a client explicitly flags for debugging).
3. **Route by trace ID** from the agents to a gateway tier.
4. **Tail-sample** there: keep all errors, latency over the SLO threshold, specific tenants or endpoints, plus a probabilistic share; add a rate-limiting policy as a safety cap.
5. **Size the wait** to your p99 trace duration, and give async work its own traces joined by span links rather than one trace waiting minutes.

Note the trade-off in step 2: head sampling before the tail tier means the tail tier never sees the dropped 75%, including their errors. Teams that must keep every error send 100% to the tail tier and pay for it.

## 7. Verified: Running the Code

The example **"Head vs tail sampling on 100,000 traces: what each keeps, inconsistent per-service sampling, unrouted spans and decision_wait"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
population: 100000 traces, 600000 spans, 308 with an error, 534 slower than 2000 ms

== HEAD sampling 1% (decided at the root from the trace ID, before anything happens) ==
kept 1000 traces; errors kept 4 of 308; slow kept 7 of 534
estimated totals (count x 100): requests 100000 (true 100000), errors 400 (true 308)

== Why every service must follow one decision (10% rate, 6 services) ==
each service flips its own coin: complete 0, broken partial traces 46781
parent-based / same trace-ID ratio everywhere: complete 10111, partial 0

== TAIL sampling: keep errors, keep >= 2 s, keep 1% of the rest ==
with whole traces: kept 1831 (1.8% of traffic); errors kept 308 of 308; slow kept 534 of 534

== TAIL break 1: spans not routed by trace ID (round robin over 4 collectors) ==
error traces kept whole 4, kept as fragments 304; 28.4% of their spans survived

== TAIL break 2: decision_wait vs spans that arrive late ==
wait     errors caught  slow caught  kept but incomplete  buffer at 480k spans/s x 500 B
 1 s        306/308         7/534              29              0.24 GB
 5 s        306/308       135/534              29              1.20 GB
10 s        306/308       301/534              30              2.40 GB
30 s        307/308       534/534              22              7.20 GB
~~~

What the simulation stands for and leaves out: traces are generated by a seeded random generator, with span end times spread evenly over the request and 2% of traces carrying a late async consumer span. The "trace ID" used for ratio sampling is a 32-bit random number compared with a threshold, which mirrors how a ratio sampler uses trace ID bits but not its exact bit layout. The tail sampler is a function, not the Collector: there is no \`num_traces\` eviction, no decision cache for late spans and no composite or rate-limiting policy. The buffer column is arithmetic on the assumed span rate and size, not measured memory.

## Edge Cases Worth Knowing

- **Late spans after a decision.** Depending on the Collector version and settings, spans arriving after the decision may follow a cached decision or be treated as a new trace; check the processor documentation and watch for fragments.
- **Debug traces on demand.** A header or flag that forces sampling for one request is invaluable, but must not be settable by arbitrary external clients.
- **Very long traces.** A batch job running for an hour cannot fit any reasonable wait; give each step its own trace.
- **Changing ratios.** Lowering the head ratio during an incident to save cost also lowers the errors you keep.
- **Multiple head samplers in a chain.** If an upstream system sampled at 10% and you sample its traces again at 10%, you keep 1%, and estimates must multiply both rates.

## Common Pitfalls

- **Independent per-service sampling.** Without a parent-based sampler almost no trace is complete.
- **Tail sampling behind a round-robin load balancer.** Decisions are made on fragments; error traces survive in pieces.
- **A decision wait shorter than your slow requests.** The latency policy cannot fire on a root span it has not seen.
- **Ignoring the buffer size.** Memory is spans per second times the wait; size and alert on it, because overload drops traces during incidents.
- **Error rates from sampled traces.** Use metrics computed before sampling.
- **Assuming tail sampling is free for apps.** It moves the cost from storage to network and gateway CPU, because every span is exported.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Head:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Head sampling</strong> decides at the root span from the trace ID, and a <strong style="color:#ffca28;">parent-based</strong> sampler makes every service follow the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">sampled</code> flag. It is stateless and cheap, but blind: at 1% my simulation kept 4 of 308 error traces.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Head breaks:</strong> <span style="color:#f0e2c8;">It loses rare events, its counts need scaling (it estimated 400 errors for a true 308), and if services sample independently traces fall apart: 0 complete traces out of 100,000 at 10% per service across 6 services.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Tail:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Tail sampling</strong> buffers every span of a trace in a Collector for a <strong style="color:#ffca28;">decision wait</strong> and applies policies: errors, latency, attributes, a probabilistic share. With whole traces it kept all 308 errors and all 534 slow traces at 1.8% of traffic.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Tail breaks:</strong> <span style="color:#f0e2c8;">It needs all spans on one collector, so <strong style="color:#ffca28;">route by trace ID</strong>; round robin left 304 of 308 error traces as fragments. Spans arriving after the wait are judged without; a 1 s wait caught 7 of 534 slow traces, 30 s caught all. Memory is spans/s times the wait, and every span must be shipped.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Design:</strong> <span style="color:#f0e2c8;">Compute RED metrics before sampling, head-sample lightly with a parent-based ratio, route by trace ID to a gateway tier, tail-sample with error, latency and probabilistic policies plus a rate cap, and size the wait to the p99 trace duration.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just tail-sample everything?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Because every span must be exported, routed and held in memory for the wait. At 480,000 spans/s and a 30 s wait that is about 7.2 GB of buffer before overhead, plus the network and CPU for spans you will drop. Light head sampling cuts that, at the price of losing some errors.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you compute error rates if traces are sampled?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Not from traces. RED metrics are computed from all spans in the SDK or agent before sampling, or from regular service metrics. Traces then provide examples, linked through exemplars.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What does the ParentBased sampler do when there is no parent?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It uses its root sampler, typically a trace-ID ratio. With a parent it follows the parent flag, which is what keeps every service consistent.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you pick decision_wait?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Slightly above the p99 duration of the traces you care about, measured from the first span. Then check the memory: spans per second times the wait times span size, with headroom. Long async work should be its own trace with links.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What breaks when you scale the tail-sampling tier?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Trace IDs are re-hashed to the new set of collectors, so traces in flight can be split between old and new owners. Consistent hashing limits the share that moves; scaling ahead of peaks limits how often it happens.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Sampling | Keeping only a subset of traces, decided per trace |
| Head sampling | Deciding at the root span, before the outcome |
| TraceIdRatioBased | SDK sampler keeping a fraction based on trace ID bits |
| ParentBased | Sampler that follows the parent decision, root sampler otherwise |
| Tail sampling | Deciding after buffering a trace, in the Collector |
| decision_wait | Time from the first span to the tail decision |
| Sampling policy | One keep rule in the tail sampler |
| Span metrics (RED) | Rate, errors, duration computed from all spans before sampling |

**Conclusion:** Head sampling is a coin flipped before the request runs: cheap, stateless and consistent when every service follows the parent flag, but it keeps errors and slow requests only at the sample rate, so at 1% almost all of them are gone. Tail sampling looks at the finished trace and keeps exactly the interesting ones, but only if every span of a trace reaches the same collector, arrives before the decision wait, and fits in a buffer that grows with spans per second times the wait. The robust design computes metrics from all spans first, uses a light parent-based head sample to control volume, routes by trace ID, and tail-samples errors, slow requests and a small random share in a gateway tier sized for incidents, not for quiet days.`,
    examples: [
      {
        label: `Head vs tail sampling on 100,000 traces: what each keeps, inconsistent per-service sampling, unrouted spans and decision_wait`,
        variants: [
          { tech: "node", code: `// Head vs tail sampling on 100,000 simulated traces (6 spans each): what each keeps, and where each breaks.
let seed = 2024;
function rand() { seed = (seed * 48271) % 2147483647; return seed / 2147483647; }
const N = 100000, SPANS = 6, ROOT = 5, SLOW_MS = 2000; // spans 0..4 are the request (4 is the root)
const pct = (a, b) => ((a * 100) / b).toFixed(1) + "%";

const traces = [];
for (let i = 0; i < N; i++) {
  const r = rand(), error = r < 0.003, slow = r >= 0.003 && r < 0.008;
  const dur = slow ? 2000 + Math.floor(rand() * 18000) : 40 + Math.floor(rand() * 160);
  const ends = []; for (let k = 0; k < ROOT; k++) ends.push(Math.floor((dur * (k + 1)) / ROOT)); // span 4 = root, ends at dur
  ends.push(rand() < 0.02 ? dur + 1000 + Math.floor(rand() * 119000) : dur); // span 5 = async consumer, sometimes late
  const errSpan = error ? Math.floor(rand() * SPANS) : -1;
  traces.push({ id: Math.floor(rand() * 4294967296), error, slow, dur, ends, errSpan });
}
const errors = traces.filter((t) => t.error).length, slows = traces.filter((t) => t.slow).length;
console.log(\`population: \${N} traces, \${N * SPANS} spans, \${errors} with an error, \${slows} slower than \${SLOW_MS} ms\`);

console.log("\\n== HEAD sampling 1% (decided at the root from the trace ID, before anything happens) ==");
const headKeep = (t, ratio) => t.id < ratio * 4294967296;
const head = traces.filter((t) => headKeep(t, 0.01));
const hErr = head.filter((t) => t.error).length, hSlow = head.filter((t) => t.slow).length;
console.log(\`kept \${head.length} traces; errors kept \${hErr} of \${errors}; slow kept \${hSlow} of \${slows}\`);
console.log(\`estimated totals (count x 100): requests \${head.length * 100} (true \${N}), errors \${hErr * 100} (true \${errors})\`);

console.log("\\n== Why every service must follow one decision (10% rate, 6 services) ==");
let indep = { full: 0, partial: 0 }, consistent = { full: 0, partial: 0 };
for (const t of traces) {
  let k = 0; for (let s = 0; s < SPANS; s++) if (rand() < 0.1) k++;
  if (k === SPANS) indep.full++; else if (k > 0) indep.partial++;
  if (headKeep(t, 0.1)) consistent.full++;
}
console.log(\`each service flips its own coin: complete \${indep.full}, broken partial traces \${indep.partial}\`);
console.log(\`parent-based / same trace-ID ratio everywhere: complete \${consistent.full}, partial \${consistent.partial}\`);

function tailDecide(t, seen) {
  if (t.errSpan >= 0 && seen[t.errSpan]) return "error";
  if (seen[ROOT - 1] && t.ends[ROOT - 1] >= SLOW_MS) return "latency"; // root span duration
  return headKeep(t, 0.01) ? "probabilistic" : null;
}
console.log("\\n== TAIL sampling: keep errors, keep >= 2 s, keep 1% of the rest ==");
const all = Array(SPANS).fill(true);
let tKept = 0, tErr = 0, tSlow = 0;
for (const t of traces) { const d = tailDecide(t, all); if (d) { tKept++; if (t.error) tErr++; if (t.slow) tSlow++; } }
console.log(\`with whole traces: kept \${tKept} (\${pct(tKept, N)} of traffic); errors kept \${tErr} of \${errors}; slow kept \${tSlow} of \${slows}\`);

console.log("\\n== TAIL break 1: spans not routed by trace ID (round robin over 4 collectors) ==");
let rr = 0, full = 0, part = 0, spansKept = 0, errTraces = 0;
for (const t of traces) {
  const owner = []; for (let s = 0; s < SPANS; s++) owner.push(rr++ % 4);
  if (!t.error) continue;
  errTraces++;
  let kept = 0;
  for (let c = 0; c < 4; c++) {
    const seen = owner.map((o) => o === c);
    if (!seen.some(Boolean)) continue;
    if (tailDecide(t, seen)) kept += seen.filter(Boolean).length;
  }
  spansKept += kept; if (kept === SPANS) full++; else part++;
}
console.log(\`error traces kept whole \${full}, kept as fragments \${part}; \${pct(spansKept, errTraces * SPANS)} of their spans survived\`);

console.log("\\n== TAIL break 2: decision_wait vs spans that arrive late ==");
console.log("wait     errors caught  slow caught  kept but incomplete  buffer at 480k spans/s x 500 B");
for (const wait of [1000, 5000, 10000, 30000]) {
  let e = 0, s = 0, inc = 0;
  for (const t of traces) {
    const cutoff = t.ends[0] + wait, seen = t.ends.map((x) => x <= cutoff);
    if (tailDecide(t, seen)) { if (t.error) e++; if (t.slow) s++; if (!seen.every(Boolean)) inc++; }
  }
  const gb = (480000 * (wait / 1000) * 500) / 1e9;
  console.log(\`\${String(wait / 1000).padStart(2)} s \${String(e).padStart(10)}/\${errors} \${String(s).padStart(9)}/\${slows} \${String(inc).padStart(15)} \${gb.toFixed(2).padStart(17)} GB\`);
}` },
          { tech: "python", code: `# Head vs tail sampling on 100,000 simulated traces (6 spans each): what each keeps, and where each breaks.
import math

seed = 2024


def rand():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647


N, SPANS, ROOT, SLOW_MS = 100000, 6, 5, 2000  # spans 0..4 are the request (4 is the root)


def pct(a, b):
    return f"{a * 100 / b:.1f}%"


traces = []
for i in range(N):
    r = rand()
    error, slow = r < 0.003, 0.003 <= r < 0.008
    dur = 2000 + math.floor(rand() * 18000) if slow else 40 + math.floor(rand() * 160)
    ends = [math.floor(dur * (k + 1) / ROOT) for k in range(ROOT)]  # span 4 = root, ends at dur
    ends.append(dur + 1000 + math.floor(rand() * 119000) if rand() < 0.02 else dur)  # span 5 = async consumer, sometimes late
    err_span = math.floor(rand() * SPANS) if error else -1
    traces.append({"id": math.floor(rand() * 4294967296), "error": error, "slow": slow, "dur": dur, "ends": ends, "errSpan": err_span})
errors = sum(1 for t in traces if t["error"])
slows = sum(1 for t in traces if t["slow"])
print(f"population: {N} traces, {N * SPANS} spans, {errors} with an error, {slows} slower than {SLOW_MS} ms")

print("\\n== HEAD sampling 1% (decided at the root from the trace ID, before anything happens) ==")


def head_keep(t, ratio):
    return t["id"] < ratio * 4294967296


head = [t for t in traces if head_keep(t, 0.01)]
h_err = sum(1 for t in head if t["error"])
h_slow = sum(1 for t in head if t["slow"])
print(f"kept {len(head)} traces; errors kept {h_err} of {errors}; slow kept {h_slow} of {slows}")
print(f"estimated totals (count x 100): requests {len(head) * 100} (true {N}), errors {h_err * 100} (true {errors})")

print("\\n== Why every service must follow one decision (10% rate, 6 services) ==")
indep = {"full": 0, "partial": 0}
consistent = {"full": 0, "partial": 0}
for t in traces:
    k = 0
    for s in range(SPANS):
        if rand() < 0.1:
            k += 1
    if k == SPANS:
        indep["full"] += 1
    elif k > 0:
        indep["partial"] += 1
    if head_keep(t, 0.1):
        consistent["full"] += 1
print(f"each service flips its own coin: complete {indep['full']}, broken partial traces {indep['partial']}")
print(f"parent-based / same trace-ID ratio everywhere: complete {consistent['full']}, partial {consistent['partial']}")


def tail_decide(t, seen):
    if t["errSpan"] >= 0 and seen[t["errSpan"]]:
        return "error"
    if seen[ROOT - 1] and t["ends"][ROOT - 1] >= SLOW_MS:  # root span duration
        return "latency"
    return "probabilistic" if head_keep(t, 0.01) else None


print("\\n== TAIL sampling: keep errors, keep >= 2 s, keep 1% of the rest ==")
everything = [True] * SPANS
t_kept = t_err = t_slow = 0
for t in traces:
    if tail_decide(t, everything):
        t_kept += 1
        t_err += t["error"]
        t_slow += t["slow"]
print(f"with whole traces: kept {t_kept} ({pct(t_kept, N)} of traffic); errors kept {t_err} of {errors}; slow kept {t_slow} of {slows}")

print("\\n== TAIL break 1: spans not routed by trace ID (round robin over 4 collectors) ==")
rr = full = part = spans_kept = err_traces = 0
for t in traces:
    owner = []
    for s in range(SPANS):
        owner.append(rr % 4)
        rr += 1
    if not t["error"]:
        continue
    err_traces += 1
    kept = 0
    for c in range(4):
        seen = [o == c for o in owner]
        if not any(seen):
            continue
        if tail_decide(t, seen):
            kept += sum(seen)
    spans_kept += kept
    if kept == SPANS:
        full += 1
    else:
        part += 1
print(f"error traces kept whole {full}, kept as fragments {part}; {pct(spans_kept, err_traces * SPANS)} of their spans survived")

print("\\n== TAIL break 2: decision_wait vs spans that arrive late ==")
print("wait     errors caught  slow caught  kept but incomplete  buffer at 480k spans/s x 500 B")
for wait in [1000, 5000, 10000, 30000]:
    e = s = inc = 0
    for t in traces:
        cutoff = t["ends"][0] + wait
        seen = [x <= cutoff for x in t["ends"]]
        if tail_decide(t, seen):
            e += t["error"]
            s += t["slow"]
            if not all(seen):
                inc += 1
    gb = 480000 * (wait / 1000) * 500 / 1e9
    print(f"{str(wait // 1000).rjust(2)} s {str(e).rjust(10)}/{errors} {str(s).rjust(9)}/{slows} {str(inc).rjust(15)} {f'{gb:.2f}'.rjust(17)} GB")` },
        ],
      },
    ],
  },
  {
    title: `How would you design a metrics monitoring and alerting system?`,
    difficulty: "hard",
    seoDescription: `Design a Prometheus-style metrics and alerting system: cardinality math, Gorilla compression, a sharded TSDB, burn-rate SLO alerts and Alertmanager.`,
    description: `**Question presented to candidate:**
"Design a metrics monitoring and alerting system for a company running a few hundred services: something like Prometheus plus Alertmanager, or Datadog. It must collect metrics from every service, keep them for a year, power dashboards, and page the on-call engineer when users are affected, without paging them for noise."

**What a strong answer should cover:**
- **Data model**: metric name plus labels identifies a time series of (timestamp, float) samples; counters, gauges, histograms; **cardinality** as the main scaling limit, with worked numbers
- **Collection**: pull (scrape) vs push, service discovery, agents; ingest sharded by series hash with replication
- **Storage**: an in-memory head with a **WAL**, immutable compressed blocks (delta-of-delta timestamps, XOR values), object storage for history, **downsampling** and retention
- **Query**: range and instant queries, \`rate()\` over counters, percentiles from histograms, caching for dashboards
- **Alerting**: rule evaluation with \`for\` durations; **SLO burn-rate** alerts over multiple windows instead of raw thresholds; Alertmanager-style **grouping, deduplication, inhibition, silences** and routing
- Reliability of the monitor itself: HA pairs, meta-monitoring and a dead man's switch alert

**Clarifying questions expected:**
- How many services, instances and series, and at what scrape interval and retention?
- Pull or push, and multi-tenant or single team?
- What should page a human, and what should only create a ticket?

**Code / implementation expected:** Optional — the examples simulate burn-rate alerting against a naive threshold, compute cardinality, and count compression bits.`,
    answer: `**Target Audience:** Engineers who use dashboards and alerts every day and want to understand how the system behind them is built, and candidates facing a "design Prometheus / Datadog" round.
**Difficulty:** Hard
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 for the alerting example (identical output), Node 22.22 and Python 3.12 for the compression example. Burn-rate thresholds are those of the Google SRE Workbook chapter "Alerting on SLOs" as reproduced by Last9, Pydantic Logfire and Grafana articles; Alertmanager defaults (\`group_wait\` 30s, \`group_interval\` 5m, \`repeat_interval\` 4h) and Prometheus scrape defaults (interval 1m, timeout 10s) from prometheus.io configuration docs; the 1.37 bytes per point figure from the Facebook Gorilla paper (VLDB 2015).

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. Every number comes from running the examples; the **Verified** section quotes their full output.

## 1. Why This Even Matters — A Story First

A city water company has meters on every pipe. Each meter reports a number every few seconds. A control room shows the flows on big screens, and when pressure drops in a district, an engineer is called.

Three things make this hard at city scale. There are **millions of meters**, and if someone decides every apartment tap needs its own meter, the count jumps a hundredfold. The control room must keep **years** of readings to compare this winter with last winter, without buying a warehouse of disks. And the alarm must be **smart**: a two-second dip should not wake an engineer at 3 a.m., but a slow leak that loses a little water every hour for three days absolutely should, even though no single reading looks alarming.

A metrics monitoring system is that control room for software. The meters are your services, the readings are samples, and the alarm is the alerting pipeline. The design questions are the same: how many meters, how to store their readings cheaply, and when to wake a human.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How many services, instances and endpoints? Which labels? | Series count is the product of label values; it sizes memory, ingest and index |
| Scrape or push interval? Retention, and at what resolution? | Samples per second and storage; downsampling plan |
| Pull (scrape) or push (agents, OTLP, StatsD)? Short-lived jobs? | Collection architecture and service discovery |
| Single team or multi-tenant platform? | Per-tenant limits, isolation, billing |
| What should page, what should be a ticket? Are there SLOs? | Burn-rate alerts vs threshold alerts, routing |
| Freshness needed for alerts: seconds or minutes? | Evaluation interval, ingest path latency |

## 3. Requirements

**Functional**
- Collect metrics from every service instance (pull or push), with metadata labels.
- Store raw samples for weeks and downsampled data for a year.
- Query by metric name and label matchers with functions (rate, sum by, quantiles from histograms) for dashboards and ad-hoc analysis.
- Evaluate alert rules continuously; route notifications to the right team by severity, with grouping, silencing and deduplication.

**Non-functional**
- **Ingest**: millions of active series, billions of samples per day (computed below).
- **Alert latency**: an outage should page within minutes; the alerting path must work even when dashboards are slow.
- **Availability**: the monitor must be more available than what it monitors, and must alert when it is itself broken.
- **Cost**: a few bytes per sample after compression; old data in cheap object storage.

## 4. Data Model and the Cardinality Problem

📌 **Interview term: time series** — the samples of one metric name with one exact set of labels, for example \`http_requests_total{service="checkout", pod="checkout-7f9", route="/pay", status="5xx"}\`.

📌 **Interview term: sample** — one (timestamp, value) point in a series. Values are 64-bit floats.

📌 **Interview term: counter, gauge, histogram** — a **counter** only increases (requests, bytes) and is queried as a rate; a **gauge** goes up and down (memory, queue depth); a **histogram** is a set of counters, one per latency bucket plus a sum and a count, from which percentiles are estimated.

📌 **Interview term: cardinality** — the number of distinct series, which is the product of the number of values of every label.

The alerting example computes a realistic fleet:

~~~text
== Cardinality: every label multiplies the number of series ==
  200 services x 10 pods x 20 endpoints x 4 status classes x 14 histogram series = 2240000 series
  scraped every 15 s: 12902400000 samples/day, 17.7 GB/day at 1.37 B/sample
  add a user_id label with 100000 active users: 224000000000 series
~~~

200 services, 10 pods each, 20 endpoints, 4 status classes and a histogram of 12 buckets plus sum and count give **2.24 million series**. Scraped every 15 seconds that is 12.9 billion samples a day, and at the Gorilla paper average of 1.37 bytes per sample about **17.7 GB a day** of compressed data. Add one label with 100,000 user IDs and the same metric becomes **224 billion** series: no system can index that. This is why every serious metrics platform enforces **per-tenant series limits** and rejects labels like user IDs, order IDs and raw URLs. Per-request detail belongs in traces and logs ([What are the three pillars of observability?](/interview-question/what-are-the-three-pillars-of-observability)).

## 5. API

- **Write**: agents push batches of samples (\`POST /api/v1/push\` with series labels and samples, protobuf and compressed; OTLP and Prometheus remote write are the common formats), or the system scrapes \`GET /metrics\` on each target.
- **Query**: \`GET /api/v1/query_range?query=...&start=...&end=...&step=60s\` returns series of points. A typical expression is \`sum by (service) (rate(http_requests_total{status="5xx"}[5m]))\`: the per-second rate of each counter over 5 minutes, summed per service.
- **Rules**: alert definitions in version-controlled config: an expression, a \`for\` duration, labels (severity, team) and annotations (summary, runbook link).
- **Silences**: \`POST /silences\` with label matchers and an expiry, for maintenance windows.

📌 **Interview term: rate() over a counter** — the per-second increase of a counter over a window, which also handles counter resets when a process restarts. Raw counter values are meaningless on a graph.

## 6. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 860 300" role="img" aria-label="Write path: targets to collectors to distributors to ingesters with a write-ahead log, flushing blocks to object storage; read path: queriers read ingesters and storage for dashboards and the rule evaluator">
  <defs>
    <marker id="sd12q4-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="40" width="140" height="80" rx="10"/>
  <text class="d-text" x="90" y="75" text-anchor="middle">Targets</text>
  <text class="d-sub" x="90" y="98" text-anchor="middle">services, nodes</text>
  <rect class="d-box" x="200" y="40" width="140" height="80" rx="10"/>
  <text class="d-text" x="270" y="75" text-anchor="middle">Collectors</text>
  <text class="d-sub" x="270" y="98" text-anchor="middle">scrape or receive</text>
  <rect class="d-box-accent" x="380" y="40" width="140" height="80" rx="10"/>
  <text class="d-text" x="450" y="75" text-anchor="middle">Distributors</text>
  <text class="d-sub" x="450" y="98" text-anchor="middle">hash series, limits</text>
  <rect class="d-box" x="560" y="40" width="140" height="80" rx="10"/>
  <text class="d-text" x="630" y="75" text-anchor="middle">Ingesters</text>
  <text class="d-sub" x="630" y="98" text-anchor="middle">memory and WAL</text>
  <rect class="d-box-muted" x="560" y="190" width="140" height="80" rx="10"/>
  <text class="d-text" x="630" y="225" text-anchor="middle">Object store</text>
  <text class="d-sub" x="630" y="248" text-anchor="middle">compacted blocks</text>
  <rect class="d-box" x="300" y="190" width="160" height="80" rx="10"/>
  <text class="d-text" x="380" y="225" text-anchor="middle">Queriers</text>
  <text class="d-sub" x="380" y="248" text-anchor="middle">merge and dedupe</text>
  <rect class="d-box" x="40" y="190" width="160" height="80" rx="10"/>
  <text class="d-text" x="120" y="225" text-anchor="middle">Dashboards</text>
  <text class="d-sub" x="120" y="248" text-anchor="middle">and rule evaluator</text>
  <path class="d-edge" d="M 160 80 L 192 80" marker-end="url(#sd12q4-arrow)"/>
  <path class="d-edge" d="M 340 80 L 372 80" marker-end="url(#sd12q4-arrow)"/>
  <path class="d-edge-accent" d="M 520 80 L 552 80" marker-end="url(#sd12q4-arrow)"/>
  <path class="d-edge-dashed" d="M 630 120 L 630 182" marker-end="url(#sd12q4-arrow)"/>
  <path class="d-edge" d="M 560 230 L 468 230" marker-end="url(#sd12q4-arrow)"/>
  <path class="d-edge" d="M 600 120 L 450 186" marker-end="url(#sd12q4-arrow)"/>
  <path class="d-edge" d="M 300 230 L 208 230" marker-end="url(#sd12q4-arrow)"/>
</svg>

Writes flow along the top: collectors gather samples, distributors validate them, enforce limits and hash each series to a set of ingesters. Ingesters keep recent data in memory and in a write-ahead log, and periodically flush compressed blocks (dashed arrow) to object storage. Queriers read recent data from ingesters and history from storage. This is the shape of horizontally scaled Prometheus-compatible systems; a single Prometheus server does all of it in one process.

**Collection: pull vs push.**

📌 **Interview term: pull (scrape) model** — the monitoring system discovers targets (from Kubernetes, Consul, cloud APIs) and periodically requests their \`/metrics\` endpoint. Prometheus works this way; its configuration docs list a default \`scrape_interval\` of 1 minute and a default timeout of 10 seconds, and many teams set 15 or 30 seconds. A failed scrape is itself a signal (\`up == 0\`).

📌 **Interview term: push model** — targets or local agents send samples to the system. Better for short-lived jobs, serverless functions and networks where the monitor cannot reach targets; requires authentication and protection against a client flooding the system.

In practice, large platforms use agents that scrape locally and push upstream, combining service discovery with a single outbound connection per node.

**Sharding and replication.** A distributor hashes the series identity (metric name plus sorted labels) onto a ring of ingesters and writes each sample to 3 of them; a write succeeds when 2 acknowledge. Queriers read from the replicas and deduplicate. The ring and quorum ideas are those of [What is consistent hashing?](/interview-question/what-is-consistent-hashing) and [What is a read/write quorum?](/interview-question/what-is-a-read-write-quorum).

## 7. Deep Dive 1: Storage and Compression

Recent samples live in an in-memory **head block** for the most recent window (two hours is common), protected by a write-ahead log so a crash loses nothing ([What is a write-ahead log (WAL)?](/interview-question/what-is-a-write-ahead-log-wal)). The head is then cut into an immutable, compressed, indexed block; blocks are compacted into larger ones and uploaded to object storage.

The compression is what makes the economics work. Facebook's Gorilla paper (VLDB 2015) describes two tricks and reports an average of **1.37 bytes per data point**, about a 12x reduction:

📌 **Interview term: delta-of-delta encoding** — store the change in the gap between timestamps. Scrapes every 15 s give gaps of 15, 15, 15, so the delta of the delta is 0 and costs **1 bit**.

📌 **Interview term: XOR float compression** — XOR each value with the previous one. Identical values give 0 (1 bit); similar values share sign, exponent and leading mantissa bits, so only the middle "meaningful" bits are stored, often reusing the previous position.

The second example counts the bits for one 2-hour block of 480 samples, using the rules from the paper:

~~~text
timestamps: 480 samples, jittered 15 s interval -> 868 bits (1.81 bits/sample)
series          example values             zero-xor reuse  new  bytes/sample  vs 16 B raw
counter         43, 94, 137, 187 ...             0   403   76         2.17       7.4x
constant        1, 1, 1 ...                    479     0    0         0.37      43.4x
gauge_tenths    45.1, 45.2, 45.1 ...             0   475    4         6.59       2.4x
random_float    0.4999..., 0.3657 ...            0   472    7         7.37       2.2x
~~~

The jittered timestamps cost 1.81 bits per sample. A constant series (\`up\`) costs 0.37 bytes per sample, a counter of integers 2.17, but a gauge stepping by 0.1 costs **6.59** bytes, because 45.1 and 45.2 are not exact in binary and differ across most of the mantissa. The same caveat appears in an independent benchmark (the graupel crate documentation measured about 5.92 bytes per point on real sensor data). Compression is data-dependent: 1.37 is an average from Facebook's data, not a constant.

📌 **Interview term: downsampling** — precomputing lower-resolution aggregates (for example 5-minute and 1-hour min, max, sum and count) of old data, so a one-year dashboard reads 8,760 hourly points per series instead of about 2.1 million raw ones at 15 s, and raw data can expire sooner.

📌 **Interview term: retention** — how long each resolution is kept, for example raw for 15 days, 5-minute for 90 days, 1-hour for 13 months.

## 8. Deep Dive 2: Alerting That Pages for the Right Things

📌 **Interview term: alert rule** — an expression evaluated every evaluation interval; when it returns a result it is **pending**, and if it keeps returning one for the \`for\` duration it becomes **firing** and is sent to the notification manager.

The naive rule "page if the error rate exceeds 1%" fails in both directions. The SRE approach alerts on the **error budget**.

📌 **Interview term: error budget** — the failures an SLO allows. A 99.9% SLO over 30 days allows 0.1% of requests to fail: at 1,000 requests a minute, 43,200 failed requests per 30 days.

📌 **Interview term: burn rate** — how fast the budget is being spent relative to plan: the error ratio divided by the allowed ratio. A burn rate of 1 spends exactly the budget in 30 days; 14.4 spends it in about 2 days, so one hour at 14.4x consumes 14.4 / 720 = **2%** of the monthly budget.

📌 **Interview term: multiwindow, multi-burn-rate alert** — several alerts, each requiring the burn rate to exceed a threshold over a long window **and** a short window (about one twelfth of the long one). The SRE Workbook starting point for 99.9%: page at 14.4x over 1 h and 5 min (2% of budget), page at 6x over 6 h and 30 min (5%), ticket at 1x over 3 days and 6 h (10%). The long window proves the spend is significant; the short window makes the alert clear quickly once the problem is fixed.

The alerting example runs four failure shapes for four simulated days each at 1,000 requests per minute, against a naive "error rate over 1% in the last minute" rule and the three burn-rate rules:

~~~text
== blip: 20% errors for 2 min ==
  error budget used: 0.9% of the 30-day budget (400 of 43200 errors)
  naive >1% in 1m     fires after 1 min, 1 firing(s), clears after 3 min
  page  14.4x 1h+5m   never
  page  6x    6h+30m  never
  ticket 1x   3d+6h   never
== outage: 10% errors for 60 min ==
  error budget used: 13.9% of the 30-day budget (6000 of 43200 errors)
  naive >1% in 1m     fires after 1 min, 1 firing(s), clears after 61 min
  page  14.4x 1h+5m   fires after 9 min, 1 firing(s), clears after 65 min
  page  6x    6h+30m  fires after 22 min, 1 firing(s), clears after 89 min
  ticket 1x   3d+6h   fires after 44 min, 1 firing(s), clears after 417 min
== slow burn: 0.8% errors from then on ==
  error budget used: 95.6% of the 30-day budget (41280 of 43200 errors)
  naive >1% in 1m     never
  page  14.4x 1h+5m   never
  page  6x    6h+30m  fires after 271 min, 1 firing(s), still firing at the end
  ticket 1x   3d+6h   fires after 541 min, 1 firing(s), still firing at the end
== trickle: 0.3% errors from then on ==
  error budget used: 35.8% of the 30-day budget (15480 of 43200 errors)
  naive >1% in 1m     never
  page  14.4x 1h+5m   never
  page  6x    6h+30m  never
  ticket 1x   3d+6h   fires after 1441 min, 1 firing(s), still firing at the end
~~~

Reading it:

- **Blip** (20% errors for 2 minutes, 0.9% of the budget): the naive rule pages someone; no burn-rate rule fires. That is the 3 a.m. page you want to avoid.
- **Outage** (10% for an hour, 13.9% of the budget): the naive rule fires after 1 minute, the fast burn-rate page after **9 minutes**, and it clears 5 minutes after the outage ends thanks to the 5-minute short window. Nine minutes is the price of not paging for blips; it is also when the outage had spent about 2% of the budget.
- **Slow burn** (0.8% errors from then on, 95.6% of the budget in under 4 days): the naive rule **never fires**, because no minute exceeds 1%. The 6x page fires after 271 minutes. Without it, the whole month of budget would be gone silently.
- **Trickle** (0.3%, 3x burn): no page, but a ticket after 1,441 minutes (one day), since 35.8% of the budget is spent over the 4 days.

The core of the rule check, in integer arithmetic so all four languages agree:

~~~js
// error ratio > burn x 0.1%  <=>  errors * 10000 > burnTenths * requests
const over = (t, w, burn) => errorsIn(t, w) * 10000 > burn * requestsIn(t, w);
const fires = (t) => over(t, longWindow, burn) && over(t, shortWindow, burn);
~~~

SLOs and availability numbers are introduced in [What latency numbers and availability targets should every engineer know?](/interview-question/what-latency-numbers-and-availability-targets-should-every-engineer-know).

## 9. Deep Dive 3: From Firing Alert to the Right Human

<svg class="iq-diagram" width="100%" viewBox="0 0 860 200" role="img" aria-label="Rule evaluator sends firing alerts to the alert manager, which groups, deduplicates, applies inhibition and silences, then routes to pager, chat or ticket">
  <defs>
    <marker id="sd12q4b-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="50" width="150" height="90" rx="10"/>
  <text class="d-text" x="95" y="88" text-anchor="middle">Rule evaluator</text>
  <text class="d-sub" x="95" y="112" text-anchor="middle">HA pair</text>
  <rect class="d-box-accent" x="220" y="50" width="170" height="90" rx="10"/>
  <text class="d-text" x="305" y="88" text-anchor="middle">Dedupe, group</text>
  <text class="d-sub" x="305" y="112" text-anchor="middle">by cluster, alert</text>
  <rect class="d-box" x="440" y="50" width="170" height="90" rx="10"/>
  <text class="d-text" x="525" y="88" text-anchor="middle">Inhibit, silence</text>
  <text class="d-sub" x="525" y="112" text-anchor="middle">suppress noise</text>
  <rect class="d-box-muted" x="660" y="50" width="180" height="90" rx="10"/>
  <text class="d-text" x="750" y="88" text-anchor="middle">Route</text>
  <text class="d-sub" x="750" y="112" text-anchor="middle">pager, chat, ticket</text>
  <path class="d-edge" d="M 170 95 L 212 95" marker-end="url(#sd12q4b-arrow)"/>
  <path class="d-edge" d="M 390 95 L 432 95" marker-end="url(#sd12q4b-arrow)"/>
  <path class="d-edge" d="M 610 95 L 652 95" marker-end="url(#sd12q4b-arrow)"/>
</svg>

Firing alerts go to a notification manager such as Prometheus Alertmanager, whose job is to turn a storm of alerts into a few useful messages:

📌 **Interview term: deduplication** — two evaluator replicas (run as an HA pair so evaluation survives one failing) send the same alert; the manager notifies once.

📌 **Interview term: grouping** — alerts with the same grouping labels (cluster, alert name) become one notification. Alertmanager waits \`group_wait\` (default 30 s) to collect the first batch, sends updates for the group at most every \`group_interval\` (default 5 m), and repeats an unresolved notification every \`repeat_interval\` (default 4 h), per its configuration docs.

📌 **Interview term: inhibition** — while a source alert fires (a whole cluster is down), suppress target alerts it explains (every service in that cluster failing).

📌 **Interview term: silence** — a time-limited mute by label matchers, for maintenance or a known issue.

**Routing** sends \`severity=page\` to the on-call pager for the owning team, \`severity=ticket\` to the issue tracker, and everything to a chat channel; every alert should carry a runbook link. Delivery itself is a notification system problem ([How would you design a notification system?](/interview-question/how-would-you-design-a-notification-system)).

📌 **Interview term: dead man's switch (watchdog alert)** — an alert that always fires; an external service pages if it **stops** arriving, which catches a broken monitoring pipeline that would otherwise stay silent.

## 10. What Breaks First at 10x

- **Cardinality, not samples.** Ingesters hold an index and buffers per active series; a single deploy that adds a pod-name or user label can multiply memory. Enforce per-tenant and per-metric series limits at the distributor and reject over-limit writes with a clear error.
- **Expensive queries.** A dashboard summing a year of 2 million series kills queriers; use downsampled data, recording rules (precomputed aggregates) and query result caching, plus query limits.
- **Rule evaluation lag.** Thousands of rules every 30 s; shard rule groups across evaluators and alert on evaluation duration.
- **Churn.** Autoscaling pods create new series names constantly; series that existed for 10 minutes still cost index entries. Avoid per-pod labels on high-volume metrics where possible.
- **The monitor monitoring itself.** Run a small, separate meta-monitoring stack and the dead man's switch.

## 11. Verified: Running the Code

The example **"SLO alerting: a naive threshold vs multiwindow, multi-burn-rate alerts on four failure shapes, plus label cardinality arithmetic"** was run with \`node main.js\` (Node 22.22), \`python3.12 main.py\`, \`go run main.go\` (Go 1.24) and \`javac Main.java && java Main\` (Java 21). All four print exactly this:

~~~text
== blip: 20% errors for 2 min ==
  error budget used: 0.9% of the 30-day budget (400 of 43200 errors)
  naive >1% in 1m     fires after 1 min, 1 firing(s), clears after 3 min
  page  14.4x 1h+5m   never
  page  6x    6h+30m  never
  ticket 1x   3d+6h   never
== outage: 10% errors for 60 min ==
  error budget used: 13.9% of the 30-day budget (6000 of 43200 errors)
  naive >1% in 1m     fires after 1 min, 1 firing(s), clears after 61 min
  page  14.4x 1h+5m   fires after 9 min, 1 firing(s), clears after 65 min
  page  6x    6h+30m  fires after 22 min, 1 firing(s), clears after 89 min
  ticket 1x   3d+6h   fires after 44 min, 1 firing(s), clears after 417 min
== slow burn: 0.8% errors from then on ==
  error budget used: 95.6% of the 30-day budget (41280 of 43200 errors)
  naive >1% in 1m     never
  page  14.4x 1h+5m   never
  page  6x    6h+30m  fires after 271 min, 1 firing(s), still firing at the end
  ticket 1x   3d+6h   fires after 541 min, 1 firing(s), still firing at the end
== trickle: 0.3% errors from then on ==
  error budget used: 35.8% of the 30-day budget (15480 of 43200 errors)
  naive >1% in 1m     never
  page  14.4x 1h+5m   never
  page  6x    6h+30m  never
  ticket 1x   3d+6h   fires after 1441 min, 1 firing(s), still firing at the end

== Cardinality: every label multiplies the number of series ==
  200 services x 10 pods x 20 endpoints x 4 status classes x 14 histogram series = 2240000 series
  scraped every 15 s: 12902400000 samples/day, 17.7 GB/day at 1.37 B/sample
  add a user_id label with 100000 active users: 224000000000 series
~~~

The example **"Gorilla-style compression: delta-of-delta timestamps and XOR values, counted bit by bit for four kinds of series"** was run with \`node main.js\` and \`python3.12 main.py\`; both print the table shown in section 7.

What the simulations stand for and leave out: the alerting run uses exact integer error counts per minute and assumes the service was healthy for weeks before (so the 3-day window is full); a real system computes these ratios with \`rate()\` over scraped counters, evaluates every 30 s or so, and adds \`for\` durations. The compression example counts bits instead of writing a bit stream and does not decode; it follows the Gorilla paper encoding (delta-of-delta buckets of 7, 9 and 12 bits; XOR with reused or new leading and trailing zero counts), while real TSDBs use variants of it. The 1.37 bytes per sample in the cardinality line is the paper average, applied as an assumption.

## Edge Cases Worth Knowing

- **Counter resets.** A process restart sets a counter back to 0; \`rate()\` detects the drop and treats it as a reset, but a counter that legitimately decreases is a gauge in disguise.
- **Missing data.** An alert on \`error_ratio > x\` does not fire when the service stops reporting; pair it with an \`absent()\` or \`up == 0\` alert.
- **Low traffic.** At 10 requests an hour, one failure is a 10% error rate; burn-rate alerts need a minimum request count or longer windows.
- **Histogram bucket choice.** Percentiles are interpolated within buckets; if all requests fall in the 1-2.5 s bucket, p99 is a guess. Choose buckets around your SLO threshold.
- **Averages of percentiles.** You cannot average p99s across pods; aggregate the histogram buckets first, then compute the quantile.

## Common Pitfalls

- **High-cardinality labels.** User IDs, request IDs and raw URLs as labels explode series count and memory.
- **Paging on causes.** CPU, memory and queue depth alerts wake people for things users never notice; page on SLO burn and keep causes on dashboards.
- **Single-window thresholds.** They page on blips and miss slow burns; the run showed both.
- **No grouping or inhibition.** One network failure becomes 300 pages.
- **Querying raw data for long ranges.** Without downsampling and recording rules, year-long dashboards are slow and expensive.
- **No monitor for the monitor.** A broken pipeline is silent unless a dead man's switch exists.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model and scale:</strong> <span style="color:#f0e2c8;">A series is a metric name plus labels; samples are (timestamp, float). Scale is set by <strong style="color:#ffca28;">cardinality</strong>: 200 services, 10 pods, 20 endpoints, 4 statuses and a 14-series histogram is <strong style="color:#ffca28;">2.24 million series</strong>, 12.9 billion samples a day at 15 s; one <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">user_id</code> label would make it 224 billion. I enforce series limits per tenant.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Write path:</strong> <span style="color:#f0e2c8;">Agents scrape <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">/metrics</code> with service discovery and push to distributors, which validate, apply limits and hash series onto ingesters with replication 3 and write quorum 2. Ingesters keep a 2-hour head in memory plus a <strong style="color:#ffca28;">WAL</strong>, then flush compressed blocks to object storage.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Storage:</strong> <span style="color:#f0e2c8;"><strong style="color:#ffca28;">Delta-of-delta</strong> timestamps and <strong style="color:#ffca28;">XOR</strong> values give about 1.37 bytes per sample on average per the Gorilla paper, but it is data-dependent: in my bit count, a constant cost 0.37 B, a counter 2.17 B and a 0.1-step gauge 6.59 B. Old data is <strong style="color:#ffca28;">downsampled</strong> with tiered retention.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Alerting:</strong> <span style="color:#f0e2c8;">Alert on <strong style="color:#ffca28;">SLO burn rate</strong> with multiple windows: page at 14.4x over 1 h and 5 min, 6x over 6 h and 30 min, ticket at 1x over 3 days. In my simulation that ignored a 2-minute blip, paged 9 minutes into an outage and caught a 0.8% slow burn the naive 1% threshold never saw.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Notification:</strong> <span style="color:#f0e2c8;">An Alertmanager-style layer <strong style="color:#ffca28;">dedupes</strong> HA evaluators, <strong style="color:#ffca28;">groups</strong> (30 s group_wait by default), <strong style="color:#ffca28;">inhibits</strong> symptoms of a known cause, honours <strong style="color:#ffca28;">silences</strong> and routes by severity and team. A <strong style="color:#ffca28;">dead man's switch</strong> proves the pipeline itself is alive.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Pull or push?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Pull gives free health checks (<code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">up</code>) and central control of rate; push suits short-lived jobs and unreachable networks. At scale I use local agents that scrape and push upstream, which gives both.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you compute p99 latency across 50 pods?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Each pod exports histogram bucket counters. I sum the bucket rates across pods first and then compute the quantile from the summed buckets. Averaging per-pod p99 values is mathematically wrong.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens when a team adds a high-cardinality label?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The distributor counts active series per tenant and per metric and rejects writes over the limit with an error the team sees, and I alert the platform on series growth. Without that, ingesters run out of memory and everyone loses monitoring.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why the short window in burn-rate alerts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The long window proves enough budget was spent to matter; the short window proves it is still happening. Without it the alert keeps firing for up to an hour after a fix. In my run the 1-hour page cleared 5 minutes after the outage ended.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep a year of data affordable?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Compressed immutable blocks in object storage, downsampled to 5-minute and 1-hour aggregates with shorter retention for raw data, plus recording rules for heavy dashboard queries.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Time series | Samples for one metric name and one label set |
| Sample | One (timestamp, float64) point |
| Counter, gauge, histogram | Only-up count; up-and-down value; bucket counters |
| Cardinality | Number of distinct series |
| rate() over a counter | Per-second increase over a window, handling resets |
| Pull (scrape) model | Monitor fetches \`/metrics\` from discovered targets |
| Push model | Targets or agents send samples |
| Delta-of-delta encoding | Store change in timestamp gaps; regular scrapes cost 1 bit |
| XOR float compression | Store only differing bits of consecutive values |
| Downsampling | Precomputed lower-resolution aggregates for old data |
| Retention | How long each resolution is kept |
| Alert rule | Expression plus \`for\` duration; pending then firing |
| Error budget | Failures the SLO allows over its window |
| Burn rate | Error ratio divided by the allowed ratio |
| Multiwindow, multi-burn-rate alert | Long and short window must both exceed a burn threshold |
| Deduplication | One notification for identical alerts from replicas |
| Grouping | Related alerts merged into one notification |
| Inhibition | Suppress alerts explained by a firing source alert |
| Silence | Time-limited mute by label matchers |
| Dead man's switch | Always-firing alert whose absence pages |

**Conclusion:** A metrics and alerting system is a time-series database with an alarm attached. Its scale is decided by cardinality, so label discipline and per-tenant series limits come first; its cost by compression, downsampling and object storage, remembering that the famous 1.37 bytes per sample depends on the data; and its usefulness by alerting on what users feel. Multiwindow burn-rate alerts on SLOs page quickly for real outages, stay quiet for blips and catch slow burns that thresholds miss, and a notification layer that dedupes, groups, inhibits and routes turns those alerts into a few actionable pages. Build it horizontally sharded with replication, and make sure something outside it notices when it goes silent.`,
    examples: [
      {
        label: `SLO alerting: a naive threshold vs multiwindow, multi-burn-rate alerts on four failure shapes, plus label cardinality arithmetic`,
        variants: [
          { tech: "node", code: `// SLO alerting: a naive threshold vs multiwindow, multi-burn-rate alerts, plus label cardinality arithmetic.
// Times are minutes since the trouble started. SLO 99.9% over 30 days, 1000 requests/minute, 4 simulated days per scenario, trouble starts at minute 600.
const RPM = 1000, MINUTES = 4 * 24 * 60, START = 600;
const BUDGET = (RPM * 30 * 24 * 60) / 1000; // 0.1% of 30 days of requests
// burn is in tenths (144 = 14.4x); windows in minutes; both windows must exceed the burn rate
const RULES = [
  ["page  14.4x 1h+5m", 144, 60, 5],
  ["page  6x    6h+30m", 60, 360, 30],
  ["ticket 1x   3d+6h", 10, 4320, 360],
];
const SCENARIOS = [
  ["blip: 20% errors for 2 min", (t) => (t >= START && t < START + 2 ? 200 : 0)],
  ["outage: 10% errors for 60 min", (t) => (t >= START && t < START + 60 ? 100 : 0)],
  ["slow burn: 0.8% errors from then on", (t) => (t >= START ? 8 : 0)],
  ["trickle: 0.3% errors from then on", (t) => (t >= START ? 3 : 0)],
];
const tenths = (num, den) => { const x = Math.floor((num * 10 + Math.floor(den / 2)) / den); return \`\${Math.floor(x / 10)}.\${x % 10}\`; };

function evaluate(firing) {
  let first = -1, fires = 0, cleared = -1, prev = false;
  for (let t = 0; t < MINUTES; t++) {
    const f = firing(t);
    if (f && !prev) { fires++; if (first < 0) first = t; }
    if (!f && prev && cleared < 0) cleared = t;
    prev = f;
  }
  if (first < 0) return "never";
  return \`fires after \${first - START + 1} min, \${fires} firing(s)\` + (cleared >= 0 ? \`, clears after \${cleared - START + 1} min\` : ", still firing at the end");
}

for (const [name, errAt] of SCENARIOS) {
  const prefix = [0];
  for (let t = 0; t < MINUTES; t++) prefix.push(prefix[t] + errAt(t));
  const errorsIn = (t, w) => prefix[t + 1] - prefix[Math.max(0, t + 1 - w)];
  const requestsIn = (t, w) => RPM * w; // the service ran cleanly for weeks before the simulation
  // error ratio > burn x 0.1%  <=>  errors * 10000 > burnTenths * requests
  const over = (t, w, burn) => errorsIn(t, w) * 10000 > burn * requestsIn(t, w);
  console.log(\`== \${name} ==\`);
  console.log(\`  error budget used: \${tenths(prefix[MINUTES] * 100, BUDGET)}% of the 30-day budget (\${prefix[MINUTES]} of \${BUDGET} errors)\`);
  console.log(\`  naive >1% in 1m     \${evaluate((t) => errorsIn(t, 1) * 100 > RPM)}\`);
  for (const [label, burn, long, short] of RULES) {
    console.log(\`  \${label.padEnd(19)} \${evaluate((t) => over(t, long, burn) && over(t, short, burn))}\`);
  }
}

console.log("\\n== Cardinality: every label multiplies the number of series ==");
const services = 200, pods = 10, endpoints = 20, statuses = 4, histSeries = 12 + 2;
const series = services * pods * endpoints * statuses * histSeries;
const perDay = series * ((24 * 60 * 60) / 15);
console.log(\`  \${services} services x \${pods} pods x \${endpoints} endpoints x \${statuses} status classes x \${histSeries} histogram series = \${series} series\`);
console.log(\`  scraped every 15 s: \${perDay} samples/day, \${tenths(perDay * 137, 100 * 1000000000)} GB/day at 1.37 B/sample\`);
console.log(\`  add a user_id label with 100000 active users: \${series * 100000} series\`);` },
          { tech: "python", code: `# SLO alerting: a naive threshold vs multiwindow, multi-burn-rate alerts, plus label cardinality arithmetic.
# Times are minutes since the trouble started. SLO 99.9% over 30 days, 1000 requests/minute, 4 simulated days per scenario, trouble starts at minute 600.
RPM, MINUTES, START = 1000, 4 * 24 * 60, 600
BUDGET = RPM * 30 * 24 * 60 // 1000  # 0.1% of 30 days of requests
# burn is in tenths (144 = 14.4x); windows in minutes; both windows must exceed the burn rate
RULES = [
    ("page  14.4x 1h+5m", 144, 60, 5),
    ("page  6x    6h+30m", 60, 360, 30),
    ("ticket 1x   3d+6h", 10, 4320, 360),
]
SCENARIOS = [
    ("blip: 20% errors for 2 min", lambda t: 200 if START <= t < START + 2 else 0),
    ("outage: 10% errors for 60 min", lambda t: 100 if START <= t < START + 60 else 0),
    ("slow burn: 0.8% errors from then on", lambda t: 8 if t >= START else 0),
    ("trickle: 0.3% errors from then on", lambda t: 3 if t >= START else 0),
]


def tenths(num, den):
    x = (num * 10 + den // 2) // den
    return f"{x // 10}.{x % 10}"


def evaluate(firing):
    first, fires, cleared, prev = -1, 0, -1, False
    for t in range(MINUTES):
        f = firing(t)
        if f and not prev:
            fires += 1
            if first < 0:
                first = t
        if not f and prev and cleared < 0:
            cleared = t
        prev = f
    if first < 0:
        return "never"
    tail = f", clears after {cleared - START + 1} min" if cleared >= 0 else ", still firing at the end"
    return f"fires after {first - START + 1} min, {fires} firing(s)" + tail


for name, err_at in SCENARIOS:
    prefix = [0]
    for t in range(MINUTES):
        prefix.append(prefix[t] + err_at(t))

    def errors_in(t, w):
        return prefix[t + 1] - prefix[max(0, t + 1 - w)]

    def requests_in(t, w):
        return RPM * w  # the service ran cleanly for weeks before the simulation

    # error ratio > burn x 0.1%  <=>  errors * 10000 > burnTenths * requests
    def over(t, w, burn):
        return errors_in(t, w) * 10000 > burn * requests_in(t, w)

    print(f"== {name} ==")
    print(f"  error budget used: {tenths(prefix[MINUTES] * 100, BUDGET)}% of the 30-day budget ({prefix[MINUTES]} of {BUDGET} errors)")
    print(f"  naive >1% in 1m     {evaluate(lambda t: errors_in(t, 1) * 100 > RPM)}")
    for label, burn, long, short in RULES:
        print(f"  {label.ljust(19)} {evaluate(lambda t: over(t, long, burn) and over(t, short, burn))}")

print("\\n== Cardinality: every label multiplies the number of series ==")
services, pods, endpoints, statuses, hist_series = 200, 10, 20, 4, 12 + 2
series = services * pods * endpoints * statuses * hist_series
per_day = series * (24 * 60 * 60 // 15)
print(f"  {services} services x {pods} pods x {endpoints} endpoints x {statuses} status classes x {hist_series} histogram series = {series} series")
print(f"  scraped every 15 s: {per_day} samples/day, {tenths(per_day * 137, 100 * 1000000000)} GB/day at 1.37 B/sample")
print(f"  add a user_id label with 100000 active users: {series * 100000} series")` },
          { tech: "go", code: `// SLO alerting: a naive threshold vs multiwindow, multi-burn-rate alerts, plus label cardinality arithmetic.
// Times are minutes since the trouble started. SLO 99.9% over 30 days, 1000 requests/minute, 4 simulated days per scenario, trouble starts at minute 600.
package main

import "fmt"

const RPM, MINUTES, START = int64(1000), 4 * 24 * 60, 600

var BUDGET = RPM * 30 * 24 * 60 / 1000 // 0.1% of 30 days of requests

type rule struct {
	label             string
	burn, long, short int64 // burn in tenths (144 = 14.4x); windows in minutes
}

type scenario struct {
	name  string
	errAt func(t int) int64
}

func tenths(num, den int64) string {
	x := (num*10 + den/2) / den
	return fmt.Sprintf("%d.%d", x/10, x%10)
}

func evaluate(firing func(t int) bool) string {
	first, fires, cleared, prev := -1, 0, -1, false
	for t := 0; t < MINUTES; t++ {
		f := firing(t)
		if f && !prev {
			fires++
			if first < 0 {
				first = t
			}
		}
		if !f && prev && cleared < 0 {
			cleared = t
		}
		prev = f
	}
	if first < 0 {
		return "never"
	}
	tail := ", still firing at the end"
	if cleared >= 0 {
		tail = fmt.Sprintf(", clears after %d min", cleared-START+1)
	}
	return fmt.Sprintf("fires after %d min, %d firing(s)", first-START+1, fires) + tail
}

func main() {
	rules := []rule{{"page  14.4x 1h+5m", 144, 60, 5}, {"page  6x    6h+30m", 60, 360, 30}, {"ticket 1x   3d+6h", 10, 4320, 360}}
	scenarios := []scenario{
		{"blip: 20% errors for 2 min", func(t int) int64 {
			if t >= START && t < START+2 {
				return 200
			}
			return 0
		}},
		{"outage: 10% errors for 60 min", func(t int) int64 {
			if t >= START && t < START+60 {
				return 100
			}
			return 0
		}},
		{"slow burn: 0.8% errors from then on", func(t int) int64 {
			if t >= START {
				return 8
			}
			return 0
		}},
		{"trickle: 0.3% errors from then on", func(t int) int64 {
			if t >= START {
				return 3
			}
			return 0
		}},
	}
	for _, sc := range scenarios {
		prefix := make([]int64, MINUTES+1)
		for t := 0; t < MINUTES; t++ {
			prefix[t+1] = prefix[t] + sc.errAt(t)
		}
		errorsIn := func(t int, w int64) int64 {
			lo := t + 1 - int(w)
			if lo < 0 {
				lo = 0
			}
			return prefix[t+1] - prefix[lo]
		}
		requestsIn := func(w int64) int64 { return RPM * w } // the service ran cleanly for weeks before the simulation
		// error ratio > burn x 0.1%  <=>  errors * 10000 > burnTenths * requests
		over := func(t int, w, burn int64) bool { return errorsIn(t, w)*10000 > burn*requestsIn(w) }
		fmt.Printf("== %s ==\\n", sc.name)
		fmt.Printf("  error budget used: %s%% of the 30-day budget (%d of %d errors)\\n", tenths(prefix[MINUTES]*100, BUDGET), prefix[MINUTES], BUDGET)
		fmt.Printf("  naive >1%% in 1m     %s\\n", evaluate(func(t int) bool { return errorsIn(t, 1)*100 > RPM }))
		for _, r := range rules {
			r := r
			fmt.Printf("  %-19s %s\\n", r.label, evaluate(func(t int) bool { return over(t, r.long, r.burn) && over(t, r.short, r.burn) }))
		}
	}
	fmt.Println("\\n== Cardinality: every label multiplies the number of series ==")
	services, pods, endpoints, statuses, histSeries := int64(200), int64(10), int64(20), int64(4), int64(12+2)
	series := services * pods * endpoints * statuses * histSeries
	perDay := series * (24 * 60 * 60 / 15)
	fmt.Printf("  %d services x %d pods x %d endpoints x %d status classes x %d histogram series = %d series\\n", services, pods, endpoints, statuses, histSeries, series)
	fmt.Printf("  scraped every 15 s: %d samples/day, %s GB/day at 1.37 B/sample\\n", perDay, tenths(perDay*137, 100*1000000000))
	fmt.Printf("  add a user_id label with 100000 active users: %d series\\n", series*100000)
}` },
          { tech: "java", code: `// SLO alerting: a naive threshold vs multiwindow, multi-burn-rate alerts, plus label cardinality arithmetic.
// Times are minutes since the trouble started. SLO 99.9% over 30 days, 1000 requests/minute, 4 simulated days per scenario, trouble starts at minute 600.
import java.util.function.IntPredicate;
import java.util.function.IntToLongFunction;

public class Main {
    static final long RPM = 1000;
    static final int MINUTES = 4 * 24 * 60, START = 600;
    static final long BUDGET = RPM * 30 * 24 * 60 / 1000; // 0.1% of 30 days of requests

    record Rule(String label, long burn, long longW, long shortW) {} // burn in tenths (144 = 14.4x); windows in minutes
    record Scenario(String name, IntToLongFunction errAt) {}

    static String tenths(long num, long den) {
        long x = (num * 10 + den / 2) / den;
        return (x / 10) + "." + (x % 10);
    }

    static String evaluate(IntPredicate firing) {
        int first = -1, fires = 0, cleared = -1;
        boolean prev = false;
        for (int t = 0; t < MINUTES; t++) {
            boolean f = firing.test(t);
            if (f && !prev) { fires++; if (first < 0) first = t; }
            if (!f && prev && cleared < 0) cleared = t;
            prev = f;
        }
        if (first < 0) return "never";
        String tail = cleared >= 0 ? ", clears after " + (cleared - START + 1) + " min" : ", still firing at the end";
        return "fires after " + (first - START + 1) + " min, " + fires + " firing(s)" + tail;
    }

    public static void main(String[] args) {
        Rule[] rules = { new Rule("page  14.4x 1h+5m", 144, 60, 5), new Rule("page  6x    6h+30m", 60, 360, 30), new Rule("ticket 1x   3d+6h", 10, 4320, 360) };
        Scenario[] scenarios = {
            new Scenario("blip: 20% errors for 2 min", t -> t >= START && t < START + 2 ? 200 : 0),
            new Scenario("outage: 10% errors for 60 min", t -> t >= START && t < START + 60 ? 100 : 0),
            new Scenario("slow burn: 0.8% errors from then on", t -> t >= START ? 8 : 0),
            new Scenario("trickle: 0.3% errors from then on", t -> t >= START ? 3 : 0),
        };
        for (Scenario sc : scenarios) {
            long[] prefix = new long[MINUTES + 1];
            for (int t = 0; t < MINUTES; t++) prefix[t + 1] = prefix[t] + sc.errAt().applyAsLong(t);
            System.out.println("== " + sc.name() + " ==");
            System.out.println("  error budget used: " + tenths(prefix[MINUTES] * 100, BUDGET) + "% of the 30-day budget (" + prefix[MINUTES] + " of " + BUDGET + " errors)");
            System.out.println("  naive >1% in 1m     " + evaluate(t -> errorsIn(prefix, t, 1) * 100 > RPM));
            for (Rule r : rules) {
                System.out.println("  " + String.format("%-19s", r.label()) + " " + evaluate(t -> over(prefix, t, r.longW(), r.burn()) && over(prefix, t, r.shortW(), r.burn())));
            }
        }
        System.out.println("\\n== Cardinality: every label multiplies the number of series ==");
        long services = 200, pods = 10, endpoints = 20, statuses = 4, histSeries = 12 + 2;
        long series = services * pods * endpoints * statuses * histSeries;
        long perDay = series * (24 * 60 * 60 / 15);
        System.out.println("  " + services + " services x " + pods + " pods x " + endpoints + " endpoints x " + statuses + " status classes x " + histSeries + " histogram series = " + series + " series");
        System.out.println("  scraped every 15 s: " + perDay + " samples/day, " + tenths(perDay * 137, 100L * 1000000000L) + " GB/day at 1.37 B/sample");
        System.out.println("  add a user_id label with 100000 active users: " + (series * 100000) + " series");
    }

    static long errorsIn(long[] prefix, int t, long w) {
        int lo = Math.max(0, t + 1 - (int) w);
        return prefix[t + 1] - prefix[lo];
    }

    static long requestsIn(long w) { return RPM * w; } // the service ran cleanly for weeks before the simulation

    // error ratio > burn x 0.1%  <=>  errors * 10000 > burnTenths * requests
    static boolean over(long[] prefix, int t, long w, long burn) { return errorsIn(prefix, t, w) * 10000 > burn * requestsIn(w); }
}` },
        ],
      },
      {
        label: `Gorilla-style compression: delta-of-delta timestamps and XOR values, counted bit by bit for four kinds of series`,
        variants: [
          { tech: "node", code: `// Gorilla-style compression (delta-of-delta timestamps + XOR float values): count the bits for
// one 2-hour block (480 samples at a 15 s scrape interval) of four kinds of series.
let seed = 99;
function rand() { seed = (seed * 48271) % 2147483647; return seed / 2147483647; }
const N = 480;

function timestampBits(ts) {
  let bits = 64 + 14, prevDelta = ts[1] - ts[0]; // header timestamp + first delta
  for (let i = 2; i < ts.length; i++) {
    const delta = ts[i] - ts[i - 1], dod = delta - prevDelta; prevDelta = delta;
    if (dod === 0) bits += 1;
    else if (dod >= -63 && dod <= 64) bits += 2 + 7;
    else if (dod >= -255 && dod <= 256) bits += 3 + 9;
    else if (dod >= -2047 && dod <= 2048) bits += 4 + 12;
    else bits += 4 + 32;
  }
  return bits;
}
const view = new DataView(new ArrayBuffer(8));
function f64bits(v) { view.setFloat64(0, v); return view.getBigUint64(0); }
function lz(x) { return 64 - x.toString(2).length; }
function tz(x) { let n = 0; while ((x & 1n) === 0n) { x >>= 1n; n++; } return n; }

function valueBits(vals) {
  let bits = 64, prev = f64bits(vals[0]), pl = -1, pt = -1, zero = 0, reuse = 0, fresh = 0;
  for (let i = 1; i < vals.length; i++) {
    const cur = f64bits(vals[i]), x = cur ^ prev; prev = cur;
    if (x === 0n) { bits += 1; zero++; continue; }
    const l = Math.min(lz(x), 31), t = tz(x);
    if (pl >= 0 && l >= pl && t >= pt) { bits += 2 + (64 - pl - pt); reuse++; }
    else { bits += 2 + 5 + 6 + (64 - l - t); pl = l; pt = t; fresh++; }
  }
  return { bits, zero, reuse, fresh };
}

const ts = [1700000000];
for (let i = 1; i < N; i++) ts.push(ts[i - 1] + 15 + (rand() < 0.05 ? (rand() < 0.5 ? -1 : 1) : 0));
const series = { counter: [], constant: [], gauge_tenths: [], random_float: [] };
const LOOKS = { counter: "43, 94, 137, 187 ...", constant: "1, 1, 1 ...", gauge_tenths: "45.1, 45.2, 45.1 ...", random_float: "0.4999..., 0.3657 ..." };
let total = 0, tenths = 450;
for (let i = 0; i < N; i++) {
  total += 40 + Math.floor(rand() * 20); series.counter.push(total);
  series.constant.push(1);
  tenths += rand() < 0.5 ? -1 : 1; series.gauge_tenths.push(tenths / 10);
  series.random_float.push(rand());
}
const tBits = timestampBits(ts);
console.log(\`timestamps: \${N} samples, jittered 15 s interval -> \${tBits} bits (\${(tBits / N).toFixed(2)} bits/sample)\`);
console.log("series          example values             zero-xor reuse  new  bytes/sample  vs 16 B raw");
for (const [name, vals] of Object.entries(series)) {
  const v = valueBits(vals);
  const bytes = Math.ceil((tBits + v.bits) / 8);
  console.log(\`\${name.padEnd(15)} \${LOOKS[name].padEnd(26)} \${String(v.zero).padStart(7)} \${String(v.reuse).padStart(5)} \${String(v.fresh).padStart(4)} \${(bytes / N).toFixed(2).padStart(12)} \${((16 * N) / bytes).toFixed(1).padStart(9)}x\`);
}` },
          { tech: "python", code: `# Gorilla-style compression (delta-of-delta timestamps + XOR float values): count the bits for
# one 2-hour block (480 samples at a 15 s scrape interval) of four kinds of series.
import math
import struct

seed = 99


def rand():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647


N = 480


def timestamp_bits(ts):
    bits, prev_delta = 64 + 14, ts[1] - ts[0]  # header timestamp + first delta
    for i in range(2, len(ts)):
        delta = ts[i] - ts[i - 1]
        dod = delta - prev_delta
        prev_delta = delta
        if dod == 0:
            bits += 1
        elif -63 <= dod <= 64:
            bits += 2 + 7
        elif -255 <= dod <= 256:
            bits += 3 + 9
        elif -2047 <= dod <= 2048:
            bits += 4 + 12
        else:
            bits += 4 + 32
    return bits


def f64bits(v):
    return struct.unpack(">Q", struct.pack(">d", float(v)))[0]


def lz(x):
    return 64 - x.bit_length()


def tz(x):
    return (x & -x).bit_length() - 1


def value_bits(vals):
    bits, prev, pl, pt, zero, reuse, fresh = 64, f64bits(vals[0]), -1, -1, 0, 0, 0
    for v in vals[1:]:
        cur = f64bits(v)
        x = cur ^ prev
        prev = cur
        if x == 0:
            bits += 1
            zero += 1
            continue
        l, t = min(lz(x), 31), tz(x)
        if pl >= 0 and l >= pl and t >= pt:
            bits += 2 + (64 - pl - pt)
            reuse += 1
        else:
            bits += 2 + 5 + 6 + (64 - l - t)
            pl, pt = l, t
            fresh += 1
    return {"bits": bits, "zero": zero, "reuse": reuse, "fresh": fresh}


ts = [1700000000]
for i in range(1, N):
    ts.append(ts[i - 1] + 15 + (((-1 if rand() < 0.5 else 1)) if rand() < 0.05 else 0))
series = {"counter": [], "constant": [], "gauge_tenths": [], "random_float": []}
LOOKS = {"counter": "43, 94, 137, 187 ...", "constant": "1, 1, 1 ...", "gauge_tenths": "45.1, 45.2, 45.1 ...", "random_float": "0.4999..., 0.3657 ..."}
total, tenths = 0, 450
for i in range(N):
    total += 40 + math.floor(rand() * 20)
    series["counter"].append(total)
    series["constant"].append(1)
    tenths += -1 if rand() < 0.5 else 1
    series["gauge_tenths"].append(tenths / 10)
    series["random_float"].append(rand())
t_bits = timestamp_bits(ts)
print(f"timestamps: {N} samples, jittered 15 s interval -> {t_bits} bits ({t_bits / N:.2f} bits/sample)")
print("series          example values             zero-xor reuse  new  bytes/sample  vs 16 B raw")
for name, vals in series.items():
    v = value_bits(vals)
    nbytes = math.ceil((t_bits + v["bits"]) / 8)
    print(f"{name.ljust(15)} {LOOKS[name].ljust(26)} {str(v['zero']).rjust(7)} {str(v['reuse']).rjust(5)} {str(v['fresh']).rjust(4)} {f'{nbytes / N:.2f}'.rjust(12)} {f'{16 * N / nbytes:.1f}'.rjust(9)}x")` },
        ],
      },
    ],
  },
  {
    title: `How would you design an analytics/metrics pipeline?`,
    difficulty: "hard",
    seoDescription: `Design an analytics pipeline: event collection, Kafka log, event-time windows and watermarks, dedup, rollups, HyperLogLog uniques, OLAP storage and replay.`,
    description: `**Question presented to candidate:**
"Our web and mobile apps emit a firehose of product events: page views, clicks, sign-ups, purchases. Product managers want dashboards that update within a minute, and finance wants daily numbers they can trust. Design the pipeline from the device to the dashboard."

**What a strong answer should cover:**
- **Collection**: batched client SDKs, a stateless ingest API, an event schema with **event ID, event time and receive time**, schema validation and versioning
- A durable **log** (Kafka or similar) as the backbone, partitioned for throughput, retained for **replay**
- Stream processing with **event-time windows and watermarks**, a policy for **late events**, and **deduplication** of retries; why processing-time windows give wrong answers
- Storage: raw events in a columnar data lake, **pre-aggregated rollups** in an OLAP store for fast dashboards; partitioning and sort keys
- **Distinct counts** with mergeable sketches (HyperLogLog), because unique counts do not add across hours or regions
- **Lambda vs Kappa**: stream for freshness, batch or replay for corrections; a worked capacity estimate and what breaks at 10x

**Clarifying questions expected:**
- How many events per day, how large, and how bursty?
- How fresh must dashboards be, and how exact must the numbers be (approximate uniques acceptable)?
- How late can events arrive (offline mobile clients), and must corrections update past numbers?

**Code / implementation expected:** Optional — the examples run event-time windows with watermarks, duplicates and late events against a batch truth, and compare exact and HyperLogLog distinct counts.`,
    answer: `**Target Audience:** Engineers who have sent analytics events from an app and want to know how they become trustworthy dashboard numbers, and candidates preparing for a data-pipeline design round.
**Difficulty:** Hard
**Verified with:** Node 22.22 and Python 3.12 (both examples print identical output in both). The Lambda/Kappa history is from coverage of Jay Kreps's 2014 O'Reilly essay "Questioning the Lambda Architecture" (HPCwire, Kai Waehner); Redis HyperLogLog size and error (12 KB, 0.81%) from the Redis documentation.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. Every number comes from running the examples; the **Verified** section quotes their full output.

## 1. Why This Even Matters — A Story First

An election night newsroom receives vote counts from thousands of polling stations. Most phone in within minutes of closing; some rural stations drive their paper ballots in hours later; a few call twice because the line dropped.

The newsroom has two audiences. Viewers want a **live** number on screen right now, even if it will change. The electoral commission wants the **official** number, exact, a day later. If the newsroom simply added every call as it arrived, it would count the double callers twice, and if it closed the tally at 10 p.m. sharp, it would lose the rural stations.

An analytics pipeline has the same shape: events arrive late, out of order and sometimes twice; product managers want a live dashboard, finance wants the official number. The design is about getting a fast answer that is honest about being provisional, and a correct answer that eventually replaces it.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Events per day, average size, peak-to-average ratio? | Sizes ingest, partitions, storage |
| How fresh must dashboards be? Seconds, a minute, an hour? | Stream processing or micro-batch, and the watermark lag you can afford |
| How exact? Are approximate unique counts acceptable? | Exact distinct counts are expensive; sketches are cheap and mergeable |
| How late can events be (offline mobile)? Must old numbers be corrected? | Late-event policy, restatement and replay |
| What dimensions do dashboards slice by, and which are high-cardinality? | Rollup design and OLAP sort keys |
| Privacy: consent, user deletion requests, regions? | Where personal data lives and how it is deleted or anonymised |

## 3. Requirements

**Functional**
- Clients send events in batches; the system acknowledges quickly and never loses an acknowledged event.
- Dashboards show counts, sums and unique users per minute, hour and day, sliced by a few dimensions (country, device, page), within about a minute.
- Analysts can query raw events with SQL; daily reports are exact and reproducible.
- Corrections: late or reprocessed data updates the affected periods.

**Non-functional**
- Peak throughput several times the average (computed below), with durable buffering for spikes and downstream outages.
- **At-least-once** delivery end to end, made effectively exactly-once by deduplication and idempotent writes.
- Raw data retained for replay and backfills; aggregates retained longer and cheaper.

## 4. Capacity Estimate

Assumptions: 2 billion events per day, 500 bytes per event as JSON, peak three times the average, a partition consumer handling 5 MB/s, and 10:1 compression for columnar storage. All of them are illustrative; measure your own.

~~~text
== Capacity (assumptions in, arithmetic out) ==
events/s: average 23148, peak 69444 (x3)
peak ingest 34.7 MB/s -> at least 7 partitions at 5 MB/s each
raw log 1 TB/day; columnar at 10:1 100 GB/day
minute rollup upper bound: 1440 min x 50 countries x 3 devices x 1000 pages = 216000000 rows/day
~~~

About 23,000 events per second on average and 69,000 at peak; 34.7 MB/s at peak needs at least 7 partitions by throughput alone, and you would provision several times that for headroom and parallelism. Raw data is 1 TB per day, about 100 GB per day once compressed in a columnar format. The upper bound on a per-minute rollup with three dimensions is 216 million rows per day, but real rollups are sparse (most country, device, page combinations do not occur every minute), which is what makes them far smaller than raw data.

## 5. API and Event Schema

- \`POST /v1/events\` with a batch of up to a few hundred events, compressed; returns \`202 Accepted\` once the batch is durably written to the log.
- Each event: \`event_id\` (a UUID generated **on the client**, so retries keep the same ID), \`event_name\`, \`user_id\` or \`anonymous_id\`, \`event_time\` (device clock), \`received_at\` (server clock, added at ingest), \`schema_version\`, \`properties\`.
- Query side: an SQL interface to the warehouse and OLAP store, and a metrics API for dashboards (\`GET /v1/metrics?metric=page_views&group_by=country&granularity=minute&from=...&to=...\`).

📌 **Interview term: event time vs processing time** — event time is when the thing happened (device clock); processing time is when the pipeline sees it. They differ by network delay, offline periods and retries, and analytics questions are almost always about event time.

📌 **Interview term: schema registry** — a central store of event schemas and versions; producers validate against it and consumers know how to read old and new versions. Invalid events go to a **dead-letter** topic instead of breaking the pipeline.

## 6. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 860 330" role="img" aria-label="Clients send batches to a stateless ingest API that writes to a partitioned log; a stream processor writes rollups to an OLAP store for dashboards; the raw log is archived to a data lake where batch jobs recompute exact tables">
  <defs>
    <marker id="sd12q5-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="20" y="120" width="130" height="80" rx="10"/>
  <text class="d-text" x="85" y="155" text-anchor="middle">Clients</text>
  <text class="d-sub" x="85" y="178" text-anchor="middle">batched SDK</text>
  <rect class="d-box" x="190" y="120" width="130" height="80" rx="10"/>
  <text class="d-text" x="255" y="155" text-anchor="middle">Ingest API</text>
  <text class="d-sub" x="255" y="178" text-anchor="middle">validate</text>
  <rect class="d-box-accent" x="360" y="120" width="130" height="80" rx="10"/>
  <text class="d-text" x="425" y="155" text-anchor="middle">Event log</text>
  <text class="d-sub" x="425" y="178" text-anchor="middle">partitioned</text>
  <rect class="d-box" x="540" y="30" width="150" height="80" rx="10"/>
  <text class="d-text" x="615" y="65" text-anchor="middle">Stream job</text>
  <text class="d-sub" x="615" y="88" text-anchor="middle">windows, dedup</text>
  <rect class="d-box" x="540" y="220" width="150" height="80" rx="10"/>
  <text class="d-text" x="615" y="255" text-anchor="middle">Data lake</text>
  <text class="d-sub" x="615" y="278" text-anchor="middle">raw columnar</text>
  <rect class="d-box-muted" x="730" y="30" width="110" height="80" rx="10"/>
  <text class="d-text" x="785" y="65" text-anchor="middle">OLAP</text>
  <text class="d-sub" x="785" y="88" text-anchor="middle">rollups</text>
  <rect class="d-box-muted" x="730" y="220" width="110" height="80" rx="10"/>
  <text class="d-text" x="785" y="255" text-anchor="middle">Batch</text>
  <text class="d-sub" x="785" y="278" text-anchor="middle">exact tables</text>
  <path class="d-edge" d="M 150 160 L 182 160" marker-end="url(#sd12q5-arrow)"/>
  <path class="d-edge" d="M 320 160 L 352 160" marker-end="url(#sd12q5-arrow)"/>
  <path class="d-edge-accent" d="M 490 145 L 534 80" marker-end="url(#sd12q5-arrow)"/>
  <path class="d-edge" d="M 490 175 L 534 245" marker-end="url(#sd12q5-arrow)"/>
  <path class="d-edge" d="M 690 70 L 722 70" marker-end="url(#sd12q5-arrow)"/>
  <path class="d-edge" d="M 690 260 L 722 260" marker-end="url(#sd12q5-arrow)"/>
  <path class="d-edge-dashed" d="M 785 220 L 785 118" marker-end="url(#sd12q5-arrow)"/>
</svg>

The top branch is the fast path that feeds dashboards within a minute; the bottom branch keeps every raw event for SQL, exact reports and replays, and its results correct the rollups (dashed arrow).

- **Ingest API**: stateless, behind a load balancer; validates against the schema, stamps \`received_at\`, writes the batch to the log and only then acknowledges. It does no aggregation, so it scales horizontally and survives downstream outages because the log absorbs them.
- **Event log** (Kafka, Kinesis, Pulsar, ...): partitioned, replicated, retained for days so any consumer can replay. Partition by a key that spreads load evenly (event ID or user ID); per-user ordering is a bonus if you key by user. The trade-offs of log vs queue are in [Kafka vs SQS — how do you choose for an event-driven system in 2025?](/interview-question/kafka-vs-sqs-how-do-you-choose-for-an-event-driven-system-in-2025).
- **Stream processor** (Flink, Kafka Streams, Spark Structured Streaming, ...): parses, deduplicates, enriches (geo from IP, device from user agent), and aggregates into windows.
- **OLAP store** (ClickHouse, Druid, Pinot, BigQuery and similar): columnar, partitioned by time, sorted by the dimensions dashboards filter on, holding rollups and recent raw events.
- **Data lake** (Parquet or a table format on object storage) and a warehouse: the full history, for SQL and batch recomputation.

📌 **Interview term: rollup (pre-aggregation)** — storing counts, sums and sketches per time bucket and dimension combination instead of raw events, so a dashboard reads thousands of rows instead of billions.

📌 **Interview term: OLAP store** — a database optimised for analytical queries over large data (scans, filters, group-bys), usually columnar, as opposed to OLTP databases optimised for many small transactions.

## 7. Deep Dive 1: Event Time, Watermarks and Late Data

A stream processor never knows whether all events for 12:00-12:01 have arrived. It needs a rule for when to close the window.

📌 **Interview term: tumbling window** — fixed, non-overlapping time buckets (every minute). Sliding and session windows are the other common types.

📌 **Interview term: watermark** — the processor's estimate that "no more events older than time T will arrive". A simple watermark is the largest event time seen minus an allowed lag. When the watermark passes the end of a window, the window is emitted.

📌 **Interview term: late event** — an event whose window was already emitted. Options: drop it (and count drops), update the emitted result (an upsert to the OLAP store), or send it to a side output for the batch correction.

The first example sends 6,000 events (10 per second for 10 minutes) through a log with realistic delays: 90% arrive within 2 s, 8% within 30 s, 2% up to 5 minutes late (offline phones), and 3% are sent twice by producer retries. It runs 1-minute event-time windows with different watermark lags, against the batch truth (every window has exactly 600 distinct events):

~~~text
6000 real events over 600 s of event time, 200 retry duplicates, 6200 messages in the log

watermark lag  dedup  duplicates counted  late dropped  total error vs batch  emit delay after window end
        5 s  false                 196           171                    51      5.0 s avg over 9 windows
        5 s  true                    0           167                   167      5.0 s avg over 9 windows
       30 s  true                    0           101                   101     30.2 s avg over 9 windows
      120 s  true                    0            54                    54    120.0 s avg over 7 windows
      300 s  true                    0             0                     0    300.0 s avg over 4 windows
~~~

The trade-off is direct: a 5 s lag emits each window 5 s after it ends but drops 167 late events; a 30 s lag waits 30 s and drops 101; waiting 300 s drops nothing because the maximum delay is 300 s, and dashboards are 5 minutes behind. Most designs pick a short lag for the live number and let the batch path or late-event updates fix the rest.

The first row also shows a trap: without deduplication, 196 retry duplicates were counted, and they **hid** most of the 171 dropped late events, so the total error (51) looked better than the deduplicated run. Two wrongs made a number that looks right and is not. Measure duplicates and late drops separately.

Why event time at all? The same events bucketed by **arrival** (processing time):

~~~text
window       batch truth  event-time (lag 30 s)  processing-time
  0-60  s          600                    587              568
 60-120 s          600                    586              586
120-180 s          600                    582              574
180-240 s          600                    593              604
240-300 s          600                    594              624
300-360 s          600                    587              601
360-420 s          600                    593              600
420-480 s          600                    585              590
480-540 s          600                    592              591
540-600 s          600                    600              617
~~~

Processing-time windows read between 568 and 624 when the truth is 600 in every window: events slide into the next minute when the network is slow, which produces fake dips and spikes. Event-time windows with a 30 s lag are always slightly under (late drops), never in the wrong minute. The last window shows 600 because at the end of input the processor flushed everything it held.

## 8. Deep Dive 2: Duplicates and Exactly-Once

Retries happen at every hop: the SDK retries a timed-out batch, the ingest API retries a log write, a consumer crashes after writing results but before committing its offset. Every hop is **at least once**, so duplicates are normal.

📌 **Interview term: deduplication by event ID** — remembering recently seen event IDs (in the stream processor state, for a bounded window such as 24 h) and dropping repeats; because the ID is generated on the client, retries of the same event share it.

📌 **Interview term: idempotent sink** — writing results so that repeating a write gives the same state: upsert by (window, dimensions) rather than incrementing, or transactional writes tied to the consumed offsets.

The full treatment of what Kafka and SQS can and cannot guarantee is in [Exactly-once processing — can Kafka or SQS guarantee it?](/interview-question/exactly-once-processing-can-kafka-or-sqs-guarantee-it); a money-adjacent version of this pipeline, where counts become invoices, is [How would you design ad click event aggregation?](/interview-question/how-would-you-design-ad-click-event-aggregation-5733).

## 9. Deep Dive 3: Unique Users and Mergeable Sketches

Counts and sums roll up easily: the day is the sum of its hours. **Distinct counts do not.** A user active in 5 different hours is one daily user, not five. Storing every user ID per rollup row is exact but expensive. The second example compares approaches on one simulated day:

~~~text
350030 events from 100000 distinct users in one day

method                 memory      estimate   error    expected std error
exact set              every id      100000    0.00%    -
HLL p=10 (1024 regs)   768 B          95593   -4.41%    3.25%
HLL p=14 (16384 regs)  12288 B        99501   -0.50%    0.81%

== Rolling 24 hourly results up to a daily number ==
hour 0 exact uniques: 13510, hour 0 sketch: 13417
sum of 24 hourly exact unique counts: 326655 (3.27x the true 100000)
merge of 24 hourly sketches (register max): 99501 (-0.50%)
~~~

📌 **Interview term: HyperLogLog (HLL)** — a probabilistic sketch that estimates the number of distinct items from the maximum run of leading zero bits of their hashes, spread over \`m\` registers. Its standard error is about \`1.04 / sqrt(m)\`: 3.25% for 1,024 registers and 0.81% for 16,384. Redis documents its implementation as using up to 12 KB with a standard error of 0.81%, which matches 16,384 registers of 6 bits.

The results: the 768-byte sketch was 4.41% low on this day (one sample, about 1.4 standard errors), the 12 KB sketch 0.50% low. Summing the 24 hourly exact unique counts gave **326,655**, 3.27 times the true 100,000 daily users. Merging the 24 hourly sketches (taking the maximum of each register) gave 99,501, exactly what the daily sketch said, because a merge of sketches is the sketch of the union.

📌 **Interview term: mergeable sketch** — a summary that can be combined across partitions, hours or regions without the raw data: HLL for distinct counts, t-digest or similar for percentiles, Count-Min for heavy hitters. Store a sketch column in each rollup row, and any coarser rollup is a merge.

A related structure for "have I seen this before?" is [What is a Bloom filter and when is it useful?](/interview-question/what-is-a-bloom-filter-and-when-is-it-useful).

## 10. Lambda vs Kappa

📌 **Interview term: Lambda architecture** — run a streaming path for fresh, approximate results and a separate batch path over the full history for correct results, and merge them at query time.

📌 **Interview term: Kappa architecture** — Jay Kreps's 2014 alternative, proposed in "Questioning the Lambda Architecture": one stream-processing codebase, and when logic changes or data must be corrected, **replay** the retained log through a new version of the job, with more parallelism, and switch over.

Kreps's objection to Lambda, as summarised by later coverage, was maintaining the same logic in two complex distributed systems and keeping them in agreement. In practice many pipelines are a hybrid: a single streaming job for freshness, the raw events in a data lake as the source of truth, and scheduled batch jobs (or replays) that restate yesterday's partitions when late data or bugs require it. Whatever the label, two properties matter: **raw events are kept** so any number can be recomputed, and **outputs are idempotent per partition** so a recomputation replaces rather than adds.

| | Lambda | Kappa |
| :--- | :--- | :--- |
| Code paths | Stream and batch | Stream only |
| Corrections | Batch recompute overwrites | Replay the log into a new job version |
| Needs | Two implementations that agree | Long log retention and fast replay |
| Typical risk | Logic drift between paths | Replay cost and time for long histories |

## 11. Storage Layout and Query Speed

- **Partition by event date** (and hour for big tables) so queries and restatements touch only the affected partitions. Late events land in old partitions, which is why restatement must be routine.
- **Sort or order keys** match dashboard filters (date, then event name, then country); columnar compression is far better on sorted data.
- **Hot vs cold**: recent rollups and raw events in the OLAP store, everything in the lake; dashboards should never scan the lake.
- **Schema evolution**: new optional fields are cheap; renames and type changes need a new version and a migration plan.
- **Privacy**: keep personal identifiers out of rollups, and design raw storage so a user's events can be found and deleted or anonymised when they ask.

## 12. What Breaks First at 10x

- **Hot partitions.** Keying the log by customer or page puts a viral page on one partition; key by event ID or add a salt, and aggregate in two stages.
- **Stream state.** Dedup sets and open windows grow with throughput times retention; use a state backend on local disk with checkpoints, and bound the dedup window.
- **High-cardinality dimensions in rollups.** A \`page_url\` dimension with millions of values turns rollups into raw data; keep a top-N and bucket the long tail as "other".
- **Backfills competing with live traffic.** A replay at full speed can starve the live job; give it separate consumers and quotas.
- **Small files in the lake.** Streaming writes create many small files; compact them periodically.

## 13. Verified: Running the Code

The example **"Event-time windows with watermarks, late events and retry duplicates, compared with processing-time windows and a batch recompute"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
6000 real events over 600 s of event time, 200 retry duplicates, 6200 messages in the log

watermark lag  dedup  duplicates counted  late dropped  total error vs batch  emit delay after window end
        5 s  false                 196           171                    51      5.0 s avg over 9 windows
        5 s  true                    0           167                   167      5.0 s avg over 9 windows
       30 s  true                    0           101                   101     30.2 s avg over 9 windows
      120 s  true                    0            54                    54    120.0 s avg over 7 windows
      300 s  true                    0             0                     0    300.0 s avg over 4 windows

window       batch truth  event-time (lag 30 s)  processing-time
  0-60  s          600                    587              568
 60-120 s          600                    586              586
120-180 s          600                    582              574
180-240 s          600                    593              604
240-300 s          600                    594              624
300-360 s          600                    587              601
360-420 s          600                    593              600
420-480 s          600                    585              590
480-540 s          600                    592              591
540-600 s          600                    600              617

== Capacity (assumptions in, arithmetic out) ==
events/s: average 23148, peak 69444 (x3)
peak ingest 34.7 MB/s -> at least 7 partitions at 5 MB/s each
raw log 1 TB/day; columnar at 10:1 100 GB/day
minute rollup upper bound: 1440 min x 50 countries x 3 devices x 1000 pages = 216000000 rows/day
~~~

The example **"Distinct users: exact sets vs HyperLogLog sketches, and merging hourly sketches into a daily count"** was run the same way; both languages print the output shown in section 9.

What the simulations stand for and leave out: the log is a sorted array and the stream processor a loop, with no partitions, parallelism, checkpoints or crash recovery; the watermark is per job, not per partition; delays and duplicates come from a seeded generator. The HLL uses a 32-bit hash (FNV-1a with a murmur3 finalizer) and the original estimator with the small-range correction only, which is fine for these sizes; production implementations use 64-bit hashes and bias corrections. The capacity lines are arithmetic on stated assumptions.

## Edge Cases Worth Knowing

- **Client clocks are wrong.** Device time can be hours off or in the future; clamp event time against \`received_at\` and record both.
- **Idle partitions stall watermarks.** If one partition gets no events, a watermark taken as the minimum across partitions stops advancing; processors offer idle-source timeouts.
- **Bots and replays.** A misbehaving client can send millions of events; rate-limit per client at ingest and filter known bots before aggregation.
- **Timezones.** "Daily active users" depends on whose day; store UTC and roll up per reporting timezone explicitly.
- **Changing definitions.** When "active user" changes meaning, recompute history from raw events or mark the break on the dashboard.

## Common Pitfalls

- **Processing-time windows for business metrics.** Network delays move events between minutes; the run showed windows from 568 to 624 for a true 600.
- **No event ID from the client.** Without it, retries cannot be told from real repeats.
- **Adding up distinct counts.** Hourly uniques summed to 3.27 times the daily truth; store mergeable sketches.
- **Aggregating at ingest.** It couples the collection API to processing logic and makes replay impossible; ingest should write raw events to the log and nothing else.
- **No raw retention.** Without raw events, a bug in aggregation logic permanently corrupts history.
- **One number for two audiences.** Label live numbers as provisional, and publish the restated batch number as the official one.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Shape:</strong> <span style="color:#f0e2c8;">Clients batch events with a client-generated <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">event_id</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">event_time</code>; a stateless ingest API validates, stamps <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">received_at</code> and writes to a partitioned, replicated <strong style="color:#ffca28;">log</strong>. At 2 billion events a day that is about 23,000 per second on average and 69,000 at peak.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Fast path:</strong> <span style="color:#f0e2c8;">A stream job deduplicates by event ID, enriches and aggregates into <strong style="color:#ffca28;">event-time windows</strong> closed by a <strong style="color:#ffca28;">watermark</strong>, writing idempotent rollups to an OLAP store. In my run a 5 s lag dropped 167 of the 6,000 events as late and a 300 s lag dropped none but was 5 minutes behind.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Correct path:</strong> <span style="color:#f0e2c8;">Raw events go to a columnar data lake partitioned by event date. Batch jobs or a log <strong style="color:#ffca28;">replay</strong> restate affected partitions for late data and bug fixes; the official number comes from there. That is the Lambda vs <strong style="color:#ffca28;">Kappa</strong> choice: two code paths or one replayable stream.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Uniques:</strong> <span style="color:#f0e2c8;">Distinct counts do not add: hourly uniques summed to 3.27 times the true daily users. I store <strong style="color:#ffca28;">HyperLogLog</strong> sketches in rollups; 12 KB gives about 0.81% error and merging hourly sketches gave exactly the daily estimate.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Scale:</strong> <span style="color:#f0e2c8;">Watch hot partitions, stream state for dedup and windows, high-cardinality dimensions in rollups, and backfills competing with live traffic. Processing-time windows are wrong for business metrics: 568 to 624 for a true 600.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you handle an event that arrives two days late?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The live window has long closed, so the stream job either upserts the old rollup row or sends the event to a side output. The nightly batch restates that date partition from raw events, which picks it up regardless.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you get exactly-once counts?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every hop is at least once, so I make the result exactly-once: client event IDs with dedup state in the stream processor, and idempotent writes to the sink (upsert by window and dimensions, or transactional commits tied to offsets).</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not query raw events for every dashboard?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Billions of rows per day per query is slow and expensive. Rollups reduce it to thousands of rows per chart; raw events stay available for ad-hoc analysis in the lake.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Lambda or Kappa?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">I default to one streaming codebase and keep raw events for replay, with scheduled restatement of recent partitions. A separate batch path is worth it when batch logic is very different, such as complex joins for finance reports.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you choose the watermark lag?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">From the measured distribution of event delay: a lag covering most events within the freshness target, with late events handled by updates or the batch path, and a metric for late-drop counts.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Event time vs processing time | When it happened vs when the pipeline saw it |
| Schema registry | Central store of event schemas and versions |
| Rollup (pre-aggregation) | Aggregates per time bucket and dimensions |
| OLAP store | Columnar database for analytical queries |
| Tumbling window | Fixed, non-overlapping time buckets |
| Watermark | Estimate that no older events will arrive; closes windows |
| Late event | Event whose window was already emitted |
| Deduplication by event ID | Dropping repeats using a client-generated ID |
| Idempotent sink | Repeated writes give the same result |
| HyperLogLog | Sketch estimating distinct counts with about 1.04/sqrt(m) error |
| Mergeable sketch | Summary combinable across partitions without raw data |
| Lambda architecture | Separate stream and batch paths merged at query time |
| Kappa architecture | One stream path; corrections by replaying the log |

**Conclusion:** An analytics pipeline turns a firehose of late, out-of-order and duplicated events into two kinds of numbers: a live one that is fast and provisional, and an official one that is exact and reproducible. Collect raw events with client-generated IDs into a durable, replayable log; aggregate them by event time with watermarks, deduplication and idempotent rollups for dashboards; keep every raw event in columnar storage so batch jobs or replays can restate any period; and use mergeable sketches for unique counts, because they are the only distinct counts that roll up. The simulations showed the cost of each shortcut: processing-time windows off by more than 5%, duplicates masking lost events, and summed hourly uniques three times the truth.`,
    examples: [
      {
        label: `Event-time windows with watermarks, late events and retry duplicates, compared with processing-time windows and a batch recompute`,
        variants: [
          { tech: "node", code: `// Stream aggregation in miniature: 1-minute event-time windows, watermarks, late events, retry duplicates,
// processing-time windows for contrast, and the batch recompute that gives the true answer.
let seed = 11;
function rand() { seed = (seed * 48271) % 2147483647; return seed / 2147483647; }
const W = 60, SECONDS = 600;

const events = [];
for (let i = 0; i < SECONDS * 10; i++) {
  const eventTime = Math.floor(i / 10), r = rand();
  const delay = r < 0.9 ? Math.floor(rand() * 3) : r < 0.98 ? 2 + Math.floor(rand() * 28) : 30 + Math.floor(rand() * 270);
  events.push({ id: "e" + i, eventTime, arrival: eventTime + delay, seq: events.length });
  if (rand() < 0.03) events.push({ id: "e" + i, eventTime, arrival: eventTime + delay + 1 + Math.floor(rand() * 5), seq: events.length }); // producer retry
}
const log = events.slice().sort((a, b) => a.arrival - b.arrival || a.seq - b.seq); // the order the stream sees
const dups = events.length - SECONDS * 10;
console.log(\`\${SECONDS * 10} real events over \${SECONDS} s of event time, \${dups} retry duplicates, \${events.length} messages in the log\`);

// Batch truth: distinct event ids per event-time window, computed over the complete log.
const truth = Array(SECONDS / W).fill(0), seenAll = new Set();
for (const e of log) if (!seenAll.has(e.id)) { seenAll.add(e.id); truth[Math.floor(e.eventTime / W)]++; }

function stream(lag, dedup) {
  const counts = new Map(), emitted = new Map(), seen = new Set();
  let watermark = -Infinity, maxEvent = -Infinity, late = 0, latency = 0, closedByWm = 0, dupCounted = 0;
  const ids = new Set();
  const flush = (now, final) => {
    for (const [w, c] of [...counts.entries()].sort((a, b) => a[0] - b[0])) {
      if (watermark >= (w + 1) * W) { emitted.set(w, c); counts.delete(w); if (!final) { latency += now - (w + 1) * W; closedByWm++; } }
    }
  };
  for (const e of log) {
    if (dedup) { if (seen.has(e.id)) continue; seen.add(e.id); }
    const w = Math.floor(e.eventTime / W);
    if (emitted.has(w)) { late++; continue; } // window already closed and emitted
    if (ids.has(e.id)) dupCounted++; else ids.add(e.id);
    counts.set(w, (counts.get(w) || 0) + 1);
    maxEvent = Math.max(maxEvent, e.eventTime);
    watermark = maxEvent - lag;
    flush(e.arrival, false);
  }
  const lastArrival = log[log.length - 1].arrival;
  watermark = Infinity; flush(lastArrival, true); // end of input closes the rest
  let err = 0; truth.forEach((t, w) => (err += Math.abs((emitted.get(w) || 0) - t)));
  return { late, err, dupCounted, closedByWm, latency: latency / closedByWm, emitted };
}

console.log("\\nwatermark lag  dedup  duplicates counted  late dropped  total error vs batch  emit delay after window end");
for (const [lag, dedup] of [[5, false], [5, true], [30, true], [120, true], [300, true]]) {
  const r = stream(lag, dedup);
  console.log(\`\${String(lag).padStart(9)} s  \${String(dedup).padEnd(5)}  \${String(r.dupCounted).padStart(18)}  \${String(r.late).padStart(12)}  \${String(r.err).padStart(20)}  \${r.latency.toFixed(1).padStart(7)} s avg over \${r.closedByWm} windows\`);
}

const procTime = Array(SECONDS / W).fill(0), seenP = new Set();
for (const e of log) { if (seenP.has(e.id)) continue; seenP.add(e.id); const w = Math.floor(e.arrival / W); if (w < procTime.length) procTime[w]++; }
const r30 = stream(30, true);
console.log("\\nwindow       batch truth  event-time (lag 30 s)  processing-time");
truth.forEach((t, w) => console.log(\`\${String(w * W).padStart(3)}-\${String((w + 1) * W).padEnd(3)} s \${String(t).padStart(12)} \${String(r30.emitted.get(w)).padStart(22)} \${String(procTime[w]).padStart(16)}\`));

console.log("\\n== Capacity (assumptions in, arithmetic out) ==");
const perDay = 2e9, bytes = 500, peakFactor = 3, partitionMBs = 5, columnarRatio = 10;
const avg = perDay / 86400, peak = avg * peakFactor, peakMBs = (peak * bytes) / 1e6;
console.log(\`events/s: average \${Math.round(avg)}, peak \${Math.round(peak)} (x\${peakFactor})\`);
console.log(\`peak ingest \${peakMBs.toFixed(1)} MB/s -> at least \${Math.ceil(peakMBs / partitionMBs)} partitions at \${partitionMBs} MB/s each\`);
console.log(\`raw log \${(perDay * bytes) / 1e12} TB/day; columnar at \${columnarRatio}:1 \${(perDay * bytes) / columnarRatio / 1e9} GB/day\`);
console.log(\`minute rollup upper bound: 1440 min x 50 countries x 3 devices x 1000 pages = \${1440 * 50 * 3 * 1000} rows/day\`);` },
          { tech: "python", code: `# Stream aggregation in miniature: 1-minute event-time windows, watermarks, late events, retry duplicates,
# processing-time windows for contrast, and the batch recompute that gives the true answer.
import math

seed = 11


def rand():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647


W, SECONDS = 60, 600

events = []
for i in range(SECONDS * 10):
    event_time, r = i // 10, rand()
    if r < 0.9:
        delay = math.floor(rand() * 3)
    elif r < 0.98:
        delay = 2 + math.floor(rand() * 28)
    else:
        delay = 30 + math.floor(rand() * 270)
    events.append({"id": f"e{i}", "eventTime": event_time, "arrival": event_time + delay, "seq": len(events)})
    if rand() < 0.03:  # producer retry
        events.append({"id": f"e{i}", "eventTime": event_time, "arrival": event_time + delay + 1 + math.floor(rand() * 5), "seq": len(events)})
log = sorted(events, key=lambda e: (e["arrival"], e["seq"]))  # the order the stream sees
dups = len(events) - SECONDS * 10
print(f"{SECONDS * 10} real events over {SECONDS} s of event time, {dups} retry duplicates, {len(events)} messages in the log")

# Batch truth: distinct event ids per event-time window, computed over the complete log.
truth, seen_all = [0] * (SECONDS // W), set()
for e in log:
    if e["id"] not in seen_all:
        seen_all.add(e["id"])
        truth[e["eventTime"] // W] += 1


def stream(lag, dedup):
    counts, emitted, seen, ids = {}, {}, set(), set()
    st = {"watermark": -math.inf, "late": 0, "latency": 0, "closed": 0, "dup": 0}
    max_event = -math.inf

    def flush(now, final):
        for w in sorted(counts):
            if st["watermark"] >= (w + 1) * W:
                emitted[w] = counts.pop(w)
                if not final:
                    st["latency"] += now - (w + 1) * W
                    st["closed"] += 1

    for e in log:
        if dedup:
            if e["id"] in seen:
                continue
            seen.add(e["id"])
        w = e["eventTime"] // W
        if w in emitted:  # window already closed and emitted
            st["late"] += 1
            continue
        if e["id"] in ids:
            st["dup"] += 1
        else:
            ids.add(e["id"])
        counts[w] = counts.get(w, 0) + 1
        max_event = max(max_event, e["eventTime"])
        st["watermark"] = max_event - lag
        flush(e["arrival"], False)
    last_arrival = log[-1]["arrival"]
    st["watermark"] = math.inf
    flush(last_arrival, True)  # end of input closes the rest
    err = sum(abs(emitted.get(w, 0) - t) for w, t in enumerate(truth))
    return {"late": st["late"], "err": err, "dupCounted": st["dup"], "closedByWm": st["closed"],
            "latency": st["latency"] / st["closed"], "emitted": emitted}


print("\\nwatermark lag  dedup  duplicates counted  late dropped  total error vs batch  emit delay after window end")
for lag, dedup in [(5, False), (5, True), (30, True), (120, True), (300, True)]:
    r = stream(lag, dedup)
    print(f"{str(lag).rjust(9)} s  {str(dedup).lower().ljust(5)}  {str(r['dupCounted']).rjust(18)}  {str(r['late']).rjust(12)}  {str(r['err']).rjust(20)}  {f'{r['latency']:.1f}'.rjust(7)} s avg over {r['closedByWm']} windows")

proc_time, seen_p = [0] * (SECONDS // W), set()
for e in log:
    if e["id"] in seen_p:
        continue
    seen_p.add(e["id"])
    w = e["arrival"] // W
    if w < len(proc_time):
        proc_time[w] += 1
r30 = stream(30, True)
print("\\nwindow       batch truth  event-time (lag 30 s)  processing-time")
for w, t in enumerate(truth):
    print(f"{str(w * W).rjust(3)}-{str((w + 1) * W).ljust(3)} s {str(t).rjust(12)} {str(r30['emitted'].get(w)).rjust(22)} {str(proc_time[w]).rjust(16)}")

print("\\n== Capacity (assumptions in, arithmetic out) ==")
per_day, nbytes, peak_factor, partition_mbs, columnar_ratio = 2_000_000_000, 500, 3, 5, 10
avg = per_day / 86400
peak = avg * peak_factor
peak_mbs = peak * nbytes / 1e6
print(f"events/s: average {round(avg)}, peak {round(peak)} (x{peak_factor})")
print(f"peak ingest {peak_mbs:.1f} MB/s -> at least {math.ceil(peak_mbs / partition_mbs)} partitions at {partition_mbs} MB/s each")
print(f"raw log {per_day * nbytes // 10**12} TB/day; columnar at {columnar_ratio}:1 {per_day * nbytes // columnar_ratio // 10**9} GB/day")
print(f"minute rollup upper bound: 1440 min x 50 countries x 3 devices x 1000 pages = {1440 * 50 * 3 * 1000} rows/day")` },
        ],
      },
      {
        label: `Distinct users: exact sets vs HyperLogLog sketches, and merging hourly sketches into a daily count`,
        variants: [
          { tech: "node", code: `// Distinct counts in an analytics pipeline: exact sets vs HyperLogLog sketches, and why
// hourly unique counts cannot be added up but hourly sketches can be merged.
let seed = 5;
function rand() { seed = (seed * 48271) % 2147483647; return seed / 2147483647; }
function hash32(s) { // FNV-1a + murmur3 finalizer
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0; h ^= h >>> 16;
  return h >>> 0;
}
class HLL {
  constructor(p) { this.p = p; this.m = 1 << p; this.reg = new Uint8Array(this.m); }
  add(s) {
    const h = hash32(s), idx = h >>> (32 - this.p), w = (h << this.p) >>> 0;
    const rho = w === 0 ? 32 - this.p + 1 : Math.clz32(w) + 1;
    if (rho > this.reg[idx]) this.reg[idx] = rho;
  }
  merge(o) { for (let i = 0; i < this.m; i++) if (o.reg[i] > this.reg[i]) this.reg[i] = o.reg[i]; }
  count() {
    let z = 0, zeros = 0;
    for (let i = 0; i < this.m; i++) { z += Math.pow(2, -this.reg[i]); if (this.reg[i] === 0) zeros++; }
    const alpha = 0.7213 / (1 + 1.079 / this.m);
    let e = (alpha * this.m * this.m) / z;
    if (e <= 2.5 * this.m && zeros > 0) e = this.m * Math.log(this.m / zeros); // small-range correction
    return Math.round(e);
  }
  bytes() { return (this.m * 6) / 8; } // 6-bit registers when packed
}
const USERS = 100000;
const day10 = new HLL(10), day14 = new HLL(14), hourly = [];
for (let h = 0; h < 24; h++) hourly.push({ exact: new Set(), sketch: new HLL(14) });
const dayExact = new Set();
let events = 0;
for (let u = 0; u < USERS; u++) {
  const id = "user-" + u, n = 1 + Math.floor(rand() * 6);
  for (let k = 0; k < n; k++) {
    const hour = Math.floor(rand() * 24); events++;
    dayExact.add(id); day10.add(id); day14.add(id);
    hourly[hour].exact.add(id); hourly[hour].sketch.add(id);
  }
}
const errPct = (est, truth) => (((est - truth) * 100) / truth).toFixed(2) + "%";
console.log(\`\${events} events from \${dayExact.size} distinct users in one day\`);
console.log("\\nmethod                 memory      estimate   error    expected std error");
const row = (label, mem, est, err, std) => console.log(\`\${label.padEnd(23)}\${mem.padEnd(12)}\${String(est).padStart(8)}   \${err.padStart(6)}    \${std}\`);
row("exact set", "every id", dayExact.size, "0.00%", "-");
for (const s of [day10, day14]) {
  const est = s.count();
  row(\`HLL p=\${s.p} (\${s.m} regs)\`, \`\${s.bytes()} B\`, est, errPct(est, dayExact.size), ((1.04 / Math.sqrt(s.m)) * 100).toFixed(2) + "%");
}
const sumHourly = hourly.reduce((a, h) => a + h.exact.size, 0);
const merged = new HLL(14); for (const h of hourly) merged.merge(h.sketch);
console.log("\\n== Rolling 24 hourly results up to a daily number ==");
console.log(\`hour 0 exact uniques: \${hourly[0].exact.size}, hour 0 sketch: \${hourly[0].sketch.count()}\`);
console.log(\`sum of 24 hourly exact unique counts: \${sumHourly} (\${(sumHourly / dayExact.size).toFixed(2)}x the true \${dayExact.size})\`);
const m = merged.count();
console.log(\`merge of 24 hourly sketches (register max): \${m} (\${errPct(m, dayExact.size)})\`);` },
          { tech: "python", code: `# Distinct counts in an analytics pipeline: exact sets vs HyperLogLog sketches, and why
# hourly unique counts cannot be added up but hourly sketches can be merged.
import math

seed = 5


def rand():
    global seed
    seed = (seed * 48271) % 2147483647
    return seed / 2147483647


def hash32(s):  # FNV-1a + murmur3 finalizer
    h = 0x811C9DC5
    for ch in s:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    h ^= h >> 16
    h = (h * 0x85EBCA6B) & 0xFFFFFFFF
    h ^= h >> 13
    h = (h * 0xC2B2AE35) & 0xFFFFFFFF
    h ^= h >> 16
    return h


class HLL:
    def __init__(self, p):
        self.p, self.m = p, 1 << p
        self.reg = [0] * self.m

    def add(self, s):
        h = hash32(s)
        idx, w = h >> (32 - self.p), (h << self.p) & 0xFFFFFFFF
        rho = 32 - self.p + 1 if w == 0 else (32 - w.bit_length()) + 1
        if rho > self.reg[idx]:
            self.reg[idx] = rho

    def merge(self, o):
        self.reg = [max(a, b) for a, b in zip(self.reg, o.reg)]

    def count(self):
        z, zeros = 0.0, 0
        for r in self.reg:
            z += math.pow(2, -r)
            if r == 0:
                zeros += 1
        alpha = 0.7213 / (1 + 1.079 / self.m)
        e = alpha * self.m * self.m / z
        if e <= 2.5 * self.m and zeros > 0:
            e = self.m * math.log(self.m / zeros)  # small-range correction
        return math.floor(e + 0.5)

    def nbytes(self):
        return self.m * 6 // 8  # 6-bit registers when packed


USERS = 100000
day10, day14 = HLL(10), HLL(14)
hourly = [{"exact": set(), "sketch": HLL(14)} for _ in range(24)]
day_exact = set()
events = 0
for u in range(USERS):
    uid, n = f"user-{u}", 1 + math.floor(rand() * 6)
    for k in range(n):
        hour = math.floor(rand() * 24)
        events += 1
        day_exact.add(uid)
        day10.add(uid)
        day14.add(uid)
        hourly[hour]["exact"].add(uid)
        hourly[hour]["sketch"].add(uid)


def err_pct(est, truth):
    return f"{(est - truth) * 100 / truth:.2f}%"


def row(label, mem, est, err, std):
    print(f"{label.ljust(23)}{mem.ljust(12)}{str(est).rjust(8)}   {err.rjust(6)}    {std}")


print(f"{events} events from {len(day_exact)} distinct users in one day")
print("\\nmethod                 memory      estimate   error    expected std error")
row("exact set", "every id", len(day_exact), "0.00%", "-")
for s in [day10, day14]:
    est = s.count()
    row(f"HLL p={s.p} ({s.m} regs)", f"{s.nbytes()} B", est, err_pct(est, len(day_exact)), f"{1.04 / math.sqrt(s.m) * 100:.2f}%")
sum_hourly = sum(len(h["exact"]) for h in hourly)
merged = HLL(14)
for h in hourly:
    merged.merge(h["sketch"])
print("\\n== Rolling 24 hourly results up to a daily number ==")
print(f"hour 0 exact uniques: {len(hourly[0]['exact'])}, hour 0 sketch: {hourly[0]['sketch'].count()}")
print(f"sum of 24 hourly exact unique counts: {sum_hourly} ({sum_hourly / len(day_exact):.2f}x the true {len(day_exact)})")
m = merged.count()
print(f"merge of 24 hourly sketches (register max): {m} ({err_pct(m, len(day_exact))})")` },
        ],
      },
    ],
  },
];

export default augments;
