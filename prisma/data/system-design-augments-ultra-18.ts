/**
 * SYSTEM DESIGN ULTRA — batch 18: Transactional systems. Every example was run by
 * scripts/verify-variant-examples.ts (node, python, go, java); quoted output is that run's output.
 */
import type { SystemDesignUltraAugment } from "./system-design-augments.types";

const augments: SystemDesignUltraAugment[] = [
  {
    title: `How would you design a payment system?`,
    difficulty: "hard",
    seoDescription: `Design a payment system end to end: pay-in and payout flows, PSP tokenization, a double-entry ledger, authorize and capture, payouts and reconciliation.`,
    description: `**Question presented to candidate:**
"Design the payment system for a marketplace like Etsy or Airbnb: buyers pay by card, the platform keeps a commission, and sellers are paid out to their bank accounts. We process about 10 million payments a day. Walk me through the components, how money is recorded, and how you make sure nothing is ever lost or paid twice."

**What a strong answer should cover:**
- The two money flows: **pay-in** (buyer card to platform through a **payment service provider**, PSP) and **payout** (platform to seller bank), and why the platform never touches raw card numbers (**tokenization**, hosted fields, smaller **PCI DSS** scope)
- A **double-entry ledger** as the source of truth: append-only entries that sum to zero, amounts in integer minor units, balances derived from entries
- The payment lifecycle: **authorize, capture, settle, refund, chargeback**, with each state change written durably and driven by PSP webhooks
- Correctness under concurrency and retries: idempotency keys end to end, conditional or versioned balance updates so payouts cannot overdraw
- **Reconciliation** of the ledger against PSP settlement reports, and what to do with mismatches
- Scale numbers: payment TPS is modest; the hard parts are correctness, auditability and integration with slow external systems

**Clarifying questions expected:**
- Are we the merchant only, or a marketplace holding money for sellers (which changes the ledger and the regulation)?
- Which payment methods, currencies and countries? Do we need multi-currency payouts?
- Can we use a PSP such as Stripe or Adyen, or are we building card network connectivity ourselves?

**Code / implementation expected:** Optional — the example runs a double-entry ledger for a marketplace order: an idempotent charge, a refund, a payout race and a reconciliation.`,
    answer: `**Target Audience:** Backend engineers preparing for system design rounds at fintech, marketplace and e-commerce companies, and anyone who wants to understand where money actually lives inside a payment system.
**Difficulty:** Hard
**Verified with:** Node 22.22 and Python 3.12 (identical output). Stripe behaviour (amounts in minor units, a 7-day authorization window for most online card payments, shortened to 5 days for Visa online merchant-initiated transactions from April 2024) is from the Stripe docs pages "Supported currencies" and "Place a hold on a payment method". PCI DSS dates are from the PCI Security Standards Council.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. Every number in the worked example comes from running the program; the **Verified** section quotes its full output. Retries and idempotency get their own page, [How do you make a payment system reliable against retries?](/interview-question/how-do-you-make-a-payment-system-reliable-against-retries); this one is about the whole system around them.

## 1. Why This Even Matters — A Story First

Picture a farmers market with one cashier for all the stalls. A shopper buys a 100-dollar quilt and pays the cashier by card. The cashier does not hand 100 dollars to the quilt maker on the spot. First the card company has to approve the payment, then it actually sends the money a day or two later, minus a fee. The market keeps 10 dollars as its commission, and on Friday it pays every stall what it is owed.

Now imagine the cashier keeps no notebook and only remembers "the cash box has about 900 dollars". When a stall owner asks "how much do you owe me?", nobody can answer. When the card company's deposit is 3.20 dollars short, nobody knows which sale caused it. When two helpers both pay the quilt maker on Friday, the market loses 63 dollars and does not notice until the end of the month.

A payment system is that cashier plus a very careful notebook. The card handling is mostly bought from a provider. The notebook, called the **ledger**, is what you design: every movement written twice (where it came from, where it went), never erased, and checked every day against the bank and the card company.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Merchant only, or a marketplace paying sellers? | A marketplace holds money for others: seller balances, payouts, more regulation (money transmission, KYC of sellers) |
| Use a PSP (Stripe, Adyen, Braintree), or connect to card networks ourselves? | With a PSP, you integrate APIs and webhooks and keep card data out of your systems; building acquiring is a multi-year project |
| Which methods and currencies? | Cards, wallets and bank transfers have different timing; currencies have different minor units |
| Volume and peak? | Sizes the payment service and ledger; usually modest compared with read traffic |
| Authorize now and capture later (ship first, then charge)? | Adds a capture step with a time limit |
| What reporting and audit is required? | Drives an append-only ledger, retention and reconciliation |

## 3. Requirements

**Functional**
- Pay-in: a buyer pays for an order with a card or wallet; support authorize-then-capture and immediate capture.
- Refunds (full and partial) and chargebacks (disputes raised by the card holder through their bank).
- Seller balances: what each seller is owed, available after a holding period.
- Payouts to seller bank accounts on a schedule.
- Statements and reports for finance; daily reconciliation with the PSP and the bank.

**Non-functional**
- **Correctness above everything**: never charge twice, never pay out twice, never lose a cent. Every number traceable to entries.
- **Durability and auditability**: append-only history, nothing updated in place, kept for years.
- **Availability**: checkout must work; if a PSP is degraded, fail clearly or fall back to a second PSP, never "maybe charged".
- **Security**: no raw card numbers in our systems; encryption, access control, audit logs.
- **Latency**: a few seconds for checkout is acceptable; the PSP call dominates.

## 4. Capacity Estimate

Assumptions: 10 million payments a day, peak traffic 10 times the average, 4 ledger entries per payment on average (charge, fee, settlement, payout share), 200 bytes per ledger entry with indexes.

| Quantity | Arithmetic | Result |
| :--- | :--- | :--- |
| Average payments per second | 10,000,000 / 86,400 | **about 116** |
| Peak payments per second | 116 x 10 | **about 1,157** |
| Ledger entries per day | 10,000,000 x 4 | 40 million |
| Ledger growth per day | 40,000,000 x 200 B | 8 GB |
| Ledger growth per year | 8 GB x 365 | **about 2.9 TB** |

A thousand writes a second fits a single well-run relational database with replicas; the number to worry about is not throughput but the cost of a single mistake. That is why the design favours **strong consistency and transactions** in the ledger over horizontal tricks, and moves scale work (reports, search, analytics) to read replicas and a warehouse fed from the ledger.

## 5. The Two Money Flows

📌 **Interview term: payment service provider (PSP)** — a company such as Stripe, Adyen or Braintree that connects you to card networks and banks. You call its API to charge a card and it notifies you of results through webhooks.

📌 **Interview term: pay-in and payout** — pay-in is money coming from buyers into the platform's account at the PSP; payout is money leaving the platform to sellers' bank accounts.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 280" role="img" aria-label="Pay-in flow: browser with hosted card fields sends a token to the payment service, which calls the payment service provider; the provider settles to the platform bank and the payout service pays sellers">
  <defs>
    <marker id="sd18q1-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="160" height="80" rx="10"/>
  <text class="d-text" x="110" y="65" text-anchor="middle">Browser</text>
  <text class="d-sub" x="110" y="88" text-anchor="middle">hosted card fields</text>
  <rect class="d-box-accent" x="250" y="30" width="160" height="80" rx="10"/>
  <text class="d-text" x="330" y="65" text-anchor="middle">Payment service</text>
  <text class="d-sub" x="330" y="88" text-anchor="middle">state machine</text>
  <rect class="d-box" x="470" y="30" width="160" height="80" rx="10"/>
  <text class="d-text" x="550" y="65" text-anchor="middle">PSP</text>
  <text class="d-sub" x="550" y="88" text-anchor="middle">card networks</text>
  <rect class="d-box-accent" x="250" y="170" width="160" height="80" rx="10"/>
  <text class="d-text" x="330" y="205" text-anchor="middle">Ledger</text>
  <text class="d-sub" x="330" y="228" text-anchor="middle">double entry</text>
  <rect class="d-box-muted" x="470" y="170" width="160" height="80" rx="10"/>
  <text class="d-text" x="550" y="205" text-anchor="middle">Platform bank</text>
  <text class="d-sub" x="550" y="228" text-anchor="middle">settlement</text>
  <rect class="d-box" x="30" y="170" width="160" height="80" rx="10"/>
  <text class="d-text" x="110" y="205" text-anchor="middle">Payout service</text>
  <text class="d-sub" x="110" y="228" text-anchor="middle">to seller banks</text>
  <path class="d-edge" d="M 190 70 L 242 70" marker-end="url(#sd18q1-arrow)"/>
  <path class="d-edge" d="M 410 70 L 462 70" marker-end="url(#sd18q1-arrow)"/>
  <path class="d-edge" d="M 330 110 L 330 162" marker-end="url(#sd18q1-arrow)"/>
  <path class="d-edge-dashed" d="M 550 110 L 550 162" marker-end="url(#sd18q1-arrow)"/>
  <path class="d-edge" d="M 250 210 L 198 210" marker-end="url(#sd18q1-arrow)"/>
</svg>

The browser collects card details in fields hosted by the PSP (an iframe or redirect), so the card number goes straight to the PSP and our server receives only a **token**. Our payment service calls the PSP with the token and records every step in the ledger. The PSP settles money to our bank account a day or more later (dashed arrow), and the payout service pays sellers from what the ledger says they are owed.

📌 **Interview term: tokenization** — replacing the card number with a reference (a token) that is useless outside the PSP. Our database stores the token and the last four digits, never the card number.

📌 **Interview term: PCI DSS** — the Payment Card Industry Data Security Standard. Any system that stores, processes or transmits card numbers is in scope and must pass a much larger audit. Using hosted fields keeps most of your systems out of scope; merchants that fully outsource card entry can usually validate with the short self-assessment questionnaire SAQ A. The PCI SSC retired version 3.2.1 on 31 March 2024, so assessments now use v4.0.1, and for SAQ A merchants with an embedded payment page the PCI SSC added a requirement (effective 1 April 2025, per its FAQ 1588) to protect that page against malicious scripts or get that confirmation from the PSP.

## 6. API

- \`POST /v1/payments\` with \`{order_id, amount, currency, payment_token, capture: "automatic" | "manual"}\` and an \`Idempotency-Key\` header. Returns \`{payment_id, status}\`.
- \`POST /v1/payments/{id}/capture\` with an optional smaller amount; \`POST /v1/payments/{id}/refunds\` with \`{amount, reason}\`.
- \`POST /v1/webhooks/psp\`: the PSP tells us about authorizations, captures, failures, refunds, disputes and settlements. It verifies the signature, stores the event, and is idempotent on the PSP event id.
- \`GET /v1/sellers/{id}/balance\` and \`GET /v1/sellers/{id}/statement\`: both computed from the ledger.
- \`POST /v1/payouts\` (internal, scheduler only): pay a seller what they are owed.

📌 **Interview term: minor units** — amounts are integers in the smallest unit of the currency: 1099 means 10.99 USD. Stripe documents that all its API amounts work this way and that zero-decimal currencies such as JPY use the whole unit (10 means 10 JPY). Never use floating point for money; the first lines of the example show why.

~~~text
== 1. Money is integers ==
ten x 0.10 as float = 0.9999999999999999, equals 1? no
ten x 10 cents      = 1.00, equals 1.00? yes
split 100.00 three ways: 33.34 + 33.33 + 33.33 = 100.00
~~~

Ten additions of 0.10 as a float do not equal 1. Splitting 100.00 three ways must also put the leftover cent somewhere explicitly (here the first share gets it), so the parts still add up to the whole.

## 7. Data Model

| Table | Key columns | Notes |
| :--- | :--- | :--- |
| \`payments\` | \`payment_id\`, \`order_id\`, \`amount\`, \`currency\`, \`status\`, \`psp_reference\`, \`idempotency_key UNIQUE\` | One row per payment attempt; the status machine lives here |
| \`payment_events\` | \`psp_event_id UNIQUE\`, \`payment_id\`, \`type\`, \`payload\`, \`received_at\` | Raw webhooks, deduplicated, kept for audit |
| \`ledger_transactions\` | \`tx_id UNIQUE\`, \`type\`, \`created_at\`, \`reference\` | One business event (charge, fee, refund, payout) |
| \`ledger_entries\` | \`tx_id\`, \`account_id\`, \`amount\` (signed minor units), \`currency\` | Append-only; the entries of one transaction sum to zero |
| \`accounts\` | \`account_id\`, \`type\` (asset, liability, revenue, expense), \`owner\`, \`currency\`, \`balance\`, \`version\` | Cached balance, updated in the same database transaction as its entries |
| \`payouts\` | \`payout_id\`, \`seller_id\`, \`amount\`, \`status\`, \`bank_reference\` | Payout state machine |

📌 **Interview term: double-entry ledger** — every money movement is recorded as at least two entries, debits and credits, that sum to zero. Money is never created or lost inside the books, only moved between accounts, so the sum over all accounts is always zero and any bug shows up as an imbalance.

📌 **Interview term: append-only** — entries are never updated or deleted. A mistake is fixed with a new reversing transaction, so history is always reconstructable.

The account set for a marketplace, with the convention used in the example (debits positive, credits negative):

| Account | Type | Meaning of its balance |
| :--- | :--- | :--- |
| \`psp_receivable\` | asset | Money the PSP has collected for us but not yet sent to our bank |
| \`cash:bank\` | asset | Money in our bank account |
| \`seller_payable:<id>\` | liability | Money we owe a seller (credit balance) |
| \`revenue:commission\` | revenue | Our commission (credit balance) |
| \`expense:psp_fees\` | expense | Fees charged by the PSP (debit balance) |

## 8. Deep Dive 1: The Ledger in Action

The example books one marketplace order through its whole life. A buyer pays 100.00, the platform keeps 10%, the PSP charges 2.9% plus 30 cents (an assumed fee for the example, not any provider's price list), then a 30.00 partial refund, and finally the seller's payout.

~~~text
== 2. Order ORD-1: buyer pays 100.00, platform keeps 10% ==
processor fee on 100.00 = 3.20
posted ORD-1:charge (3 entries)
duplicate ORD-1:charge ignored
posted ORD-1:fee (2 entries)
posted ORD-1:settle (2 entries)
rejected ORD-1:bad: legs do not sum to zero

== 3. Partial refund of 30.00 ==
posted ORD-1:refund (3 entries)
seller S1 is owed 63.00
~~~

The charge posts three entries: the PSP owes us 100.00 (debit), we owe the seller 90.00 and earned 10.00 (credits). The **same transaction id arriving twice is ignored**, which is what makes webhook redelivery safe at the ledger level. A transaction whose legs do not sum to zero is **rejected before anything is written**. Settlement moves 96.80 from the PSP receivable to the bank and books the 3.20 fee. The refund takes 27.00 back from the seller and 3.00 from our commission; in this sketch the PSP keeps its original fee on refunds, which is a common policy but varies by provider and contract, so check yours. The seller is now owed 63.00.

The heart of posting, in the example:

~~~js
if (this.seen.has(txId)) return "duplicate " + txId + " ignored";
if (legs.reduce((s, l) => s + l[1], 0) !== 0) return "rejected " + txId + ": legs do not sum to zero";
// ...then, in one database transaction: insert every entry, update every cached balance and version
~~~

At the end the **trial balance** must sum to zero:

~~~text
== 5. Trial balance ==
  cash:bank                3.80
  expense:psp_fees         3.20
  psp_receivable           0.00
  revenue:commission      -7.00
  seller_payable:S1        0.00
  sum                      0.00   entries: 12
~~~

The 3.80 left in the bank is exactly the commission (7.00) minus the PSP fee (3.20). Nothing else was created or lost.

📌 **Interview term: trial balance** — the list of every account balance; in double entry it must sum to zero. Running it continuously (or after every batch) is the cheapest correctness alarm you can have.

**Storing balances.** Computing a balance by summing millions of entries is too slow for checkout and payouts, so each account row also holds a cached \`balance\` and a \`version\`, updated in the same database transaction as the entries. The entries remain the source of truth; a nightly job recomputes balances from entries and alerts on any difference.

## 9. Deep Dive 2: The Payment Lifecycle and the PSP

📌 **Interview term: authorization and capture** — authorization asks the card issuer to approve and hold the amount on the card; capture actually takes the money. Capturing later lets you charge when the item ships. Stripe documents that an uncaptured authorization is typically held for 7 days for online card payments (shorter for some cases, such as 5 days for Visa online merchant-initiated transactions since April 2024), after which it is released; so a manual-capture design needs a job that captures or cancels before the deadline.

📌 **Interview term: settlement** — the PSP transfers collected funds, minus fees, to your bank account, usually in a daily batch with a settlement report listing each charge, refund and fee.

📌 **Interview term: chargeback (dispute)** — the card holder disputes a charge with their bank; the money is pulled back, often with a fee, and you can submit evidence. In the ledger it is another transaction that debits the seller (or the platform) and credits the PSP receivable.

The payment row moves through explicit states: \`CREATED -> AUTHORIZED -> CAPTURED -> SETTLED\`, with \`FAILED\`, \`CANCELED\`, \`REFUNDED\` and \`DISPUTED\` branches. Each transition is written before the next external call and is driven either by the synchronous PSP response or by a webhook, whichever arrives first, so handlers must be idempotent and accept events out of order (a \`captured\` webhook can arrive before our own API call returns). The full treatment of unknown outcomes, timeouts and recovery workers is in [How do you make a payment system reliable against retries?](/interview-question/how-do-you-make-a-payment-system-reliable-against-retries) and [What is idempotency and why does it matter?](/interview-question/what-is-idempotency-and-why-does-it-matter).

**Writing the ledger and notifying others.** When a payment is captured, the order service, email and analytics must hear about it. Writing the ledger and publishing a message as two separate steps can lose one of them; write an outbox row in the same transaction and publish from it ([Outbox pattern vs polling for CDC — how do you avoid dual-write failure?](/interview-question/outbox-pattern-vs-polling-for-cdc-how-do-you-avoid-dual-write-failure)). A multi-step checkout (reserve stock, charge, confirm) is a saga with compensations, not a distributed transaction ([What is the saga pattern for distributed transactions?](/interview-question/what-is-the-saga-pattern-for-distributed-transactions)).

**Risk.** Before authorizing, a risk service scores the payment (velocity, device, address checks, the PSP risk score). High scores require 3-D Secure authentication or are declined. This sits on the synchronous path, so it needs a strict latency budget and a safe default if it is down.

## 10. Deep Dive 3: Payouts and Reconciliation

Payouts are where a concurrency bug costs real money: two scheduler workers, or a retry plus the original, can both read "seller owed 63.00" and both send a bank transfer. The example runs that race against the account version:

~~~text
== 4. Two payout requests race for the same balance ==
both read balance 63.00 at version 2
worker 1: posted PAYOUT-1 (2 entries)
worker 2: rejected PAYOUT-2: version conflict on seller_payable:S1
worker 2 re-reads version 3: rejected PAYOUT-2: seller_payable:S1 would go negative
~~~

Worker 2 read version 2, but worker 1 already wrote version 3, so worker 2's conditional write fails. When it re-reads, the balance check (a seller payable account must never become a debit, which would mean we paid more than we owe) rejects it. In SQL this is \`UPDATE accounts SET balance = balance + :amt, version = version + 1 WHERE account_id = :id AND version = :v\` plus a check constraint, inside the same transaction as the entries ([What is the difference between optimistic and pessimistic locking?](/interview-question/what-is-the-difference-between-optimistic-and-pessimistic-locking)). The payout also carries an idempotency key to the bank or payout provider, because the version check protects our books but not a transfer request that was sent twice.

📌 **Interview term: reconciliation** — comparing our ledger with external records (the PSP settlement report, bank statements) line by line, every day. It is the only way to find what no single system can see on its own.

~~~text
== 6. Daily reconciliation against the processor report ==
  ORD-1  ledger  100.00  report  100.00  matched
  ORD-2  ledger       -  report   25.00  MISSING IN LEDGER (lost webhook?)
  ORD-3  ledger   40.00  report       -  MISSING AT PROCESSOR
processor fee on 25.00 = 1.03
~~~

**ORD-2** was charged at the PSP but our ledger never recorded it: a lost webhook or a crash between the PSP call and our write. The fix is to fetch the payment from the PSP and post the missing transaction. **ORD-3** is in our ledger but the PSP has no record: perhaps a charge that actually failed. Each mismatch becomes a ticket for an automated fixer or a finance operator; reconciliation never silently edits entries.

## 11. What Breaks First at 10x

- **Hot accounts.** Every charge credits \`revenue:commission\` and debits \`psp_receivable\`; at thousands of writes a second, the row lock on those cached balances becomes the bottleneck. Split hot accounts into sub-accounts (for example 16 shards summed on read), or do not keep a running balance for them and aggregate entries asynchronously.
- **The PSP.** A slow or failing PSP stalls checkout. Use timeouts, a circuit breaker ([What is the circuit breaker pattern?](/interview-question/what-is-the-circuit-breaker-pattern)) and, at large scale, a second PSP with routing.
- **Webhook floods.** Settlement and refund events arrive in bursts; put them in a queue and process them idempotently instead of doing work in the HTTP handler.
- **Reports on the primary.** Statements and finance queries move to replicas and a warehouse fed by CDC.
- **Multi-currency.** Each account has one currency; FX conversion is a transaction with entries in two currencies through an FX account, at a recorded rate.

## 12. Verified: Running the Code

The example **"Marketplace payment on a double-entry ledger: integer cents, an idempotent charge, a refund, a payout race and daily reconciliation"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
== 1. Money is integers ==
ten x 0.10 as float = 0.9999999999999999, equals 1? no
ten x 10 cents      = 1.00, equals 1.00? yes
split 100.00 three ways: 33.34 + 33.33 + 33.33 = 100.00

== 2. Order ORD-1: buyer pays 100.00, platform keeps 10% ==
processor fee on 100.00 = 3.20
posted ORD-1:charge (3 entries)
duplicate ORD-1:charge ignored
posted ORD-1:fee (2 entries)
posted ORD-1:settle (2 entries)
rejected ORD-1:bad: legs do not sum to zero

== 3. Partial refund of 30.00 ==
posted ORD-1:refund (3 entries)
seller S1 is owed 63.00

== 4. Two payout requests race for the same balance ==
both read balance 63.00 at version 2
worker 1: posted PAYOUT-1 (2 entries)
worker 2: rejected PAYOUT-2: version conflict on seller_payable:S1
worker 2 re-reads version 3: rejected PAYOUT-2: seller_payable:S1 would go negative

== 5. Trial balance ==
  cash:bank                3.80
  expense:psp_fees         3.20
  psp_receivable           0.00
  revenue:commission      -7.00
  seller_payable:S1        0.00
  sum                      0.00   entries: 12

== 6. Daily reconciliation against the processor report ==
  ORD-1  ledger  100.00  report  100.00  matched
  ORD-2  ledger       -  report   25.00  MISSING IN LEDGER (lost webhook?)
  ORD-3  ledger   40.00  report       -  MISSING AT PROCESSOR
processor fee on 25.00 = 1.03
~~~

What the simulation stands for and leaves out: the \`Ledger\` class stands for the ledger tables inside one database transaction (the \`seen\` set is the unique constraint on \`tx_id\`, the version map is the \`version\` column). The PSP, its fee (2.9% plus 30 cents, an assumption) and its settlement report are simulated in-process. Real systems also handle currencies, holding periods, chargebacks and FX, and run the payout version check in SQL rather than in memory.

## Edge Cases Worth Knowing

- **Partial captures and multiple captures.** Capture less than authorized (an item out of stock) and release the rest; some PSPs allow several partial captures.
- **Refund after payout.** The seller may already have been paid; their payable goes into debit, which you recover from future sales or treat as a loss, a business policy decision.
- **Currency rounding.** Percentages produce fractions of a cent. Choose a rounding rule (the example uses half up in integer arithmetic) and allocate remainders explicitly.
- **Webhooks out of order.** A \`refund.succeeded\` can arrive before \`charge.captured\` is processed; store events and apply them by state, not by arrival order.
- **Authorization expiry.** Manual-capture payments not captured before the PSP deadline are released; capture or cancel them on a schedule.

## Common Pitfalls

- **Floats for money.** \`0.1 + 0.2\` errors accumulate into real discrepancies; use integer minor units or a decimal type.
- **A single \`balance\` column with no entries.** Updating a balance in place loses the history needed to explain or audit it.
- **Updating or deleting ledger rows.** Corrections must be new reversing transactions.
- **Storing card numbers.** It pulls your whole system into full PCI scope; use PSP tokens.
- **Trusting the synchronous response alone.** Outcomes also arrive by webhook; without reconciliation, a lost webhook is a permanent hole in the books.
- **Payouts without a balance check and idempotency key.** A retry pays the seller twice.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Scope and flows:</strong> <span style="color:#f0e2c8;">Two flows: <strong style="color:#ffca28;">pay-in</strong> from buyer cards through a PSP, and <strong style="color:#ffca28;">payouts</strong> to seller banks. Card data never reaches us: hosted fields give us a <strong style="color:#ffca28;">token</strong>, which keeps us near <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SAQ A</code> PCI scope. At 10 million payments a day that is about 116 TPS average and about 1,157 at peak, so this is a correctness problem more than a scale problem.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Ledger:</strong> <span style="color:#f0e2c8;">The source of truth is a <strong style="color:#ffca28;">double-entry ledger</strong>: append-only entries in integer <strong style="color:#ffca28;">minor units</strong>, each transaction summing to zero. A 100.00 sale posts three entries: PSP receivable +100.00, seller payable -90.00, commission -10.00. Balances are cached per account with a version and recomputed nightly from entries.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Lifecycle:</strong> <span style="color:#f0e2c8;">Payments move <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CREATED -&gt; AUTHORIZED -&gt; CAPTURED -&gt; SETTLED</code> with refund and dispute branches, every transition written before the next external call, driven by the PSP response or webhook, idempotent on the PSP event id. Manual capture must happen before the authorization expires, typically 7 days for online cards per Stripe.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Payouts:</strong> <span style="color:#f0e2c8;">A payout is a ledger transaction with a version check on the seller account and a no-overdraft rule, plus an idempotency key to the bank. In my run, two workers racing to pay out 63.00 produced exactly one payout: the second got a version conflict, then failed the balance check.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Reconciliation:</strong> <span style="color:#f0e2c8;">Every day I compare the ledger with the PSP settlement report and the bank statement. In my example that caught a charge the PSP had but we never recorded (a lost webhook) and one we recorded that the PSP never had. The trial balance must always sum to zero.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not just a <code style="background:#4a3418;color:#ffe0b2;padding:1px 5px;border-radius:3px;">balance</code> column per user?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">You cannot explain it, audit it or rebuild it after a bug. Entries give the full history; the cached balance is a performance optimisation that is verified against them.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you avoid charging twice when the client retries?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">Idempotency-Key</code> on our API stored with a unique constraint, the same key forwarded to the PSP, and unique transaction ids in the ledger. In my run a duplicate <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">ORD-1:charge</code> was ignored.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What about the hot commission account?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every payment touches it, so its row lock limits throughput. I split it into N sub-accounts chosen by hash and sum them for reports, or post entries without maintaining a running balance for it.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do refunds and chargebacks show up?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">As new transactions that reverse part of the original legs, never as edits. A refund of 30.00 took 27.00 from the seller and 3.00 from commission; a chargeback is similar, plus a dispute fee.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How would you support a second PSP?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A routing layer chooses the PSP per payment by cost, success rate or health, the payment row stores which PSP and its reference, and each PSP gets its own receivable account and its own reconciliation.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Payment service provider (PSP) | Company that connects you to card networks and banks |
| Pay-in and payout | Money in from buyers; money out to sellers |
| Tokenization | Replacing card numbers with a PSP reference |
| PCI DSS | Card data security standard; scope shrinks with hosted fields |
| Minor units | Integer amounts in the smallest currency unit |
| Double-entry ledger | Every movement as entries that sum to zero |
| Append-only | Never update or delete; correct with reversals |
| Trial balance | All account balances; must sum to zero |
| Authorization and capture | Approve and hold, then actually take the money |
| Settlement | PSP transfers collected funds minus fees to your bank |
| Chargeback (dispute) | Card holder reverses a charge through their bank |
| Reconciliation | Daily comparison of ledger with PSP and bank records |

**Conclusion:** A payment system is mostly an integration with a PSP wrapped around a very careful set of books. Keep card data at the PSP with hosted fields and tokens; record every movement as append-only double-entry transactions in integer minor units; drive a durable state machine from PSP responses and webhooks, idempotently; protect payouts with versioned balance updates and idempotency keys; and reconcile against the PSP and the bank every day. Throughput is modest even at 10 million payments a day, so the design spends its effort on correctness, auditability and recovery, and the trial balance summing to zero is the simplest proof that it works.`,
    examples: [
      {
        label: `Marketplace payment on a double-entry ledger: integer cents, an idempotent charge, a refund, a payout race and daily reconciliation`,
        variants: [
          { tech: "node", code: `// A marketplace payment flow on a double-entry ledger, in integer minor units (cents).
// Debits are positive, credits negative; every transaction must sum to zero.
const fmt = (c) => (c < 0 ? "-" : "") + Math.floor(Math.abs(c) / 100) + "." + String(Math.abs(c) % 100).padStart(2, "0");
const yn = (b) => (b ? "yes" : "no");
const pspFee = (amount) => Math.floor((amount * 29 + 500) / 1000) + 30; // 2.9% + 30c, rounded half up

console.log("== 1. Money is integers ==");
let f = 0;
for (let i = 0; i < 10; i++) f += 0.1;
let cents = 0;
for (let i = 0; i < 10; i++) cents += 10;
console.log("ten x 0.10 as float = " + f + ", equals 1? " + yn(f === 1));
console.log("ten x 10 cents      = " + fmt(cents) + ", equals 1.00? " + yn(cents === 100));
function allocate(total, parts) { // largest remainder: shares always add up to total
  const base = Math.floor(total / parts);
  const out = [];
  for (let i = 0; i < parts; i++) out.push(base + (i < total - base * parts ? 1 : 0));
  return out;
}
const split = allocate(10000, 3);
console.log("split 100.00 three ways: " + split.map(fmt).join(" + ") + " = " + fmt(split.reduce((a, b) => a + b, 0)));

class Ledger {
  constructor() { this.entries = []; this.bal = new Map(); this.ver = new Map(); this.seen = new Set(); }
  balance(acct) { return this.bal.get(acct) || 0; }
  version(acct) { return this.ver.get(acct) || 0; }
  post(txId, legs, expect) { // expect: optional {account, version, minCredit}
    if (this.seen.has(txId)) return "duplicate " + txId + " ignored";
    if (legs.reduce((s, l) => s + l[1], 0) !== 0) return "rejected " + txId + ": legs do not sum to zero";
    if (expect) {
      if (this.version(expect.account) !== expect.version) return "rejected " + txId + ": version conflict on " + expect.account;
      const after = this.balance(expect.account) + legs.filter((l) => l[0] === expect.account).reduce((s, l) => s + l[1], 0);
      if (after > 0) return "rejected " + txId + ": " + expect.account + " would go negative";
    }
    this.seen.add(txId);
    for (const [acct, amt] of legs) {
      this.entries.push([txId, acct, amt]);
      this.bal.set(acct, this.balance(acct) + amt);
      this.ver.set(acct, this.version(acct) + 1);
    }
    return "posted " + txId + " (" + legs.length + " entries)";
  }
}

console.log("\\n== 2. Order ORD-1: buyer pays 100.00, platform keeps 10% ==");
const L = new Ledger();
const fee1 = pspFee(10000);
console.log("processor fee on 100.00 = " + fmt(fee1));
console.log(L.post("ORD-1:charge", [["psp_receivable", 10000], ["seller_payable:S1", -9000], ["revenue:commission", -1000]]));
console.log(L.post("ORD-1:charge", [["psp_receivable", 10000], ["seller_payable:S1", -9000], ["revenue:commission", -1000]]));
console.log(L.post("ORD-1:fee", [["expense:psp_fees", fee1], ["psp_receivable", -fee1]]));
console.log(L.post("ORD-1:settle", [["cash:bank", 10000 - fee1], ["psp_receivable", -(10000 - fee1)]]));
console.log(L.post("ORD-1:bad", [["cash:bank", 500], ["revenue:commission", -400]]));

console.log("\\n== 3. Partial refund of 30.00 ==");
console.log(L.post("ORD-1:refund", [["seller_payable:S1", 2700], ["revenue:commission", 300], ["cash:bank", -3000]]));
console.log("seller S1 is owed " + fmt(-L.balance("seller_payable:S1")));

console.log("\\n== 4. Two payout requests race for the same balance ==");
const v = L.version("seller_payable:S1");
const owed = -L.balance("seller_payable:S1");
const payout = (id, ver) => L.post(id, [["seller_payable:S1", owed], ["cash:bank", -owed]], { account: "seller_payable:S1", version: ver });
console.log("both read balance " + fmt(owed) + " at version " + v);
console.log("worker 1: " + payout("PAYOUT-1", v));
console.log("worker 2: " + payout("PAYOUT-2", v));
console.log("worker 2 re-reads version " + L.version("seller_payable:S1") + ": " + payout("PAYOUT-2", L.version("seller_payable:S1")));

console.log("\\n== 5. Trial balance ==");
let total = 0;
for (const acct of [...L.bal.keys()].sort()) {
  total += L.balance(acct);
  console.log("  " + acct.padEnd(20) + fmt(L.balance(acct)).padStart(9));
}
console.log("  " + "sum".padEnd(20) + fmt(total).padStart(9) + "   entries: " + L.entries.length);

console.log("\\n== 6. Daily reconciliation against the processor report ==");
L.post("ORD-3:charge", [["psp_receivable", 4000], ["seller_payable:S2", -3600], ["revenue:commission", -400]]);
const report = [["ORD-1", 10000, pspFee(10000)], ["ORD-2", 2500, pspFee(2500)]];
const ours = new Map();
for (const [tx, acct, amt] of L.entries) if (tx.endsWith(":charge") && acct === "psp_receivable") ours.set(tx.split(":")[0], amt);
const theirs = new Map(report.map((r) => [r[0], r[1]]));
for (const id of [...new Set([...ours.keys(), ...theirs.keys()])].sort()) {
  const a = ours.get(id), b = theirs.get(id);
  const verdict = a === undefined ? "MISSING IN LEDGER (lost webhook?)" : b === undefined ? "MISSING AT PROCESSOR" : a === b ? "matched" : "AMOUNT MISMATCH";
  console.log("  " + id + "  ledger " + (a === undefined ? "-" : fmt(a)).padStart(7) + "  report " + (b === undefined ? "-" : fmt(b)).padStart(7) + "  " + verdict);
}
console.log("processor fee on 25.00 = " + fmt(pspFee(2500)));` },
          { tech: "python", code: `# A marketplace payment flow on a double-entry ledger, in integer minor units (cents).
# Debits are positive, credits negative; every transaction must sum to zero.


def fmt(c):
    return ("-" if c < 0 else "") + str(abs(c) // 100) + "." + str(abs(c) % 100).zfill(2)


def yn(b):
    return "yes" if b else "no"


def psp_fee(amount):  # 2.9% + 30c, rounded half up
    return (amount * 29 + 500) // 1000 + 30


print("== 1. Money is integers ==")
f = 0.0
for _ in range(10):
    f += 0.1
cents = 0
for _ in range(10):
    cents += 10
print("ten x 0.10 as float = " + repr(f) + ", equals 1? " + yn(f == 1))
print("ten x 10 cents      = " + fmt(cents) + ", equals 1.00? " + yn(cents == 100))


def allocate(total, parts):  # largest remainder: shares always add up to total
    base = total // parts
    return [base + (1 if i < total - base * parts else 0) for i in range(parts)]


split = allocate(10000, 3)
print("split 100.00 three ways: " + " + ".join(fmt(s) for s in split) + " = " + fmt(sum(split)))


class Ledger:
    def __init__(self):
        self.entries, self.bal, self.ver, self.seen = [], {}, {}, set()

    def balance(self, acct):
        return self.bal.get(acct, 0)

    def version(self, acct):
        return self.ver.get(acct, 0)

    def post(self, tx_id, legs, expect=None):  # expect: optional (account, version)
        if tx_id in self.seen:
            return "duplicate " + tx_id + " ignored"
        if sum(a for _, a in legs) != 0:
            return "rejected " + tx_id + ": legs do not sum to zero"
        if expect:
            acct, ver = expect
            if self.version(acct) != ver:
                return "rejected " + tx_id + ": version conflict on " + acct
            after = self.balance(acct) + sum(a for x, a in legs if x == acct)
            if after > 0:
                return "rejected " + tx_id + ": " + acct + " would go negative"
        self.seen.add(tx_id)
        for acct, amt in legs:
            self.entries.append((tx_id, acct, amt))
            self.bal[acct] = self.balance(acct) + amt
            self.ver[acct] = self.version(acct) + 1
        return "posted " + tx_id + " (" + str(len(legs)) + " entries)"


print("\\n== 2. Order ORD-1: buyer pays 100.00, platform keeps 10% ==")
L = Ledger()
fee1 = psp_fee(10000)
print("processor fee on 100.00 = " + fmt(fee1))
print(L.post("ORD-1:charge", [("psp_receivable", 10000), ("seller_payable:S1", -9000), ("revenue:commission", -1000)]))
print(L.post("ORD-1:charge", [("psp_receivable", 10000), ("seller_payable:S1", -9000), ("revenue:commission", -1000)]))
print(L.post("ORD-1:fee", [("expense:psp_fees", fee1), ("psp_receivable", -fee1)]))
print(L.post("ORD-1:settle", [("cash:bank", 10000 - fee1), ("psp_receivable", -(10000 - fee1))]))
print(L.post("ORD-1:bad", [("cash:bank", 500), ("revenue:commission", -400)]))

print("\\n== 3. Partial refund of 30.00 ==")
print(L.post("ORD-1:refund", [("seller_payable:S1", 2700), ("revenue:commission", 300), ("cash:bank", -3000)]))
print("seller S1 is owed " + fmt(-L.balance("seller_payable:S1")))

print("\\n== 4. Two payout requests race for the same balance ==")
v = L.version("seller_payable:S1")
owed = -L.balance("seller_payable:S1")


def payout(pid, ver):
    return L.post(pid, [("seller_payable:S1", owed), ("cash:bank", -owed)], ("seller_payable:S1", ver))


print("both read balance " + fmt(owed) + " at version " + str(v))
print("worker 1: " + payout("PAYOUT-1", v))
print("worker 2: " + payout("PAYOUT-2", v))
print("worker 2 re-reads version " + str(L.version("seller_payable:S1")) + ": " + payout("PAYOUT-2", L.version("seller_payable:S1")))

print("\\n== 5. Trial balance ==")
total = 0
for acct in sorted(L.bal):
    total += L.balance(acct)
    print("  " + acct.ljust(20) + fmt(L.balance(acct)).rjust(9))
print("  " + "sum".ljust(20) + fmt(total).rjust(9) + "   entries: " + str(len(L.entries)))

print("\\n== 6. Daily reconciliation against the processor report ==")
L.post("ORD-3:charge", [("psp_receivable", 4000), ("seller_payable:S2", -3600), ("revenue:commission", -400)])
report = [("ORD-1", 10000, psp_fee(10000)), ("ORD-2", 2500, psp_fee(2500))]
ours = {}
for tx, acct, amt in L.entries:
    if tx.endswith(":charge") and acct == "psp_receivable":
        ours[tx.split(":")[0]] = amt
theirs = {r[0]: r[1] for r in report}
for oid in sorted(set(ours) | set(theirs)):
    a, b = ours.get(oid), theirs.get(oid)
    if a is None:
        verdict = "MISSING IN LEDGER (lost webhook?)"
    elif b is None:
        verdict = "MISSING AT PROCESSOR"
    else:
        verdict = "matched" if a == b else "AMOUNT MISMATCH"
    print("  " + oid + "  ledger " + ("-" if a is None else fmt(a)).rjust(7) + "  report " + ("-" if b is None else fmt(b)).rjust(7) + "  " + verdict)
print("processor fee on 25.00 = " + fmt(psp_fee(2500)))` },
        ],
      },
    ],
  },
  {
    title: `How would you design a hotel reservation system?`,
    difficulty: "hard",
    seoDescription: `Design a hotel reservation system: room-type inventory per date, preventing double booking with conditional updates, multi-night stays, and overbooking.`,
    description: `**Question presented to candidate:**
"Design the reservation system for a hotel chain like Marriott, or a booking site like Booking.com: guests search for hotels by city and dates, see prices, and book a room type for several nights. Make sure we never sell more rooms than we have, unless we decide to overbook on purpose."

**What a strong answer should cover:**
- Inventory modelled as **counters per (hotel, room type, date)**, not individual rooms: guests book a type, the front desk assigns the room number at check-in
- The **double-booking race** (two guests, one room left) and how to prevent it: a conditional \`UPDATE ... WHERE reserved + n <= total\`, optimistic versioning, or row locks, with the trade-offs
- A multi-night stay updates several date rows **in one transaction**, all or nothing
- The reservation lifecycle (pending, paid, confirmed, cancelled), holds that expire during payment, and an **idempotent** reserve call
- **Overbooking** as a business setting (for example accept 110% of rooms) with the no-show arithmetic behind it
- Scale: writes are tiny (a few per second), reads are large (search and availability); cache and replicate reads, shard by hotel

**Clarifying questions expected:**
- One chain or an aggregator of many hotels? How many hotels and rooms?
- Do guests book a room type or a specific room?
- Is overbooking allowed, and by how much? Pay now or pay at the hotel?

**Code / implementation expected:** Optional — the example reproduces the double-booking race and shows conditional updates, all-or-nothing multi-night bookings, idempotent retries and the overbooking curve.`,
    answer: `**Target Audience:** Backend engineers preparing for "design a booking system" rounds, and anyone who wants to see why "check, then insert" is the most expensive bug in reservations.
**Difficulty:** Hard
**Verified with:** Node 22.22 and Python 3.12 (identical output). The race and the fixes are simulated in-process; the SQL statements shown are the standard PostgreSQL and MySQL forms of the same logic.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. Every number comes from running the example; the **Verified** section quotes its full output.

## 1. Why This Even Matters — A Story First

A small hotel has 10 king rooms and a paper diary at the front desk. On Christmas Eve, 9 are already written in. Two phone lines ring at the same moment. Two receptionists each look at the diary, see one room left, say "yes, you are booked" and start writing. On Christmas Eve, 11 guests arrive for 10 rooms.

The diary is the database, the receptionists are application servers, and the moment between looking and writing is the bug. A hotel reservation system is mostly about that moment: making "is there a room?" and "take it" a single, indivisible step, across every night of a stay, while thousands of people browse prices at the same time. And then, oddly, hotels deliberately sell an 11th room anyway, because some guests never show up. You need to be able to do that on purpose, not by accident.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| One chain or an aggregator of many hotels? How many hotels and rooms? | Sizes data and decides whether inventory is ours or synced from hotel systems |
| Book a room type or a specific room? | Room type means counters; specific rooms means per-room rows (like seats) |
| Pay at booking or at the hotel? Free cancellation? | Adds a payment step and holds; cancellations return inventory |
| Overbooking allowed? How much? | Changes the availability check from \`total\` to \`total x (1 + overbook)\` |
| Dynamic prices per date? | Prices live per room type per date and must be shown consistently |
| How fresh must search results be? | Decides how much availability can be cached |

## 3. Requirements

**Functional**
- Search hotels by location and dates; show room types with price and availability.
- Reserve a room type for a date range; pay now or later; cancel.
- Hotel staff manage inventory, prices and room assignment at check-in.
- Optional overbooking per hotel.

**Non-functional**
- **No accidental double booking**: availability check and reservation are atomic.
- **High read throughput**: searches outnumber bookings by orders of magnitude; reads may be slightly stale, the final booking step may not.
- **Availability**: booking must keep working when search or caching layers are degraded.
- **Idempotency**: a retried "book" never creates two reservations.

## 4. Capacity Estimate

The example starts with the arithmetic. Assumptions: 5,000 hotels, 1 million rooms in total, 70% occupancy, an average stay of 3 nights, a 10% conversion at each step of the funnel (room detail page, booking page, reservation), 20 room types per hotel and inventory kept 2 years ahead.

~~~text
== 1. Capacity (assumptions) ==
reservations/day = 1,000,000 x 0.7 / 3 nights = 233333
reservations/s = 2.70, booking page QPS ~ 27.0, room detail QPS ~ 270
inventory rows = 5,000 hotels x 20 room types x 730 days = 73000000
~~~

Fewer than **3 reservations a second**. Even at 10 times that peak, a single relational database handles the writes. The 270 detail page views a second are reads, served from caches and replicas. The inventory table has 73 million small rows, which fits on one machine; sharding by \`hotel_id\` is for growth and isolation, not necessity. This is a design where **correctness, not throughput, is the hard part**, which is why a relational database with transactions is the natural choice ([When would you choose SQL vs NoSQL?](/interview-question/when-would-you-choose-sql-vs-nosql)).

## 5. API

- \`GET /v1/hotels/search?city=paris&check_in=2026-12-23&check_out=2026-12-26&guests=2\`: hotels with their cheapest available room type (served from a search index and cache).
- \`GET /v1/hotels/{hotel_id}/availability?check_in=...&check_out=...\`: room types, nightly prices and remaining count, read from replicas or a cache.
- \`POST /v1/reservations\` with \`{reservation_id, hotel_id, room_type_id, check_in, check_out, guests}\`. The client generates \`reservation_id\` when the booking page loads, which makes the call idempotent.
- \`POST /v1/reservations/{id}/cancel\` and \`GET /v1/reservations/{id}\`.

## 6. Data Model

📌 **Interview term: room-type inventory** — guests book a type ("king, sea view"), not room 412. So inventory is a counter per hotel, room type and date: how many exist and how many are already reserved. The specific room is assigned at check-in.

| Table | Columns | Notes |
| :--- | :--- | :--- |
| \`room_type_inventory\` | \`hotel_id, room_type_id, date\` (primary key), \`total_inventory\`, \`total_reserved\`, \`version\` | One row per night; the only table the booking race touches |
| \`reservations\` | \`reservation_id\` (primary key, from client), \`hotel_id\`, \`room_type_id\`, \`check_in\`, \`check_out\`, \`status\`, \`guest_id\`, \`amount\` | \`status\`: \`PENDING, PAID, CONFIRMED, CANCELLED, REFUNDED\` |
| \`rates\` | \`hotel_id, room_type_id, date\`, \`price\` | Nightly price, separate from inventory |
| \`hotels\`, \`room_types\` | descriptive data | Read-mostly, cached |

Searching "any hotel in Paris for these dates" across all inventory rows is a read problem: a search index (location, amenities, price bands) narrows to candidate hotels, then availability for those few hotels is read from cached inventory.

<svg class="iq-diagram" width="100%" viewBox="0 0 660 280" role="img" aria-label="Booking path: the client calls the reservation service, which updates inventory and reservation rows in one database transaction, then calls payment; search reads from a cache and replicas">
  <defs>
    <marker id="sd18q2-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="160" height="80" rx="10"/>
  <text class="d-text" x="110" y="65" text-anchor="middle">Client</text>
  <text class="d-sub" x="110" y="88" text-anchor="middle">booking page</text>
  <rect class="d-box-accent" x="250" y="30" width="160" height="80" rx="10"/>
  <text class="d-text" x="330" y="65" text-anchor="middle">Reservation svc</text>
  <text class="d-sub" x="330" y="88" text-anchor="middle">one transaction</text>
  <rect class="d-box-accent" x="470" y="30" width="160" height="80" rx="10"/>
  <text class="d-text" x="550" y="65" text-anchor="middle">Primary DB</text>
  <text class="d-sub" x="550" y="88" text-anchor="middle">inventory rows</text>
  <rect class="d-box" x="470" y="170" width="160" height="80" rx="10"/>
  <text class="d-text" x="550" y="205" text-anchor="middle">Payment svc</text>
  <text class="d-sub" x="550" y="228" text-anchor="middle">PSP</text>
  <rect class="d-box" x="30" y="170" width="160" height="80" rx="10"/>
  <text class="d-text" x="110" y="205" text-anchor="middle">Search svc</text>
  <text class="d-sub" x="110" y="228" text-anchor="middle">index and cache</text>
  <rect class="d-box-muted" x="250" y="170" width="160" height="80" rx="10"/>
  <text class="d-text" x="330" y="205" text-anchor="middle">Read replicas</text>
  <text class="d-sub" x="330" y="228" text-anchor="middle">availability</text>
  <path class="d-edge" d="M 190 70 L 242 70" marker-end="url(#sd18q2-arrow)"/>
  <path class="d-edge-accent" d="M 410 70 L 462 70" marker-end="url(#sd18q2-arrow)"/>
  <path class="d-edge" d="M 550 110 L 550 162" marker-end="url(#sd18q2-arrow)"/>
  <path class="d-edge" d="M 190 210 L 242 210" marker-end="url(#sd18q2-arrow)"/>
  <path class="d-edge-dashed" d="M 550 110 L 330 162" marker-end="url(#sd18q2-arrow)"/>
</svg>

The booking path (top row) is short and strongly consistent: one service, one database transaction. The search path (bottom row) reads replicas and caches that lag the primary slightly (dashed arrow); that is fine because the final booking re-checks inventory on the primary.

## 7. Deep Dive 1: The Double-Booking Race

📌 **Interview term: race condition (check-then-act)** — two transactions both read the same state, both decide the action is allowed, and both act. The check was true when each looked, but not when both wrote.

The example reproduces it: 9 of 10 king rooms reserved on 12-24, two guests booking at once.

~~~text
== 2. Two guests, one room left on 12-24 ==
naive SELECT count then INSERT: both saw 9 of 10, rows now 11 -> DOUBLE BOOKED
conditional UPDATE ... WHERE reserved + 1 <= total: T1 rows=1, T2 rows=0, reserved = 10
optimistic version check: T1 booked, T2 version conflict, T2 retry sold out
~~~

**Naive:** both transactions run \`SELECT count(*)\`, both see 9, both insert. Eleven reservations for ten rooms. The default isolation levels do not prevent it: PostgreSQL defaults to \`READ COMMITTED\` and MySQL InnoDB to \`REPEATABLE READ\`, and in both a plain \`SELECT\` takes no lock that would stop the other insert (only \`SERIALIZABLE\` would detect it, by aborting one transaction).

**Fix 1, conditional update (recommended).** Make the check part of the write:

~~~sql
UPDATE room_type_inventory
SET total_reserved = total_reserved + :rooms
WHERE hotel_id = :h AND room_type_id = :t AND date = :d
  AND total_reserved + :rooms <= total_inventory;
-- affected rows = 0  ->  sold out, roll back
~~~

The database locks the row while it evaluates and updates it, so the second transaction re-evaluates the condition against the new value and updates 0 rows. No application-level lock, no retry loop.

📌 **Interview term: optimistic concurrency control** — read a \`version\`, then write \`WHERE version = :read_version\`; if someone else wrote first, 0 rows change and you retry with fresh data. In the run T2 got a version conflict, retried, and correctly saw "sold out". It shines when conflicts are rare, which is true for most hotel nights.

📌 **Interview term: pessimistic locking** — \`SELECT ... FOR UPDATE\` locks the row until commit, so the second transaction waits. Correct, but holds locks across application logic, and long waits under load. See [What is the difference between optimistic and pessimistic locking?](/interview-question/what-is-the-difference-between-optimistic-and-pessimistic-locking).

| Approach | How conflicts show up | Good when | Watch out for |
| :--- | :--- | :--- | :--- |
| Conditional \`UPDATE ... WHERE reserved + n <= total\` | 0 rows updated | Counters, any contention | Must check affected rows |
| Optimistic version column | 0 rows updated, retry | Low contention, complex rows | Retry storms on hot rows |
| \`SELECT ... FOR UPDATE\` | Waits for lock | Short transactions | Deadlocks if dates locked in different orders |
| Database \`CHECK (total_reserved <= total_inventory)\` | Constraint error | Safety net for all the above | Error handling path |
| Distributed lock (Redis) | Lock not acquired | Rarely needed here | Lock expiry while DB write is slow; adds a second system |

A \`CHECK\` constraint is a cheap last line of defence even when you use one of the others.

## 8. Deep Dive 2: Multi-Night Stays Are All or Nothing

A stay from 12-23 to 12-26 is three inventory rows. Updating them one by one without a transaction leaks inventory when one night is full:

~~~text
== 3. A 3-night stay (12-23 to 12-26) when 12-24 is full ==
before:        12-23=6/10  12-24=10/10  12-25=4/10
night by night: 12-23=7/10  12-24=10/10  12-25=4/10   <- 12-23 leaked a room
one transaction: booked=no  12-23=6/10  12-24=10/10  12-25=4/10
after a cancel:  booked=yes  12-23=7/10  12-24=10/10  12-25=5/10
~~~

The night-by-night loop reserved 12-23, then failed on 12-24, and left 12-23 taken by nobody. In one transaction, the failure on 12-24 rolls back 12-23 too, and after a cancellation frees a room on 12-24 the whole stay succeeds. In SQL, run the conditional update for each night inside one transaction and roll back if any affected-row count is 0. To avoid deadlocks between two stays that overlap, always touch the dates in ascending order. Shard by \`hotel_id\` so every row of one stay is in the same database and the transaction stays local.

📌 **Interview term: atomicity** — a transaction's writes all happen or none do. It is the property that makes multi-night stays safe without any compensating logic.

## 9. Deep Dive 3: Holds, Payment and Idempotency

Paying takes time (3-D Secure, slow card networks). Two common choices:

- **Reserve, then pay**: the reservation is created \`PENDING\` and inventory is decremented immediately; if payment does not succeed within, say, 10 minutes, a sweeper cancels it and returns inventory. Simple, and the guest never pays for a room that is gone.
- **Pay at the hotel**: reserve and confirm immediately with a card guarantee; no hold window.

Either way, the reserve call must be idempotent because clients and gateways retry on timeouts:

~~~text
== 4. Retry with the same reservation id ==
created R-7f3a | timeout, client retries: existing R-7f3a | 12-23=7/10  12-24=10/10  12-25=5/10
~~~

The client generated \`R-7f3a\` when the booking page loaded and sent it with the request; the retry found the existing reservation and returned it, and inventory moved only once. With \`reservation_id\` as the primary key, the duplicate insert fails inside the same transaction as the inventory update, so both roll back together. Background: [What is idempotency and why does it matter?](/interview-question/what-is-idempotency-and-why-does-it-matter). The payment step itself is covered in [How would you design a payment system?](/interview-question/how-would-you-design-a-payment-system-573c).

## 10. Deep Dive 4: Overbooking on Purpose

📌 **Interview term: overbooking** — accepting more reservations than rooms because a predictable share of guests cancel late or do not show up. The availability check becomes \`total_reserved + n <= floor(total_inventory x 1.1)\` for a 10% limit.

📌 **Interview term: walking a guest** — when more guests arrive than rooms, the hotel pays for a room elsewhere and usually compensation. It is the cost side of overbooking.

The example computes the expected outcome for a 100-room hotel with a 5% no-show rate, a 200 room rate and a 400 cost to walk a guest, using the binomial distribution of how many booked guests actually arrive:

~~~text
== 5. Overbooking 100 rooms, 5% no-shows, room 200, walking a guest costs 400 ==
  accept 100: rooms filled 95.00, guests walked 0.00, expected net 19000
  accept 102: rooms filled 96.86, guests walked 0.04, expected net 19356
  accept 104: rooms filled 98.43, guests walked 0.37, expected net 19538
  accept 106: rooms filled 99.41, guests walked 1.29, expected net 19364
  accept 108: rooms filled 99.83, guests walked 2.77, expected net 18859
  accept 110: rooms filled 99.96, guests walked 4.54, expected net 18178
~~~

Accepting 104 bookings fills 98.43 rooms on average and walks 0.37 guests, for the best expected net in this model (19,538 against 19,000 without overbooking). Beyond that, each extra booking mostly adds walked guests. The no-show rate, price and walking cost are assumptions; real revenue-management systems estimate them per hotel, date and channel. The design point is that overbooking is a **number stored per hotel and room type**, applied by the same conditional update, not an accident of a race.

## 11. What Breaks First at 10x

- **Read load on search and availability.** Add caches with short TTLs and event-driven invalidation from inventory changes ([How does CDC with Debezium keep search and cache in sync with Postgres?](/interview-question/how-does-cdc-with-debezium-keep-search-and-cache-in-sync-with-postgres)); never use the cache for the final check.
- **Hot inventory rows.** A flash sale on one hotel and date funnels all bookings into one row. Conditional updates queue on the row lock; that is still correct, and at hotel scale still fast. Ticket-style seat contention is a different problem ([How would you design a ticket booking system like Ticketmaster?](/interview-question/how-would-you-design-a-ticket-booking-system-like-ticketmaster)).
- **Aggregator sync.** Booking sites selling rooms that the hotel also sells directly need two-way sync with the hotel property system; the inventory row becomes an allocation per channel, with reconciliation for drift.
- **Data growth.** Archive past dates out of the inventory table; shard by \`hotel_id\` when one database is no longer enough ([What is database sharding?](/interview-question/what-is-database-sharding)).

## 12. Verified: Running the Code

The example **"Hotel inventory counters: the double-booking race, conditional updates, all-or-nothing multi-night stays, retries and overbooking"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
== 1. Capacity (assumptions) ==
reservations/day = 1,000,000 x 0.7 / 3 nights = 233333
reservations/s = 2.70, booking page QPS ~ 27.0, room detail QPS ~ 270
inventory rows = 5,000 hotels x 20 room types x 730 days = 73000000

== 2. Two guests, one room left on 12-24 ==
naive SELECT count then INSERT: both saw 9 of 10, rows now 11 -> DOUBLE BOOKED
conditional UPDATE ... WHERE reserved + 1 <= total: T1 rows=1, T2 rows=0, reserved = 10
optimistic version check: T1 booked, T2 version conflict, T2 retry sold out

== 3. A 3-night stay (12-23 to 12-26) when 12-24 is full ==
before:        12-23=6/10  12-24=10/10  12-25=4/10
night by night: 12-23=7/10  12-24=10/10  12-25=4/10   <- 12-23 leaked a room
one transaction: booked=no  12-23=6/10  12-24=10/10  12-25=4/10
after a cancel:  booked=yes  12-23=7/10  12-24=10/10  12-25=5/10

== 4. Retry with the same reservation id ==
created R-7f3a | timeout, client retries: existing R-7f3a | 12-23=7/10  12-24=10/10  12-25=5/10

== 5. Overbooking 100 rooms, 5% no-shows, room 200, walking a guest costs 400 ==
  accept 100: rooms filled 95.00, guests walked 0.00, expected net 19000
  accept 102: rooms filled 96.86, guests walked 0.04, expected net 19356
  accept 104: rooms filled 98.43, guests walked 0.37, expected net 19538
  accept 106: rooms filled 99.41, guests walked 1.29, expected net 19364
  accept 108: rooms filled 99.83, guests walked 2.77, expected net 18859
  accept 110: rooms filled 99.96, guests walked 4.54, expected net 18178
~~~

What the simulation stands for and leaves out: the in-memory map stands for the \`room_type_inventory\` table, \`condUpdate\` for the conditional SQL \`UPDATE\`, and \`bookStay\` for one database transaction. The race is reproduced by interleaving two reads before two writes by hand; a real database would interleave them across connections. The overbooking model uses independent no-shows with a single probability, which real guests do not quite follow (groups cancel together).

## Edge Cases Worth Knowing

- **Date semantics.** A stay from 12-23 to 12-26 uses the nights of 12-23, 12-24 and 12-25; the check-out date is not reserved. Off-by-one bugs here double-book or waste a night.
- **Time zones.** "Tonight" is the hotel's local date, not the server's UTC date.
- **Modifying a booking.** Changing dates is cancel plus book in one transaction, or the guest can lose both.
- **Pending holds that never resolve.** A sweeper must release \`PENDING\` reservations past their deadline, idempotently.
- **Inventory changes by staff.** Taking rooms out of service can make \`total_reserved > total_inventory\`; the system must flag those dates rather than fail.

## Common Pitfalls

- **Check-then-insert without a lock or condition.** The classic double booking, shown above.
- **Booking each night separately.** Leaks inventory on partial failure; use one transaction.
- **Using the cache for the final availability check.** Cached counts are stale; the primary decides.
- **A Redis lock as the only guard.** Locks can expire mid-transaction; the database condition must still hold.
- **No idempotency key on reserve.** Timeouts plus retries create duplicate reservations.
- **Treating overbooking as a bug fix.** It is a policy number applied in the same atomic check.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Model:</strong> <span style="color:#f0e2c8;">Guests book a <strong style="color:#ffca28;">room type</strong>, so inventory is a counter per <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">(hotel, room_type, date)</code> with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total_inventory</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">total_reserved</code>; the room number is assigned at check-in. Prices are per date in a separate table.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Scale:</strong> <span style="color:#f0e2c8;">1 million rooms at 70% occupancy and 3-night stays is about 233,000 reservations a day, under <strong style="color:#ffca28;">3 per second</strong>. Writes fit one relational database; the load is search and availability reads, served by a search index, caches and replicas.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Concurrency:</strong> <span style="color:#f0e2c8;">The race is check-then-insert: two guests both see 9 of 10 and both book. I make the check part of the write: <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">UPDATE ... SET total_reserved = total_reserved + 1 WHERE ... AND total_reserved + 1 &lt;= total_inventory</code>; 0 affected rows means sold out. A <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">CHECK</code> constraint is the safety net.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Multi-night and idempotency:</strong> <span style="color:#f0e2c8;">All nights of a stay are updated in <strong style="color:#ffca28;">one transaction</strong>, in date order to avoid deadlocks, sharded by hotel so it stays local. The client sends a <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">reservation_id</code> generated on page load, the primary key, so retries return the same booking.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Overbooking:</strong> <span style="color:#f0e2c8;">Overbooking is a per-hotel limit applied by the same condition. With 5% no-shows, 200 per room and 400 to walk a guest, my model gave the best expected net at 104 bookings for 100 rooms: 19,538 against 19,000.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why not a distributed lock in Redis?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The database already serializes writes to one row and the conditional update is atomic. A Redis lock adds a second system that can expire mid-transaction, so the database condition would still be needed.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Optimistic or pessimistic locking?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">For counters, the conditional update beats both. For more complex rows, optimistic versioning when conflicts are rare; <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SELECT FOR UPDATE</code> only with short transactions and a consistent lock order.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you keep search results fresh?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Short TTL caches plus invalidation from change events on the inventory table. Search can be a few seconds stale because the booking re-checks the primary and the user sees "no longer available" at worst.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What happens if payment fails after reserving?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The reservation is <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">PENDING</code> with a deadline; a failed or expired payment cancels it and returns inventory in one transaction. The sweeper is idempotent so it can run twice safely.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is this different from Ticketmaster?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Hotels sell counted, fungible inventory at low contention; concerts sell specific seats to huge crowds at the same second, which needs seat holds with expiry and a waiting room.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Room-type inventory | Counter of total and reserved rooms per hotel, type and date |
| Race condition (check-then-act) | Two transactions both pass a check and both act |
| Optimistic concurrency control | Write only if the version you read is unchanged |
| Pessimistic locking | Lock the row on read until commit |
| Atomicity | All writes of a transaction happen or none do |
| Overbooking | Accepting more bookings than rooms, by policy |
| Walking a guest | Relocating an arriving guest when the hotel is full |

**Conclusion:** A hotel reservation system is a small-write, big-read design whose real difficulty is one race. Model inventory as counters per hotel, room type and night; make the availability check part of the update so two guests can never both take the last room; update every night of a stay in one transaction; make the reserve call idempotent with a client-generated id; and treat overbooking as a policy number in the same check. Serve the heavy search traffic from caches and replicas, and let the primary database have the final word on every booking.`,
    examples: [
      {
        label: `Hotel inventory counters: the double-booking race, conditional updates, all-or-nothing multi-night stays, retries and overbooking`,
        variants: [
          { tech: "node", code: `// Hotel inventory: per (hotel, room type, date) counters, the double-booking race,
// all-or-nothing multi-night stays, idempotent retries and the overbooking trade-off.
console.log("== 1. Capacity (assumptions) ==");
const rooms = 1000000, occupancy = 0.7, avgNights = 3;
const perDay = Math.round((rooms * occupancy) / avgNights);
const tps = perDay / 86400;
console.log("reservations/day = 1,000,000 x 0.7 / 3 nights = " + perDay);
console.log("reservations/s = " + tps.toFixed(2) + ", booking page QPS ~ " + (tps * 10).toFixed(1) + ", room detail QPS ~ " + (tps * 100).toFixed(0));
console.log("inventory rows = 5,000 hotels x 20 room types x 730 days = " + 5000 * 20 * 730);

// inventory table: key "hotel|type|date" -> {total, reserved, version}
const inv = new Map();
const key = (d) => "H1|KING|" + d;
const reset = () => { for (const [d, r] of [["12-23", 6], ["12-24", 9], ["12-25", 4]]) inv.set(key(d), { total: 10, reserved: r, version: 0 }); };
const show = () => ["12-23", "12-24", "12-25"].map((d) => d + "=" + inv.get(key(d)).reserved + "/10").join("  ");

console.log("\\n== 2. Two guests, one room left on 12-24 ==");
reset();
let row = inv.get(key("12-24"));
const rows = [];
for (let i = 0; i < 9; i++) rows.push("old-" + i); // 9 existing reservation rows
const seen1 = rows.length, seen2 = rows.length; // both SELECT count(*) before either INSERTs
if (seen1 < row.total) rows.push("guest-A");
if (seen2 < row.total) rows.push("guest-B");
console.log("naive SELECT count then INSERT: both saw " + seen1 + " of 10, rows now " + rows.length + " -> DOUBLE BOOKED");
reset();
row = inv.get(key("12-24"));
const condUpdate = (r, n) => { if (r.reserved + n <= r.total) { r.reserved += n; r.version++; return 1; } return 0; };
console.log("conditional UPDATE ... WHERE reserved + 1 <= total: T1 rows=" + condUpdate(row, 1) + ", T2 rows=" + condUpdate(row, 1) + ", reserved = " + row.reserved);
reset();
row = inv.get(key("12-24"));
const v1 = row.version, v2 = row.version;
const casUpdate = (r, ver) => { if (r.version !== ver) return "version conflict"; if (r.reserved + 1 > r.total) return "sold out"; r.reserved++; r.version++; return "booked"; };
console.log("optimistic version check: T1 " + casUpdate(row, v1) + ", T2 " + casUpdate(row, v2) + ", T2 retry " + casUpdate(row, row.version));

console.log("\\n== 3. A 3-night stay (12-23 to 12-26) when 12-24 is full ==");
reset();
inv.get(key("12-24")).reserved = 10;
const nights = ["12-23", "12-24", "12-25"];
console.log("before:        " + show());
for (const d of nights) { if (!condUpdate(inv.get(key(d)), 1)) break; }
console.log("night by night: " + show() + "   <- 12-23 leaked a room");
reset();
inv.get(key("12-24")).reserved = 10;
function bookStay(ds, n) { // one transaction: check every night, then apply all
  if (!ds.every((d) => inv.get(key(d)).reserved + n <= inv.get(key(d)).total)) return false;
  for (const d of ds) condUpdate(inv.get(key(d)), n);
  return true;
}
console.log("one transaction: booked=" + (bookStay(nights, 1) ? "yes" : "no") + "  " + show());
inv.get(key("12-24")).reserved = 9;
console.log("after a cancel:  booked=" + (bookStay(nights, 1) ? "yes" : "no") + "  " + show());

console.log("\\n== 4. Retry with the same reservation id ==");
reset();
const reservations = new Map();
function reserve(resId, ds) {
  if (reservations.has(resId)) return "existing " + resId;
  if (!bookStay(ds, 1)) return "sold out";
  reservations.set(resId, ds);
  return "created " + resId;
}
console.log(reserve("R-7f3a", nights) + " | timeout, client retries: " + reserve("R-7f3a", nights) + " | " + show());

console.log("\\n== 5. Overbooking 100 rooms, 5% no-shows, room 200, walking a guest costs 400 ==");
function outcome(booked, pShow) {
  let walks = 0, filled = 0;
  for (let k = 0; k <= booked; k++) {
    let c = 1; // binomial coefficient C(booked, k) as a float
    for (let i = 0; i < k; i++) c = (c * (booked - i)) / (i + 1);
    const p = c * Math.pow(pShow, k) * Math.pow(1 - pShow, booked - k);
    walks += p * Math.max(0, k - 100);
    filled += p * Math.min(k, 100);
  }
  return [filled, walks];
}
for (const n of [100, 102, 104, 106, 108, 110]) {
  const [filled, walks] = outcome(n, 0.95);
  const net = 200 * filled - 400 * walks;
  console.log("  accept " + n + ": rooms filled " + filled.toFixed(2) + ", guests walked " + walks.toFixed(2) + ", expected net " + net.toFixed(0));
}` },
          { tech: "python", code: `# Hotel inventory: per (hotel, room type, date) counters, the double-booking race,
# all-or-nothing multi-night stays, idempotent retries and the overbooking trade-off.
print("== 1. Capacity (assumptions) ==")
rooms, occupancy, avg_nights = 1000000, 0.7, 3
per_day = round(rooms * occupancy / avg_nights)
tps = per_day / 86400
print("reservations/day = 1,000,000 x 0.7 / 3 nights = " + str(per_day))
print(f"reservations/s = {tps:.2f}, booking page QPS ~ {tps * 10:.1f}, room detail QPS ~ {tps * 100:.0f}")
print("inventory rows = 5,000 hotels x 20 room types x 730 days = " + str(5000 * 20 * 730))

# inventory table: key "hotel|type|date" -> {total, reserved, version}
inv = {}


def key(d):
    return "H1|KING|" + d


def reset():
    for d, r in (("12-23", 6), ("12-24", 9), ("12-25", 4)):
        inv[key(d)] = {"total": 10, "reserved": r, "version": 0}


def show():
    return "  ".join(d + "=" + str(inv[key(d)]["reserved"]) + "/10" for d in ("12-23", "12-24", "12-25"))


print("\\n== 2. Two guests, one room left on 12-24 ==")
reset()
row = inv[key("12-24")]
rows = ["old-" + str(i) for i in range(9)]  # 9 existing reservation rows
seen1, seen2 = len(rows), len(rows)  # both SELECT count(*) before either INSERTs
if seen1 < row["total"]:
    rows.append("guest-A")
if seen2 < row["total"]:
    rows.append("guest-B")
print("naive SELECT count then INSERT: both saw " + str(seen1) + " of 10, rows now " + str(len(rows)) + " -> DOUBLE BOOKED")


def cond_update(r, n):
    if r["reserved"] + n <= r["total"]:
        r["reserved"] += n
        r["version"] += 1
        return 1
    return 0


reset()
row = inv[key("12-24")]
a = cond_update(row, 1)
b = cond_update(row, 1)
print(f"conditional UPDATE ... WHERE reserved + 1 <= total: T1 rows={a}, T2 rows={b}, reserved = {row['reserved']}")
reset()
row = inv[key("12-24")]
v1 = v2 = row["version"]


def cas_update(r, ver):
    if r["version"] != ver:
        return "version conflict"
    if r["reserved"] + 1 > r["total"]:
        return "sold out"
    r["reserved"] += 1
    r["version"] += 1
    return "booked"


x = cas_update(row, v1)
y = cas_update(row, v2)
z = cas_update(row, row["version"])
print("optimistic version check: T1 " + x + ", T2 " + y + ", T2 retry " + z)

print("\\n== 3. A 3-night stay (12-23 to 12-26) when 12-24 is full ==")
reset()
inv[key("12-24")]["reserved"] = 10
nights = ["12-23", "12-24", "12-25"]
print("before:        " + show())
for d in nights:
    if not cond_update(inv[key(d)], 1):
        break
print("night by night: " + show() + "   <- 12-23 leaked a room")
reset()
inv[key("12-24")]["reserved"] = 10


def book_stay(ds, n):  # one transaction: check every night, then apply all
    if not all(inv[key(d)]["reserved"] + n <= inv[key(d)]["total"] for d in ds):
        return False
    for d in ds:
        cond_update(inv[key(d)], n)
    return True


print("one transaction: booked=" + ("yes" if book_stay(nights, 1) else "no") + "  " + show())
inv[key("12-24")]["reserved"] = 9
print("after a cancel:  booked=" + ("yes" if book_stay(nights, 1) else "no") + "  " + show())

print("\\n== 4. Retry with the same reservation id ==")
reset()
reservations = {}


def reserve(res_id, ds):
    if res_id in reservations:
        return "existing " + res_id
    if not book_stay(ds, 1):
        return "sold out"
    reservations[res_id] = ds
    return "created " + res_id


first = reserve("R-7f3a", nights)
second = reserve("R-7f3a", nights)
print(first + " | timeout, client retries: " + second + " | " + show())

print("\\n== 5. Overbooking 100 rooms, 5% no-shows, room 200, walking a guest costs 400 ==")


def outcome(booked, p_show):
    walks = filled = 0.0
    for k in range(booked + 1):
        c = 1.0  # binomial coefficient C(booked, k) as a float
        for i in range(k):
            c = (c * (booked - i)) / (i + 1)
        p = c * (p_show ** k) * ((1 - p_show) ** (booked - k))
        walks += p * max(0, k - 100)
        filled += p * min(k, 100)
    return filled, walks


for n in (100, 102, 104, 106, 108, 110):
    filled, walks = outcome(n, 0.95)
    net = 200 * filled - 400 * walks
    print(f"  accept {n}: rooms filled {filled:.2f}, guests walked {walks:.2f}, expected net {net:.0f}")` },
        ],
      },
    ],
  },
  {
    title: `How would you design a ticket booking system like Ticketmaster?`,
    difficulty: "hard",
    seoDescription: `Design Ticketmaster: a virtual waiting room, seat holds that expire, conditional seat updates, hot on-sale load math, and why a free-for-all fails.`,
    description: `**Question presented to candidate:**
"Design a ticketing system like Ticketmaster. Most of the time it sells tickets for small shows, but a few times a year a huge artist goes on sale and millions of fans try to buy 70,000 stadium seats in the same few minutes. Each fan picks specific seats, has a few minutes to pay, and no seat can ever be sold twice."

**What a strong answer should cover:**
- Why this is harder than hotels: **specific seats** (not counters), extreme **contention at one instant**, bots, and a burst of traffic orders of magnitude above normal
- A **virtual waiting room** that admits fans at the rate the booking path can handle, with tokens, fairness and bot checks, while static pages come from a CDN
- **Seat holds with a TTL**: \`AVAILABLE -> HELD(hold_id, expires_at) -> SOLD\`, written with a conditional update; expired holds return to sale; payment confirmation must match the hold id
- How to choose the hold length, and **server-side seat assignment** ("best available") to remove conflicts for the hottest seats
- Data model and partitioning (by event, then section), the read-heavy seat map, and the payment step done idempotently
- Real numbers: Ticketmaster reported 3.5 billion system requests during the Taylor Swift Eras Tour presale in November 2022

**Clarifying questions expected:**
- Do fans choose seats on a map, or can we assign "best available"? General admission too?
- How long may a fan hold seats while paying? Ticket limits per fan?
- Is a pre-registration step (verified fans, codes) part of the product?

**Code / implementation expected:** Optional — the example compares a free-for-all on the best seats with a waiting room plus expiring holds, and shows how hold length changes the sell-out time.`,
    answer: `**Target Audience:** Backend engineers preparing for the "design Ticketmaster" round, which is really a question about contention, holds and admission control.
**Difficulty:** Hard
**Verified with:** Node 22.22 and Python 3.12 (identical output). The Eras Tour figures are from Ticketmaster's statement of November 2022 as reported by CBS News and Cox Media Group stations.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. Every number from the simulation comes from running the example; the **Verified** section quotes its full output. Counted inventory (hotel rooms) is covered in [How would you design a hotel reservation system?](/interview-question/how-would-you-design-a-hotel-reservation-system-572u); this page is about specific seats under extreme contention.

## 1. Why This Even Matters — A Story First

A bakery makes 500 loaves of a famous sourdough once a year. At 9:00 the doors open and 5,000 people rush in, all pointing at the same 10 loaves at the front of the shelf. Ten people get a loaf; 4,990 grab at air, push back to the shelf, and point at the next 10. The shop is chaos, the floor is full, and nobody can even get to the till.

A sensible bakery puts a rope outside. It lets in 100 people a minute, a clerk hands each of them a specific loaf from the back with a ticket saying "yours for 8 minutes, please pay", and loaves that are not paid for go back on the shelf for the next person. The same 500 loaves sell, nobody fights, and people outside know where they stand.

A ticketing system for a big on-sale is that bakery. The rope is the **waiting room**, the 8-minute ticket is a **seat hold**, and the clerk handing out loaves is **server-side seat assignment**. The example below runs both versions of the bakery with real numbers.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Reserved seats picked on a map, best-available assignment, or general admission? | Specific seats need per-seat state; GA is a counter like hotel rooms |
| Size of the biggest on-sale (seats, expected fans)? | Sizes the waiting room and the burst capacity |
| How long can a fan hold seats while paying? | Hold TTL trades sell-out speed against fans cut off mid-checkout |
| Ticket limits per account or card? | Anti-scalping rules enforced at hold time |
| Pre-registration, codes, verified fans? | Lets you shape demand before the sale |
| Resale marketplace? | Adds transfers and a second seller flow |

## 3. Requirements

**Functional**
- Browse events and see a seat map with live availability and prices.
- Select seats (or ask for best available), hold them for a fixed time, pay, receive tickets.
- Waiting room for high-demand on-sales; per-fan ticket limits.
- Cancel and refund; transfer tickets.

**Non-functional**
- **A seat is never sold twice**, even under maximum contention.
- **Survive bursts** many times normal traffic without falling over; degrade by queueing, not by erroring.
- **Fairness and transparency**: a fan in the queue knows their position; bots are kept out.
- **Low latency** for holds and the seat map once admitted.

## 4. Capacity Estimate

The scale of a hot on-sale, as reported: Ticketmaster said the Eras Tour Verified Fan presale on 15 November 2022 drew **3.5 billion total system requests, 4 times its previous peak**; more than 3.5 million people had pre-registered, about 1.5 million received codes and 2 million were waitlisted, and more than 2 million tickets were sold that day (Ticketmaster statement, as reported by CBS News). The arithmetic below uses round assumptions, not those exact figures:

~~~text
== 1. Load arithmetic (assumptions) ==
fans refreshing every 2 s without a queue: 750000 requests/s
same fans polling a static queue page every 30 s: 50000 requests/s
a 70000-seat stadium at 4 tickets/order = 17500 orders, 8.75 minutes at 2000 checkouts/min
~~~

1.5 million fans hammering refresh every 2 seconds is **750,000 requests a second** against dynamic pages. The same fans in a waiting room polling a cheap, cacheable status endpoint every 30 seconds is 50,000 requests a second, mostly served from a CDN or an edge cache ([What is a CDN and how does it work?](/interview-question/what-is-a-cdn-and-how-does-it-work)). Meanwhile the thing being sold is tiny: a 70,000-seat stadium at 4 tickets per order is 17,500 orders, which at 2,000 checkouts a minute (an assumed booking-path capacity) is under 9 minutes of work. The design problem is not storing or selling seats; it is **keeping millions of people from all touching the same rows at once**.

## 5. API

- \`GET /v1/events/{id}\` and \`GET /v1/events/{id}/seatmap\`: static parts from the CDN; availability as a compact bitmap per section, cached for about a second.
- \`POST /v1/queue/{event_id}/join\` returns a queue token; \`GET /v1/queue/{event_id}/status?token=...\` returns position or an **access token** once admitted.
- \`POST /v1/holds\` with \`{event_id, seat_ids or {section, count}, access_token}\` returns \`{hold_id, seats, expires_at}\`.
- \`POST /v1/orders\` with \`{hold_id, payment_token, Idempotency-Key}\` confirms the purchase.
- \`DELETE /v1/holds/{hold_id}\` releases seats early.

## 6. Data Model

| Table | Columns | Notes |
| :--- | :--- | :--- |
| \`events\`, \`venues\`, \`sections\` | descriptive data, price levels | Read-mostly, cached and on the CDN |
| \`seats\` | \`event_id, seat_id\` (key), \`section\`, \`status\` (\`AVAILABLE, HELD, SOLD\`), \`hold_id\`, \`hold_expires_at\`, \`order_id\`, \`version\` | One row per seat per event; the contended table |
| \`holds\` | \`hold_id\`, \`user_id\`, \`event_id\`, \`seat_ids\`, \`expires_at\` | One per fan attempt |
| \`orders\` | \`order_id\`, \`hold_id UNIQUE\`, \`user_id\`, \`amount\`, \`status\`, \`idempotency_key UNIQUE\` | One hold becomes at most one order |

📌 **Interview term: seat hold (reservation with TTL)** — a temporary claim on specific seats with an expiry time. While held, nobody else can take them; if not paid before expiry, they return to sale automatically.

📌 **Interview term: conditional state transition** — the seat status changes only if it is still in the expected state, in one statement:

~~~sql
UPDATE seats SET status = 'HELD', hold_id = :hold, hold_expires_at = now() + interval '8 minutes'
WHERE event_id = :e AND seat_id = ANY(:seats)
  AND (status = 'AVAILABLE' OR (status = 'HELD' AND hold_expires_at < now()));
-- affected rows must equal the number of seats, otherwise roll back: someone else got one
~~~

The \`hold_expires_at < now()\` clause makes expiry **lazy**: an expired hold is simply treated as available by the next writer, so correctness does not depend on a sweeper running on time (the sweeper only tidies up and updates the seat map). Holds are often kept in Redis instead (\`SET seat:{event}:{id} {hold_id} NX PX 480000\`), which is fast and expires on its own; then the database row is written once, at purchase, with the same conditional check as the source of truth.

## 7. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 660 280" role="img" aria-label="Fans hit the CDN and the waiting room; admitted fans with an access token reach the seat map and hold service, which writes the seats database; checkout calls payment and confirms the hold">
  <defs>
    <marker id="sd18q3-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="160" height="80" rx="10"/>
  <text class="d-text" x="110" y="65" text-anchor="middle">Fans</text>
  <text class="d-sub" x="110" y="88" text-anchor="middle">millions</text>
  <rect class="d-box" x="250" y="30" width="160" height="80" rx="10"/>
  <text class="d-text" x="330" y="65" text-anchor="middle">CDN</text>
  <text class="d-sub" x="330" y="88" text-anchor="middle">static pages</text>
  <rect class="d-box-accent" x="470" y="30" width="160" height="80" rx="10"/>
  <text class="d-text" x="550" y="65" text-anchor="middle">Waiting room</text>
  <text class="d-sub" x="550" y="88" text-anchor="middle">tokens, bot checks</text>
  <rect class="d-box-accent" x="470" y="170" width="160" height="80" rx="10"/>
  <text class="d-text" x="550" y="205" text-anchor="middle">Hold service</text>
  <text class="d-sub" x="550" y="228" text-anchor="middle">per-section allocator</text>
  <rect class="d-box-accent" x="250" y="170" width="160" height="80" rx="10"/>
  <text class="d-text" x="330" y="205" text-anchor="middle">Seats DB</text>
  <text class="d-sub" x="330" y="228" text-anchor="middle">by event, section</text>
  <rect class="d-box" x="30" y="170" width="160" height="80" rx="10"/>
  <text class="d-text" x="110" y="205" text-anchor="middle">Checkout</text>
  <text class="d-sub" x="110" y="228" text-anchor="middle">payment, tickets</text>
  <path class="d-edge" d="M 190 70 L 242 70" marker-end="url(#sd18q3-arrow)"/>
  <path class="d-edge" d="M 410 70 L 462 70" marker-end="url(#sd18q3-arrow)"/>
  <path class="d-edge-accent" d="M 550 110 L 550 162" marker-end="url(#sd18q3-arrow)"/>
  <path class="d-edge" d="M 470 210 L 418 210" marker-end="url(#sd18q3-arrow)"/>
  <path class="d-edge" d="M 250 210 L 198 210" marker-end="url(#sd18q3-arrow)"/>
</svg>

Everything a fan sees before being admitted is static or cheap: event pages from the CDN and a queue status endpoint. The waiting room hands out signed **access tokens** at a controlled rate (accent arrow). Only token holders reach the hold service, which writes seat rows partitioned by event and section, and checkout turns a hold into an order.

📌 **Interview term: virtual waiting room** — a queue in front of the booking path. In a common design, fans who arrive before the sale start are shuffled into random order at the start time (so arriving at 9:59:59 is not worse than 9:59:00, which removes the incentive to hammer), later arrivals join at the back, and the room admits fans at the rate the booking path can serve. Admission is a signed, short-lived token checked by the hold service.

📌 **Interview term: admission control** — limiting how many requests enter a system to what it can process, instead of letting overload cause timeouts for everyone. The waiting room is admission control with a user interface; see also [What is backpressure and how do you handle it?](/interview-question/what-is-backpressure-and-how-do-you-handle-it) and [How would you design a rate limiter?](/interview-question/how-would-you-design-a-rate-limiter).

**Bots.** Bots buy for resale and multiply the load. Defences include pre-registration and codes, CAPTCHA or proof-of-work at queue entry, device and behaviour signals, one queue token per verified account, and per-account and per-card ticket limits checked at hold time.

## 8. Deep Dive 1: Why a Free-for-All Collapses

The example puts 5,000 fans in front of 500 seat pairs. In the free-for-all, every fan looks at the same seat map and grabs a random pair among the best 10 still available; a conditional update lets exactly one win each pair:

~~~text
== 2. Free-for-all: 5000 fans, 500 seat pairs, everyone grabs from the best 10 ==
  round 1: 5000 attempts, 10 succeed
  round 2: 4990 attempts, 10 succeed
  sold out after 50 rounds: 237750 seat writes for 500 sales, 99.8% conflicts
~~~

Each round, thousands of fans fight for 10 pairs: **237,750 seat writes to sell 500 pairs, 99.8% of them conflicts**. Every conflict is a database round trip, a lock wait on a hot row and a fan who sees "seat no longer available". Correctness holds (no seat was sold twice, thanks to the conditional update), but the system spends almost all its capacity on failure. Real fans also do not wait politely in rounds; they retry immediately, which is worse.

## 9. Deep Dive 2: Waiting Room, Server-Assigned Seats and Holds

The second run admits at most 100 fans a minute and only while seats are free. The hold service assigns each admitted fan the best free pair itself; 70% of fans pay within 1 to 6 minutes and 30% walk away, so their hold expires after 8 minutes and the seats go back to sale:

~~~text
== 3. Waiting room: admit up to 100 fans/min, server assigns the best free pair ==
  min  1: admitted 100  holding 100  sold   0  released   0
  min  2: admitted 200  holding 187  sold  13  released   0
  min  3: admitted 300  holding 262  sold  38  released   0
  min  4: admitted 400  holding 328  sold  72  released   0
  min  8: admitted 500  holding 217  sold 283  released   0
  min 12: admitted 619  holding 114  sold 386  released 119
  min 16: admitted 641  holding  65  sold 435  released 141
  min 20: admitted 678  holding  36  sold 464  released 178
  min 24: admitted 683  holding  22  sold 478  released 183
  min 28: admitted 693  holding  11  sold 489  released 193
  min 32: admitted 696  holding   6  sold 494  released 196
  min 36: admitted 698  holding   3  sold 497  released 198
  min 40: admitted 699  holding   2  sold 498  released 199
  8-min holds: sold out at minute 41, 699 fans admitted, 4301 told sold out, 1398 seat writes, 0 conflicts
~~~

**Zero conflicts and 1,398 seat writes** (one per hold, sale and release) instead of 237,750. Because admission stops when every seat is held, fans are not let in to stare at an empty map; the 4,301 never admitted are told the event is sold out instead of fighting for nothing.

📌 **Interview term: server-side seat assignment (best available)** — instead of every fan choosing from the same map, the server picks seats for each fan from a per-section allocator. Only one writer touches each section's rows, so there is nothing to conflict on. Seat-map picking can still be offered, with conflicts limited to the few admitted fans.

**Choosing the hold length** is a trade-off the example makes concrete:

~~~text
  hold  4 min: sold out at minute 48, holds released 611, buyers cut off mid-checkout 281
  hold  8 min: sold out at minute 41, holds released 199, buyers cut off mid-checkout   0
  hold 15 min: sold out at minute 69, holds released 199, buyers cut off mid-checkout   0
~~~

- **4 minutes** is shorter than many fans need: 281 buyers were cut off mid-checkout and 611 holds were released, so the event actually sold out later (minute 48) because seats kept cycling.
- **15 minutes** cuts nobody off, but seats held by fans who walked away stay locked for a quarter of an hour; sell-out slips to minute 69.
- **8 minutes**, just above the slowest real checkout in this model, sells out first, at minute 41.

The right TTL comes from measured checkout times (the p95 or p99 of time from hold to payment), plus a visible countdown so fans know the deadline.

## 10. Deep Dive 3: Holds Meet Payments

A payment can succeed after its hold expired (a slow 3-D Secure step), by which time the seats may belong to someone else. Confirmation must therefore check the hold id, not just the seat:

~~~text
== 4. A payment that arrives after its hold expired ==
  late confirm for hold-A: rejected hold-A, refund the charge
  confirm for hold-B:      SOLD to hold-B
~~~

\`UPDATE seats SET status = 'SOLD', order_id = :o WHERE seat_id = ANY(:s) AND status = 'HELD' AND hold_id = :hold\` with an affected-row check; on failure, void or refund the payment automatically. To shrink this window, authorize the card first and capture only after the seats are marked sold, and extend the hold slightly while a payment is in progress. Charging is idempotent end to end ([How do you make a payment system reliable against retries?](/interview-question/how-do-you-make-a-payment-system-reliable-against-retries)).

**Partitioning.** Seats are sharded by \`event_id\`, so one hot event lives on one shard; within it, sections are independent and can be served by separate allocators or even separate partitions. The seat map is read-heavy and can be a second or two stale; it is rebuilt from seat changes and pushed to admitted clients over WebSockets or server-sent events ([When would you use WebSockets vs polling vs SSE?](/interview-question/when-would-you-use-websockets-vs-polling-vs-sse)).

## 11. What Breaks First at 10x

- **The front door.** Without a waiting room on the CDN or edge, origin servers drown before any seat logic runs. The waiting room itself must be static-heavy and horizontally scalable.
- **Bots.** 10x more fans often means 100x more bots; verification and per-account limits matter more than raw capacity.
- **Hot sections.** Floor seats get most requests; best-available allocation per section keeps writes serialised and conflict-free.
- **Payment provider limits.** A burst of 2,000 checkouts a minute may exceed what your PSP account allows; agree burst limits in advance and queue payment confirmations.
- **Seat map fan-out.** Pushing every change to hundreds of thousands of clients is expensive; send per-section counts and batch updates every second.

## 12. Verified: Running the Code

The example **"Hot on-sale: a free-for-all on the best seats vs a waiting room with server-assigned seat holds that expire"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
== 1. Load arithmetic (assumptions) ==
fans refreshing every 2 s without a queue: 750000 requests/s
same fans polling a static queue page every 30 s: 50000 requests/s
a 70000-seat stadium at 4 tickets/order = 17500 orders, 8.75 minutes at 2000 checkouts/min

== 2. Free-for-all: 5000 fans, 500 seat pairs, everyone grabs from the best 10 ==
  round 1: 5000 attempts, 10 succeed
  round 2: 4990 attempts, 10 succeed
  sold out after 50 rounds: 237750 seat writes for 500 sales, 99.8% conflicts

== 3. Waiting room: admit up to 100 fans/min, server assigns the best free pair ==
  min  1: admitted 100  holding 100  sold   0  released   0
  min  2: admitted 200  holding 187  sold  13  released   0
  min  3: admitted 300  holding 262  sold  38  released   0
  min  4: admitted 400  holding 328  sold  72  released   0
  min  8: admitted 500  holding 217  sold 283  released   0
  min 12: admitted 619  holding 114  sold 386  released 119
  min 16: admitted 641  holding  65  sold 435  released 141
  min 20: admitted 678  holding  36  sold 464  released 178
  min 24: admitted 683  holding  22  sold 478  released 183
  min 28: admitted 693  holding  11  sold 489  released 193
  min 32: admitted 696  holding   6  sold 494  released 196
  min 36: admitted 698  holding   3  sold 497  released 198
  min 40: admitted 699  holding   2  sold 498  released 199
  8-min holds: sold out at minute 41, 699 fans admitted, 4301 told sold out, 1398 seat writes, 0 conflicts
  hold  4 min: sold out at minute 48, holds released 611, buyers cut off mid-checkout 281
  hold  8 min: sold out at minute 41, holds released 199, buyers cut off mid-checkout   0
  hold 15 min: sold out at minute 69, holds released 199, buyers cut off mid-checkout   0

== 4. A payment that arrives after its hold expired ==
  late confirm for hold-A: rejected hold-A, refund the charge
  confirm for hold-B:      SOLD to hold-B
~~~

What the simulation stands for and leaves out: the arrays stand for the \`seats\` table and the hold store, one loop iteration of section 3 is one minute on a fake clock, and fan behaviour comes from a seeded generator (MINSTD, seed 42) so every language prints the same. The free-for-all runs in synchronous rounds, which is kinder than reality. Network latency, bots, payment failures and seat-map choice are not modelled.

## Edge Cases Worth Knowing

- **Partial holds.** A fan asks for 4 adjacent seats and only 3 are free; hold none, or offer an alternative, never hold 3 silently.
- **Orphan seats.** Best-available should avoid leaving single seats between held pairs, which are hard to sell.
- **Queue token theft.** Tokens are signed, bound to the account and short-lived, or bots buy them.
- **Clock skew.** Hold expiry should be judged by one clock (the database or Redis), not by each app server.
- **Refunds and returns.** Returned tickets go back on sale through the same hold path, possibly to the waiting room.

## Common Pitfalls

- **Letting everyone in at once.** Correct but useless: 99.8% conflicts in the example.
- **A cache or the seat map as the source of truth.** Only the conditional update decides who gets a seat.
- **Confirming payment without checking the hold id.** Sells a seat that was re-held by another fan.
- **Holds without expiry, or expiry that depends on a sweeper.** Seats get stuck; use a TTL or lazy expiry in the condition.
- **A hold TTL picked by gut feeling.** Too short cuts off buyers, too long slows the sale.
- **Ignoring bots.** They are a large share of the load on the biggest on-sales.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Shape of the problem:</strong> <span style="color:#f0e2c8;">Specific seats, extreme contention in one instant, and bursts far above normal: Ticketmaster reported <strong style="color:#ffca28;">3.5 billion system requests</strong>, 4 times its previous peak, for the Eras Tour presale. Seats are few (a 70,000-seat stadium is about 17,500 orders); people are many.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Front door:</strong> <span style="color:#f0e2c8;">Static pages from the CDN and a <strong style="color:#ffca28;">virtual waiting room</strong>: early arrivals are shuffled at start time, fans poll a cheap status endpoint, and admitted fans get a signed, short-lived access token. Bot checks and per-account limits happen here.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Seat state:</strong> <span style="color:#f0e2c8;">Each seat row goes <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">AVAILABLE -&gt; HELD(hold_id, expires_at) -&gt; SOLD</code> by a <strong style="color:#ffca28;">conditional update</strong> that also treats expired holds as available, so expiry does not depend on a sweeper. Holds can live in Redis with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">SET NX PX</code>, with the database as the final check.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Contention:</strong> <span style="color:#f0e2c8;">Admission rate plus <strong style="color:#ffca28;">server-side best-available</strong> per section removes conflicts: in my simulation 5,000 fans on 500 pairs took 237,750 writes and 99.8% conflicts in a free-for-all, versus 1,398 writes and zero conflicts with a waiting room.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Holds and payment:</strong> <span style="color:#f0e2c8;">The hold TTL comes from measured checkout time: 4 minutes cut off 281 buyers, 15 minutes delayed sell-out to minute 69, 8 minutes sold out first at minute 41. Confirmation checks the <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">hold_id</code>; a late payment is refunded automatically.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Redis or the database for holds?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Redis is fast and expires keys on its own, which suits a hold. But the database seat row must still be written with a conditional check at purchase, because Redis is not the system of record and can lose a key on failover.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How is the queue fair?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Everyone who arrives before the start is randomised at start time, later arrivals join the back, and each verified account gets one token. Position is shown so people do not refresh.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you push seat availability to clients?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Per-section counts and seat bitmaps, batched about once a second over SSE or WebSockets, and only to admitted fans. The map is a hint; the hold call decides.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you shard?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">By event, so one hot event is on one shard, then by section inside it, with one allocator per section. Different events never contend.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What if the PSP is slow at peak?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Authorize first and capture after seats are marked sold, extend holds while a payment is in flight, and queue confirmations. Agree burst limits with the PSP before the on-sale.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| Seat hold (reservation with TTL) | Temporary claim on seats that expires automatically |
| Conditional state transition | Change a row only if it is still in the expected state |
| Virtual waiting room | Queue in front of the booking path, admitting at a set rate |
| Admission control | Accept only as much work as the system can process |
| Server-side seat assignment | Server picks seats per fan from a per-section allocator |

**Conclusion:** Ticketmaster is a contention problem dressed up as a booking problem. Serve everything you can from the CDN, put a fair waiting room with signed tokens in front of the booking path, let the server assign best-available seats per section, and model each seat as a row that moves from available to held to sold only through conditional updates that respect hold expiry. Pick the hold TTL from real checkout times, and make payment confirmation check the hold id so a late payment never steals a re-sold seat. Done this way, a sale that would otherwise burn 99.8% of its writes on conflicts runs with none.`,
    examples: [
      {
        label: `Hot on-sale: a free-for-all on the best seats vs a waiting room with server-assigned seat holds that expire`,
        variants: [
          { tech: "node", code: `// A hot on-sale: fans fighting over the same seats vs a waiting room that admits fans
// at a fixed rate and lets the server hand out seat holds that expire on a fake clock.
let seed = 42;
const rnd = (n) => { seed = (seed * 48271) % 2147483647; return seed % n; }; // MINSTD, same in every language

console.log("== 1. Load arithmetic (assumptions) ==");
const fans = 1500000, refreshSec = 2;
console.log("fans refreshing every " + refreshSec + " s without a queue: " + fans / refreshSec + " requests/s");
console.log("same fans polling a static queue page every 30 s: " + fans / 30 + " requests/s");
const seats = 70000, perOrder = 4, ordersPerMin = 2000;
console.log("a " + seats + "-seat stadium at " + perOrder + " tickets/order = " + seats / perOrder + " orders, " + seats / perOrder / ordersPerMin + " minutes at " + ordersPerMin + " checkouts/min");

const PAIRS = 500, FANS = 5000;
console.log("\\n== 2. Free-for-all: " + FANS + " fans, " + PAIRS + " seat pairs, everyone grabs from the best 10 ==");
let state = new Array(PAIRS).fill("AVAILABLE");
let waiting = FANS, rounds = 0, attempts = 0, wins = 0;
while (waiting > 0 && state.includes("AVAILABLE")) {
  rounds++;
  const best = [];
  for (let i = 0; i < PAIRS && best.length < 10; i++) if (state[i] === "AVAILABLE") best.push(i);
  let won = 0;
  for (let f = 0; f < waiting; f++) {
    const p = best[rnd(best.length)];
    attempts++;
    if (state[p] === "AVAILABLE") { state[p] = "SOLD"; won++; } // UPDATE ... WHERE state = AVAILABLE
  }
  wins += won;
  waiting -= won;
  if (rounds <= 2) console.log("  round " + rounds + ": " + (waiting + won) + " attempts, " + won + " succeed");
}
console.log("  sold out after " + rounds + " rounds: " + attempts + " seat writes for " + wins + " sales, " + ((100 * (attempts - wins)) / attempts).toFixed(1) + "% conflicts");

console.log("\\n== 3. Waiting room: admit up to 100 fans/min, server assigns the best free pair ==");
function simulate(HOLD, verbose) {
  seed = 42;
  const st = new Array(PAIRS).fill("AVAILABLE");
  const holds = new Map(); // pair -> {expires, buyAt}; buyAt -1 means the fan walks away
  let nextFan = 0, sold = 0, released = 0, lost = 0, writes = 0, minute = 0;
  while (sold < PAIRS && minute < 120) {
    minute++;
    for (const [p, h] of [...holds.entries()]) {
      if (h.buyAt !== -1 && h.buyAt <= h.expires && h.buyAt <= minute) { st[p] = "SOLD"; sold++; writes++; holds.delete(p); }
      else if (h.expires <= minute) { st[p] = "AVAILABLE"; released++; writes++; if (h.buyAt !== -1) lost++; holds.delete(p); }
    }
    const free = st.filter((x) => x === "AVAILABLE").length;
    const admit = Math.min(100, free, FANS - nextFan);
    for (let i = 0; i < admit; i++) {
      const p = st.indexOf("AVAILABLE"); // best free pair; one allocator per section, so no contention
      st[p] = "HELD";
      writes++;
      nextFan++;
      const buys = rnd(10) < 7; // 70% want to buy and need 1-6 minutes for checkout
      holds.set(p, { expires: minute + HOLD, buyAt: buys ? minute + 1 + rnd(6) : -1 });
    }
    if (verbose && (minute <= 4 || minute % 4 === 0)) console.log("  min " + String(minute).padStart(2) + ": admitted " + String(nextFan).padStart(3) + "  holding " + String(holds.size).padStart(3) + "  sold " + String(sold).padStart(3) + "  released " + String(released).padStart(3));
  }
  return { minute, nextFan, released, lost, writes };
}
const r8 = simulate(8, true);
console.log("  8-min holds: sold out at minute " + r8.minute + ", " + r8.nextFan + " fans admitted, " + (FANS - r8.nextFan) + " told sold out, " + r8.writes + " seat writes, 0 conflicts");
for (const hold of [4, 8, 15]) {
  const r = simulate(hold, false);
  console.log("  hold " + String(hold).padStart(2) + " min: sold out at minute " + String(r.minute).padStart(2) + ", holds released " + String(r.released).padStart(3) + ", buyers cut off mid-checkout " + String(r.lost).padStart(3));
}

console.log("\\n== 4. A payment that arrives after its hold expired ==");
const seat = { state: "HELD", holdId: "hold-B" }; // fan A held it first, expired, fan B holds it now
const confirm = (s, holdId) => { if (s.state === "HELD" && s.holdId === holdId) { s.state = "SOLD"; return "SOLD to " + holdId; } return "rejected " + holdId + ", refund the charge"; };
console.log("  late confirm for hold-A: " + confirm(seat, "hold-A"));
console.log("  confirm for hold-B:      " + confirm(seat, "hold-B"));` },
          { tech: "python", code: `# A hot on-sale: fans fighting over the same seats vs a waiting room that admits fans
# at a fixed rate and lets the server hand out seat holds that expire on a fake clock.
seed = 42


def rnd(n):  # MINSTD, same in every language
    global seed
    seed = (seed * 48271) % 2147483647
    return seed % n


print("== 1. Load arithmetic (assumptions) ==")
fans, refresh_sec = 1500000, 2
print("fans refreshing every " + str(refresh_sec) + " s without a queue: " + str(fans // refresh_sec) + " requests/s")
print("same fans polling a static queue page every 30 s: " + str(fans // 30) + " requests/s")
seats, per_order, orders_per_min = 70000, 4, 2000
print("a " + str(seats) + "-seat stadium at " + str(per_order) + " tickets/order = " + str(seats // per_order)
      + " orders, " + str(seats / per_order / orders_per_min) + " minutes at " + str(orders_per_min) + " checkouts/min")

PAIRS, FANS = 500, 5000
print("\\n== 2. Free-for-all: " + str(FANS) + " fans, " + str(PAIRS) + " seat pairs, everyone grabs from the best 10 ==")
state = ["AVAILABLE"] * PAIRS
waiting, rounds, attempts, wins = FANS, 0, 0, 0
while waiting > 0 and "AVAILABLE" in state:
    rounds += 1
    best = [i for i in range(PAIRS) if state[i] == "AVAILABLE"][:10]
    won = 0
    for _ in range(waiting):
        p = best[rnd(len(best))]
        attempts += 1
        if state[p] == "AVAILABLE":  # UPDATE ... WHERE state = AVAILABLE
            state[p] = "SOLD"
            won += 1
    wins += won
    waiting -= won
    if rounds <= 2:
        print("  round " + str(rounds) + ": " + str(waiting + won) + " attempts, " + str(won) + " succeed")
print(f"  sold out after {rounds} rounds: {attempts} seat writes for {wins} sales, {100 * (attempts - wins) / attempts:.1f}% conflicts")

print("\\n== 3. Waiting room: admit up to 100 fans/min, server assigns the best free pair ==")


def simulate(hold, verbose):
    global seed
    seed = 42
    st = ["AVAILABLE"] * PAIRS
    holds = {}  # pair -> (expires, buy_at); buy_at -1 means the fan walks away
    next_fan = sold = released = lost = writes = minute = 0
    while sold < PAIRS and minute < 120:
        minute += 1
        for p, (expires, buy_at) in list(holds.items()):
            if buy_at != -1 and buy_at <= expires and buy_at <= minute:
                st[p] = "SOLD"
                sold += 1
                writes += 1
                del holds[p]
            elif expires <= minute:
                st[p] = "AVAILABLE"
                released += 1
                writes += 1
                if buy_at != -1:
                    lost += 1
                del holds[p]
        free = st.count("AVAILABLE")
        admit = min(100, free, FANS - next_fan)
        for _ in range(admit):
            p = st.index("AVAILABLE")  # best free pair; one allocator per section, so no contention
            st[p] = "HELD"
            writes += 1
            next_fan += 1
            buys = rnd(10) < 7  # 70% want to buy and need 1-6 minutes for checkout
            holds[p] = (minute + hold, minute + 1 + rnd(6) if buys else -1)
        if verbose and (minute <= 4 or minute % 4 == 0):
            print(f"  min {minute:2d}: admitted {next_fan:3d}  holding {len(holds):3d}  sold {sold:3d}  released {released:3d}")
    return minute, next_fan, released, lost, writes


m, admitted, rel, lost, writes = simulate(8, True)
print(f"  8-min holds: sold out at minute {m}, {admitted} fans admitted, {FANS - admitted} told sold out, {writes} seat writes, 0 conflicts")
for hold in (4, 8, 15):
    m, admitted, rel, lost, writes = simulate(hold, False)
    print(f"  hold {hold:2d} min: sold out at minute {m:2d}, holds released {rel:3d}, buyers cut off mid-checkout {lost:3d}")

print("\\n== 4. A payment that arrives after its hold expired ==")
seat = {"state": "HELD", "hold_id": "hold-B"}  # fan A held it first, expired, fan B holds it now


def confirm(s, hold_id):
    if s["state"] == "HELD" and s["hold_id"] == hold_id:
        s["state"] = "SOLD"
        return "SOLD to " + hold_id
    return "rejected " + hold_id + ", refund the charge"


print("  late confirm for hold-A: " + confirm(seat, "hold-A"))
print("  confirm for hold-B:      " + confirm(seat, "hold-B"))` },
        ],
      },
    ],
  },
  {
    title: `How would you design a distributed email service?`,
    difficulty: "hard",
    seoDescription: `Design a Gmail-scale email service: SMTP in and out, retries and bounces, SPF, DKIM and DMARC, user-sharded mailbox storage, threading and search.`,
    description: `**Question presented to candidate:**
"Design an email service like Gmail or Outlook.com for a billion users. People send and receive mail from other providers over the internet, read it in a web and mobile app, search years of mail, and organise it into folders and threads. Walk me through receiving, sending and storing mail."

**What a strong answer should cover:**
- The protocols and their roles: **SMTP** between servers (inbound and outbound), submission from clients, and **IMAP**, POP or an HTTP/JSON API (JMAP or a private one) for reading
- The **outbound path**: a durable queue, per-domain delivery workers, handling of SMTP reply classes (2xx done, **4xx retry with backoff**, **5xx bounce**), a queue lifetime, bounces and a **suppression list**
- **Deliverability and trust**: SPF, DKIM, DMARC on outbound mail and checks on inbound, spam and malware filtering, IP reputation; the 2024 Gmail and Yahoo bulk-sender rules
- **Storage**: metadata (folders, labels, flags, threads) partitioned by \`user_id\` in a wide-column or sharded SQL store, bodies and attachments in blob storage, deduplication of attachments
- **Threading** by Message-ID, In-Reply-To and References, unread counters, and a per-user **search index**
- Worked numbers: send rate, storage per year, and why storage dominates

**Clarifying questions expected:**
- Consumer webmail (Gmail) or a sending platform for businesses (SendGrid)? The design differs a lot.
- Which clients must work: IMAP desktop clients, our own apps, or both?
- Retention, attachment size limits and search requirements?

**Code / implementation expected:** Optional — the examples simulate outbound delivery with retries, bounces and suppression, a DKIM body hash, and mailbox threading and counters.`,
    answer: `**Target Audience:** Backend engineers preparing for a "design Gmail" round, and anyone curious how a message actually gets from one mailbox to another.
**Difficulty:** Hard
**Verified with:** Node 22.22 and Python 3.12 (identical output for both examples). SMTP reply classes are from RFC 5321; the Postfix default \`maximal_queue_lifetime\` of 5 days is from the Postfix queue manager documentation; the bulk-sender rules (more than 5,000 messages a day to Gmail: SPF, DKIM and DMARC, one-click unsubscribe, spam rate under 0.3%) are from Google's sender guidelines as summarised by several deliverability vendors; Gmail's 25 MB attachment limit is from Gmail help pages.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. Every number from the simulations comes from running the examples; the **Verified** section quotes their full output.

## 1. Why This Even Matters — A Story First

Think of a city post office. Letters arrive from other cities by truck; clerks check the stamps and the sender's seal, throw away obvious junk, and sort the rest into a pigeonhole for each resident. Residents come to read their mail, file it, and look up old letters. For outgoing mail, the post office sends trucks to other cities; if a city's office is closed for the day it tries again tomorrow, and if the address does not exist it returns the letter with a note and stops sending to that address.

Email works the same way, with one billion pigeonholes. Other providers deliver to our servers over **SMTP**; we check who really sent each message, filter spam, and store it in the right mailbox. Our users read through an app or a desktop client, search ten years of mail, and send replies, which our outbound servers deliver to other providers, retrying politely when they are busy and giving up cleanly when an address is dead.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| Consumer mailboxes (Gmail) or a transactional or marketing sender (SendGrid, SES)? | Mailboxes need storage, search and clients; a sender is all about outbound throughput and reputation |
| How many users, messages a day, average size, attachments? | Storage dominates; it sizes the blob store and the metadata store |
| IMAP and POP for third-party clients, or only our own apps? | IMAP needs folder semantics and per-message UIDs; our own apps can use a JSON API |
| Search requirements: full text across all mail, how fast? | A per-user inverted index is a large subsystem |
| Retention and legal hold? | Deletion and compliance rules |
| Spam and malware filtering in scope? | Inbound pipeline stages and ML models |

## 3. Requirements

**Functional**
- Receive mail from the internet for our users; send mail from our users to anyone.
- Read, search, organise (folders or labels, read and unread, star), thread conversations.
- Attachments, drafts, contacts; access from web, mobile and standard IMAP clients.

**Non-functional**
- **Durability**: an accepted message is never lost. Once our server replies 250 to the sending server, the message is our responsibility.
- **Availability**: inbound acceptance must almost never fail (senders retry, but users notice delays); reading must work even when search is degraded.
- **Latency**: new mail visible within seconds; mailbox listing in a few hundred milliseconds.
- **Security and trust**: authenticated sending, spam and phishing protection, encryption in transit and at rest.

## 4. Capacity Estimate

Assumptions: 1 billion users, each sending 10 and receiving 40 messages a day, 50 KB per message including headers and body, 20% of received messages carrying attachments averaging 500 KB. The mailbox example computes:

~~~text
== 1. Capacity (assumptions) ==
send QPS = 1e9 x 10 / 86400 = 115741
new mail per year = 730 PB of bodies + 1460 PB of attachments
~~~

- **Send rate**: about 115,741 messages a second on average; inbound is 4 times that, about 463,000 a second, before spam is discarded.
- **Storage**: about **730 PB a year of bodies and 1,460 PB a year of attachments**, before replication. Storage, not request rate, is what this design is sized by. It pushes bodies and attachments into a cheap blob store ([How would you design S3-like object storage?](/interview-question/how-would-you-design-s3-like-object-storage-572x)), with deduplication (the same attachment sent to 50 people is stored once, by content hash), compression, and a hot and cold tier, since most mail is never opened after its first week.

Gmail's help pages put the attachment limit at 25 MB per message, with larger files sent as Drive links; a limit of that kind keeps a single message from becoming a storage or SMTP problem.

## 5. Protocols and API

📌 **Interview term: SMTP (Simple Mail Transfer Protocol)** — the protocol servers use to hand mail to each other (RFC 5321). The sending server looks up the recipient domain's **MX record** in DNS ([How does DNS resolution work?](/interview-question/how-does-dns-resolution-work)), connects, and transfers the message; the receiver answers with a three-digit reply code.

📌 **Interview term: IMAP, POP and JMAP** — protocols for clients to read mail. POP downloads and usually deletes; IMAP keeps mail on the server with folders and flags; JMAP is a newer JSON-over-HTTP protocol (RFC 8620 and RFC 8621). Our own web and mobile apps would use our HTTP API; IMAP gateways translate for desktop clients.

The internal API for our apps:

- \`GET /v1/mailboxes/{folder}/messages?cursor=...&limit=50\`: newest-first listing from metadata only.
- \`GET /v1/messages/{id}\` (body fetched from the blob store), \`GET /v1/threads/{thread_id}\`.
- \`POST /v1/messages\` to send (with an idempotency key, so a retried "send" is not delivered twice), \`PATCH /v1/messages/{id}\` for flags and labels.
- \`GET /v1/search?q=from:bob invoice after:2026/01/01\`.
- A push channel (WebSocket or mobile push) for "new mail" events ([How would you design a notification system?](/interview-question/how-would-you-design-a-notification-system)).

## 6. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 880 280" role="img" aria-label="Inbound SMTP servers pass mail through spam and authentication filters into the mailbox store and blob store; the web API reads them; outbound mail goes through a queue to delivery workers that send SMTP to other providers">
  <defs>
    <marker id="sd18q4-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="160" height="80" rx="10"/>
  <text class="d-text" x="110" y="65" text-anchor="middle">Inbound SMTP</text>
  <text class="d-sub" x="110" y="88" text-anchor="middle">MX servers</text>
  <rect class="d-box-accent" x="250" y="30" width="160" height="80" rx="10"/>
  <text class="d-text" x="330" y="65" text-anchor="middle">Filters</text>
  <text class="d-sub" x="330" y="88" text-anchor="middle">SPF DKIM DMARC, spam</text>
  <rect class="d-box-accent" x="470" y="30" width="160" height="80" rx="10"/>
  <text class="d-text" x="550" y="65" text-anchor="middle">Mailbox store</text>
  <text class="d-sub" x="550" y="88" text-anchor="middle">metadata by user</text>
  <rect class="d-box-muted" x="690" y="30" width="160" height="80" rx="10"/>
  <text class="d-text" x="770" y="65" text-anchor="middle">Blob store</text>
  <text class="d-sub" x="770" y="88" text-anchor="middle">bodies, attachments</text>
  <rect class="d-box" x="30" y="170" width="160" height="80" rx="10"/>
  <text class="d-text" x="110" y="205" text-anchor="middle">Delivery workers</text>
  <text class="d-sub" x="110" y="228" text-anchor="middle">SMTP to the world</text>
  <rect class="d-box-accent" x="250" y="170" width="160" height="80" rx="10"/>
  <text class="d-text" x="330" y="205" text-anchor="middle">Outbound queue</text>
  <text class="d-sub" x="330" y="228" text-anchor="middle">durable, per domain</text>
  <rect class="d-box" x="470" y="170" width="160" height="80" rx="10"/>
  <text class="d-text" x="550" y="205" text-anchor="middle">Web and IMAP API</text>
  <text class="d-sub" x="550" y="228" text-anchor="middle">apps and clients</text>
  <rect class="d-box-muted" x="690" y="170" width="160" height="80" rx="10"/>
  <text class="d-text" x="770" y="205" text-anchor="middle">Search index</text>
  <text class="d-sub" x="770" y="228" text-anchor="middle">per user</text>
  <path class="d-edge" d="M 190 70 L 242 70" marker-end="url(#sd18q4-arrow)"/>
  <path class="d-edge" d="M 410 70 L 462 70" marker-end="url(#sd18q4-arrow)"/>
  <path class="d-edge" d="M 630 70 L 682 70" marker-end="url(#sd18q4-arrow)"/>
  <path class="d-edge" d="M 250 210 L 198 210" marker-end="url(#sd18q4-arrow)"/>
  <path class="d-edge" d="M 470 210 L 418 210" marker-end="url(#sd18q4-arrow)"/>
  <path class="d-edge" d="M 550 110 L 550 162" marker-end="url(#sd18q4-arrow)"/>
  <path class="d-edge-dashed" d="M 550 110 L 770 162" marker-end="url(#sd18q4-arrow)"/>
</svg>

The inbound path runs along the top: MX servers accept mail, filters authenticate it and score spam, then the message is stored. The outbound path runs right to left on the bottom: the API writes outgoing mail to a durable queue and delivery workers send it. The search index is built asynchronously from the mailbox store (dashed arrow).

**Inbound.** The MX servers accept a message and reply 250 only after it is durably written (to a replicated spool or queue). Then a pipeline runs: authentication checks, spam and malware scoring, user filters and rules, storage, indexing, and a push notification.

## 7. Deep Dive 1: Outbound Delivery, Retries and Bounces

📌 **Interview term: SMTP reply classes** — RFC 5321 defines 2yz as success, **4yz as a transient failure** (the same command may succeed later, so retry) and **5yz as a permanent failure** (do not repeat the same request). Greylisting, rate limits and a busy server reply 4xx; an unknown user replies 550.

📌 **Interview term: queue lifetime** — how long a server keeps retrying a message with transient failures before giving up and returning it to the sender. Postfix documents a default \`maximal_queue_lifetime\` of 5 days.

📌 **Interview term: bounce (DSN)** — a delivery status notification sent back to the sender when a message cannot be delivered: immediately on a 5xx, or after the queue lifetime on repeated 4xx.

📌 **Interview term: suppression list** — addresses that hard-bounced (or complained, or unsubscribed); future sends to them are skipped. Repeatedly sending to dead addresses is a strong spam signal and damages the sender's reputation.

The delivery example sends one message to four scripted servers on a fake clock, with backoff doubling from 5 minutes and capped at 4 hours (assumed values for the sketch, not a Postfix default):

~~~text
== 1. Send one message to four recipients ==
  t+0d00h00m alice@example.org: 250 2.0.0 OK after 1 attempt(s)
  t+0d00h00m bob@busy.example: 451 4.7.1 greylisted, try later -> retry at t+0d00h05m
  t+0d00h00m carol@gone.example: 550 5.1.1 user unknown -> hard bounce, suppress, notify sender
  t+0d00h00m dave@down.example: 421 4.3.2 service not available -> retry at t+0d00h05m
  t+0d00h05m bob@busy.example: 451 4.7.1 greylisted, try later -> retry at t+0d00h15m
  t+0d00h05m dave@down.example: 421 4.3.2 service not available -> retry at t+0d00h15m
  t+0d00h15m bob@busy.example: 250 2.0.0 OK after 3 attempt(s)
  t+0d00h15m dave@down.example: 421 4.3.2 service not available -> retry at t+0d00h35m
  t+4d21h15m dave@down.example: 421 4.3.2 service not available -> gave up after 35 attempts, bounce to sender
  total SMTP attempts: 40 (alice 1, bob 3, carol 1, dave 35)

== 2. Next day, a newsletter to the same list ==
  t+1d00h00m alice@example.org: 250 2.0.0 OK after 1 attempt(s)
  t+1d00h00m carol@gone.example: skipped, on suppression list
  suppression list: carol@gone.example
~~~

Alice gets it at once. Bob's server greylists the first two attempts (4xx) and accepts the third, 15 minutes later. Carol does not exist (550): one attempt, a bounce to the sender and an entry on the suppression list, which makes the next day's newsletter skip her. Dave's server is down for good: **35 attempts over almost 5 days** (the backoff hits the 4-hour cap), then a bounce. Without the cap, attempts would be rarer but a server that comes back would wait many hours for its mail.

The decision itself is three lines:

~~~js
if (cls === "2") { /* delivered */ }
else if (cls === "5") { suppressed.add(job.rcpt); /* bounce now */ }
else { const next = job.due + backoff(job.tries); /* retry, or bounce if past the 5-day lifetime */ }
~~~

**Scaling outbound.** The queue is partitioned by recipient domain, so one slow provider does not block others, and each domain has its own concurrency and rate limit (large providers throttle senders with 421 or 4.7.x replies). Messages to the same domain are batched into one connection. A message to 50 recipients is one job per domain, not 50. Background on queues and retry: [How would you design a distributed message queue?](/interview-question/how-would-you-design-a-distributed-message-queue-572o).

## 8. Deep Dive 2: Proving Who Sent It

📌 **Interview term: SPF** — a DNS record listing the IP addresses allowed to send mail for a domain; the receiver checks the connecting IP.

📌 **Interview term: DKIM** — the sending server signs selected headers and a hash of the body with a private key; the public key is in DNS under the signing domain. Any change to the signed body breaks the signature.

📌 **Interview term: DMARC** — a DNS policy telling receivers what to do (\`none\`, \`quarantine\`, \`reject\`) when a message's visible From domain is not aligned with a passing SPF or DKIM result, and where to send reports.

The example computes a body hash the way DKIM's \`bh=\` tag does in spirit (SHA-256 of the body with CRLF line endings, base64), leaving out canonicalization details and the RSA or Ed25519 signature over headers:

~~~text
== 3. DKIM body hash (bh=) survives relays, not edits ==
  signed bh  = y9zig3bhnz2j4k+eRhXw3jWuJ7b4nwpMSnPitsWZtIo=
  relay keeps body:        bh matches -> dkim=pass
  list appends a footer:   bh differs -> dkim=fail
~~~

A relay that passes the body through unchanged keeps DKIM valid; a mailing list that appends a footer breaks it. That is why lists and forwarders often re-sign or use ARC (Authenticated Received Chain, RFC 8617) to vouch for the original result.

**Bulk-sender rules.** Google and Yahoo announced in October 2023, and enforced in phases from February 2024 (one-click unsubscribe from June 2024), that bulk senders must authenticate with SPF, DKIM and DMARC, offer one-click unsubscribe (RFC 8058) on promotional mail, and keep the reported spam rate below 0.3%. Google defines a bulk sender as one sending about 5,000 or more messages a day to Gmail addresses (Google sender guidelines, as summarised by Red Sift, dmarcian and other deliverability vendors). For our outbound service this means signing everything, publishing DMARC, honouring unsubscribes within two days and watching complaint rates per sending IP.

**Inbound checks** use the same records in reverse: verify SPF, DKIM and DMARC, then score spam with reputation (sender IP and domain history), content and user feedback ("report spam" clicks). Messages that fail DMARC with \`p=reject\` are refused during the SMTP session with a 5xx.

## 9. Deep Dive 3: Mailbox Storage, Threads and Counters

📌 **Interview term: partition by user** — every row of one mailbox (messages, folders, labels, threads, counters) shares the partition key \`user_id\`, so listing a folder or a thread is a single-partition query and per-user transactions stay on one node.

~~~text
== 2. Every row of a mailbox lives on one shard (partition key = user_id) ==
  u:alice -> shard 6
  u:bob -> shard 9
  u:carol -> shard 3
~~~

A wide-column store (Bigtable, Cassandra) or sharded SQL works; a typical message metadata row is keyed by \`(user_id, folder_id, received_at DESC, message_id)\` so "newest 50 in INBOX" is one range scan, with the body and attachments referenced by blob id. Sharding and hashing background: [What is database sharding?](/interview-question/what-is-database-sharding) and [What is consistent hashing?](/interview-question/what-is-consistent-hashing).

📌 **Interview term: threading headers** — every message has a unique \`Message-ID\`; a reply carries \`In-Reply-To\` (its direct parent) and \`References\` (the chain of ancestors, starting with the thread root).

The example threads one inbox three ways. Dan's reply arrives before Carol's message it answers:

~~~text
== 3. Threading ==
  in-reply-to <a1@x>  bob, carol
  in-reply-to <c3@x>  dan, bob
  in-reply-to <h1@y>  eve
  in-reply-to <h2@z>  frank
  references  <a1@x>  bob, dan, carol, bob
  references  <h1@y>  eve
  references  <h2@z>  frank
  by subject  Trip plan  bob, dan, carol, bob
  by subject  Hello      eve, frank   <- two strangers merged
~~~

- **In-Reply-To only** splits the conversation: Dan's reply points at a message not seen yet, so it starts its own thread, and Bob's later reply joins Dan's.
- **References** keeps it together, because every reply names the thread root \`<a1@x>\`.
- **Subject only** gets the trip right but merges two unrelated messages from strangers both titled "Hello". Subject matching is a fallback for clients that drop headers, combined with participants and time.

**Counters.** Unread counts per folder are shown on every screen, so they are stored, not computed, and updated in the same per-user transaction as the flag change. A flag change must be idempotent (marking a message read twice must not decrement twice):

~~~text
== 4. Folder listing and unread counters ==
  INBOX unread=4 (recount 4), newest 3: bob*, frank*, eve
~~~

A periodic recount repairs any drift.

📌 **Interview term: per-user search index** — an inverted index (terms to message ids) partitioned by user, built asynchronously from new mail. Because a query only ever searches one mailbox, the index is sharded by \`user_id\` and a query touches one shard.

## 10. What Breaks First at 10x

- **Storage cost.** At more than 2 EB a year before replication, erasure coding instead of 3 full copies, attachment deduplication and cold tiers matter more than any compute choice.
- **Hot mailboxes.** A shared support inbox receiving millions of messages breaks the one-partition-per-user assumption; split it by time bucket.
- **Outbound reputation.** One compromised account spamming can get shared IPs blocked by other providers; rate-limit new accounts and separate IP pools by traffic type.
- **Search indexing lag.** Indexing falls behind ingest during spikes; queue it, and let users still list and open mail.
- **IMAP sessions.** Millions of long-lived IMAP IDLE connections need dedicated, horizontally scaled gateways.

## 11. Verified: Running the Code

The example **"Outbound delivery: SMTP 2xx/4xx/5xx handling, exponential retry, a 5-day queue lifetime, suppression and the DKIM body hash"** was run with \`node main.js\` (Node 22.22) and \`python3.12 main.py\`. Both print exactly this:

~~~text
== 1. Send one message to four recipients ==
  t+0d00h00m alice@example.org: 250 2.0.0 OK after 1 attempt(s)
  t+0d00h00m bob@busy.example: 451 4.7.1 greylisted, try later -> retry at t+0d00h05m
  t+0d00h00m carol@gone.example: 550 5.1.1 user unknown -> hard bounce, suppress, notify sender
  t+0d00h00m dave@down.example: 421 4.3.2 service not available -> retry at t+0d00h05m
  t+0d00h05m bob@busy.example: 451 4.7.1 greylisted, try later -> retry at t+0d00h15m
  t+0d00h05m dave@down.example: 421 4.3.2 service not available -> retry at t+0d00h15m
  t+0d00h15m bob@busy.example: 250 2.0.0 OK after 3 attempt(s)
  t+0d00h15m dave@down.example: 421 4.3.2 service not available -> retry at t+0d00h35m
  t+4d21h15m dave@down.example: 421 4.3.2 service not available -> gave up after 35 attempts, bounce to sender
  total SMTP attempts: 40 (alice 1, bob 3, carol 1, dave 35)

== 2. Next day, a newsletter to the same list ==
  t+1d00h00m alice@example.org: 250 2.0.0 OK after 1 attempt(s)
  t+1d00h00m carol@gone.example: skipped, on suppression list
  suppression list: carol@gone.example

== 3. DKIM body hash (bh=) survives relays, not edits ==
  signed bh  = y9zig3bhnz2j4k+eRhXw3jWuJ7b4nwpMSnPitsWZtIo=
  relay keeps body:        bh matches -> dkim=pass
  list appends a footer:   bh differs -> dkim=fail
~~~

The example **"Mailbox storage: user-partitioned shards, threading by References vs In-Reply-To vs subject, and unread counters"** was run the same way. Both print exactly this:

~~~text
== 1. Capacity (assumptions) ==
send QPS = 1e9 x 10 / 86400 = 115741
new mail per year = 730 PB of bodies + 1460 PB of attachments

== 2. Every row of a mailbox lives on one shard (partition key = user_id) ==
  u:alice -> shard 6
  u:bob -> shard 9
  u:carol -> shard 3

== 3. Threading ==
  in-reply-to <a1@x>  bob, carol
  in-reply-to <c3@x>  dan, bob
  in-reply-to <h1@y>  eve
  in-reply-to <h2@z>  frank
  references  <a1@x>  bob, dan, carol, bob
  references  <h1@y>  eve
  references  <h2@z>  frank
  by subject  Trip plan  bob, dan, carol, bob
  by subject  Hello      eve, frank   <- two strangers merged

== 4. Folder listing and unread counters ==
  INBOX unread=4 (recount 4), newest 3: bob*, frank*, eve
~~~

What the simulations stand for and leave out: remote servers are scripted lists of reply strings and time is a fake clock in minutes, so there are no DNS lookups, TLS, connection reuse or real DSN messages. The backoff schedule (5 minutes doubling to a 4-hour cap) is an assumption; the 5-day lifetime matches the Postfix default. The DKIM part computes only a body hash, not a full signature with canonicalization. The mailbox example keeps everything in memory; the shard numbers come from FNV-1a hashing of the user id.

## Edge Cases Worth Knowing

- **Accept, then fail.** Once you reply 250 you own the message; if a later stage cannot deliver it, you must generate a bounce, never drop it.
- **Backscatter.** Bouncing spam with forged senders sends bounces to innocent people; reject during the SMTP session instead of accepting and bouncing.
- **Duplicate deliveries.** SMTP retries after a lost 250 can deliver twice; deduplicate by Message-ID plus a content hash per mailbox.
- **Large recipient lists.** One message to 10,000 recipients is fanned out by domain, rate-limited, and checked against suppression per address.
- **Internationalised addresses.** Unicode local parts and domains (SMTPUTF8) need end-to-end support or a clear 5xx.

## Common Pitfalls

- **Treating every failure the same.** Retrying 5xx harms reputation; giving up on 4xx loses mail.
- **No suppression list.** Sending again and again to dead addresses is how senders get blocklisted.
- **Storing bodies in the metadata database.** Petabytes of blobs belong in object storage, referenced by id.
- **Threading by subject.** Merges unrelated conversations; use References first.
- **Computing unread counts on every page load.** Store counters and update them atomically with flags.
- **Skipping DMARC.** Without it, anyone can spoof your users domain and your mail is more likely to be filtered.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Scope and numbers:</strong> <span style="color:#f0e2c8;">A Gmail-style service: SMTP in and out, our API and IMAP for clients. At 1 billion users sending 10 and receiving 40 a day that is about 115,741 sends a second and roughly <strong style="color:#ffca28;">730 PB of bodies plus 1,460 PB of attachments a year</strong>, so storage drives the design.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Inbound:</strong> <span style="color:#f0e2c8;">MX servers reply 250 only after a durable write, then a pipeline checks <strong style="color:#ffca28;">SPF, DKIM and DMARC</strong>, scores spam and malware, applies user rules, stores metadata and the body, indexes and pushes a notification.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Outbound:</strong> <span style="color:#f0e2c8;">A durable queue partitioned by recipient domain with per-domain rate limits. Reply classes drive behaviour: <strong style="color:#ffca28;">2xx</strong> done, <strong style="color:#ffca28;">4xx</strong> retry with capped exponential backoff for up to the queue lifetime (5 days is the Postfix default), <strong style="color:#ffca28;">5xx</strong> bounce at once and add to the <strong style="color:#ffca28;">suppression list</strong>. In my simulation a dead server took 35 attempts before the bounce.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Storage:</strong> <span style="color:#f0e2c8;">Metadata partitioned by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">user_id</code> in a wide-column or sharded SQL store, keyed so "newest 50 in INBOX" is one range scan; bodies and attachments in a blob store with content-hash dedup and cold tiers. Unread counters are stored and updated with the flag, idempotently.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Threads and search:</strong> <span style="color:#f0e2c8;">Thread with <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">References</code> first, then <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">In-Reply-To</code>, subject only as a fallback: in my example, In-Reply-To alone split a thread when a reply arrived first, and subject matching merged two strangers. Search is a per-user inverted index built asynchronously.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you make sure an accepted message is never lost?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">The 250 reply is sent only after the message is written to a replicated spool. Every later stage reads from that durable copy and is idempotent, so a crash just means the stage runs again.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why partition by user rather than by message?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Every read is within one mailbox: list a folder, open a thread, search. Partitioning by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">user_id</code> makes all of those single-partition operations and keeps per-user transactions local.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">What do SPF, DKIM and DMARC each do?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">SPF says which IPs may send for a domain, DKIM signs headers and a body hash with a key published in DNS, and DMARC says what to do when the From domain is not aligned with a passing SPF or DKIM, and where to send reports.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you stop your outbound IPs getting blocklisted?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Authenticate everything, honour bounces and unsubscribes through the suppression list, rate-limit new and suspicious accounts, separate IP pools for transactional and bulk mail, and watch complaint rates; Google wants under 0.3% for bulk senders.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How does search scale?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">An inverted index per user, sharded by <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">user_id</code>, so a query hits one shard. It is updated asynchronously from new mail; if it lags, listing and reading still work.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| SMTP | Server-to-server mail transfer protocol with numeric replies |
| IMAP, POP and JMAP | Client protocols to read mail |
| SMTP reply classes | 2xx success, 4xx retry later, 5xx permanent failure |
| Queue lifetime | How long transient failures are retried before bouncing |
| Bounce (DSN) | Notice to the sender that delivery failed |
| Suppression list | Addresses never to send to again |
| SPF | DNS list of IPs allowed to send for a domain |
| DKIM | Signature over headers and body hash, key in DNS |
| DMARC | Policy for unaligned or failing mail, plus reports |
| Partition by user | All rows of a mailbox share the key \`user_id\` |
| Threading headers | Message-ID, In-Reply-To and References |
| Per-user search index | Inverted index sharded by mailbox owner |

**Conclusion:** A distributed email service is two pipelines and a very large filing cabinet. Inbound, accept only after a durable write, authenticate with SPF, DKIM and DMARC and filter spam. Outbound, queue by domain and let the reply class decide: deliver, retry with capped backoff for days, or bounce and suppress. Store metadata partitioned by user so every mailbox operation is local, push bodies and attachments into deduplicated blob storage that dominates the cost, and thread by References rather than subject. Worked numbers show that at a billion users the hard limit is storage, not requests.`,
    examples: [
      {
        label: `Outbound delivery: SMTP 2xx/4xx/5xx handling, exponential retry, a 5-day queue lifetime, suppression and the DKIM body hash`,
        variants: [
          { tech: "node", code: `// Outbound mail delivery on a fake clock: SMTP reply classes (2xx done, 4xx retry, 5xx bounce),
// exponential backoff, a 5-day queue lifetime, a suppression list, and a DKIM body hash.
const crypto = require("crypto");

// Scripted remote servers: the reply for attempt 1, 2, 3, ... (the last one repeats)
const remote = {
  "alice@example.org": ["250 2.0.0 OK"],
  "bob@busy.example": ["451 4.7.1 greylisted, try later", "451 4.7.1 greylisted, try later", "250 2.0.0 OK"],
  "carol@gone.example": ["550 5.1.1 user unknown"],
  "dave@down.example": ["421 4.3.2 service not available"],
};
const LIFETIME = 5 * 24 * 60; // minutes; Postfix default maximal_queue_lifetime is 5d
const backoff = (n) => Math.min(5 * 2 ** (n - 1), 240); // 5, 10, 20, ... capped at 4 hours
const suppressed = new Set();
const triesBy = new Map();
const fmtT = (m) => "t+" + Math.floor(m / 1440) + "d" + String(Math.floor((m % 1440) / 60)).padStart(2, "0") + "h" + String(m % 60).padStart(2, "0") + "m";

function deliver(queue) {
  const log = [];
  let attempts = 0;
  while (queue.length) {
    queue.sort((a, b) => a.due - b.due || (a.rcpt < b.rcpt ? -1 : 1));
    const job = queue.shift();
    if (suppressed.has(job.rcpt)) { log.push(fmtT(job.due) + " " + job.rcpt + ": skipped, on suppression list"); continue; }
    job.tries++;
    attempts++;
    triesBy.set(job.rcpt, job.tries);
    const replies = remote[job.rcpt];
    const reply = replies[Math.min(job.tries, replies.length) - 1];
    const cls = reply[0];
    if (cls === "2") log.push(fmtT(job.due) + " " + job.rcpt + ": " + reply + " after " + job.tries + " attempt(s)");
    else if (cls === "5") { suppressed.add(job.rcpt); log.push(fmtT(job.due) + " " + job.rcpt + ": " + reply + " -> hard bounce, suppress, notify sender"); }
    else {
      const next = job.due + backoff(job.tries);
      if (next - job.queued > LIFETIME) log.push(fmtT(job.due) + " " + job.rcpt + ": " + reply + " -> gave up after " + job.tries + " attempts, bounce to sender");
      else { if (job.tries <= 3) log.push(fmtT(job.due) + " " + job.rcpt + ": " + reply + " -> retry at " + fmtT(next)); job.due = next; queue.push(job); }
    }
  }
  return [log, attempts];
}

console.log("== 1. Send one message to four recipients ==");
let [log, attempts] = deliver(Object.keys(remote).map((rcpt) => ({ rcpt, due: 0, queued: 0, tries: 0 })));
for (const l of log) console.log("  " + l);
console.log("  total SMTP attempts: " + attempts + " (" + [...triesBy.entries()].map(([r, n]) => r.split("@")[0] + " " + n).join(", ") + ")");

console.log("\\n== 2. Next day, a newsletter to the same list ==");
[log, attempts] = deliver(["alice@example.org", "carol@gone.example"].map((rcpt) => ({ rcpt, due: 1440, queued: 1440, tries: 0 })));
for (const l of log) console.log("  " + l);
console.log("  suppression list: " + [...suppressed].sort().join(", "));

console.log("\\n== 3. DKIM body hash (bh=) survives relays, not edits ==");
const bh = (body) => crypto.createHash("sha256").update(body.replace(/\\r?\\n/g, "\\r\\n")).digest("base64");
const body = "Hi Alice,\\nYour order has shipped.\\n";
const signed = bh(body);
console.log("  signed bh  = " + signed);
console.log("  relay keeps body:        bh " + (bh(body) === signed ? "matches -> dkim=pass" : "differs -> dkim=fail"));
const footer = body + "-- Sent via list-server\\n";
console.log("  list appends a footer:   bh " + (bh(footer) === signed ? "matches -> dkim=pass" : "differs -> dkim=fail"));` },
          { tech: "python", code: `# Outbound mail delivery on a fake clock: SMTP reply classes (2xx done, 4xx retry, 5xx bounce),
# exponential backoff, a 5-day queue lifetime, a suppression list, and a DKIM body hash.
import base64
import hashlib
import re

# Scripted remote servers: the reply for attempt 1, 2, 3, ... (the last one repeats)
remote = {
    "alice@example.org": ["250 2.0.0 OK"],
    "bob@busy.example": ["451 4.7.1 greylisted, try later", "451 4.7.1 greylisted, try later", "250 2.0.0 OK"],
    "carol@gone.example": ["550 5.1.1 user unknown"],
    "dave@down.example": ["421 4.3.2 service not available"],
}
LIFETIME = 5 * 24 * 60  # minutes; Postfix default maximal_queue_lifetime is 5d


def backoff(n):  # 5, 10, 20, ... capped at 4 hours
    return min(5 * 2 ** (n - 1), 240)


suppressed = set()
tries_by = {}


def fmt_t(m):
    return f"t+{m // 1440}d{(m % 1440) // 60:02d}h{m % 60:02d}m"


def deliver(queue):
    log, attempts = [], 0
    while queue:
        queue.sort(key=lambda j: (j["due"], j["rcpt"]))
        job = queue.pop(0)
        if job["rcpt"] in suppressed:
            log.append(fmt_t(job["due"]) + " " + job["rcpt"] + ": skipped, on suppression list")
            continue
        job["tries"] += 1
        attempts += 1
        tries_by[job["rcpt"]] = job["tries"]
        replies = remote[job["rcpt"]]
        reply = replies[min(job["tries"], len(replies)) - 1]
        cls = reply[0]
        if cls == "2":
            log.append(fmt_t(job["due"]) + " " + job["rcpt"] + ": " + reply + " after " + str(job["tries"]) + " attempt(s)")
        elif cls == "5":
            suppressed.add(job["rcpt"])
            log.append(fmt_t(job["due"]) + " " + job["rcpt"] + ": " + reply + " -> hard bounce, suppress, notify sender")
        else:
            nxt = job["due"] + backoff(job["tries"])
            if nxt - job["queued"] > LIFETIME:
                log.append(fmt_t(job["due"]) + " " + job["rcpt"] + ": " + reply + " -> gave up after " + str(job["tries"]) + " attempts, bounce to sender")
            else:
                if job["tries"] <= 3:
                    log.append(fmt_t(job["due"]) + " " + job["rcpt"] + ": " + reply + " -> retry at " + fmt_t(nxt))
                job["due"] = nxt
                queue.append(job)
    return log, attempts


print("== 1. Send one message to four recipients ==")
log, attempts = deliver([{"rcpt": r, "due": 0, "queued": 0, "tries": 0} for r in remote])
for line in log:
    print("  " + line)
print("  total SMTP attempts: " + str(attempts) + " (" + ", ".join(r.split("@")[0] + " " + str(n) for r, n in tries_by.items()) + ")")

print("\\n== 2. Next day, a newsletter to the same list ==")
log, attempts = deliver([{"rcpt": r, "due": 1440, "queued": 1440, "tries": 0} for r in ("alice@example.org", "carol@gone.example")])
for line in log:
    print("  " + line)
print("  suppression list: " + ", ".join(sorted(suppressed)))

print("\\n== 3. DKIM body hash (bh=) survives relays, not edits ==")


def bh(body):
    return base64.b64encode(hashlib.sha256(re.sub(r"\\r?\\n", "\\r\\n", body).encode()).digest()).decode()


body = "Hi Alice,\\nYour order has shipped.\\n"
signed = bh(body)
print("  signed bh  = " + signed)
print("  relay keeps body:        bh " + ("matches -> dkim=pass" if bh(body) == signed else "differs -> dkim=fail"))
footer = body + "-- Sent via list-server\\n"
print("  list appends a footer:   bh " + ("matches -> dkim=pass" if bh(footer) == signed else "differs -> dkim=fail"))` },
        ],
      },
      {
        label: `Mailbox storage: user-partitioned shards, threading by References vs In-Reply-To vs subject, and unread counters`,
        variants: [
          { tech: "node", code: `// Mailbox storage: capacity arithmetic, metadata sharded by user, threading by Message-ID /
// In-Reply-To / References headers (vs. by subject), and unread counters per folder.
console.log("== 1. Capacity (assumptions) ==");
const users = 1e9, sentPerDay = 10, recvPerDay = 40, msgKB = 50, attachPct = 20, attachKB = 500;
console.log("send QPS = 1e9 x 10 / 86400 = " + Math.round((users * sentPerDay) / 86400));
console.log("new mail per year = " + (users * recvPerDay * msgKB * 365) / 1e12 + " PB of bodies + " + (users * recvPerDay * attachPct * attachKB * 365) / 100 / 1e12 + " PB of attachments");

const fnv = (s) => { let h = 0x811c9dc5; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h; };
const SHARDS = 16;
console.log("\\n== 2. Every row of a mailbox lives on one shard (partition key = user_id) ==");
for (const u of ["u:alice", "u:bob", "u:carol"]) console.log("  " + u + " -> shard " + (fnv(u) % SHARDS));

// Alice's inbox, in arrival order. The reply from Dan arrives before the message it answers.
const inbox = [
  { id: "<a1@x>", t: 1, from: "bob", subject: "Trip plan", inReplyTo: null, refs: [] },
  { id: "<c3@x>", t: 2, from: "dan", subject: "Re: Trip plan", inReplyTo: "<b2@x>", refs: ["<a1@x>", "<b2@x>"] },
  { id: "<b2@x>", t: 3, from: "carol", subject: "Re: Trip plan", inReplyTo: "<a1@x>", refs: ["<a1@x>"] },
  { id: "<h1@y>", t: 4, from: "eve", subject: "Hello", inReplyTo: null, refs: [] },
  { id: "<h2@z>", t: 5, from: "frank", subject: "Hello", inReplyTo: null, refs: [] },
  { id: "<d4@x>", t: 6, from: "bob", subject: "Re: Trip plan", inReplyTo: "<c3@x>", refs: ["<a1@x>", "<b2@x>", "<c3@x>"] },
];

console.log("\\n== 3. Threading ==");
const irt = new Map(); // In-Reply-To only: a reply that arrives before its parent starts a new thread
const byIrt = new Map();
for (const m of inbox) {
  const tid = m.inReplyTo && irt.has(m.inReplyTo) ? irt.get(m.inReplyTo) : m.id;
  irt.set(m.id, tid);
  if (!byIrt.has(tid)) byIrt.set(tid, []);
  byIrt.get(tid).push(m.from);
}
for (const [tid, who] of byIrt) console.log("  in-reply-to " + tid.padEnd(7) + " " + who.join(", "));
const threadOf = new Map(); // message-id -> thread id
const byHeaders = new Map();
for (const m of inbox) {
  const known = [m.inReplyTo, ...m.refs].filter((r) => r && threadOf.has(r)).map((r) => threadOf.get(r));
  const root = m.refs.length ? m.refs[0] : m.inReplyTo; // References starts with the thread root
  const tid = known.length ? known[0] : root || m.id;
  threadOf.set(m.id, tid);
  for (const r of m.refs) if (!threadOf.has(r)) threadOf.set(r, tid);
  if (!byHeaders.has(tid)) byHeaders.set(tid, []);
  byHeaders.get(tid).push(m.from);
}
for (const [tid, who] of byHeaders) console.log("  references  " + tid.padEnd(7) + " " + who.join(", "));
const bySubject = new Map();
for (const m of inbox) {
  const s = m.subject.replace(/^(re|fwd?):\\s*/i, "");
  if (!bySubject.has(s)) bySubject.set(s, []);
  bySubject.get(s).push(m.from);
}
for (const [s, who] of bySubject) console.log("  by subject  " + s.padEnd(10) + " " + who.join(", ") + (s === "Hello" ? "   <- two strangers merged" : ""));

console.log("\\n== 4. Folder listing and unread counters ==");
const folder = { name: "INBOX", unread: 0, msgs: [] }; // counter row updated in the same transaction as the message rows
for (const m of inbox) { folder.msgs.push({ ...m, read: false }); folder.unread++; }
const markRead = (id) => { const m = folder.msgs.find((x) => x.id === id); if (!m.read) { m.read = true; folder.unread--; } };
markRead("<a1@x>");
markRead("<a1@x>"); // a second client sends the same flag change: no double decrement
markRead("<h1@y>");
const page = [...folder.msgs].sort((a, b) => b.t - a.t).slice(0, 3);
console.log("  INBOX unread=" + folder.unread + " (recount " + folder.msgs.filter((m) => !m.read).length + "), newest 3: " + page.map((m) => m.from + (m.read ? "" : "*")).join(", "));` },
          { tech: "python", code: `# Mailbox storage: capacity arithmetic, metadata sharded by user, threading by Message-ID /
# In-Reply-To / References headers (vs. by subject), and unread counters per folder.
import re

print("== 1. Capacity (assumptions) ==")
users, sent_per_day, recv_per_day, msg_kb, attach_pct, attach_kb = 10**9, 10, 40, 50, 20, 500
print("send QPS = 1e9 x 10 / 86400 = " + str(round(users * sent_per_day / 86400)))
print("new mail per year = " + str(users * recv_per_day * msg_kb * 365 // 10**12) + " PB of bodies + "
      + str(users * recv_per_day * attach_pct * attach_kb * 365 // 100 // 10**12) + " PB of attachments")


def fnv(s):
    h = 0x811C9DC5
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


SHARDS = 16
print("\\n== 2. Every row of a mailbox lives on one shard (partition key = user_id) ==")
for u in ("u:alice", "u:bob", "u:carol"):
    print("  " + u + " -> shard " + str(fnv(u) % SHARDS))

# Alice's inbox, in arrival order. The reply from Dan arrives before the message it answers.
inbox = [
    {"id": "<a1@x>", "t": 1, "from": "bob", "subject": "Trip plan", "irt": None, "refs": []},
    {"id": "<c3@x>", "t": 2, "from": "dan", "subject": "Re: Trip plan", "irt": "<b2@x>", "refs": ["<a1@x>", "<b2@x>"]},
    {"id": "<b2@x>", "t": 3, "from": "carol", "subject": "Re: Trip plan", "irt": "<a1@x>", "refs": ["<a1@x>"]},
    {"id": "<h1@y>", "t": 4, "from": "eve", "subject": "Hello", "irt": None, "refs": []},
    {"id": "<h2@z>", "t": 5, "from": "frank", "subject": "Hello", "irt": None, "refs": []},
    {"id": "<d4@x>", "t": 6, "from": "bob", "subject": "Re: Trip plan", "irt": "<c3@x>", "refs": ["<a1@x>", "<b2@x>", "<c3@x>"]},
]

print("\\n== 3. Threading ==")
irt, by_irt = {}, {}  # In-Reply-To only: a reply that arrives before its parent starts a new thread
for m in inbox:
    tid = irt[m["irt"]] if m["irt"] and m["irt"] in irt else m["id"]
    irt[m["id"]] = tid
    by_irt.setdefault(tid, []).append(m["from"])
for tid, who in by_irt.items():
    print("  in-reply-to " + tid.ljust(7) + " " + ", ".join(who))
thread_of, by_headers = {}, {}  # message-id -> thread id
for m in inbox:
    known = [thread_of[r] for r in [m["irt"]] + m["refs"] if r and r in thread_of]
    root = m["refs"][0] if m["refs"] else m["irt"]  # References starts with the thread root
    tid = known[0] if known else (root or m["id"])
    thread_of[m["id"]] = tid
    for r in m["refs"]:
        thread_of.setdefault(r, tid)
    by_headers.setdefault(tid, []).append(m["from"])
for tid, who in by_headers.items():
    print("  references  " + tid.ljust(7) + " " + ", ".join(who))
by_subject = {}
for m in inbox:
    s = re.sub(r"^(re|fwd?):\\s*", "", m["subject"], flags=re.I)
    by_subject.setdefault(s, []).append(m["from"])
for s, who in by_subject.items():
    print("  by subject  " + s.ljust(10) + " " + ", ".join(who) + ("   <- two strangers merged" if s == "Hello" else ""))

print("\\n== 4. Folder listing and unread counters ==")
folder = {"name": "INBOX", "unread": 0, "msgs": []}  # counter row updated in the same transaction as the message rows
for m in inbox:
    folder["msgs"].append(dict(m, read=False))
    folder["unread"] += 1


def mark_read(mid):
    m = next(x for x in folder["msgs"] if x["id"] == mid)
    if not m["read"]:
        m["read"] = True
        folder["unread"] -= 1


mark_read("<a1@x>")
mark_read("<a1@x>")  # a second client sends the same flag change: no double decrement
mark_read("<h1@y>")
page = sorted(folder["msgs"], key=lambda m: -m["t"])[:3]
recount = sum(1 for m in folder["msgs"] if not m["read"])
print("  INBOX unread=" + str(folder["unread"]) + " (recount " + str(recount) + "), newest 3: "
      + ", ".join(m["from"] + ("" if m["read"] else "*") for m in page))` },
        ],
      },
    ],
  },
  {
    title: `How would you design a distributed key-value store?`,
    difficulty: "hard",
    seoDescription: `Design a Dynamo-style key-value store: consistent hashing, N/R/W quorums, hinted handoff, read repair, vector clocks, gossip and an LSM storage engine.`,
    description: `**Question presented to candidate:**
"Design a distributed key-value store like Amazon Dynamo, Cassandra or Riak. It stores \`get(key)\` and \`put(key, value)\` for many terabytes of data across many machines, stays available when machines fail, and lets each application choose how consistent its reads should be. Walk me through partitioning, replication, failures and how each node stores data on disk."

**What a strong answer should cover:**
- The **CAP** decision up front: an AP, leaderless Dynamo-style design with tunable consistency, versus a CP design with a leader per shard (Raft), and when each fits
- **Partitioning** with consistent hashing and virtual nodes; **replication** to the next N distinct nodes on the ring (the preference list)
- **Quorums**: N, R, W and \`R + W > N\`; **sloppy quorum with hinted handoff** to stay writable during failures; **read repair** and **Merkle-tree anti-entropy** to converge
- **Conflict handling**: vector clocks and siblings versus last-write-wins, and what LWW silently loses
- **Membership and failure detection** by gossip, and the **storage engine**: write-ahead log, memtable, SSTables with Bloom filters, tombstones and compaction
- Worked numbers: node count from data size, replication and headroom; per-node write rate

**Clarifying questions expected:**
- Value sizes and data volume? Read-heavy or write-heavy?
- Is eventual consistency acceptable, or do some operations need linearizable reads or compare-and-set?
- Single region or multi-region? Expected failure modes?

**Code / implementation expected:** Optional — the examples run a Dynamo-style cluster (ring, sloppy quorum, hinted handoff, read repair, vector clocks) and an LSM storage engine on one node.`,
    answer: `**Target Audience:** Engineers preparing for the classic "design a key-value store" round, which tests whether you can combine partitioning, replication, consistency and storage into one coherent system.
**Difficulty:** Hard
**Verified with:** Node 22.22, Python 3.12, Go 1.24 and Java 21 for the cluster example (identical output); Node 22.22 and Python 3.12 for the storage-engine example. The design follows the Dynamo paper (DeCandia et al., SOSP 2007); the DynamoDB 400 KB item limit is from the AWS DynamoDB developer guide.

> **How to read this doc:** Every idea is explained in plain language first, then tagged with \`📌 Interview term:\` so you also learn the words an interviewer expects. Every number comes from running the examples; the **Verified** section quotes their full output. Several building blocks have their own pages and are only summarised here: [What is consistent hashing?](/interview-question/what-is-consistent-hashing), [What is a read/write quorum?](/interview-question/what-is-a-read-write-quorum), [What is a write-ahead log (WAL)?](/interview-question/what-is-a-write-ahead-log-wal) and [What is a Bloom filter and when is it useful?](/interview-question/what-is-a-bloom-filter-and-when-is-it-useful).

## 1. Why This Even Matters — A Story First

A town library has grown too big for one building, so it spreads its books over five branches. Each book is assigned to a branch by a simple rule on its title, and to be safe, copies are kept at that branch and the next two along the bus route. When a branch floods for a week, the neighbouring branch keeps a box labelled "for the flooded branch" with any new editions that arrive, and drives the box over when the branch reopens. When two librarians in different branches update the same catalogue card at the same time, nobody throws either change away; the next reader sees both and merges them.

That is a distributed key-value store. The rule on the title is **consistent hashing**, the three copies are **replication**, the box is a **hinted handoff**, the reader who fixes an out-of-date copy is **read repair**, and the two catalogue cards are **siblings** detected by **vector clocks**. Each branch also has its own way of shelving new books quickly, which is the storage engine.

## 2. Questions to Ask Your Interviewer First

| Question | Why it matters |
| :--- | :--- |
| How much data, what value sizes, how many reads and writes per second? | Sizes the cluster; large values belong in a blob store with a pointer |
| Eventual consistency acceptable? Any compare-and-set or transactions? | AP leaderless (Dynamo) versus CP leader-per-shard (Raft) |
| Read-heavy or write-heavy? | Storage engine choice: LSM tree for writes, B-tree for read-mostly |
| Single region or multi-region? | Replica placement, latency, conflict rate |
| What happens on concurrent writes to one key: merge or last writer wins? | Vector clocks and siblings versus LWW |
| Range scans or only point lookups? | Hash partitioning versus range partitioning |

## 3. Requirements

**Functional**
- \`put(key, value, context)\`, \`get(key)\` returning value(s) and a context, \`delete(key)\`.
- Per-request consistency choice (R and W, or a consistency level).

**Non-functional**
- **Scale horizontally** to tens or hundreds of nodes, adding and removing nodes without downtime.
- **High availability**: writes and reads succeed while some nodes or a network segment are down.
- **Durability**: N replicas on different machines (and racks or zones).
- **Low latency**: single-digit milliseconds at p99 for small values.
- Small values: DynamoDB, for comparison, limits an item to 400 KB including attribute names (AWS developer guide).

## 4. Capacity Estimate

Assumptions: 10 TB of user data, replication factor 3, 2 TB of usable disk per node, keep disks at most 50% full (room for compaction, which temporarily needs extra space, and for growth), 100,000 client writes a second.

| Quantity | Arithmetic | Result |
| :--- | :--- | :--- |
| Stored bytes with replicas | 10 TB x 3 | 30 TB |
| Nodes at full disks | 30 TB / 2 TB | 15 |
| Nodes at 50% headroom | 30 TB / (2 TB x 0.5) | **30** |
| Replica writes per second | 100,000 x 3 | 300,000 |
| Writes per node | 300,000 / 30 | **10,000 a second** |

10,000 small sequential writes a second per node is comfortable for an LSM storage engine on SSDs, which is one reason Dynamo-style stores use one. Disk space and compaction headroom, not CPU, usually decide the node count.

## 5. CAP: Pick the Shape First

📌 **Interview term: AP versus CP store** — during a network partition a store must either refuse some requests to stay consistent (CP) or keep accepting them and reconcile later (AP). Background in [What is the CAP theorem?](/interview-question/what-is-the-cap-theorem).

- **AP, leaderless (Dynamo, Cassandra, Riak):** any replica accepts writes, consistency is tunable per request, conflicts are possible and must be resolved. Best for always-writable workloads such as shopping carts, sessions and user activity. This page designs this one.
- **CP, leader per shard (etcd, TiKV, CockroachDB ranges):** each shard has a leader elected by Raft, writes are linearizable, a shard is unavailable for writes while it has no majority ([What is leader election in distributed systems?](/interview-question/what-is-leader-election-in-distributed-systems)). Best for metadata, locks and anything needing compare-and-set.

## 6. API and Data Model

- \`get(key)\` returns \`[(value, context)]\`: one or more values (siblings) and an opaque **context** that encodes their version.
- \`put(key, value, context)\`: the context says which version(s) this write supersedes.
- \`delete(key, context)\`: a write of a **tombstone**.
- Internally a value is stored as \`(key, value, vector_clock)\`; keys are hashed to a 32 or 64-bit token for placement.

## 7. High-Level Architecture

<svg class="iq-diagram" width="100%" viewBox="0 0 660 280" role="img" aria-label="A client sends a request to any node, which acts as coordinator, hashes the key on the ring and forwards to N replica nodes; nodes gossip membership and run anti-entropy">
  <defs>
    <marker id="sd18q5-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path class="d-arrow" d="M0,0 L7,3 L0,6 Z"/>
    </marker>
  </defs>
  <rect class="d-box" x="30" y="30" width="160" height="80" rx="10"/>
  <text class="d-text" x="110" y="65" text-anchor="middle">Client</text>
  <text class="d-sub" x="110" y="88" text-anchor="middle">smart or via LB</text>
  <rect class="d-box-accent" x="250" y="30" width="160" height="80" rx="10"/>
  <text class="d-text" x="330" y="65" text-anchor="middle">Coordinator</text>
  <text class="d-sub" x="330" y="88" text-anchor="middle">any node</text>
  <rect class="d-box" x="470" y="30" width="160" height="80" rx="10"/>
  <text class="d-text" x="550" y="65" text-anchor="middle">Replica 1</text>
  <text class="d-sub" x="550" y="88" text-anchor="middle">home node</text>
  <rect class="d-box" x="470" y="170" width="160" height="80" rx="10"/>
  <text class="d-text" x="550" y="205" text-anchor="middle">Replica 2</text>
  <text class="d-sub" x="550" y="228" text-anchor="middle">next on ring</text>
  <rect class="d-box" x="250" y="170" width="160" height="80" rx="10"/>
  <text class="d-text" x="330" y="205" text-anchor="middle">Replica 3</text>
  <text class="d-sub" x="330" y="228" text-anchor="middle">next on ring</text>
  <rect class="d-box-muted" x="30" y="170" width="160" height="80" rx="10"/>
  <text class="d-text" x="110" y="205" text-anchor="middle">Gossip</text>
  <text class="d-sub" x="110" y="228" text-anchor="middle">membership, health</text>
  <path class="d-edge" d="M 190 70 L 242 70" marker-end="url(#sd18q5-arrow)"/>
  <path class="d-edge-accent" d="M 410 70 L 462 70" marker-end="url(#sd18q5-arrow)"/>
  <path class="d-edge-accent" d="M 330 110 L 550 162" marker-end="url(#sd18q5-arrow)"/>
  <path class="d-edge-accent" d="M 330 110 L 330 162" marker-end="url(#sd18q5-arrow)"/>
  <path class="d-edge-dashed" d="M 190 210 L 242 210" marker-end="url(#sd18q5-arrow)"/>
</svg>

Any node can coordinate a request: it hashes the key, finds the **preference list** and sends the operation to the N home replicas, answering the client after W acknowledgements (writes) or R responses (reads). Every node runs the same code: there is no master. Membership and health spread by gossip (dashed arrow).

📌 **Interview term: preference list** — for a key, the list of distinct physical nodes found by walking clockwise around the hash ring from the key position. The first N are the home replicas; the rest are spares for sloppy quorum.

📌 **Interview term: virtual nodes** — each physical node owns several positions (tokens) on the ring so load spreads evenly and a failed node's ranges are taken over by many nodes, not one ([What is consistent hashing with virtual nodes and when do you need it?](/interview-question/what-is-consistent-hashing-with-virtual-nodes-and-when-do-you-need-it)).

The cluster example uses 5 nodes with 4 virtual nodes each and N = 3:

~~~text
== 1. Ring placement (5 nodes x 4 virtual nodes, N=3) ==
  cart:7 -> home D,B,C  spares A,E
  user:42 -> home A,E,D  spares B,C
  session:9 -> home E,D,B  spares C,A
~~~

📌 **Interview term: gossip protocol** — each node periodically exchanges membership and heartbeat state with a few random peers, so information spreads to the whole cluster in a logarithmic number of rounds without a central registry. Failure detection on top of it (phi accrual and timeouts) is covered in [How do distributed systems detect node failures?](/interview-question/how-do-distributed-systems-detect-node-failures).

## 8. Deep Dive 1: Writes and Reads When Nodes Fail

📌 **Interview term: N, R, W** — N copies of each key; a write succeeds after W replicas acknowledge, a read waits for R replicas. With \`R + W > N\`, every read quorum overlaps every write quorum, so a read sees the latest acknowledged write (as long as the quorums are made of home replicas). N = 3, R = 2, W = 2 is a common configuration in Dynamo-style stores.

📌 **Interview term: sloppy quorum and hinted handoff** — if a home replica is down, the coordinator writes to the next healthy node on the preference list instead, with a **hint** naming the intended owner. When the owner recovers, the hint is handed back. This keeps writes available during failures at the cost of the overlap guarantee.

~~~text
== 2. Normal write, then one home replica fails ==
  put cart:7=book {D:1} via D -> D, B, C OK
  node B is down
  get cart:7 R=2 from D,C: book {D:1}
  put cart:7=book+pen {D:2} via D -> D, A(hint for B), C OK
  node C is down too: put cart:7=book+pen+cup {D:3} via D -> D, A(hint for B), E(hint for C) OK
  strict quorum would need 2 of the home replicas, only 1 is up; sloppy quorum used hints
~~~

With B down, the write of \`book+pen\` still reaches 3 nodes: D, C and spare A holding a hint for B. With C also down, a **strict quorum** could not reach 2 home replicas and would fail; the sloppy quorum succeeds with 2 hints. This is the availability Dynamo-style stores are built for, and the reason they are not linearizable.

📌 **Interview term: read repair** — when a read sees replicas with different versions, the coordinator returns the newest and writes it back to the stale replicas.

~~~text
== 3. Both nodes return: a stale read, read repair, hinted handoff ==
  get cart:7 R=1 from B: book {D:1}   <- stale
  get cart:7 R=2 from B,D: book+pen+cup {D:3}  (read repair -> B)
  hint A -> B {D:2} already current
  hint A -> B {D:3} already current
  hint E -> C {D:3} delivered
  get cart:7 R=3 from D,B,C: book+pen+cup {D:3}
~~~

Right after B returns, an **R = 1 read served by B alone returns the stale \`book\`**: B missed two writes. An R = 2 read from B and D sees both versions, returns the newer one by vector clock, and repairs B. Hinted handoff then delivers A's hints (already current on B) and E's hint to C. After that all three replicas agree.

📌 **Interview term: anti-entropy with Merkle trees** — hints and read repair only fix keys that were written during an outage or read later. A background process compares replicas by exchanging **Merkle trees** (hash trees over key ranges): matching root hashes mean the range is identical, and only mismatching subtrees are walked and synced, so two replicas holding millions of keys compare with a few hashes. The Dynamo paper uses Merkle trees this way; Cassandra runs them as \`nodetool repair\`.

## 9. Deep Dive 2: Concurrent Writes and Vector Clocks

📌 **Interview term: vector clock** — a version made of one counter per node that coordinated writes for the key, for example \`{C:1, D:3}\`. Version A **descends** from B if every counter in A is at least the one in B. If neither descends from the other, the writes were **concurrent** and both are kept as **siblings**.

~~~text
== 4. Two clients write concurrently from the same version ==
  put cart:7=book+pen+cup+hat {D:4} via D -> D, B, C OK
  put cart:7=book+pen+cup+scarf {C:1,D:3} via C -> D, B, C OK
  get cart:7 R=2 from D,B: book+pen+cup+hat {D:4} | book+pen+cup+scarf {C:1,D:3}
  client merges siblings: put cart:7=book+cup+hat+pen+scarf {C:1,D:5} via D -> D, B, C OK
  get cart:7 R=2 from D,B: book+cup+hat+pen+scarf {C:1,D:5}
  last-write-wins would keep only the later write (book+pen+cup+scarf) and silently lose the hat
~~~

Two clients both read \`{D:3}\` and write different additions through different coordinators: \`{D:4}\` (hat, via D) and \`{C:1, D:3}\` (scarf, via C). Neither descends from the other, so the store keeps both. The next read returns both siblings; the client merges them (here a union of cart items, which is exactly the Dynamo shopping-cart example) and writes back with the merged context, producing \`{C:1, D:5}\`, which supersedes both.

The comparison at the heart of it:

~~~js
function cmp(a, b) { // "before", "after", "equal" or "concurrent"
  let lt = false, gt = false;
  for (let i = 0; i < a.length; i++) { if (a[i] < b[i]) lt = true; if (a[i] > b[i]) gt = true; }
  return lt && gt ? "concurrent" : lt ? "before" : gt ? "after" : "equal";
}
~~~

📌 **Interview term: last-write-wins (LWW)** — resolve conflicts by keeping the value with the highest timestamp. Simple and used by Cassandra per column, but it **silently drops** one of two concurrent writes, here the hat, and depends on synchronised clocks. Choose it only when losing a concurrent update is acceptable or impossible (immutable or single-writer keys). For mergeable data types, CRDTs (counters, sets) merge automatically instead of returning siblings.

## 10. Deep Dive 3: The Storage Engine on Each Node

📌 **Interview term: LSM tree (log-structured merge tree)** — a write goes to a **write-ahead log** for durability and an in-memory sorted **memtable**; when the memtable is full it is flushed as an immutable sorted file, an **SSTable**. Reads check the memtable, then SSTables from newest to oldest. Writes are always sequential, which is why LSM trees suit write-heavy stores.

📌 **Interview term: tombstone** — a delete is a write of a special marker, because older SSTables still contain the key; the marker hides it until compaction removes both.

📌 **Interview term: compaction** — merging SSTables into fewer, larger ones, keeping only the newest version of each key and dropping shadowed versions and expired tombstones. It bounds read cost and disk use at the price of rewriting data (write amplification).

The storage example flushes every 4 keys:

~~~text
== 1. Writes: 16 puts and 2 deletes, memtable flushes every 4 keys ==
  sst-4: 03=v3 05=X 11=v1 12=v1
  sst-3: 03=v2 07=v2 09=v1 10=v1
  sst-2: 05=v1 06=v1 07=v1 08=v1
  sst-1: 01=v1 02=v1 03=v1 04=v1
  memtable: 09=X 13=v1

== 2. Reads go newest to oldest; Bloom filters skip files ==
  user:09 = (deleted)   [memtable] file reads 0
  user:03 = v3   [sst-4:hit] file reads 1
  user:07 = v2   [sst-4:skip sst-3:hit] file reads 1
  user:01 = v1   [sst-4:skip sst-3:skip sst-2:skip sst-1:hit] file reads 1
  user:05 = (deleted)   [sst-4:hit] file reads 1
  40 lookups of absent keys: 160 file reads without Bloom filters, 1 with them (each one a false positive)
~~~

\`user:01\` lives in the oldest file, but three newer files are skipped by their **Bloom filters**, so only one file is actually read. Across 40 lookups of keys that do not exist, the filters cut file reads from 160 to 1 (that 1 is a false positive, which a Bloom filter allows). \`user:05\` is found as a tombstone in the newest file, which hides the older \`v1\` in sst-2.

~~~text
== 3. Compaction merges every SSTable, newest version wins, tombstones dropped ==
  4 files with 16 rows -> 1 file with 11 live rows (space amplification was 1.45x)
  user:03 = v3   [sst-c1:hit] file reads 1
  user:05 = (not found)   [sst-c1:skip] file reads 0
  write amplification: 18 user writes -> 18 WAL + 16 flush + 11 compaction = 2.50x
~~~

Compaction turned 4 files with 16 rows into 1 file with 11 live rows: the space spent on stale versions and tombstones (1.45x) is gone. The cost: 18 user writes caused 45 row writes (log, flush and compaction), a **write amplification of 2.50x** in this tiny run; real LSM engines with many levels see much more, which is why compaction strategy (size-tiered versus leveled) is a real tuning decision.

**Tombstones in a replicated store.** A tombstone must not be dropped until every replica has seen it, or a replica that missed the delete will "resurrect" the key during anti-entropy. Cassandra therefore keeps tombstones for a configurable grace period (\`gc_grace_seconds\`) and expects repair to run within it.

## 11. What Breaks First at 10x

- **Hot keys.** One celebrity key hammers its 3 replicas; add a cache in front, or split the key (\`key#0..key#9\`) and merge on read.
- **Large partitions.** A key that grows without bound (a wide row) makes compaction and repair slow; cap value size and model unbounded lists differently.
- **Repair cost.** Full Merkle repairs across petabytes take days; run incremental repairs continuously.
- **Rebalancing.** Adding nodes streams data for every range they take over; throttle streaming so it does not starve client traffic. Virtual nodes spread that load.
- **Tombstone build-up.** Delete-heavy workloads (queues stored as rows) make reads scan thousands of tombstones; do not use the store as a queue.
- **Multi-region.** Quorums across regions add a WAN round trip; use per-region quorums (\`LOCAL_QUORUM\` in Cassandra) and asynchronous cross-region replication.

## 12. Verified: Running the Code

The example **"Dynamo-style cluster: ring placement, sloppy quorum with hinted handoff, read repair and vector-clock siblings"** was run with \`node main.js\` (Node 22.22), \`python3.12 main.py\`, \`go run main.go\` (Go 1.24) and \`javac Main.java && java Main\` (Java 21). All four print exactly this:

~~~text
== 1. Ring placement (5 nodes x 4 virtual nodes, N=3) ==
  cart:7 -> home D,B,C  spares A,E
  user:42 -> home A,E,D  spares B,C
  session:9 -> home E,D,B  spares C,A

== 2. Normal write, then one home replica fails ==
  put cart:7=book {D:1} via D -> D, B, C OK
  node B is down
  get cart:7 R=2 from D,C: book {D:1}
  put cart:7=book+pen {D:2} via D -> D, A(hint for B), C OK
  node C is down too: put cart:7=book+pen+cup {D:3} via D -> D, A(hint for B), E(hint for C) OK
  strict quorum would need 2 of the home replicas, only 1 is up; sloppy quorum used hints

== 3. Both nodes return: a stale read, read repair, hinted handoff ==
  get cart:7 R=1 from B: book {D:1}   <- stale
  get cart:7 R=2 from B,D: book+pen+cup {D:3}  (read repair -> B)
  hint A -> B {D:2} already current
  hint A -> B {D:3} already current
  hint E -> C {D:3} delivered
  get cart:7 R=3 from D,B,C: book+pen+cup {D:3}

== 4. Two clients write concurrently from the same version ==
  put cart:7=book+pen+cup+hat {D:4} via D -> D, B, C OK
  put cart:7=book+pen+cup+scarf {C:1,D:3} via C -> D, B, C OK
  get cart:7 R=2 from D,B: book+pen+cup+hat {D:4} | book+pen+cup+scarf {C:1,D:3}
  client merges siblings: put cart:7=book+cup+hat+pen+scarf {C:1,D:5} via D -> D, B, C OK
  get cart:7 R=2 from D,B: book+cup+hat+pen+scarf {C:1,D:5}
  last-write-wins would keep only the later write (book+pen+cup+scarf) and silently lose the hat
~~~

The example **"LSM storage engine: memtable flushes, SSTables with Bloom filters, tombstones, compaction and write amplification"** was run with \`node main.js\` and \`python3.12 main.py\`. Both print exactly this:

~~~text
== 1. Writes: 16 puts and 2 deletes, memtable flushes every 4 keys ==
  sst-4: 03=v3 05=X 11=v1 12=v1
  sst-3: 03=v2 07=v2 09=v1 10=v1
  sst-2: 05=v1 06=v1 07=v1 08=v1
  sst-1: 01=v1 02=v1 03=v1 04=v1
  memtable: 09=X 13=v1

== 2. Reads go newest to oldest; Bloom filters skip files ==
  user:09 = (deleted)   [memtable] file reads 0
  user:03 = v3   [sst-4:hit] file reads 1
  user:07 = v2   [sst-4:skip sst-3:hit] file reads 1
  user:01 = v1   [sst-4:skip sst-3:skip sst-2:skip sst-1:hit] file reads 1
  user:05 = (deleted)   [sst-4:hit] file reads 1
  40 lookups of absent keys: 160 file reads without Bloom filters, 1 with them (each one a false positive)

== 3. Compaction merges every SSTable, newest version wins, tombstones dropped ==
  4 files with 16 rows -> 1 file with 11 live rows (space amplification was 1.45x)
  user:03 = v3   [sst-c1:hit] file reads 1
  user:05 = (not found)   [sst-c1:skip] file reads 0
  write amplification: 18 user writes -> 18 WAL + 16 flush + 11 compaction = 2.50x
~~~

What the simulations stand for and leave out: the cluster is five in-memory maps with an \`up\` flag per node; there is no network, timeout, gossip or Merkle tree, the coordinator contacts replicas sequentially, and hints are kept in one global list rather than on each spare node. Ring tokens come from FNV-1a hashes of \`node#index\`. The LSM example has no real files or log; the Bloom filters use 64 bits and 3 hash functions (FNV-1a with a murmur3 finalizer, double hashing) per SSTable, and compaction is a single full merge instead of size-tiered or leveled.

## Edge Cases Worth Knowing

- **Sibling explosion.** Many concurrent writers without reading first create many siblings; clients must always write with the context from their last read.
- **Clock growth.** A vector clock gains an entry for every coordinator; Dynamo truncates old entries, which can occasionally create false conflicts.
- **Delete then concurrent write.** A tombstone and a concurrent put become siblings; the application decides whether the delete wins.
- **Sloppy quorum reads.** With hinted writes, an R = 2 read of home replicas can miss the latest write until the hint is delivered; \`R + W > N\` only holds for strict quorums.
- **Node replacement.** A replaced node with the same tokens must be rebuilt from replicas before serving reads.

## Common Pitfalls

- **Claiming strong consistency from \`R + W > N\` with sloppy quorums.** Hinted writes break the overlap.
- **Using last-write-wins for mergeable data.** It silently loses concurrent updates, as the hat showed.
- **Forgetting anti-entropy.** Without repair, keys that are never read stay inconsistent forever.
- **Dropping tombstones too early.** Deleted data comes back from a replica that missed the delete.
- **One token per node.** Uneven load and slow rebalancing; use virtual nodes.
- **Large values in the store.** Put blobs in object storage and keep a pointer.

## How to Answer in an Interview

<div style="background:#1c140a;border:2px solid #f9a825;border-radius:10px;padding:20px 24px;margin:20px 0;">

<div style="color:#ffca28;font-size:1.15em;font-weight:bold;margin-bottom:16px;">🎤 How to Answer in an Interview</div>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:0 0 10px 0;">The 60-Second Answer</div>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">1. Shape:</strong> <span style="color:#f0e2c8;">I would build an <strong style="color:#ffca28;">AP, leaderless, Dynamo-style</strong> store with tunable consistency, and say up front that a CP design with Raft per shard is the choice when you need compare-and-set. For 10 TB, replication 3, 2 TB disks at 50% fill, that is <strong style="color:#ffca28;">30 nodes</strong>, about 10,000 replica writes a second each at 100,000 client writes.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">2. Placement:</strong> <span style="color:#f0e2c8;">Keys are placed by <strong style="color:#ffca28;">consistent hashing with virtual nodes</strong>; the <strong style="color:#ffca28;">preference list</strong> is the next distinct nodes clockwise, first N = 3 are home replicas. Any node coordinates; membership spreads by <strong style="color:#ffca28;">gossip</strong> with a failure detector.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">3. Quorums and failures:</strong> <span style="color:#f0e2c8;">Writes wait for W = 2, reads for R = 2, so <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">R + W &gt; N</code>. When a home replica is down, a <strong style="color:#ffca28;">sloppy quorum</strong> writes to a spare with a <strong style="color:#ffca28;">hint</strong>. In my run, with two of three home replicas down, a strict quorum would fail but the sloppy write succeeded with two hints. <strong style="color:#ffca28;">Read repair</strong>, hinted handoff and <strong style="color:#ffca28;">Merkle-tree anti-entropy</strong> bring replicas back in line.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">4. Conflicts:</strong> <span style="color:#f0e2c8;">Versions are <strong style="color:#ffca28;">vector clocks</strong>. Concurrent writes become <strong style="color:#ffca28;">siblings</strong> returned to the client, which merges and writes back: in my run, <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{D:4}</code> and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{C:1,D:3}</code> were siblings and the merge produced <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">{C:1,D:5}</code>. Last-write-wins would have silently lost the hat.</span>
</blockquote>

<blockquote style="border-left:3px solid #f9a825;margin:10px 0;padding:2px 0 2px 14px;color:#f0e2c8;">
<strong style="color:#ffca28;">5. Storage engine:</strong> <span style="color:#f0e2c8;">Each node is an <strong style="color:#ffca28;">LSM tree</strong>: WAL plus memtable, flushed to SSTables with <strong style="color:#ffca28;">Bloom filters</strong>, deletes as <strong style="color:#ffca28;">tombstones</strong>, and compaction. In my run the Bloom filters cut 160 file reads to 1 for absent keys, and compaction turned 16 rows into 11 at a write amplification of 2.50x.</span>
</blockquote>

<div style="color:#e0a83e;font-size:0.8em;font-weight:bold;text-transform:uppercase;letter-spacing:0.6px;margin:22px 0 10px 0;border-top:1px solid #4a3a1a;padding-top:16px;">Follow-Up Questions to Expect</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:12px 0 0 0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do you add a node without downtime?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">It takes ownership of some token ranges; existing replicas stream those ranges to it while still serving, and the ring update spreads by gossip. With virtual nodes the data comes from many nodes at once, so no single node is overloaded.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Can this store give strongly consistent reads?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">With strict quorums and <code style="background:#332310;color:#ffca28;padding:1px 5px;border-radius:3px;">R + W &gt; N</code>, a read sees the latest acknowledged write, but it is still not linearizable under concurrent writes and sloppy quorums break even that. For compare-and-set, use a Raft-per-shard design or a lightweight Paxos path for those keys.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">Why an LSM tree rather than a B-tree?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">LSM trees turn random writes into sequential ones, which suits write-heavy replicated stores. The costs are read amplification, mitigated by Bloom filters and compaction, and write amplification from compaction.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do replicas find differences after a long outage?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0 0 14px 0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">Merkle trees per token range: compare root hashes, descend only into differing subtrees, and stream just those keys. It runs in the background and is throttled.</span>
</div>

<div style="background:#3d2810;border-radius:8px 8px 0 0;padding:10px 16px;margin:0;">
<span style="color:#ff8a65;font-weight:bold;">❓ Q:</span> <span style="color:#ffe0b2;">How do deletes work if replicas can be offline?</span>
</div>
<div style="background:#151a15;border:1px solid #f9a825;border-top:none;border-radius:0 0 8px 8px;padding:10px 16px;margin:0;">
<span style="color:#66bb6a;font-weight:bold;">💡 A:</span> <span style="color:#d8d8d8;">A delete writes a tombstone with a vector clock. It is kept for a grace period longer than the maximum time between repairs, so every replica sees it before compaction removes it; otherwise the key could come back.</span>
</div>

</div>

## Quick Glossary

| Term | Meaning |
| :--- | :--- |
| AP versus CP store | Stay available and reconcile, or refuse requests to stay consistent |
| Preference list | Distinct nodes clockwise from the key; first N hold replicas |
| Virtual nodes | Several ring positions per physical node |
| Gossip protocol | Peer-to-peer spread of membership and health |
| N, R, W | Replicas, read quorum, write quorum |
| Sloppy quorum and hinted handoff | Write to a spare with a hint when an owner is down |
| Read repair | Fix stale replicas found during a read |
| Anti-entropy with Merkle trees | Background comparison of replicas by hash trees |
| Vector clock | Per-node counters that detect concurrent versions |
| Last-write-wins (LWW) | Keep the highest timestamp, drop the rest |
| LSM tree | WAL plus memtable flushed to immutable sorted files |
| Tombstone | Delete marker that hides older versions |
| Compaction | Merging SSTables and dropping shadowed data |

**Conclusion:** A distributed key-value store is four ideas working together. Consistent hashing with virtual nodes decides where each key lives; replication to N nodes with R and W quorums sets the consistency each request gets; sloppy quorums, hinted handoff, read repair and Merkle-tree anti-entropy keep it writable through failures and make replicas converge afterwards; and vector clocks detect concurrent writes so they can be merged instead of silently lost. Under all of it, each node runs an LSM storage engine whose Bloom filters and compaction keep reads cheap while writes stay sequential. Choose this AP shape for always-writable data, and a Raft-per-shard CP store when you need compare-and-set.`,
    examples: [
      {
        label: `Dynamo-style cluster: ring placement, sloppy quorum with hinted handoff, read repair and vector-clock siblings`,
        variants: [
          { tech: "node", code: `// A Dynamo-style key-value store in miniature: a hash ring with virtual nodes, N=3 replicas,
// W=2 / R=2 quorums, sloppy quorum with hinted handoff, read repair and vector clocks.
const NODES = ["A", "B", "C", "D", "E"], VNODES = 4, N = 3, W = 2, R = 2;
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; };
const ring = [];
for (const n of NODES) for (let v = 0; v < VNODES; v++) ring.push([fnv(n + "#" + v), n]);
ring.sort((a, b) => a[0] - b[0]);
function prefList(key) { // every physical node in clockwise order from the key; first N are home replicas
  const h = fnv(key);
  let i = ring.findIndex((t) => t[0] >= h);
  if (i < 0) i = 0;
  const out = [];
  for (let k = 0; out.length < NODES.length; k++) { const n = ring[(i + k) % ring.length][1]; if (!out.includes(n)) out.push(n); }
  return out;
}
const store = {}, up = {}, hints = [];
for (const n of NODES) { store[n] = new Map(); up[n] = true; }
const clockStr = (c) => "{" + c.map((x, i) => (x ? NODES[i] + ":" + x : "")).filter(Boolean).join(",") + "}";
function cmp(a, b) { // "before", "after", "equal" or "concurrent"
  let lt = false, gt = false;
  for (let i = 0; i < a.length; i++) { if (a[i] < b[i]) lt = true; if (a[i] > b[i]) gt = true; }
  return lt && gt ? "concurrent" : lt ? "before" : gt ? "after" : "equal";
}
function keep(versions, v) { // add v unless an existing version dominates it; drop versions v dominates
  if (versions.some((x) => ["after", "equal"].includes(cmp(x.clock, v.clock)))) return versions;
  return versions.filter((x) => cmp(x.clock, v.clock) !== "before").concat([v]).sort((x, y) => (x.value < y.value ? -1 : 1));
}
function write(node, key, v) { store[node].set(key, keep(store[node].get(key) || [], v)); }
function put(key, value, ctx, coord) {
  const pref = prefList(key);
  coord = coord || pref.find((n) => up[n]);
  const clock = ctx.slice();
  clock[NODES.indexOf(coord)]++;
  const v = { value, clock };
  const acks = [], spare = pref.slice(N).filter((n) => up[n]);
  for (const home of pref.slice(0, N)) {
    if (up[home]) { write(home, key, v); acks.push(home); }
    else if (spare.length) { const sub = spare.shift(); hints.push({ sub, home, key, v }); acks.push(sub + "(hint for " + home + ")"); }
  }
  return "put " + key + "=" + value + " " + clockStr(clock) + " via " + coord + " -> " + acks.join(", ") + (acks.length >= W ? " OK" : " FAILED");
}
function get(key, r, from) {
  const replicas = from || prefList(key).slice(0, N).filter((n) => up[n]).slice(0, r);
  let merged = [];
  for (const n of replicas) for (const v of store[n].get(key) || []) merged = keep(merged, v);
  const repaired = [];
  for (const n of replicas) {
    const mine = (store[n].get(key) || []).map((v) => clockStr(v.clock)).join();
    if (mine !== merged.map((v) => clockStr(v.clock)).join()) { for (const v of merged) write(n, key, v); repaired.push(n); }
  }
  return { merged, text: "get " + key + " R=" + r + " from " + replicas.join(",") + ": " + merged.map((v) => v.value + " " + clockStr(v.clock)).join(" | ") + (repaired.length ? "  (read repair -> " + repaired.join(",") + ")" : "") };
}

console.log("== 1. Ring placement (5 nodes x 4 virtual nodes, N=3) ==");
for (const k of ["cart:7", "user:42", "session:9"]) console.log("  " + k + " -> home " + prefList(k).slice(0, N).join(",") + "  spares " + prefList(k).slice(N).join(","));
const KEY = "cart:7", [p0, p1, p2] = prefList(KEY);
const zero = NODES.map(() => 0);

console.log("\\n== 2. Normal write, then one home replica fails ==");
console.log("  " + put(KEY, "book", zero));
up[p1] = false;
console.log("  node " + p1 + " is down");
let r = get(KEY, R);
console.log("  " + r.text);
console.log("  " + put(KEY, "book+pen", r.merged[0].clock));
up[p2] = false;
console.log("  node " + p2 + " is down too: " + put(KEY, "book+pen+cup", get(KEY, 1).merged[0].clock));
console.log("  strict quorum would need " + W + " of the home replicas, only 1 is up; sloppy quorum used hints");

console.log("\\n== 3. Both nodes return: a stale read, read repair, hinted handoff ==");
up[p1] = true; up[p2] = true;
console.log("  " + get(KEY, 1, [p1]).text + "   <- stale");
console.log("  " + get(KEY, R, [p1, p0]).text);
for (const h of hints.splice(0)) {
  const before = (store[h.home].get(h.key) || []).length && cmp(store[h.home].get(h.key)[0].clock, h.v.clock) !== "before";
  write(h.home, h.key, h.v);
  console.log("  hint " + h.sub + " -> " + h.home + " " + clockStr(h.v.clock) + (before ? " already current" : " delivered"));
}
console.log("  " + get(KEY, N).text);

console.log("\\n== 4. Two clients write concurrently from the same version ==");
const ctx = get(KEY, R).merged[0].clock;
console.log("  " + put(KEY, "book+pen+cup+hat", ctx, p0));
const later = "book+pen+cup+scarf";
console.log("  " + put(KEY, later, ctx, p2));
r = get(KEY, R);
console.log("  " + r.text);
const union = [...new Set(r.merged.flatMap((v) => v.value.split("+")))].sort().join("+");
const mergedCtx = r.merged.reduce((c, v) => c.map((x, i) => Math.max(x, v.clock[i])), zero);
console.log("  client merges siblings: " + put(KEY, union, mergedCtx));
console.log("  " + get(KEY, R).text);
console.log("  last-write-wins would keep only the later write (" + later + ") and silently lose the hat");` },
          { tech: "python", code: `# A Dynamo-style key-value store in miniature: a hash ring with virtual nodes, N=3 replicas,
# W=2 / R=2 quorums, sloppy quorum with hinted handoff, read repair and vector clocks.
NODES, VNODES, N, W, R = ["A", "B", "C", "D", "E"], 4, 3, 2, 2


def fnv(s):
    h = 0x811C9DC5
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


ring = sorted((fnv(n + "#" + str(v)), n) for n in NODES for v in range(VNODES))


def pref_list(key):  # every physical node in clockwise order from the key; first N are home replicas
    h = fnv(key)
    i = next((j for j, t in enumerate(ring) if t[0] >= h), 0)
    out, k = [], 0
    while len(out) < len(NODES):
        n = ring[(i + k) % len(ring)][1]
        if n not in out:
            out.append(n)
        k += 1
    return out


store = {n: {} for n in NODES}
up = {n: True for n in NODES}
hints = []


def clock_str(c):
    return "{" + ",".join(NODES[i] + ":" + str(x) for i, x in enumerate(c) if x) + "}"


def cmp(a, b):  # "before", "after", "equal" or "concurrent"
    lt = any(x < y for x, y in zip(a, b))
    gt = any(x > y for x, y in zip(a, b))
    return "concurrent" if lt and gt else "before" if lt else "after" if gt else "equal"


def keep(versions, v):  # add v unless an existing version dominates it; drop versions v dominates
    if any(cmp(x["clock"], v["clock"]) in ("after", "equal") for x in versions):
        return versions
    return sorted([x for x in versions if cmp(x["clock"], v["clock"]) != "before"] + [v], key=lambda x: x["value"])


def write(node, key, v):
    store[node][key] = keep(store[node].get(key, []), v)


def put(key, value, ctx, coord=None):
    pref = pref_list(key)
    coord = coord or next(n for n in pref if up[n])
    clock = list(ctx)
    clock[NODES.index(coord)] += 1
    v = {"value": value, "clock": clock}
    acks, spare = [], [n for n in pref[N:] if up[n]]
    for home in pref[:N]:
        if up[home]:
            write(home, key, v)
            acks.append(home)
        elif spare:
            sub = spare.pop(0)
            hints.append({"sub": sub, "home": home, "key": key, "v": v})
            acks.append(sub + "(hint for " + home + ")")
    return "put " + key + "=" + value + " " + clock_str(clock) + " via " + coord + " -> " + ", ".join(acks) + (" OK" if len(acks) >= W else " FAILED")


def get(key, r, frm=None):
    replicas = frm or [n for n in pref_list(key)[:N] if up[n]][:r]
    merged = []
    for n in replicas:
        for v in store[n].get(key, []):
            merged = keep(merged, v)
    repaired = []
    for n in replicas:
        mine = ",".join(clock_str(v["clock"]) for v in store[n].get(key, []))
        if mine != ",".join(clock_str(v["clock"]) for v in merged):
            for v in merged:
                write(n, key, v)
            repaired.append(n)
    text = "get " + key + " R=" + str(r) + " from " + ",".join(replicas) + ": " + " | ".join(v["value"] + " " + clock_str(v["clock"]) for v in merged)
    if repaired:
        text += "  (read repair -> " + ",".join(repaired) + ")"
    return merged, text


print("== 1. Ring placement (5 nodes x 4 virtual nodes, N=3) ==")
for k in ("cart:7", "user:42", "session:9"):
    print("  " + k + " -> home " + ",".join(pref_list(k)[:N]) + "  spares " + ",".join(pref_list(k)[N:]))
KEY = "cart:7"
p0, p1, p2 = pref_list(KEY)[:3]
zero = [0] * len(NODES)

print("\\n== 2. Normal write, then one home replica fails ==")
print("  " + put(KEY, "book", zero))
up[p1] = False
print("  node " + p1 + " is down")
merged, text = get(KEY, R)
print("  " + text)
print("  " + put(KEY, "book+pen", merged[0]["clock"]))
up[p2] = False
ctx1 = get(KEY, 1)[0][0]["clock"]
print("  node " + p2 + " is down too: " + put(KEY, "book+pen+cup", ctx1))
print("  strict quorum would need " + str(W) + " of the home replicas, only 1 is up; sloppy quorum used hints")

print("\\n== 3. Both nodes return: a stale read, read repair, hinted handoff ==")
up[p1] = up[p2] = True
print("  " + get(KEY, 1, [p1])[1] + "   <- stale")
print("  " + get(KEY, R, [p1, p0])[1])
for h in hints:
    cur = store[h["home"]].get(h["key"], [])
    before = bool(cur) and cmp(cur[0]["clock"], h["v"]["clock"]) != "before"
    write(h["home"], h["key"], h["v"])
    print("  hint " + h["sub"] + " -> " + h["home"] + " " + clock_str(h["v"]["clock"]) + (" already current" if before else " delivered"))
hints.clear()
print("  " + get(KEY, N)[1])

print("\\n== 4. Two clients write concurrently from the same version ==")
ctx = get(KEY, R)[0][0]["clock"]
print("  " + put(KEY, "book+pen+cup+hat", ctx, p0))
later = "book+pen+cup+scarf"
print("  " + put(KEY, later, ctx, p2))
merged, text = get(KEY, R)
print("  " + text)
union = "+".join(sorted(set(item for v in merged for item in v["value"].split("+"))))
merged_ctx = [max(v["clock"][i] for v in merged) for i in range(len(NODES))]
print("  client merges siblings: " + put(KEY, union, merged_ctx))
print("  " + get(KEY, R)[1])
print("  last-write-wins would keep only the later write (" + later + ") and silently lose the hat")` },
          { tech: "go", code: `// A Dynamo-style key-value store in miniature: a hash ring with virtual nodes, N=3 replicas,
// W=2 / R=2 quorums, sloppy quorum with hinted handoff, read repair and vector clocks.
package main

import (
	"fmt"
	"sort"
	"strings"
)

var NODES = []string{"A", "B", "C", "D", "E"}

const VNODES, N, W, R = 4, 3, 2, 2

type token struct {
	h    uint32
	node string
}
type version struct {
	value string
	clock []int
}
type hint struct {
	sub, home, key string
	v              version
}

func fnv(s string) uint32 {
	h := uint32(0x811c9dc5)
	for i := 0; i < len(s); i++ {
		h ^= uint32(s[i])
		h *= 0x01000193
	}
	return h
}

var ring []token
var store = map[string]map[string][]version{}
var up = map[string]bool{}
var hints []hint

func prefList(key string) []string { // every physical node clockwise from the key; first N are home replicas
	h := fnv(key)
	i := sort.Search(len(ring), func(j int) bool { return ring[j].h >= h }) % len(ring)
	out := []string{}
	for k := 0; len(out) < len(NODES); k++ {
		n := ring[(i+k)%len(ring)].node
		if !contains(out, n) {
			out = append(out, n)
		}
	}
	return out
}
func contains(xs []string, x string) bool {
	for _, y := range xs {
		if y == x {
			return true
		}
	}
	return false
}
func indexOf(x string) int {
	for i, y := range NODES {
		if y == x {
			return i
		}
	}
	return -1
}
func clockStr(c []int) string {
	parts := []string{}
	for i, x := range c {
		if x != 0 {
			parts = append(parts, fmt.Sprintf("%s:%d", NODES[i], x))
		}
	}
	return "{" + strings.Join(parts, ",") + "}"
}
func cmp(a, b []int) string { // "before", "after", "equal" or "concurrent"
	lt, gt := false, false
	for i := range a {
		if a[i] < b[i] {
			lt = true
		}
		if a[i] > b[i] {
			gt = true
		}
	}
	if lt && gt {
		return "concurrent"
	} else if lt {
		return "before"
	} else if gt {
		return "after"
	}
	return "equal"
}
func keep(versions []version, v version) []version { // add v unless dominated; drop versions v dominates
	for _, x := range versions {
		if c := cmp(x.clock, v.clock); c == "after" || c == "equal" {
			return versions
		}
	}
	out := []version{}
	for _, x := range versions {
		if cmp(x.clock, v.clock) != "before" {
			out = append(out, x)
		}
	}
	out = append(out, v)
	sort.SliceStable(out, func(i, j int) bool { return out[i].value < out[j].value })
	return out
}
func write(node, key string, v version) { store[node][key] = keep(store[node][key], v) }
func put(key, value string, ctx []int, coord string) string {
	pref := prefList(key)
	if coord == "" {
		for _, n := range pref {
			if up[n] {
				coord = n
				break
			}
		}
	}
	clock := append([]int{}, ctx...)
	clock[indexOf(coord)]++
	v := version{value, clock}
	acks, spare := []string{}, []string{}
	for _, n := range pref[N:] {
		if up[n] {
			spare = append(spare, n)
		}
	}
	for _, home := range pref[:N] {
		if up[home] {
			write(home, key, v)
			acks = append(acks, home)
		} else if len(spare) > 0 {
			sub := spare[0]
			spare = spare[1:]
			hints = append(hints, hint{sub, home, key, v})
			acks = append(acks, sub+"(hint for "+home+")")
		}
	}
	status := " FAILED"
	if len(acks) >= W {
		status = " OK"
	}
	return "put " + key + "=" + value + " " + clockStr(clock) + " via " + coord + " -> " + strings.Join(acks, ", ") + status
}
func clocks(vs []version) string {
	parts := []string{}
	for _, v := range vs {
		parts = append(parts, clockStr(v.clock))
	}
	return strings.Join(parts, ",")
}
func get(key string, r int, from []string) ([]version, string) {
	replicas := from
	if replicas == nil {
		for _, n := range prefList(key)[:N] {
			if up[n] && len(replicas) < r {
				replicas = append(replicas, n)
			}
		}
	}
	merged := []version{}
	for _, n := range replicas {
		for _, v := range store[n][key] {
			merged = keep(merged, v)
		}
	}
	repaired := []string{}
	for _, n := range replicas {
		if clocks(store[n][key]) != clocks(merged) {
			for _, v := range merged {
				write(n, key, v)
			}
			repaired = append(repaired, n)
		}
	}
	vals := []string{}
	for _, v := range merged {
		vals = append(vals, v.value+" "+clockStr(v.clock))
	}
	text := fmt.Sprintf("get %s R=%d from %s: %s", key, r, strings.Join(replicas, ","), strings.Join(vals, " | "))
	if len(repaired) > 0 {
		text += "  (read repair -> " + strings.Join(repaired, ",") + ")"
	}
	return merged, text
}

func main() {
	for _, n := range NODES {
		for v := 0; v < VNODES; v++ {
			ring = append(ring, token{fnv(fmt.Sprintf("%s#%d", n, v)), n})
		}
		store[n] = map[string][]version{}
		up[n] = true
	}
	sort.Slice(ring, func(i, j int) bool { return ring[i].h < ring[j].h })

	fmt.Println("== 1. Ring placement (5 nodes x 4 virtual nodes, N=3) ==")
	for _, k := range []string{"cart:7", "user:42", "session:9"} {
		p := prefList(k)
		fmt.Println("  " + k + " -> home " + strings.Join(p[:N], ",") + "  spares " + strings.Join(p[N:], ","))
	}
	KEY := "cart:7"
	p := prefList(KEY)
	p0, p1, p2 := p[0], p[1], p[2]
	zero := make([]int, len(NODES))

	fmt.Println("\\n== 2. Normal write, then one home replica fails ==")
	fmt.Println("  " + put(KEY, "book", zero, ""))
	up[p1] = false
	fmt.Println("  node " + p1 + " is down")
	merged, text := get(KEY, R, nil)
	fmt.Println("  " + text)
	fmt.Println("  " + put(KEY, "book+pen", merged[0].clock, ""))
	up[p2] = false
	m1, _ := get(KEY, 1, nil)
	fmt.Println("  node " + p2 + " is down too: " + put(KEY, "book+pen+cup", m1[0].clock, ""))
	fmt.Printf("  strict quorum would need %d of the home replicas, only 1 is up; sloppy quorum used hints\\n", W)

	fmt.Println("\\n== 3. Both nodes return: a stale read, read repair, hinted handoff ==")
	up[p1], up[p2] = true, true
	_, text = get(KEY, 1, []string{p1})
	fmt.Println("  " + text + "   <- stale")
	_, text = get(KEY, R, []string{p1, p0})
	fmt.Println("  " + text)
	for _, h := range hints {
		cur := store[h.home][h.key]
		before := len(cur) > 0 && cmp(cur[0].clock, h.v.clock) != "before"
		write(h.home, h.key, h.v)
		state := " delivered"
		if before {
			state = " already current"
		}
		fmt.Println("  hint " + h.sub + " -> " + h.home + " " + clockStr(h.v.clock) + state)
	}
	hints = nil
	_, text = get(KEY, N, nil)
	fmt.Println("  " + text)

	fmt.Println("\\n== 4. Two clients write concurrently from the same version ==")
	mc, _ := get(KEY, R, nil)
	ctx := mc[0].clock
	fmt.Println("  " + put(KEY, "book+pen+cup+hat", ctx, p0))
	later := "book+pen+cup+scarf"
	fmt.Println("  " + put(KEY, later, ctx, p2))
	merged, text = get(KEY, R, nil)
	fmt.Println("  " + text)
	set := map[string]bool{}
	for _, v := range merged {
		for _, it := range strings.Split(v.value, "+") {
			set[it] = true
		}
	}
	items := []string{}
	for it := range set {
		items = append(items, it)
	}
	sort.Strings(items)
	mctx := make([]int, len(NODES))
	for _, v := range merged {
		for i, x := range v.clock {
			if x > mctx[i] {
				mctx[i] = x
			}
		}
	}
	fmt.Println("  client merges siblings: " + put(KEY, strings.Join(items, "+"), mctx, ""))
	_, text = get(KEY, R, nil)
	fmt.Println("  " + text)
	fmt.Println("  last-write-wins would keep only the later write (" + later + ") and silently lose the hat")
}` },
          { tech: "java", code: `// A Dynamo-style key-value store in miniature: a hash ring with virtual nodes, N=3 replicas,
// W=2 / R=2 quorums, sloppy quorum with hinted handoff, read repair and vector clocks.
import java.util.*;
import java.util.stream.*;

public class Main {
    static final List<String> NODES = List.of("A", "B", "C", "D", "E");
    static final int VNODES = 4, N = 3, W = 2, R = 2;
    record Version(String value, int[] clock) {}
    record Hint(String sub, String home, String key, Version v) {}
    static final List<long[]> ring = new ArrayList<>(); // {token, node index}
    static final Map<String, Map<String, List<Version>>> store = new HashMap<>();
    static final Map<String, Boolean> up = new HashMap<>();
    static final List<Hint> hints = new ArrayList<>();

    static long fnv(String s) {
        int h = 0x811c9dc5;
        for (int i = 0; i < s.length(); i++) { h ^= s.charAt(i); h *= 0x01000193; }
        return Integer.toUnsignedLong(h);
    }
    static List<String> prefList(String key) { // every physical node clockwise from the key; first N are home replicas
        long h = fnv(key);
        int i = 0;
        while (i < ring.size() && ring.get(i)[0] < h) i++;
        if (i == ring.size()) i = 0;
        List<String> out = new ArrayList<>();
        for (int k = 0; out.size() < NODES.size(); k++) {
            String n = NODES.get((int) ring.get((i + k) % ring.size())[1]);
            if (!out.contains(n)) out.add(n);
        }
        return out;
    }
    static String clockStr(int[] c) {
        List<String> p = new ArrayList<>();
        for (int i = 0; i < c.length; i++) if (c[i] != 0) p.add(NODES.get(i) + ":" + c[i]);
        return "{" + String.join(",", p) + "}";
    }
    static String cmp(int[] a, int[] b) { // "before", "after", "equal" or "concurrent"
        boolean lt = false, gt = false;
        for (int i = 0; i < a.length; i++) { if (a[i] < b[i]) lt = true; if (a[i] > b[i]) gt = true; }
        return lt && gt ? "concurrent" : lt ? "before" : gt ? "after" : "equal";
    }
    static List<Version> keep(List<Version> versions, Version v) { // add v unless dominated; drop versions v dominates
        for (Version x : versions) { String c = cmp(x.clock(), v.clock()); if (c.equals("after") || c.equals("equal")) return versions; }
        List<Version> out = new ArrayList<>();
        for (Version x : versions) if (!cmp(x.clock(), v.clock()).equals("before")) out.add(x);
        out.add(v);
        out.sort(Comparator.comparing(Version::value));
        return out;
    }
    static List<Version> at(String node, String key) { return store.get(node).getOrDefault(key, List.of()); }
    static void write(String node, String key, Version v) { store.get(node).put(key, keep(at(node, key), v)); }
    static String put(String key, String value, int[] ctx, String coord) {
        List<String> pref = prefList(key);
        if (coord == null) coord = pref.stream().filter(up::get).findFirst().get();
        int[] clock = ctx.clone();
        clock[NODES.indexOf(coord)]++;
        Version v = new Version(value, clock);
        List<String> acks = new ArrayList<>();
        Deque<String> spare = pref.subList(N, pref.size()).stream().filter(up::get).collect(Collectors.toCollection(ArrayDeque::new));
        for (String home : pref.subList(0, N)) {
            if (up.get(home)) { write(home, key, v); acks.add(home); }
            else if (!spare.isEmpty()) { String sub = spare.poll(); hints.add(new Hint(sub, home, key, v)); acks.add(sub + "(hint for " + home + ")"); }
        }
        return "put " + key + "=" + value + " " + clockStr(clock) + " via " + coord + " -> " + String.join(", ", acks) + (acks.size() >= W ? " OK" : " FAILED");
    }
    static String clocks(List<Version> vs) { return vs.stream().map(v -> clockStr(v.clock())).collect(Collectors.joining(",")); }
    static String text;
    static List<Version> get(String key, int r, List<String> from) {
        List<String> replicas = from != null ? from : prefList(key).subList(0, N).stream().filter(up::get).limit(r).toList();
        List<Version> merged = new ArrayList<>();
        for (String n : replicas) for (Version v : at(n, key)) merged = keep(merged, v);
        List<String> repaired = new ArrayList<>();
        for (String n : replicas) if (!clocks(at(n, key)).equals(clocks(merged))) { for (Version v : merged) write(n, key, v); repaired.add(n); }
        text = "get " + key + " R=" + r + " from " + String.join(",", replicas) + ": "
            + merged.stream().map(v -> v.value() + " " + clockStr(v.clock())).collect(Collectors.joining(" | "))
            + (repaired.isEmpty() ? "" : "  (read repair -> " + String.join(",", repaired) + ")");
        return merged;
    }

    public static void main(String[] args) {
        for (int n = 0; n < NODES.size(); n++) {
            for (int v = 0; v < VNODES; v++) ring.add(new long[]{fnv(NODES.get(n) + "#" + v), n});
            store.put(NODES.get(n), new HashMap<>());
            up.put(NODES.get(n), true);
        }
        ring.sort(Comparator.comparingLong(t -> t[0]));
        System.out.println("== 1. Ring placement (5 nodes x 4 virtual nodes, N=3) ==");
        for (String k : List.of("cart:7", "user:42", "session:9")) {
            List<String> p = prefList(k);
            System.out.println("  " + k + " -> home " + String.join(",", p.subList(0, N)) + "  spares " + String.join(",", p.subList(N, p.size())));
        }
        String KEY = "cart:7";
        List<String> p = prefList(KEY);
        String p0 = p.get(0), p1 = p.get(1), p2 = p.get(2);
        int[] zero = new int[NODES.size()];

        System.out.println("\\n== 2. Normal write, then one home replica fails ==");
        System.out.println("  " + put(KEY, "book", zero, null));
        up.put(p1, false);
        System.out.println("  node " + p1 + " is down");
        List<Version> merged = get(KEY, R, null);
        System.out.println("  " + text);
        System.out.println("  " + put(KEY, "book+pen", merged.get(0).clock(), null));
        up.put(p2, false);
        int[] ctx1 = get(KEY, 1, null).get(0).clock();
        System.out.println("  node " + p2 + " is down too: " + put(KEY, "book+pen+cup", ctx1, null));
        System.out.println("  strict quorum would need " + W + " of the home replicas, only 1 is up; sloppy quorum used hints");

        System.out.println("\\n== 3. Both nodes return: a stale read, read repair, hinted handoff ==");
        up.put(p1, true); up.put(p2, true);
        get(KEY, 1, List.of(p1));
        System.out.println("  " + text + "   <- stale");
        get(KEY, R, List.of(p1, p0));
        System.out.println("  " + text);
        for (Hint h : hints) {
            List<Version> cur = at(h.home(), h.key());
            boolean before = !cur.isEmpty() && !cmp(cur.get(0).clock(), h.v().clock()).equals("before");
            write(h.home(), h.key(), h.v());
            System.out.println("  hint " + h.sub() + " -> " + h.home() + " " + clockStr(h.v().clock()) + (before ? " already current" : " delivered"));
        }
        hints.clear();
        get(KEY, N, null);
        System.out.println("  " + text);

        System.out.println("\\n== 4. Two clients write concurrently from the same version ==");
        int[] ctx = get(KEY, R, null).get(0).clock();
        System.out.println("  " + put(KEY, "book+pen+cup+hat", ctx, p0));
        String later = "book+pen+cup+scarf";
        System.out.println("  " + put(KEY, later, ctx, p2));
        merged = get(KEY, R, null);
        System.out.println("  " + text);
        String union = merged.stream().flatMap(v -> Arrays.stream(v.value().split("\\\\+"))).distinct().sorted().collect(Collectors.joining("+"));
        int[] mctx = new int[NODES.size()];
        for (Version v : merged) for (int i = 0; i < mctx.length; i++) mctx[i] = Math.max(mctx[i], v.clock()[i]);
        System.out.println("  client merges siblings: " + put(KEY, union, mctx, null));
        get(KEY, R, null);
        System.out.println("  " + text);
        System.out.println("  last-write-wins would keep only the later write (" + later + ") and silently lose the hat");
    }
}` },
        ],
      },
      {
        label: `LSM storage engine: memtable flushes, SSTables with Bloom filters, tombstones, compaction and write amplification`,
        variants: [
          { tech: "node", code: `// One storage node as an LSM tree: a write-ahead log and memtable, flushes to immutable sorted
// SSTables with Bloom filters, tombstones for deletes, and a compaction that merges the files.
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h; };
const BITS = 64, K = 3, MEMTABLE_LIMIT = 4, TOMB = "<tombstone>";
const mix = (h) => { h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0; h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0; return (h ^ (h >>> 16)) >>> 0; }; // murmur3 finalizer
const bitsFor = (key) => { const h1 = mix(fnv(key)), h2 = (mix(fnv(key + "#")) | 1) >>> 0; const out = []; for (let i = 0; i < K; i++) out.push((h1 + i * h2) % BITS); return out; };
let memtable = new Map(), sstables = [], walWrites = 0, flushWrites = 0, compactWrites = 0, userWrites = 0, deletes = 0;

function flush() {
  const rows = [...memtable.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const bloom = new Array(BITS).fill(false);
  for (const [k] of rows) for (const b of bitsFor(k)) bloom[b] = true;
  sstables.unshift({ id: "sst-" + (sstables.length + 1), rows, bloom }); // newest first
  flushWrites += rows.length;
  memtable = new Map();
}
function put(k, v) { walWrites++; userWrites++; if (v === TOMB) deletes++; memtable.set(k, v); if (memtable.size >= MEMTABLE_LIMIT) flush(); }
function get(k, useBloom) {
  const trace = [];
  if (memtable.has(k)) return [memtable.get(k), "memtable", 0];
  let reads = 0;
  for (const t of sstables) {
    if (useBloom && !bitsFor(k).every((b) => t.bloom[b])) { trace.push(t.id + ":skip"); continue; }
    reads++;
    let lo = 0, hi = t.rows.length - 1; // binary search inside the sorted file
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (t.rows[mid][0] === k) { trace.push(t.id + ":hit"); return [t.rows[mid][1], trace.join(" "), reads]; }
      if (t.rows[mid][0] < k) lo = mid + 1; else hi = mid - 1;
    }
    trace.push(t.id + ":miss");
  }
  return [null, trace.join(" "), reads];
}
const show = (k) => { const [v, trace, reads] = get(k, true); return k + " = " + (v === null ? "(not found)" : v === TOMB ? "(deleted)" : v) + "   [" + trace + "] file reads " + reads; };

for (let i = 1; i <= 10; i++) put("user:" + String(i).padStart(2, "0"), "v1");
put("user:03", "v2"); put("user:07", "v2"); put("user:03", "v3"); put("user:11", "v1");
put("user:05", TOMB); put("user:12", "v1"); put("user:09", TOMB); put("user:13", "v1");
console.log("== 1. Writes: " + (userWrites - deletes) + " puts and " + deletes + " deletes, memtable flushes every " + MEMTABLE_LIMIT + " keys ==");
for (const t of sstables) console.log("  " + t.id + ": " + t.rows.map((r) => r[0].slice(5) + "=" + (r[1] === TOMB ? "X" : r[1])).join(" "));
console.log("  memtable: " + [...memtable.entries()].map((r) => r[0].slice(5) + "=" + (r[1] === TOMB ? "X" : r[1])).join(" "));

console.log("\\n== 2. Reads go newest to oldest; Bloom filters skip files ==");
for (const k of ["user:09", "user:03", "user:07", "user:01", "user:05"]) console.log("  " + show(k));
let withBloom = 0, without = 0;
for (let i = 100; i < 140; i++) {
  const k = "user:" + i;
  withBloom += get(k, true)[2];
  without += get(k, false)[2];
}
console.log("  40 lookups of absent keys: " + without + " file reads without Bloom filters, " + withBloom + " with them (each one a false positive)");

console.log("\\n== 3. Compaction merges every SSTable, newest version wins, tombstones dropped ==");
const before = sstables.reduce((n, t) => n + t.rows.length, 0);
const merged = new Map();
for (const t of [...sstables].reverse()) for (const [k, v] of t.rows) merged.set(k, v); // oldest first, newer overwrite
const live = [...merged.entries()].filter((r) => r[1] !== TOMB).sort((a, b) => (a[0] < b[0] ? -1 : 1));
compactWrites += live.length;
const filesBefore = sstables.length;
const bloom = new Array(BITS).fill(false);
for (const [k] of live) for (const b of bitsFor(k)) bloom[b] = true;
sstables = [{ id: "sst-c1", rows: live, bloom }];
console.log("  " + filesBefore + " files with " + before + " rows -> 1 file with " + live.length + " live rows (space amplification was " + (before / live.length).toFixed(2) + "x)");
console.log("  " + show("user:03"));
console.log("  " + show("user:05"));
console.log("  write amplification: " + userWrites + " user writes -> " + walWrites + " WAL + " + flushWrites + " flush + " + compactWrites + " compaction = " + ((walWrites + flushWrites + compactWrites) / userWrites).toFixed(2) + "x");` },
          { tech: "python", code: `# One storage node as an LSM tree: a write-ahead log and memtable, flushes to immutable sorted
# SSTables with Bloom filters, tombstones for deletes, and a compaction that merges the files.
M32 = 0xFFFFFFFF


def fnv(s):
    h = 0x811C9DC5
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x01000193) & M32
    return h


def mix(h):  # murmur3 finalizer
    h = ((h ^ (h >> 16)) * 0x85EBCA6B) & M32
    h = ((h ^ (h >> 13)) * 0xC2B2AE35) & M32
    return h ^ (h >> 16)


BITS, K, MEMTABLE_LIMIT, TOMB = 64, 3, 4, "<tombstone>"


def bits_for(key):
    h1, h2 = mix(fnv(key)), mix(fnv(key + "#")) | 1
    return [(h1 + i * h2) % BITS for i in range(K)]


memtable, sstables = {}, []
stats = {"wal": 0, "flush": 0, "compact": 0, "user": 0, "deletes": 0}


def make_bloom(rows):
    bloom = [False] * BITS
    for k, _ in rows:
        for b in bits_for(k):
            bloom[b] = True
    return bloom


def flush():
    global memtable
    rows = sorted(memtable.items())
    sstables.insert(0, {"id": "sst-" + str(len(sstables) + 1), "rows": rows, "bloom": make_bloom(rows)})  # newest first
    stats["flush"] += len(rows)
    memtable = {}


def put(k, v):
    stats["wal"] += 1
    stats["user"] += 1
    if v == TOMB:
        stats["deletes"] += 1
    memtable[k] = v
    if len(memtable) >= MEMTABLE_LIMIT:
        flush()


def get(k, use_bloom):
    trace = []
    if k in memtable:
        return memtable[k], "memtable", 0
    reads = 0
    for t in sstables:
        if use_bloom and not all(t["bloom"][b] for b in bits_for(k)):
            trace.append(t["id"] + ":skip")
            continue
        reads += 1
        lo, hi = 0, len(t["rows"]) - 1  # binary search inside the sorted file
        while lo <= hi:
            mid = (lo + hi) >> 1
            if t["rows"][mid][0] == k:
                trace.append(t["id"] + ":hit")
                return t["rows"][mid][1], " ".join(trace), reads
            if t["rows"][mid][0] < k:
                lo = mid + 1
            else:
                hi = mid - 1
        trace.append(t["id"] + ":miss")
    return None, " ".join(trace), reads


def show(k):
    v, trace, reads = get(k, True)
    shown = "(not found)" if v is None else "(deleted)" if v == TOMB else v
    return k + " = " + shown + "   [" + trace + "] file reads " + str(reads)


def short(rows):
    return " ".join(k[5:] + "=" + ("X" if v == TOMB else v) for k, v in rows)


for i in range(1, 11):
    put("user:" + str(i).zfill(2), "v1")
for k, v in (("user:03", "v2"), ("user:07", "v2"), ("user:03", "v3"), ("user:11", "v1"),
             ("user:05", TOMB), ("user:12", "v1"), ("user:09", TOMB), ("user:13", "v1")):
    put(k, v)
print("== 1. Writes: " + str(stats["user"] - stats["deletes"]) + " puts and " + str(stats["deletes"]) + " deletes, memtable flushes every " + str(MEMTABLE_LIMIT) + " keys ==")
for t in sstables:
    print("  " + t["id"] + ": " + short(t["rows"]))
print("  memtable: " + short(memtable.items()))

print("\\n== 2. Reads go newest to oldest; Bloom filters skip files ==")
for k in ("user:09", "user:03", "user:07", "user:01", "user:05"):
    print("  " + show(k))
with_bloom = without = 0
for i in range(100, 140):
    k = "user:" + str(i)
    with_bloom += get(k, True)[2]
    without += get(k, False)[2]
print("  40 lookups of absent keys: " + str(without) + " file reads without Bloom filters, " + str(with_bloom) + " with them (each one a false positive)")

print("\\n== 3. Compaction merges every SSTable, newest version wins, tombstones dropped ==")
before = sum(len(t["rows"]) for t in sstables)
merged = {}
for t in reversed(sstables):  # oldest first, newer overwrite
    for k, v in t["rows"]:
        merged[k] = v
live = sorted((k, v) for k, v in merged.items() if v != TOMB)
stats["compact"] += len(live)
files_before = len(sstables)
sstables = [{"id": "sst-c1", "rows": live, "bloom": make_bloom(live)}]
print(f"  {files_before} files with {before} rows -> 1 file with {len(live)} live rows (space amplification was {before / len(live):.2f}x)")
print("  " + show("user:03"))
print("  " + show("user:05"))
total = stats["wal"] + stats["flush"] + stats["compact"]
print(f"  write amplification: {stats['user']} user writes -> {stats['wal']} WAL + {stats['flush']} flush + {stats['compact']} compaction = {total / stats['user']:.2f}x")` },
        ],
      },
    ],
  },
];

export default augments;
