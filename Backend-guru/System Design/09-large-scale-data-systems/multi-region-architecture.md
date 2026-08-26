# Multi-Region Architecture

[← Back to index](../readme.md)

## Why this matters in an interview

Any system with users on more than one continent eventually has to answer: do we serve everyone from one region and accept the speed-of-light latency tax for people far from it, or do we run the system in multiple regions — and if we do, how do writes in Tokyo and writes in Virginia ever agree on the truth? Interviewers use multi-region questions to see whether you can make CAP-theorem trade-offs concrete at global scale (cross-region links are the partition-prone, high-latency network CAP describes, not a hypothetical), and whether you know the real patterns (active-passive, active-active, home-region sharding) rather than hand-waving "we'll just replicate everything everywhere."

## Active-passive vs. active-active

```text
Active-Passive                          Active-Active
───────────────                         ─────────────
Region A (primary)  ──writes──▶ DB      Region A (primary) ──writes──▶ DB A
        │                                                                 │
        │ async replication                          bidirectional         │
        ▼                                             async replication    │
Region B (standby)   ◀──reads only      Region B (primary) ◀───────────────┘
                                                │
  All writes go to Region A.              writes──▶ DB B
  Region B only serves reads (or
  nothing) until failover promotes it.    Both regions accept writes;
                                          conflicts must be resolved.
```

- **Active-passive**: one region takes all writes; one or more standby regions replicate asynchronously and can serve reads (or sit idle) until a failover promotes one to primary. Simpler to reason about — there's a single writer, so no cross-region write conflicts — at the cost of the passive region's compute capacity being underused most of the time, and a failover event that requires promoting a region and re-pointing traffic.
- **Active-active**: multiple regions accept writes simultaneously, each local to its own users (lower write latency everywhere), replicating to each other asynchronously. This gives every region full utilization and the best possible write latency for local users, but introduces the hard problem: two regions can accept conflicting writes to the same record before either has heard from the other, and something has to reconcile that.

## Replicating data across regions: async + conflict resolution, or home-region sharding

Synchronous cross-region replication (wait for a remote region to acknowledge before committing) is usually a non-starter for real cross-continent distances — a round trip between, say, US-East and Asia-Pacific is on the order of 150–250ms, and requiring that on every write turns a normally sub-10ms local write into a user-visible multi-hundred-millisecond one. So multi-region systems almost always pick one of two strategies:

### 1. Async replication with conflict resolution

Every region can be written to, changes stream to other regions after the fact, and if two regions modify the same item before syncing, a conflict-resolution rule picks the winner:

```text
Region A: user updates profile.bio = "Loves hiking"    (t=100ms)
Region B: user updates profile.bio = "Loves climbing"  (t=105ms, before sync)

          Async replication propagates both changes
                       │
                       ▼
           Conflict detected on same key
                       │
        ┌──────────────┴──────────────┐
        │ Last-Write-Wins (LWW)       │
        │ Vector clocks / CRDTs       │
        │ Application-specific merge  │
        └─────────────────────────────┘
```

Conflict-resolution strategies:

- **Last-Write-Wins (LWW)** — simple but can silently discard a concurrent update.
- **Vector clocks / CRDTs** — preserve concurrent versions or merge automatically.
- **Application-specific merge** — merge based on business logic (e.g., set union, max counter).

This is the model used by DynamoDB Global Tables.

### 2. Home-region sharding ("cell" / geo-partitioning)

Instead of allowing every region to write every record, assign each record (usually each user) a **home region**.

```text
User "alice" → home region: eu-west-1
User "bob"   → home region: us-east-1

eu-west-1 (primary for EU users)
      │
      ├── async replicate ──▶ us-east-1 (read replica)
      │
us-east-1 (primary for US users)
      │
      └── async replicate ──▶ eu-west-1 (read replica)
```

Only the user's home region accepts writes for that user's data.

Advantages:

- No write conflicts.
- Simpler operational model.
- Supports data residency requirements naturally.

Trade-off:

Users traveling away from their home region pay cross-region write latency.

## GeoDNS and latency-based routing

Before replication even matters, traffic has to reach the correct region.

```text
User (Tokyo)
      │
      ▼
 DNS: api.example.com
      │
      ▼
GeoDNS / Latency Routing
      │
      ▼
ap-northeast-1
```

Common approaches:

- GeoDNS (Route53 latency routing)
- Cloudflare
- Anycast networking

They also provide automatic failover by routing traffic away from unhealthy regions.

## CAP theorem becomes very real

Cross-region networking is exactly the environment CAP describes.

Choices become explicit:

### Strong consistency (CP)

Every write waits for remote quorum.

Pros:

- No conflicting versions.
- Strong guarantees.

Cons:

- Every write pays hundreds of milliseconds of WAN latency.
- Network partitions block writes.

### Eventual consistency (AP)

Writes commit locally.

Pros:

- Fast local writes.
- Better availability.

Cons:

- Stale reads.
- Conflict resolution required.

There is no architecture that provides:

- local writes,
- global strong consistency,
- zero latency,
- and partition tolerance

simultaneously.

## Failover runbook

```text
1. Detect failure
        │
2. Confirm regional outage
        │
3. Promote standby database
        │
4. Redirect traffic
        │
5. Run smoke tests
        │
6. Repair original region
        │
7. Rejoin as standby
```

Important considerations:

- Verify replication lag before promotion.
- Measure expected RPO.
- Avoid false failovers.
- Never fail back until replication is fully restored.

## Real-world examples

### Google Spanner

- Strong global consistency
- Paxos replication
- TrueTime API
- CP system

### DynamoDB Global Tables

- Active-active
- Async replication
- Last-write-wins
- AP-leaning

### Cloudflare

- Anycast networking
- Hundreds of edge locations
- Automatic routing to nearest healthy location

## Trade-offs summary

| | Active-Passive | Active-Active | Home-Region Sharding |
|---|---|---|---|
| Write latency | High outside primary | Low | Usually low |
| Conflict resolution | None | Required | None |
| Resource utilization | Low | High | High |
| Failover | Promote standby | Traffic rerouting | Route affected users |
| Best use case | Disaster recovery | Global applications | Compliance & data residency |

## Common interview follow-ups

**Q: Why not use synchronous cross-region replication?**

Because every write would wait for intercontinental RTT (often 100–250ms), dramatically increasing latency and making writes unavailable during WAN failures.

---

**Q: Why doesn't Spanner need conflict resolution?**

Spanner establishes a globally agreed commit order using Paxos and TrueTime, preventing concurrent conflicting commits rather than reconciling them afterward.

---

**Q: GeoDNS vs Anycast?**

GeoDNS returns different IPs based on location.

Anycast advertises the same IP globally and lets BGP route packets to the nearest healthy edge.

---

**Q: When would you choose home-region sharding?**

When:

- users naturally own their own data,
- compliance requires data residency,
- avoiding conflict resolution is more valuable than globally local writes.

---

**Q: How do you avoid false regional failovers?**

Use:

- health checks from multiple regions,
- consecutive failures over time,
- confirmation that the outage is regional rather than a single-service issue.

---

**Q: How do RPO and RTO relate to architecture?**

- Active-passive has RPO equal to replication lag and RTO equal to promotion + rerouting time.
- Active-active generally provides faster recovery because other regions are already serving live traffic, although asynchronous replication still determines possible data loss.

## Related topics
- [CAP Theorem](../03-consistency-distributed/cap-theorem.md) — the CP/AP tension this page makes concrete at cross-region scale
- [PACELC Theorem](../03-consistency-distributed/pacelc-theorem.md) — the latency-vs-consistency cost paid on every cross-region write, partition or not
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md) — the consistency models underlying active-active conflict resolution
- [Database Replication](../02-data-storage/database-replication.md) — the sync/async replication mechanics this page applies across regions instead of across replicas
- [Disaster Recovery](../08-reliability-operations/disaster-recovery.md) — RPO/RTO and failover runbook detail this page's failover section builds on
- [High Availability](../08-reliability-operations/high-availability.md) — the active/standby and health-check patterns underlying regional failover
