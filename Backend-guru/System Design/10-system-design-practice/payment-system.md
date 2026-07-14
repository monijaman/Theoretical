# Design a Payment Processing System
[← Back to index](../readme.md)

## 1. Requirements

**Functional**
- Accept a charge request (amount, currency, payment method) from a merchant/client and process it against a card network or bank.
- Support refunds (full/partial) and voids.
- Safely retry failed/ambiguous requests without double-charging (idempotency).
- Maintain an authoritative, auditable ledger of every money movement.
- Reconcile internal records against external payment network settlement files.
- Support multiple payment methods (card, ACH/bank transfer, wallet) behind one API.

**Non-functional**
- Correctness over latency: never double-charge, never silently lose a charge. Money moved is money that must be accounted for, always.
- Exactly-once *effect* per logical charge (the network call may not be exactly-once, but the financial outcome must be).
- Strong consistency for balance/ledger reads used in decisions (e.g., "has this order been paid?").
- High availability (a payment outage is direct revenue loss and merchant trust loss), but availability must never be bought at the cost of correctness — better to reject a charge than risk a duplicate.
- Auditability: every state transition must be traceable, immutable, and reconstructable for compliance and disputes.
- PCI-DSS compliance: raw card numbers must never touch application code/logs/most of the infrastructure.

**Assumptions**
- 10M transactions/day, average transaction $50, processed across multiple card networks and a couple of banking rails.
- External payment networks (Visa/Mastercard/ACH) are the ultimate source of truth for whether money actually moved — our system must faithfully mirror that, not invent its own truth.
- Multi-day settlement lag is normal (a "successful" charge today settles funds to the merchant days later) — this is a core reconciliation problem, not an edge case.

## 2. Capacity Estimation

**Traffic**
- 10M transactions/day ≈ 10,000,000 / 86,400 ≈ **~116 TPS average**; payments traffic is bursty around business hours and shopping events (Black Friday-class events can be 10-20x normal) → design for **~2,000-2,500 TPS peak**.
- Each logical charge involves multiple downstream calls (fraud check, card network authorization, ledger writes, notification) — real backend request volume is 5-10x the front-door TPS.

**Storage — ledger**
- Double-entry ledger: every transaction creates at least 2 ledger rows (debit + credit). At ~150 bytes/row (account id, amount, currency, txn id, timestamp, entry type) → 10M txns/day × 2 entries × 150 bytes ≈ **3 GB/day**, ~1.1 TB/year. Small in absolute terms, but ledger rows are **never deleted or updated** (append-only, immutable) — retention is effectively indefinite for audit/regulatory reasons (often 7+ years), so plan for ~8 TB retained just for the ledger over a typical audit-retention window, trivially cheap relative to the correctness it buys.

**Idempotency key storage**
- Each request carries a client-generated idempotency key; store `(key → result)` for a rolling window (e.g., 24-48 hours is typical — long enough to cover realistic client retry storms, e.g. a mobile client retrying after being backgrounded). 10M keys/day × ~300 bytes ≈ 3 GB/day, easily held in a fast KV store (Redis or DynamoDB) with TTL-based expiry.

**PCI scope reduction via tokenization**
- Card PANs (16 digits) are never stored in our systems post-tokenization; a PCI-compliant vault (in-house isolated service or a third party like a card-network tokenization service) exchanges the PAN for an opaque token once, at first use. Everything downstream — our app servers, database, logs — only ever sees the token, shrinking PCI audit scope to a tiny, isolated component instead of the entire platform.

## 3. High-Level Architecture

```
┌──────────┐     ┌───────────────┐     ┌────────────────────┐
│  Merchant │────▶│  API Gateway   │────▶│  Payment API Service│
│  / Client │     │ (auth, TLS)    │     │ (idempotency check)  │
└──────────┘     └───────────────┘     └──────────┬───────────┘
                                                    │
                          ┌─────────────────────────┼─────────────────────────┐
                          ▼                         ▼                         ▼
                 ┌────────────────┐       ┌──────────────────┐      ┌─────────────────┐
                 │ Idempotency Store│      │  Fraud/Risk Engine │      │  Tokenization Vault│
                 │ (Redis/DynamoDB) │      │  (sync scoring)    │      │  (PCI-isolated)     │
                 └────────────────┘       └──────────────────┘      └─────────────────┘
                                                    │
                                          ┌─────────▼──────────┐
                                          │  Saga Orchestrator   │  (charge = multi-step workflow)
                                          └─────────┬───────────┘
                        ┌───────────────────────────┼───────────────────────────┐
                        ▼                            ▼                          ▼
              ┌──────────────────┐         ┌──────────────────┐      ┌──────────────────┐
              │ Card Network       │        │  Double-Entry      │      │  Notification /    │
              │ Adapter (auth/cap.)│        │  Ledger (source of  │      │  Webhook Dispatch  │
              └──────────────────┘         │  truth, append-only)│      └──────────────────┘
                                            └─────────┬──────────┘
                                                       │ async
                                             ┌─────────▼──────────┐
                                             │  Reconciliation Job  │──▶ compares vs. network
                                             │  (nightly settlement)│    settlement files
                                             └─────────────────────┘
```

**Walkthrough**
1. **Request arrives** with a client-supplied idempotency key. The Payment API Service first checks the Idempotency Store: if this key was already processed, return the *stored result* immediately without reprocessing — this is the primary double-charge defense (see 6.1).
2. **Fraud scoring** runs synchronously (rules + ML model) against the request; high-risk transactions are declined or routed to manual review before any money moves.
3. **Tokenization**: if a raw card number is present (first-time use), it's exchanged for a token in the PCI-isolated vault; all subsequent internal handling uses only the token.
4. **Saga orchestration**: a charge is a multi-step distributed workflow — reserve/authorize with the card network, write the ledger entries, capture funds, notify the merchant. Each step is compensable; if a later step fails, prior steps are rolled back via compensating actions (see 6.2).
5. **Ledger write**: once the card network confirms authorization, an atomic double-entry ledger transaction is recorded — this is the durable source of truth for "did money move," independent of any downstream notification success/failure.
6. **Async reconciliation**: nightly (or more frequent) jobs pull settlement files from each card network/bank and diff them against our ledger, flagging discrepancies for manual/automated resolution (see 6.4).

## 4. API Design

```
POST /api/v1/charges
Headers: Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Request:
{
  "amount": 5000,                 // in minor units (cents) — never floats
  "currency": "USD",
  "payment_method_token": "tok_9f8a...",
  "merchant_id": "m_4471",
  "description": "Order #88213"
}
Response: 201
{
  "charge_id": "ch_7A2bK9",
  "status": "succeeded",          // succeeded | pending | failed | requires_action
  "amount": 5000,
  "currency": "USD",
  "created_at": "2026-07-14T10:02:11Z"
}

POST /api/v1/charges/{charge_id}/refunds
Request: { "amount": 2000 }       // partial refund, optional (omit = full)
Response: 201
{ "refund_id": "re_88fA", "status": "succeeded", "amount": 2000 }

GET /api/v1/charges/{charge_id}
Response: 200
{ "charge_id": "ch_7A2bK9", "status": "succeeded", "ledger_entries": [ ... ] }

POST /internal/webhooks/network-callback   // async card network status updates
```

Every mutating endpoint requires `Idempotency-Key`; requests without one are rejected outright for anything that moves money — this is a hard API contract, not an optional header.

## 5. Data Model & Storage Choice

```
ledger_entries (append-only, immutable)
  entry_id       UUID PK
  transaction_id UUID, indexed        -- groups the debit+credit pair
  account_id     VARCHAR              -- e.g. "merchant:4471", "network:visa_clearing"
  amount         BIGINT (minor units)
  direction      ENUM('debit','credit')
  currency       CHAR(3)
  created_at     TIMESTAMP
  -- never UPDATE or DELETE a row; corrections are new offsetting entries

charges
  charge_id       UUID PK
  idempotency_key VARCHAR, unique indexed
  status          ENUM('pending','succeeded','failed','requires_action')
  amount, currency, payment_method_token, merchant_id
  network_ref     VARCHAR    -- card network's own transaction id, for reconciliation

idempotency_keys (fast KV, TTL ~48h)
  key → { charge_id, response_body, status_code }
```

The ledger is a textbook case for a strongly-consistent relational store (Postgres/MySQL, or a distributed SQL engine like Spanner/CockroachDB at very high scale): every transaction must satisfy ACID guarantees — a debit and its matching credit either both commit or neither does, and balance queries must never see a partial write. This is the opposite profile from the URL-shortener's pure key-value workload; see [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md) — money movement is precisely the domain relational transactions were built for, and NoSQL's relaxed consistency models are actively dangerous here unless the specific store offers strong per-partition transactions. The idempotency-key lookup, by contrast, is a pure high-throughput KV access pattern and belongs in Redis/DynamoDB, not the ledger database.

## 6. Deep Dive

### 6.1 Idempotency keys — the core double-charge defense

Clients (or their SDKs) generate a unique idempotency key per logical charge attempt and send it on every retry of that same attempt. The server, on first sight of a key, does the real work and atomically stores `(key → result)` *in the same transaction* as the side effect (or via a conditional write that fails if the key already exists) — never "check then act" as two separate steps, which races under concurrent retries. On any subsequent request with the same key, the stored result is replayed verbatim without touching the card network again. This converts an inherently non-idempotent operation (charging a card) into an idempotent API, which is what makes safe client-side [retry with backoff](../01-scaling-traffic/retry-exponential-backoff.md) possible at all — without this, a client that times out waiting for a response has no safe way to know whether to retry.

The hard edge case: what if the server crashes *after* calling the card network but *before* persisting the result? On retry, the naive path would double-charge. The fix is to make the card-network call itself idempotent too — pass the same idempotency key (or a derived request id) through to the network/acquirer, which most modern processors support natively, so even a duplicate outbound call is deduplicated at the network's edge.

### 6.2 Saga pattern for the multi-step charge workflow

A single logical "charge" is really: (1) fraud check, (2) authorize with card network, (3) write ledger entries, (4) capture, (5) notify merchant. These can't be one local ACID transaction because step 2 is a call to an external system. This is the canonical saga use case: each step has a **compensating action** (e.g., if the ledger write fails after authorization succeeded, issue a *void/reversal* to the card network) so the overall workflow can be rolled back to a consistent state on partial failure, rather than leaving money "authorized" with no corresponding internal record. An orchestrator (rather than pure choreography via events) is preferable here because payment workflows need centralized visibility and deterministic retry/compensation ordering for audit purposes — see [distributed-transactions](../02-data-storage/distributed-transactions.md) for the general pattern and its alternatives (2PC is generally avoided here; it doesn't compose with an external, non-cooperating card network).

### 6.3 PCI compliance and tokenization

Storing, transmitting, or even logging raw card numbers puts the *entire* system in PCI-DSS scope — a massive, expensive compliance burden. Tokenization solves this by having a single, hardened, isolated vault component be the only thing that ever touches a raw PAN: on first use it exchanges the PAN for an opaque, format-preserving token, and every other service (API layer, database, application logs, analytics) only ever handles that token. The token is meaningless outside the vault, so a breach anywhere else in the stack exposes nothing usable. This is why real payment platforms (Stripe, Braintree) offer client-side tokenization (card details go directly from the client's browser/app to the processor, never touching the merchant's own servers at all) — it shrinks PCI scope to nearly zero for the merchant.

### 6.4 Reconciliation against external networks

Card networks and banks are the actual ground truth for whether money moved — our ledger is our *belief* about that truth, and beliefs can drift from reality (a network timeout where we recorded "failed" but the network actually processed it, or vice versa). Reconciliation jobs periodically (nightly, or more frequently for high-value flows) pull settlement/clearing files from each network and diff every entry against our ledger by `network_ref`. Mismatches fall into a few buckets: **ours-but-not-theirs** (we think we charged, they don't show it — investigate before trusting our own state), **theirs-but-not-ours** (money moved that we have no record of — a serious gap requiring immediate alerting), and **amount mismatches** (partial captures, currency conversion rounding). This process is what actually catches the rare cases idempotency and sagas don't fully prevent (network-side bugs, split-brain during an outage), and it's why "exactly-once" in payments is really "idempotent processing plus rigorous after-the-fact reconciliation," not a magic distributed-systems guarantee.

## 7. Bottlenecks & Scaling

- **10x transaction volume**: the ledger database becomes the bottleneck first (every charge is a synchronous, strongly-consistent write). Shard the ledger by account/merchant ID (most queries are scoped to one account) and move to a distributed SQL engine (Spanner/CockroachCB) if a single-primary Postgres can no longer keep up with write throughput — see [database-sharding](../02-data-storage/database-sharding.md).
- **Fraud engine latency under peak load**: synchronous ML scoring adds latency to every charge; scale the fraud service horizontally and pre-compute cacheable risk signals (device/IP reputation) asynchronously ahead of the request.
- **Idempotency store hot keys**: a merchant retry-storming the same key at very high rate could hot-spot one Redis node; mitigate with client library enforced backoff and per-key request coalescing.
- **Reconciliation at scale**: diffing tens of millions of ledger rows against network files nightly becomes a big batch job; move to a streaming reconciliation model (consume network webhooks/reports incrementally throughout the day) rather than one giant nightly batch.
- **Card network outage/latency spike**: circuit-break to a degraded mode that queues authorizations for retry rather than blocking checkout entirely, with clear "payment pending" UX — see [circuit-breaker-pattern](../01-scaling-traffic/circuit-breaker-pattern.md).

## 8. Trade-offs & Alternatives

- **Orchestrated saga vs. 2PC**: chose an orchestrated saga with compensating actions over two-phase commit, because the card network is an external party that cannot participate in our transaction protocol — 2PC requires all participants to support it. The cost is more application-level complexity in defining compensations correctly.
- **Strong consistency for the ledger vs. eventual consistency**: chose strong consistency (single-region primary, or a consensus-based distributed SQL store) for ledger writes, accepting higher write latency and reduced multi-region write availability, because a stale or conflicting balance read is unacceptable in a financial system — see [CAP theorem](../03-consistency-distributed/cap-theorem.md), we sit firmly on the CP side for the ledger specifically (other parts of the system, like notifications, can be AP).
- **Client-generated idempotency keys vs. server-generated**: client-generated keys let the *client* safely retry across network failures (the client knows if it already sent the request; the server doesn't until told), at the cost of trusting clients to generate genuinely unique keys per logical attempt — mitigated by scoping keys to `(merchant_id, key)` so one merchant can't collide with another's.
- **Full PCI scope vs. tokenization/vault isolation**: took on the operational complexity of running (or integrating) an isolated, hardened vault service in exchange for keeping the rest of the platform almost entirely out of PCI audit scope — a large ongoing cost saving.

## Related topics
- [Distributed Transactions](../02-data-storage/distributed-transactions.md)
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
- [Retry & Exponential Backoff](../01-scaling-traffic/retry-exponential-backoff.md)
- [Circuit Breaker Pattern](../01-scaling-traffic/circuit-breaker-pattern.md)
- [CAP Theorem](../03-consistency-distributed/cap-theorem.md)
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
- [Outbox Pattern](../05-messaging-event-driven/outbox-pattern.md)
- [Database Sharding](../02-data-storage/database-sharding.md)
