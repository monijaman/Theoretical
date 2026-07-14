# Multi-Region Architecture
[← Back to index](../readme.md)

## Why this matters in an interview

Any system with users on more than one continent eventually has to answer: do we serve everyone from one region and accept the speed-of-light latency tax for people far from it, or do we run the system in multiple regions — and if we do, how do writes in Tokyo and writes in Virginia ever agree on the truth? Interviewers use multi-region questions to see whether you can make CAP-theorem trade-offs concrete at global scale (cross-region links are the partition-prone, high-latency network CAP describes, not a hypothetical), and whether you know the real patterns (active-passive, active-active, home-region sharding) rather than hand-waving "we'll just replicate everything everywhere."

## Active-passive vs. active-active

```
Active-Passive                          Active-Active
───────────────                         ─────────────
Region A (primary)  ──writes──▶ DB      Region A (primary) ──writes──▶ DB A
        │                                                                 │
        │ async replication                          bidirectional      │
        ▼                                             async replication  │
Region B (standby)   ◀──reads only      Region B (primary) ◀────────────┘
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

**1. Async replication with conflict resolution** — every region can be written to, changes stream to other regions after the fact, and if two regions modify the same item before syncing, a conflict-resolution rule picks the winner:

```
Region A: user updates profile.bio = "Loves hiking"   (t=100ms)
Region B: user updates profile.bio = "Loves climbing"  (t=105ms, before sync)

  Async replication propagates both changes
              │
              ▼
     Conflict detected on same key
              │
   ┌──────────┴──────────┐
   │ Last-Write-Wins (LWW) — pick by timestamp (simple, can silently drop a write)
   │ Vector clocks/CRDTs — merge or expose both versions to the app
   │ Application-specific merge — e.g., "union" for a set, "max" for a counter
   └─────────────────────┘
```

This is DynamoDB Global Tables' model (last-writer-wins by default, using a wall-clock timestamp with a "last writer" resolution reminiscent of the original Dynamo paper's AP posture — see [CAP Theorem](../03-consistency-distributed/cap-theorem.md)).

**2. Home-region sharding ("cell"/geo-partitioning)** — instead of letting any region write any record, assign each record (usually per-user) a **home region**, and route all writes for that record to its home region specifically, while other regions hold read replicas or nothing. A European user's data lives with EU as its home region; writes always route there even if the user is briefly traveling elsewhere, and cross-region replication becomes async-for-reads-only rather than needing multi-writer conflict resolution at all.

```
User "alice" → home region: eu-west-1  → all her writes go there
User "bob"   → home region: us-east-1  → all his writes go there

eu-west-1 (primary for EU users)  ──async replicate──▶  us-east-1 (read replica for EU users' data)
us-east-1 (primary for US users)  ──async replicate──▶  eu-west-1 (read replica for US users' data)

No two regions ever accept a conflicting write for the SAME user's data
→ no conflict resolution needed, at the cost of non-local users
  getting cross-region latency for THEIR writes if they're traveling.
```

Home-region sharding trades away active-active's "every write is always local" property for the much simpler guarantee of never needing conflict resolution — a common choice for systems (e.g., regulated data with data-residency requirements) where you'd rather accept occasional cross-region latency for traveling users than build multi-writer conflict logic.

## GeoDNS and latency-based routing

Before any replication question, there's a simpler one: how does a request even reach the "right" region?

```
User in Tokyo  ──DNS query for api.example.com──▶  GeoDNS / latency-based routing
                                                            │
                                          resolves to the IP of the
                                          nearest/lowest-latency healthy region
                                          (ap-northeast-1), not a fixed IP
```

**GeoDNS** (or AWS Route 53 latency-based routing, Cloudflare's Anycast) resolves a single hostname to different IPs depending on the requester's location or measured latency to each candidate region, so users are transparently routed to their nearest healthy region with no client-side logic. Anycast (routing the *same* IP address to the topologically nearest datacenter at the network layer, used heavily by Cloudflare) achieves a similar effect one layer lower, without even needing per-client DNS resolution differences — the network itself routes the packet to the nearest edge. Both approaches double as failover mechanisms: if health checks mark a region unhealthy, routing shifts new traffic away from it automatically, which is the first step of most failover runbooks.

## The CAP tension made concrete at global scale

[CAP Theorem](../03-consistency-distributed/cap-theorem.md) says P isn't optional once you have more than one node coordinating over an unreliable network — multi-region is the starkest possible illustration, because cross-region links are simultaneously the *most* partition-prone (transoceanic cables, BGP reroutes, regional outages) and the *highest latency* links in the whole system. This forces the CP-vs-AP choice into the open rather than letting you pretend it doesn't apply:

- Insisting on strong (linearizable) consistency across regions means every write pays a multi-hundred-millisecond cross-region round trip (CP, paying the latency cost even in the common case — this is the PACELC "else" branch: even absent a partition, consistency costs latency).
- Accepting async replication means occasional stale reads and conflict resolution, but local-latency writes everywhere (AP-leaning).
- There is no trick that gives every region local-latency strongly-consistent writes on arbitrary keys — any claim otherwise is either narrowing the guarantee (external consistency on a single item via consensus, still paying quorum latency) or is wrong.

## Failover runbooks

A failover runbook is what turns "we have a standby region" into an actual recovery, and interviewers value hearing the concrete steps rather than "we fail over":

```
1. Detect: health checks / alerting confirm primary region is down
           (not just one node — confirm it's regional, avoid a false failover)
2. Decide: automated (health-check-triggered) or human-approved failover?
           (automated is faster but risks flapping/false positives;
            many orgs require human sign-off for a full regional failover)
3. Promote: standby region's database promoted to primary
           (verify replication lag at time of failover — how much data,
            if any, is lost/not-yet-replicated?)
4. Reroute: update GeoDNS/load balancer/Anycast routing to send all
           traffic to the newly-promoted region
5. Verify: run smoke tests against the promoted region before declaring done
6. Failback (later): once original region recovers, re-sync it as a
           standby before ever sending it traffic again — never just
           flip back without re-establishing correct replication first
```

The step most commonly skipped in a rushed interview answer is checking replication lag at failover time — async replication means the standby is very likely missing the last few seconds (or more) of writes, so a failover is often also a small, bounded data-loss event (this quantity is your RPO — recovery point objective — see [Disaster Recovery](../08-reliability-operations/disaster-recovery.md)).

## Real examples

- **Google Spanner**: achieves externally-consistent (linearizable) transactions *across regions* using **TrueTime** — atomic clock + GPS-disciplined clocks in every datacenter bound clock uncertainty to a few milliseconds, letting Spanner know when it's safe to commit a distributed transaction without waiting for a full round of communication to rule out clock skew. It's still fundamentally CP (a partitioned minority can't proceed), but TrueTime shrinks the practical latency cost of maintaining strong consistency across regions — see the Spanner discussion in [CAP Theorem](../03-consistency-distributed/cap-theorem.md).
- **DynamoDB Global Tables**: active-active, multi-region, last-writer-wins conflict resolution by default — an explicit AP-leaning choice prioritizing local-latency writes in every region over avoiding all conflicts.
- **Cloudflare**: uses Anycast routing so the same IP address is announced from hundreds of edge locations worldwide, and BGP naturally routes each user's packets to the topologically nearest one — this is latency-based routing implemented at the network layer rather than the DNS layer, and it's also how Cloudflare achieves fast, automatic failover away from an unhealthy edge location without any DNS TTL delay.

## Trade-offs summary

| | Active-Passive | Active-Active (conflict resolution) | Home-Region Sharding |
|---|---|---|---|
| Write latency for non-primary-region users | High (cross-region to reach primary) | Low (always local) | Low unless traveling away from home region |
| Conflict resolution needed | No (single writer) | Yes (LWW/CRDT/app merge) | No (per-record single writer, just relocated) |
| Standby resource utilization | Low (often idle or read-only) | High (fully active everywhere) | High |
| Failover complexity | Promote passive → primary | No failover needed for writes, but regional outage still loses that region's users' write access | Re-route affected users' home region on regional outage |
| Best fit | Simpler systems, DR-focused | Global low-latency writes, tolerant of eventual consistency | Data-residency requirements, per-user data ownership |

## Common interview follow-ups

**Q: Why can't you just make cross-region replication synchronous and avoid all this complexity?**
Synchronous replication means every write waits for acknowledgment from a remote region, and speed-of-light-bound network latency between continents (often 100–250ms round trip) would be added to every single write — usually an unacceptable user-facing latency cost, and also means a transient cross-region network issue blocks writes entirely (a CP choice paid on every request, not just during rare partitions).

**Q: How does Spanner avoid needing conflict resolution the way DynamoDB Global Tables does?**
Spanner uses TrueTime and a Paxos-based consensus protocol per shard to establish a single, globally-agreed commit order for transactions rather than letting multiple regions accept independent writes to the same data — it pays consensus latency per cross-region transaction instead of accepting conflicts and reconciling after the fact, which is a CP choice rather than DynamoDB Global Tables' AP-leaning last-writer-wins model.

**Q: What's the difference between GeoDNS and Anycast for regional routing?**
GeoDNS resolves a hostname to different IP addresses depending on the resolver's location, which means routing changes only take effect on the next DNS lookup (subject to TTL caching delays); Anycast announces the identical IP address from every location and lets network-layer BGP routing send each packet to the topologically nearest one, which reacts to outages faster since it doesn't depend on DNS caches expiring.

**Q: How do you decide between active-active and home-region sharding for a new global product?**
If conflicting concurrent writes to the same record from different regions are rare and tolerable to resolve automatically (social media likes, presence status), active-active with LWW/CRDTs is simpler to reason about long-term; if data has a natural, sticky owner (a user's own profile/orders) and especially if there are data-residency/compliance requirements (a EU user's data must reside in the EU), home-region sharding avoids conflict-resolution complexity entirely at the cost of extra latency for that user's writes while they're traveling.

**Q: What should you measure to decide if a region has really failed, versus a transient blip, before triggering failover?**
Health checks from multiple independent vantage points (not a single monitoring node, which could itself be the thing partitioned), sustained failure over a time window rather than one failed probe, and ideally confirmation that the issue is regional (multiple services/AZs affected) rather than a single service's bug — flapping into an unnecessary failover has its own cost (replication lag, traffic disruption) that can be worse than riding out a short blip.

**Q: What's the relationship between RPO/RTO and the choice of active-passive vs. active-active?**
Active-passive with async replication has a non-zero RPO (recovery point objective — how much data can be lost) equal to replication lag at failover time, and an RTO (recovery time objective) bounded by how long promotion and re-routing take; active-active's per-region RPO/RTO for *that region's* users during a regional outage is similarly bounded by how quickly traffic reroutes to another already-active region, which is typically faster than promoting a cold/passive standby — this is the core reason active-active can offer a lower RTO despite being architecturally more complex.

## Related topics
- [CAP Theorem](../03-consistency-distributed/cap-theorem.md) — the CP/AP tension this page makes concrete at cross-region scale
- [PACELC Theorem](../03-consistency-distributed/pacelc-theorem.md) — the latency-vs-consistency cost paid on every cross-region write, partition or not
- [Strong vs Eventual Consistency](../03-consistency-distributed/strong-vs-eventual-consistency.md) — the consistency models underlying active-active conflict resolution
- [Database Replication](../02-data-storage/database-replication.md) — the sync/async replication mechanics this page applies across regions instead of across replicas
- [Disaster Recovery](../08-reliability-operations/disaster-recovery.md) — RPO/RTO and failover runbook detail this page's failover section builds on
- [High Availability](../08-reliability-operations/high-availability.md) — the active/standby and health-check patterns underlying regional failover
