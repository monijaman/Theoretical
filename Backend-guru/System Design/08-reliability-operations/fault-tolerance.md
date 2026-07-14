# Fault Tolerance
[← Back to index](../readme.md)

## What it is and why it's asked

Fault tolerance is the ability of a system to keep operating correctly — possibly in a degraded mode — when one or more of its components fail. It is a narrower, more mechanical cousin of high availability: HA is the outcome ("the system stayed up"), fault tolerance is the *mechanism* ("here is exactly how we detected the failure and routed around it").

Interviewers probe this because "add more servers" is not an answer — it's a wish. They want to hear the actual failure-handling primitives: how you detect a dead dependency, what the caller does in the meantime, how you stop one failing component from dragging down healthy ones, and whether your system fails *predictably* or fails in a way nobody designed for. A design that has never had a failure mode discussion is not fault tolerant, it's untested.

## Redundancy: active-active vs active-passive

Fault tolerance starts with not having a single instance of anything critical. The two redundancy models:

**Active-passive** — a standby exists but does no work until the primary fails.

```
[Primary: serving traffic] --replicates state--> [Standby: idle]
        X fails
                                                  [Standby: promoted]
```
- Simple failure semantics: exactly one thing was ever authoritative.
- Costs idle capacity; failover has a gap (detect + promote + reroute).
- Natural fit for single-writer systems (most relational databases, leader-based logs like Kafka partitions).

**Active-active** — two or more instances serve live traffic concurrently; losing one just means the others absorb its share.

```
        ┌──── LB splits traffic ────┐
        ▼                           ▼
 [Node A: serving]           [Node B: serving]
   X fails → LB stops routing to A, B keeps going, no promotion step
```
- No idle capacity, failover is often invisible to users (just "stop sending traffic here").
- Requires either statelessness or a data layer that tolerates concurrent writers (quorums, CRDTs, partitioning) — see `../03-consistency-distributed/cap-theorem.md`.
- Harder to test: split-brain (two nodes each believing they're sole owner of some resource) is a real failure mode that active-passive doesn't have.

Both patterns are covered in more depth, including the trade-off table, in `high-availability.md` — this page focuses on what happens *at the moment of failure* and *after*, rather than on the topology.

## Graceful degradation vs failing hard

A fault-tolerant system doesn't have to choose between "fully working" and "completely down" — it should have intermediate states.

**Failing hard**: any dependency failure becomes a user-facing error. Simple to implement, terrible for user experience, and it wastes the fact that most of your system is still healthy.

**Graceful degradation**: the system sheds non-essential functionality to protect the essential path.

- Amazon's product page still renders with a cached price and "recommendations unavailable" if the personalization service is down, rather than a 500.
- Netflix's homepage falls back to a generic, non-personalized row of titles if the recommendation service times out, instead of a blank screen.
- A checkout flow can disable "apply promo code" if the promotions service is unhealthy, while still completing the purchase — losing a nice-to-have instead of losing the sale.

The engineering cost is real: every "essential vs optional" call requires an explicit decision at design time (what's the fallback value? cached? default? empty?), plus a timeout/circuit breaker so the degraded path activates fast instead of after a long hang. See `../01-scaling-traffic/circuit-breaker-pattern.md` and `../01-scaling-traffic/retry-exponential-backoff.md` — degradation only works if you fail fast in the first place.

## The bulkhead pattern: isolating failure domains

Named after ship bulkheads — physical compartments so that a hull breach in one compartment doesn't sink the whole ship. In software, a bulkhead means giving each dependency (or tenant, or feature) its own resource pool — thread pool, connection pool, process, or even whole service instance — so that one dependency being slow or dead can't exhaust resources shared by everything else.

**Without a bulkhead:**
```
Single shared thread pool (200 threads) serves calls to:
  Payments API, Recommendations API, Reviews API

Recommendations API goes slow (hangs 30s per call)
→ All 200 threads eventually blocked waiting on Recommendations
→ Payments calls can't get a thread either, even though Payments is healthy
→ Total outage caused by one non-critical dependency
```

**With a bulkhead:**
```
Payments pool (100 threads) | Recommendations pool (50 threads) | Reviews pool (50 threads)

Recommendations goes slow → its 50 threads saturate → Recommendations calls fail/degrade
Payments pool is untouched → checkout keeps working
```

Concrete implementations:
- **Netflix Hystrix** (now largely superseded by resilience4j) made bulkheads a first-class concept: each downstream dependency got its own thread pool or semaphore, sized to that dependency's expected concurrency.
- **Kubernetes resource requests/limits + separate pod deployments per service** are a coarse-grained bulkhead — one service's memory leak can't starve another service's pods on the same node if limits are set correctly (and node-level isolation is itself a bulkhead).
- **Database connection pool per downstream consumer** rather than one global pool, so a runaway batch job can't starve the API's connections.
- **Cell-based architecture** (AWS uses this internally) partitions the whole system into independent "cells," each serving a subset of customers — a cell melting down affects only its slice of traffic, not 100% of customers.

The trade-off: bulkheads add operational overhead (more pools/queues to size and monitor) and can under-utilize resources (Recommendations' 50 threads sit idle while Payments' 100 are all busy) — the isolation is bought with some efficiency loss, which is the right trade in almost every case where "one bad dependency" would otherwise be able to cause total outage.

## Failover mechanics: how failure is actually detected

None of the above works without fast, accurate failure detection. The three common primitives:

- **Health checks** — an active prober (load balancer, orchestrator) periodically asks "are you alive/ready?" Distinguish **liveness** (is the process running at all) from **readiness** (can it actually serve a real request right now, e.g. DB connection established, cache warmed). A shallow liveness-only check is a classic bug: the process is technically up but every request 500s.
- **Heartbeats** — the monitored node periodically pushes "I'm alive" to a coordinator, instead of being polled. Used in cluster membership protocols (Kafka brokers to ZooKeeper/KRaft controller, Consul/etcd session leases). Missing N consecutive heartbeats past a timeout triggers failover.
- **Timeouts on the request path itself** — every RPC needs a timeout budget; a caller that waits forever for a dead callee has effectively made itself unavailable too. This is the difference between fault tolerance and fault *propagation*.

```
Heartbeat every 2s, timeout after 3 missed beats (6s)

t=0   heartbeat OK
t=2   heartbeat OK
t=4   (missed)
t=6   (missed)
t=8   (missed) → declared dead → failover triggered → standby promoted
```

Tuning this window is a real trade-off: too short and transient GC pauses/network blips cause false-positive failovers (flapping); too long and real outages take longer to recover from. Systems like Raft/Paxos-based stores (etcd, Kafka's KRaft) use randomized election timeouts specifically to avoid multiple nodes triggering elections simultaneously and causing split votes.

## "Let it crash": the Erlang/OTP supervision-tree philosophy

Most of the above is about *avoiding* failure or routing around it gracefully. Erlang/OTP (and Elixir, which runs on the same VM) takes a deliberately different philosophy for a huge class of bugs: **don't try to handle every possible error at the point it occurs — let the process crash, and have a supervisor restart it into a known-good state.**

The reasoning: defensive code that tries to anticipate every failure mode tends to be wrong in the unanticipated cases (the ones that matter), and it obscures the actual bug behind a pile of `try/catch`. Erlang instead builds **supervision trees**: lightweight processes are organized in a hierarchy, and a supervisor's only job is to watch its children and restart them per a defined strategy when they die.

```
                Supervisor
             (restart strategy: one_for_one)
             /       |        \
      Worker A   Worker B   Worker C
      (crashes)

Supervisor notices Worker A's exit signal
→ restarts just Worker A into its initial state
→ Worker B and C are unaffected
```

Restart strategies:
- `one_for_one` — only the crashed child restarts.
- `one_for_all` — if one child crashes, all siblings are restarted (used when children share state and a partial restart would leave things inconsistent).
- `rest_for_one` — the crashed child and everything started after it are restarted.

This is why WhatsApp famously ran a small engineering team supporting hundreds of millions of users on Erlang: individual connection-handling processes crashing on bad input is a non-event — the supervisor restarts that one process in microseconds, the other millions of connections never notice.

This contrasts with the bulkhead/circuit-breaker philosophy in emphasis rather than contradiction: bulkheads isolate failure *between* components so it doesn't spread; "let it crash" additionally says that *within* a component, attempting to recover from an unexpected state is often worse than resetting to a known-good one. Kubernetes' pod restart-on-crash-loop and liveness-probe-triggered restarts are the same idea applied at the container level rather than the language-runtime level.

## Trade-offs summary

| Technique | What it buys you | What it costs |
|---|---|---|
| Active-active redundancy | Near-zero failover time, full resource utilization | Concurrent-write conflict handling, split-brain risk |
| Active-passive redundancy | Simple failure semantics | Idle capacity, failover gap (detect+promote+reroute) |
| Graceful degradation | Users keep working during partial outages | Every feature needs an explicit fallback design |
| Bulkhead isolation | One dependency's failure can't sink unrelated ones | Resource under-utilization, more pools to size/monitor |
| Health checks / heartbeats | Fast, automated failure detection | Tuning false-positive (flapping) vs slow-detection trade-off |
| "Let it crash" supervision | Simpler code, fast recovery to known-good state | Requires cheap process restart + idempotent reinitialization |

## Common interview follow-ups

**Q: What's the difference between fault tolerance and high availability?**
HA is the outcome measured in uptime percentage; fault tolerance is the set of mechanisms (redundancy, bulkheads, failover detection) that produce that outcome. You can have redundancy without genuine fault tolerance if, say, all replicas share a failure domain (same rack, same AZ) — the mechanism looks right but doesn't actually isolate failures.

**Q: Why not just retry every failed request instead of building bulkheads?**
Retries help with transient, independent failures but make correlated failures *worse* — if a dependency is failing because it's overloaded, blind retries add more load and can cause a retry storm that takes it down harder (and now also threatens the caller's own resources). Bulkheads plus circuit breakers plus capped, jittered retries (see `../01-scaling-traffic/retry-exponential-backoff.md`) are complementary, not substitutes.

**Q: How do you decide what to bulkhead?**
Isolate along the boundary where failure is most likely to be correlated and most likely to be non-critical to isolate: per external dependency (each third-party API gets its own pool), per tenant (a noisy customer can't starve others), or per criticality tier (payment path pool is separate from analytics-event pool).

**Q: Is "let it crash" compatible with stateful services?**
Only if the state that matters survives the crash — externalized to a database, replicated log, or the supervisor's own state, so the freshly restarted process can reload rather than starting from a blank slate. "Let it crash" for a process that holds the only copy of unflushed critical data is just data loss with extra steps.

**Q: How would you test that your fault tolerance actually works, not just that it looks right on paper?**
Inject the failure you claim to tolerate — kill a node, add latency to a dependency, partition the network — in a controlled environment and verify the fallback/failover actually engages within the expected time. This is exactly what chaos engineering (Netflix's Chaos Monkey and successors) formalizes; see `disaster-recovery.md`.

**Q: Give an example where graceful degradation would be the wrong choice.**
Anywhere a stale or default value is unsafe rather than just suboptimal — e.g., degrading a fraud-check service to "always allow" during an outage trades a UX problem for a security/financial one. There, failing hard (blocking the transaction) is the correct trade-off despite the worse user experience.

## Related topics
- [High Availability](high-availability.md)
- [Disaster Recovery](disaster-recovery.md)
- [Zero-Downtime Deployment](zero-downtime-deployment.md)
- [Circuit Breaker Pattern](../01-scaling-traffic/circuit-breaker-pattern.md)
- [Retry & Exponential Backoff](../01-scaling-traffic/retry-exponential-backoff.md)
- [CAP Theorem](../03-consistency-distributed/cap-theorem.md)
- [Leader Election](../03-consistency-distributed/leader-election.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
