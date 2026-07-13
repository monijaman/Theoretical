# High Availability

[← Back to index](../readme.md)

## What it means and why interviewers probe it

High availability (HA) is the property that a system keeps serving correct responses within an acceptable latency, for an acceptable fraction of the time, even when individual components fail. It is not "the system never fails" — that's impossible at scale. It's "the system is engineered so that no single failure takes the whole thing down, and failures are repaired faster than they accumulate."

Interviewers ask about HA because it forces you to reveal whether you actually think about failure as a first-class citizen of the design, or whether your architecture is a happy-path diagram with a load balancer icon glued on. A good answer identifies every single point of failure (SPOF) in your own design and says what replaces it when it dies.

## The "nines" and what they actually cost you

Availability is usually expressed as a percentage of uptime over a year, described in "nines":

| Availability | Downtime/year | Downtime/month | Downtime/week | Downtime/day |
|---|---|---|---|---|
| 99% ("two nines") | 3.65 days | 7.3 hours | 1.68 hours | 14.4 min |
| 99.9% ("three nines") | 8.76 hours | 43.8 min | 10.1 min | 86.4 sec |
| 99.95% | 4.38 hours | 21.9 min | 5.04 min | 43.2 sec |
| 99.99% ("four nines") | 52.6 min | 4.38 min | 1.01 min | 8.64 sec |
| 99.999% ("five nines") | 5.26 min | 26.3 sec | 6.05 sec | 864 ms |

Each additional nine is roughly an order of magnitude more expensive to achieve, because you're no longer just handling machine failures — you're eliminating deployment-caused outages, DNS propagation delays, human error, and eventually entire data-center-level events. Five nines effectively bans manual failover: 864ms/day is not enough time for a human to notice a page, let alone act. That budget only works with fully automated detection and failover.

This is why the first thing you should do with an HA requirement in an interview is translate the SLA into a downtime budget, then ask what components of your design could plausibly eat that budget (a single bad deploy at 3 nines can burn a third of the monthly allowance in one incident).

Composite availability matters too: if a request touches five services each individually at 99.9%, and they're in serial dependency (not redundant), the effective availability is roughly 0.999^5 ≈ 99.5% — worse than any individual component. This is why deep synchronous call chains are an availability anti-pattern regardless of how reliable each hop is.

## Redundancy at every layer

HA is achieved by removing every SPOF, layer by layer:

```
                      ┌─────────────┐
                      │   DNS / GSLB │  ← multiple providers, health-checked
                      └──────┬──────┘
                             │
                 ┌───────────┴───────────┐
                 │   Load Balancer (x N) │  ← LB pair, not a single LB
                 └───────────┬───────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                     │
   ┌─────────┐         ┌─────────┐           ┌─────────┐
   │ App AZ-A│         │ App AZ-B│           │ App AZ-C│   ← multi-AZ app tier
   └────┬────┘         └────┬────┘           └────┬────┘
        │                    │                     │
        └────────────────────┼─────────────────────┘
                             │
                 ┌───────────┴────────────┐
                 │   DB primary + replicas │  ← replica in each AZ
                 └────────────────────────┘
```

Concretely:

- **DNS**: use a provider with anycast and health-check-based failover (Route 53, Cloudflare); never point at a single IP.
- **Load balancers**: run at least two, typically active-active behind a floating VIP or anycast; the LB itself must not be a SPOF.
- **Compute**: spread instances across availability zones (AZs), not just across servers in one rack — a rack, a switch, or a whole AZ can go down.
- **Data tier**: synchronous or asynchronous replicas across AZs (see `../02-data-storage/database-replication.md`), with automated leader election on primary failure (see `../03-consistency-distributed/leader-election.md`).
- **Caches, queues, config stores**: same story — a single Redis node or single ZooKeeper node defeats the purpose of everything above it.
- **Power, network, physical**: outside your control day-to-day, but this is precisely why multi-AZ (and sometimes multi-region) exists — a cloud AZ maps roughly to an independent power/network/cooling domain.

## Active-active vs active-passive

**Active-passive (active-standby):** one instance/region/DC serves all traffic; a standby is kept in sync (via replication) and takes over on failure.

```
[Primary: serving] ---replicates---> [Standby: idle, warm]
        X (fails)
                                     [Standby: promoted, now serving]
```

- Simpler to reason about — no need to handle concurrent writes to two masters, no split-brain conflict resolution.
- Wastes capacity — the standby does nothing under normal operation (unless used for read traffic).
- Failover introduces a gap: detection time + promotion time + DNS/routing propagation. This is your RTO (see `disaster-recovery.md`).

**Active-active:** two or more instances/regions serve live traffic simultaneously, typically behind a load balancer or geo-routing layer.

```
        ┌──────── requests split by GSLB ────────┐
        ▼                                        ▼
 [Region A: active]  <---bidirectional sync--->  [Region B: active]
```

- No idle capacity — every node earns its keep, and failover is just "the LB stops sending traffic to the dead node," which is fast and often invisible to users.
- Much harder: needs either a shared data layer, conflict-free replication (CRDTs), or careful partitioning of which region owns which data, to avoid write conflicts. See `../03-consistency-distributed/cap-theorem.md` and `../03-consistency-distributed/quorum.md`.
- Testing and reasoning about split-brain scenarios (both sides think they're primary) is a real engineering cost.

| | Active-Passive | Active-Active |
|---|---|---|
| Resource efficiency | Low (idle standby) | High |
| Failover time | Seconds–minutes (promotion) | Near-zero (just stop routing) |
| Complexity | Lower | Higher (conflict resolution, data sync) |
| Good fit | Stateful systems with a natural single writer (most RDBMS) | Stateless services, geo-distributed reads, CRDT-friendly data |

## Avoiding single points of failure — a checklist

- Is there exactly one of anything that, if killed, stops the request path? (one LB, one NAT gateway, one DB writer instance not behind failover, one message broker node)
- Does the "redundant" pair actually fail independently? Two app servers in the same rack sharing a power strip are not independent.
- Do health checks distinguish "process is up" from "process is actually healthy" (can serve real traffic, DB connection working)? A shallow health check masks a SPOF.
- Is there a bulkhead between tenants/features so one noisy neighbor can't take everything down? See `fault-tolerance.md`.
- Does the control plane (config service, service discovery, secrets manager) have the same redundancy as the data plane? Teams often HA the app tier and forget that Consul/ZooKeeper/etcd is a single node.

## Trade-offs

- HA costs money and complexity linearly-ish, but the value of an extra nine is not linear — it depends entirely on the cost of downtime to the business (an e-commerce checkout flow vs. an internal reporting dashboard have very different HA budgets).
- Over-engineering HA for a low-traffic internal tool wastes engineering time that could go to features; under-engineering it for a payments system is a business risk. Match the target to the actual cost-of-downtime, not to a generic "five nines" aspiration.
- HA reduces *frequency/duration* of outages from *infrastructure* failure. It does not protect against bad deploys, bugs, or data corruption — that's what `disaster-recovery.md` and `zero-downtime-deployment.md` are for.

## Common interview follow-ups

**Q: Your design has a load balancer in front of your app servers — isn't that a SPOF?**
Yes, unless it's deployed redundantly. In practice, use a managed LB service (already HA internally) or run a pair with a floating VIP (keepalived/VRRP) or DNS-based failover. The point of the question is to check whether you notice the LB itself needs redundancy, not just the tier behind it.

**Q: How do you achieve 99.99% availability when your database is a single writer?**
Accept that the single writer is a bottleneck for *write* availability, and mitigate with fast automated failover to a synchronously-replicated standby (seconds, not minutes), while reads scale out over replicas. True active-active writes need either partitioning by key (each partition has its own single writer) or a consensus-based multi-writer store — call out the CAP trade-off explicitly.

**Q: What's the difference between availability and reliability?**
Availability is "is it up right now" (a point-in-time or aggregate percentage). Reliability is "does it keep working correctly over time without failing" (often measured as MTBF — mean time between failures). A system can be highly available (fails often but recovers in milliseconds) yet not very reliable, or vice versa.

**Q: How would you actually measure whether you're hitting your SLA?**
Synthetic uptime checks are necessary but not sufficient — they miss partial degradation. Use real user monitoring / SLO burn-rate alerting on error rate and latency percentiles from actual traffic (see `observability-logs-metrics-traces.md`), and define availability as "percentage of requests that succeeded within SLA latency," not just "server responded to ping."

**Q: When would active-active be a bad idea?**
When the data layer can't reconcile concurrent writes cheaply — e.g., a strongly consistent ledger where double-processing a payment is unacceptable. There, active-passive with fast failover (or active-active with strict partitioning by account/shard) is safer than a CRDT-based merge that risks silent inconsistency.

## Related topics

- [Load Balancing](../01-scaling-traffic/load-balancing.md)
- [Circuit Breaker Pattern](../01-scaling-traffic/circuit-breaker-pattern.md)
- [Database Replication](../02-data-storage/database-replication.md)
- [Leader Election](../03-consistency-distributed/leader-election.md)
- [CAP Theorem](../03-consistency-distributed/cap-theorem.md)
- [Fault Tolerance](fault-tolerance.md)
- [Disaster Recovery](disaster-recovery.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
