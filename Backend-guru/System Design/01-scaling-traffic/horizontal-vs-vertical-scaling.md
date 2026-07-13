# Horizontal vs Vertical Scaling
[← Back to index](../readme.md)

## Why it matters

"Just add more capacity" is the first instinct in every scaling conversation, but *how* you add it determines your architecture, your cost curve, and your failure modes for years. Interviewers probe this to see whether you understand that vertical scaling is a stopgap with a hard ceiling, and that horizontal scaling — the industry default at real scale — is a design decision that must be made early (statelessness) rather than retrofitted.

## Definitions

**Vertical scaling (scale up)**: give one machine more resources — more CPU, more RAM, faster disks/NVMe, better network. The number of nodes stays the same; each node gets more powerful.

**Horizontal scaling (scale out)**: add more machines running the same workload, splitting traffic/data across them. The number of nodes grows; each node stays roughly the same size.

```
Vertical:                          Horizontal:

  [ 4 vCPU / 16GB ]                [2vCPU/8GB] [2vCPU/8GB] [2vCPU/8GB]
        |                                \          |          /
        v                                        Load Balancer
  [16 vCPU / 128GB ]                                  |
                                                     Client
```

## Mechanics: why statelessness is the prerequisite

Vertical scaling requires no architectural change — the app doesn't know or care that it got a bigger box. Horizontal scaling requires that **any instance can handle any request**. That's only true if:

- Session/user state lives outside the process (Redis, DB) — see the sticky-session discussion in [Load Balancing](load-balancing.md).
- Local disk isn't the source of truth (uploaded files go to object storage, not local disk — see [Object Storage Architecture](../09-large-scale-data-systems/object-storage-architecture.md)).
- In-memory caches are either per-request-safe to lose, or backed by a shared cache layer.
- Background jobs/state machines can resume on any worker, not just the one that started them.

If those aren't true, adding a second instance doesn't add capacity — it adds bugs (user hits instance B, has no session, gets logged out; two instances write conflicting local files, etc.). This is the crux of why "horizontal scaling" is really a statement about application design, not just infrastructure provisioning.

## Cost curves

Vertical scaling cost is **non-linear and eventually vertical (pun intended)** — doubling a machine's specs often costs more than double, because you're moving up a hardware tier where premium/enterprise components (more memory channels, higher core-count CPUs, faster interconnects) cost disproportionately more, and past a certain point you're on specialized hardware (e.g., very large memory instances) priced at a premium.

Horizontal scaling cost is closer to **linear** — 10 small boxes cost roughly 10x one box, at least until you hit fleet-level overhead (load balancers, network egress between nodes, coordination/consensus overhead, data replication cost).

```
Cost
 ^                                      * vertical (steep past a point)
 |                                   *
 |                              *
 |                        *
 |                   *              horizontal (near-linear + LB/coord overhead)
 |              *          + + + + + + + + + + +
 |         *      + + + +
 |    *  + +
 |* +
 +---------------------------------------------------------------> Capacity
```

Vertical scaling also has a **hard ceiling**: there's a biggest instance type your cloud provider offers, and eventually a physical limit to how much RAM/CPU fits in one machine. Horizontal scaling's ceiling is architectural (coordination overhead, data partitioning limits — see [Database Sharding](../02-data-storage/database-sharding.md)) rather than physical, which is why it's the only real answer at internet scale.

## When each makes sense

**Vertical scaling makes sense when:**
- You're early-stage and the *engineering cost* of horizontal-scaling architecture (statelessness, distributed data) isn't justified yet — a single bigger Postgres instance is simpler than sharding.
- The workload is inherently hard to parallelize (a single-threaded legacy system, some monolithic batch jobs).
- You need it *today* and it's a one-click resize vs a multi-week distributed-systems project.
- Licensing costs scale per-core or per-node (some commercial databases) — fewer, bigger nodes can be cheaper.

**Horizontal scaling makes sense when:**
- You need to scale past what any single machine can offer (web tiers serving millions of users).
- You need **fault tolerance**, not just capacity — a single powerful machine is still a single point of failure; N machines let you survive losing one. This is often the *stronger* argument for horizontal scaling even at moderate load, ahead of raw capacity.
- Traffic is elastic/spiky — auto-scaling groups add/remove instances in minutes; you can't "auto-resize" a running vertical instance without an interruption/reboot in most clouds.
- Cost efficiency at scale — commodity hardware in bulk usually beats specialized big-iron pricing.

## Practical pattern: vertical first, horizontal for real scale, both together in practice

Most real systems do both, at different layers:
- The database is often scaled vertically first (bigger primary), then horizontally via read replicas and eventually sharding once vertical limits or write throughput become the bottleneck. See [Database Replication](../02-data-storage/database-replication.md) and [Database Sharding](../02-data-storage/database-sharding.md).
- The stateless web/API tier is scaled horizontally from day one in any serious deployment because it's cheap to make stateless and the payoff (elastic auto-scaling, HA) is immediate.

## Trade-offs

| | Vertical | Horizontal |
|---|---|---|
| Architecture change required | None | Requires statelessness, often requires data partitioning |
| Ceiling | Hard (biggest instance available) | Soft (architectural, not physical) |
| Fault tolerance | None — still one box | Improves — survives node loss |
| Cost curve | Superlinear past a point | Near-linear + coordination overhead |
| Downtime to scale | Usually a resize/reboot | Usually zero (add nodes behind LB) |
| Operational complexity | Low | Higher (LB, service discovery, distributed data, consistency) |
| Elastic/auto-scaling | Poor fit | Natural fit |

## Common interview follow-ups

**Q: Why not just always scale horizontally from the start?**
Because it has a real engineering cost — building stateless services, externalizing session/data state, handling distributed consistency — that isn't free. For a small system with predictable, low load, that complexity is waste. The right call depends on expected growth and how expensive it'd be to retrofit later; if growth is likely, bias toward stateless design early even if you deploy on a single instance for a while.

**Q: How do you scale a stateful component like a database horizontally?**
Read-heavy workloads scale via replicas (read from replicas, write to primary — see [Database Replication](../02-data-storage/database-replication.md)). Write-heavy or very large datasets need sharding/partitioning, which introduces cross-shard query complexity and rebalancing challenges (see [Database Sharding](../02-data-storage/database-sharding.md)).

**Q: What's the relationship between horizontal scaling and high availability?**
They're linked but distinct goals: horizontal scaling is about capacity, HA is about survivability. But going horizontal often gets you HA "for free" if designed right — N stateless instances across AZs means losing one instance (or a whole AZ) doesn't take the service down. See [High Availability](../08-reliability-operations/high-availability.md).

**Q: Can you scale horizontally without a load balancer?**
Technically yes for some patterns (client-side load balancing/service discovery, message-queue-based work distribution where workers pull from a queue), but for request/response traffic you need something distributing requests — otherwise clients would need to know about every instance and its health themselves.

**Q: What's a real-world example of hitting the vertical scaling ceiling?**
A single-primary relational database under heavy write load — you can move to the largest instance type, tune I/O, add more RAM for buffer cache, but eventually write throughput is bound by a single machine's disk/CPU, forcing a move to sharding or a horizontally-scalable data store (Cassandra, DynamoDB) instead of "one bigger Postgres."

## Related topics

- [Load Balancing](load-balancing.md)
- [Database Replication](../02-data-storage/database-replication.md)
- [Database Sharding](../02-data-storage/database-sharding.md)
- [High Availability](../08-reliability-operations/high-availability.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
