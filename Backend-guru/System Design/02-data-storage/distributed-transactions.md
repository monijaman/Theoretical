# Distributed Transactions
[← Back to index](../readme.md)

## Why it's asked

A single-database transaction is easy: `BEGIN`, do work, `COMMIT` or `ROLLBACK`, and the engine's WAL/MVCC machinery guarantees atomicity for free. The moment "the order" touches three separate services each with their own database — payments, inventory, shipping — there is no single engine that can atomically commit or roll back all three. Interviewers ask this to see whether you reach for 2PC (textbook-correct, operationally fragile) or the Saga pattern (the thing almost everyone actually runs in production), and whether you understand *why* the industry moved away from the former.

## The problem in one picture

```
Order placed → must atomically:
   1. Payments service:  charge $50
   2. Inventory service: decrement stock by 1
   3. Shipping service:  create shipment record

Each service owns its own database. There is no cross-database BEGIN/COMMIT.
If step 2 fails after step 1 succeeded, the customer is charged with no order.
```

## Two-Phase Commit (2PC)

2PC is the classical protocol for atomically committing a transaction across multiple independent resources, coordinated by a single **transaction coordinator**.

```
Phase 1 — Prepare (vote):
  Coordinator → Participant A: "can you commit?"   A: locks resources, writes to its own log, replies "yes"
  Coordinator → Participant B: "can you commit?"   B: locks resources, writes to its own log, replies "yes"
  Coordinator → Participant C: "can you commit?"   C: replies "no" (e.g. out of stock)

Phase 2 — Commit/Abort (decide):
  If ALL participants voted yes → Coordinator tells everyone: COMMIT
  If ANY participant voted no   → Coordinator tells everyone: ABORT (rollback)
```

```
        Coordinator
       /     |      \
   PREPARE PREPARE PREPARE
      │       │       │
   [vote:Y] [vote:Y] [vote:N]
      │       │       │
      └───────┴───────┘
              │
        one "no" vote → ABORT sent to all
```

Every participant locks its rows/resources for the entire window between voting "yes" and receiving the final decision — this is the core problem.

### The coordinator failure / blocking problem

If the coordinator crashes after collecting all "yes" votes but before sending the final `COMMIT`/`ABORT`, every participant is stuck holding its locks indefinitely — it voted "yes" (meaning it *promised* to commit if told to) and cannot unilaterally decide to abort, because the coordinator might come back and say commit. This is 2PC's fundamental **blocking** flaw: a single coordinator failure can freeze resources across every participant until the coordinator recovers (or a human intervenes), during which those rows are unavailable for other transactions. Distributed database internals (Spanner, CockroachDB) solve this by replacing the single coordinator with a replicated/Paxos-backed one, but a plain 2PC across independently-owned microservices has no such safety net — which is exactly why microservice architectures avoid it.

## Why microservices avoid 2PC in practice

- **Locks held across a network round trip, across service boundaries you don't control** — if the inventory service is slow or down, the payments service's rows stay locked, and lock duration is now dependent on another team's service's uptime.
- **Tight coupling** — 2PC requires every participant to speak the same coordination protocol (XA, typically) and be available simultaneously; this reintroduces exactly the synchronous, availability-coupled dependency chain that microservices are meant to avoid.
- **Poor fit for heterogeneous stores** — XA-style 2PC assumes participants support prepare/commit semantics; a lot of modern infrastructure (most NoSQL stores, message queues, third-party payment APIs) simply doesn't implement it.
- **Doesn't compose with availability goals** — a system built to survive individual service outages can't also have a rule that any one service being briefly unavailable can freeze transactions everywhere else.

## The Saga pattern: the practical alternative

A saga breaks the distributed transaction into a sequence of local transactions, each committed independently and immediately (no cross-service locks held), with a **compensating transaction** defined for each step to semantically undo it if a later step fails.

```
Step 1: Payments.charge($50)         — commits immediately
Step 2: Inventory.decrementStock(1)  — commits immediately
Step 3: Shipping.createShipment()    — FAILS

Compensation runs backward:
  Undo step 2: Inventory.restoreStock(1)
  Undo step 1: Payments.refund($50)
```

Compensations are not a database rollback — they're new, forward-moving transactions that semantically reverse an already-committed effect (a refund, not "undo the charge"), so sagas trade strict atomicity for **eventual** consistency: there's a window where the charge has happened but the order hasn't fully completed, visible to anyone reading state mid-saga.

### Choreography vs orchestration

**Choreography** — no central coordinator; each service listens for events and reacts, publishing its own event when done.

```
Payments (charge) --event: PaymentCompleted--> Inventory (decrement) --event: StockReserved--> Shipping (ship)
                                                     │ fails
                                            --event: StockReservationFailed--> Payments (refund)
```
Pro: fully decoupled, no single point of control. Con: the overall flow is implicit, spread across every service's event handlers — hard to see "what's the current state of order #42" without tracing events across services, and adding a new step means touching multiple services' listeners.

**Orchestration** — a central saga orchestrator explicitly calls each step and explicitly invokes compensations on failure.

```
                    Saga Orchestrator
                 /        │         \
        charge()    decrementStock()   createShipment()
                 \        │         /
              (on failure, orchestrator calls compensations in reverse)
```
Pro: the flow is explicit, in one place, easy to reason about and monitor (a state machine you can inspect: `PAYMENT_DONE`, `INVENTORY_DONE`, `COMPENSATING`). Con: the orchestrator is a new component to build/operate, and a naive implementation can become a de facto coordinator with its own availability requirements (mitigated by making it stateless/re-driveable from persisted saga state, e.g. via an [outbox pattern](../05-messaging-event-driven/outbox-pattern.md)).

Most production systems past a handful of saga steps choose orchestration, because implicit choreographed flows become genuinely hard to debug once there are more than 3-4 services involved.

## TCC: Try-Confirm-Cancel

TCC is a refinement of the saga idea for cases where you need a middle "reserved but not committed" state instead of committing immediately and compensating later.

```
Try:     Inventory reserves 1 unit (marks it held, not yet decremented from sellable stock)
Confirm: Inventory converts the reservation into an actual decrement (all Try steps succeeded)
Cancel:  Inventory releases the reservation (any Try step failed)
```

This avoids the "compensate a fully-committed side effect" awkwardness of plain sagas — a Cancel is often cheaper and less error-prone than an after-the-fact undo (e.g., "release a hold" vs. "issue a refund and hope the customer doesn't notice the temporary charge"). The cost is that every participant must implement three explicit operations instead of one, more code and more failure modes to test, which is why TCC shows up mostly in payments/booking-style domains where "reserve then confirm" is already a natural business concept (seat holds, inventory holds).

## Trade-offs summary

| | 2PC | Saga (choreography) | Saga (orchestration) | TCC |
|---|---|---|---|---|
| Atomicity | Strong (all-or-nothing) | Eventual (compensation-based) | Eventual (compensation-based) | Eventual, with a "reserved" middle state |
| Locks held across services? | Yes, for the whole protocol | No | No | Briefly, as an explicit reservation |
| Coordinator single point of failure? | Yes (blocking on crash) | No central coordinator | Yes, but stateless/re-driveable | Depends on implementation |
| Failure handling | Automatic rollback | Explicit compensating transactions | Explicit compensating transactions | Explicit cancel operations |
| Operational complexity | Low to design, high risk in practice | Spread across services, hard to trace | Centralized, easier to monitor | Highest (3 ops per participant) |
| Common in microservices? | Rare | Common | Common, often preferred at scale | Payments/booking-specific |

## Common interview follow-ups

**Q: Why is a saga "eventually consistent" instead of consistent?**
Because each local transaction commits independently and immediately visible to readers, there's a real window where some steps have happened and others haven't (payment charged, order not yet marked complete) — any correctness-sensitive read during that window sees a transitional, not final, state, which the application must be designed to tolerate (e.g., an order status of "processing" rather than exposing partial completion as final).

**Q: What happens if a compensating transaction itself fails?**
This is the hard part of saga design in practice — compensations must be retried (usually via a durable queue with retry/backoff) until they succeed, and truly un-compensatable actions (an email already sent, a non-refundable charge) need a fallback like manual intervention or an alert; sagas are only as reliable as their compensation logic's own retry guarantees.

**Q: Can sagas guarantee isolation like a real ACID transaction would?**
No — this is the other property sagas give up beyond atomicity: intermediate states are visible to concurrent transactions, which can cause anomalies (e.g., another process seeing stock decremented before the order is confirmed); mitigations include semantic locks (marking a record "pending" so other flows treat it specially) or accepting the anomaly as a documented business trade-off.

**Q: When would 2PC still be the right call?**
Within a single database engine's own internals across shards it controls (Spanner, CockroachDB use 2PC-like protocols internally, backed by Paxos/Raft to avoid the blocking problem), or in tightly-coupled, low-service-count systems where all participants are under one team's operational control and strict atomicity is worth the availability cost — it's the cross-team, cross-availability-domain case where it breaks down.

**Q: How do you make an orchestrator not become a new single point of failure?**
Persist saga state durably (often via the same [outbox pattern](../05-messaging-event-driven/outbox-pattern.md) used for reliable event publishing) so a crashed orchestrator instance can be replaced and resume from the last recorded step, rather than holding saga progress only in memory.

## Related topics
- [Database Migration at Scale](database-migration-at-scale.md)
- [CAP Theorem](../03-consistency-distributed/cap-theorem.md)
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md)
- [Outbox Pattern](../05-messaging-event-driven/outbox-pattern.md)
- [Event Sourcing](../05-messaging-event-driven/event-sourcing.md)
- [Payment System](../10-system-design-practice/payment-system.md)
