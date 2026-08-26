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

Composite availability matters too: if a request touches five services each individually at 99.9%, and they're in serial dependency (not redundant), the effective availability is roughly:

```
0.999^5 ≈ 99.5%
```

This is why deep synchronous call chains are an availability anti-pattern regardless of how reliable each hop is.

## Redundancy at every layer

HA is achieved by removing every SPOF, layer by layer:

```text
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
   │ App AZ-A│         │ App AZ-B│           │ App AZ-C│
   └────┬────┘         └────┬────┘           └────┬────┘
        │                    │                     │
        └────────────────────┼─────────────────────┘
                             │
                 ┌───────────┴────────────┐
                 │ DB primary + replicas  │
                 └────────────────────────┘
```

Concretely:

- **DNS**: use a provider with anycast and health-check-based failover; never point at a single IP.
- **Load balancers**: run at least two, typically active-active behind a floating VIP or anycast. The LB itself must not be a SPOF.
- **Compute**: spread instances across availability zones (AZs), not just across servers in one rack.
- **Data tier**: synchronous or asynchronous replicas across AZs with automated leader election on primary failure.
- **Caches, queues, config stores**: the same redundancy rules apply. A single Redis or Kafka node defeats everything above it.
- **Infrastructure**: multi-AZ protects against failures in power, networking, or cooling domains.

## Active-active vs active-passive

### Active-passive (active-standby)

One instance or region serves traffic while a standby remains synchronized and waits for failover.

```text
[Primary: serving] ---replicates---> [Standby: idle, warm]

        X fails

                                  [Standby promoted]
```

Advantages:

- Simpler consistency model.
- Single authoritative writer.
- Easier operational reasoning.

Trade-offs:

- Idle capacity.
- Failover takes detection + promotion + routing time.

### Active-active

Multiple instances or regions all serve production traffic.

```text
         ┌──────── Traffic ────────┐
         ▼                         ▼
 [Region A]  <---- sync ---->  [Region B]
```

Advantages:

- Near-zero failover.
- Better resource utilization.
- Excellent for stateless services and global traffic.

Trade-offs:

- Concurrent write conflicts.
- Split-brain risk.
- Much more complex replication and consistency.

| | Active-Passive | Active-Active |
|---|---|---|
| Resource utilization | Low | High |
| Failover | Seconds–minutes | Near-zero |
| Complexity | Lower | Higher |
| Best fit | Single-writer systems | Stateless or partitioned systems |

## Avoiding single points of failure

Ask yourself:

- Is there exactly one instance of anything critical?
- Are redundant components actually independent (different AZs/racks)?
- Are health checks testing real readiness rather than just "process exists"?
- Are critical and non-critical workloads isolated?
- Is the control plane (configuration, service discovery, secrets) as redundant as the application itself?

A system is only as available as its weakest dependency.

## Trade-offs

High availability always costs additional infrastructure, operational complexity, and engineering effort.

The right target depends entirely on business value:

- Internal reporting tool → 99.9% may be perfectly acceptable.
- Consumer SaaS → 99.95–99.99% is common.
- Financial payments or critical infrastructure → much higher availability targets justify the cost.

Remember that HA only protects against infrastructure failures.

It does **not** protect against:

- Bad deployments
- Application bugs
- Data corruption
- Operator mistakes

Those require deployment strategies, backups, and disaster recovery.

## Common interview follow-ups

### Q: Isn't the load balancer itself a SPOF?

Yes—unless it is redundant. Managed cloud load balancers already run HA internally. Self-managed deployments require redundant LBs with floating IPs or DNS failover.

---

### Q: How do you achieve 99.99% availability with a single-writer database?

Use synchronous replication plus automated failover to a standby within seconds. Reads can scale through replicas, while writes continue using one elected primary.

---

### Q: What's the difference between availability and reliability?

Availability answers:

> Is the system serving requests right now?

Reliability answers:

> How frequently does the system fail over long periods?

A service that crashes every hour but recovers in one second has high availability but poor reliability.

---

### Q: How do you measure availability?

Don't rely only on ping checks.

Measure:

- Request success rate
- Error rate
- Latency SLOs
- Real User Monitoring (RUM)
- Synthetic monitoring

Availability should be defined as:

> Percentage of requests successfully completed within the agreed latency SLO.

---

### Q: When is active-active the wrong choice?

When conflicting concurrent writes are unacceptable.

Examples:

- Banking ledgers
- Payment systems
- Inventory reservation

These systems typically prefer active-passive with fast automated failover or strict partitioning rather than allowing multiple concurrent writers.

## Related topics

- [Load Balancing](../01-scaling-traffic/load-balancing.md)
- [Circuit Breaker Pattern](../01-scaling-traffic/circuit-breaker-pattern.md)
- [Database Replication](../02-data-storage/database-replication.md)
- [Leader Election](../03-consistency-distributed/leader-election.md)
- [CAP Theorem](../03-consistency-distributed/cap-theorem.md)
- [Fault Tolerance](fault-tolerance.md)
- [Disaster Recovery](disaster-recovery.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
