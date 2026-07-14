# Blue-Green & Canary Deployment
[← Back to index](../readme.md)

## What it is and why it's asked

Blue-green and canary are two different answers to the same question: how do you roll out a new version so that if it's bad, you find out with the smallest possible number of affected users and the fastest possible path back to safety? They're often confused with the mechanics of `zero-downtime-deployment.md` (rolling updates, readiness gating, draining), but they answer a different question — not "how do I avoid dropping requests during a deploy" but "how much of my traffic should see the new version, for how long, before I trust it."

Interviewers ask this to see whether you think about deployment risk quantitatively: what fraction of users are exposed if this goes wrong, how fast can you detect "wrong," and how fast can you undo it. A candidate who just says "we use canary deployments" without describing the rollback trigger hasn't actually answered the question.

## Blue-green: two full environments, instant switch

Blue-green deployment runs two complete, independent, identically-provisioned environments — call them "blue" (currently live) and "green" (the new version) — and cuts traffic from one to the other atomically, usually at the router/load-balancer/DNS layer.

```
Before switch:
  Router ──100%──▶ [Blue: v1]  (live)
                   [Green: v2] (fully deployed, warmed, tested, receiving 0% traffic)

Switch (instant, at the router):
  Router ──100%──▶ [Green: v2]  (live)
                   [Blue: v1]   (idle, kept around as instant rollback target)

Rollback if v2 is bad:
  Router ──100%──▶ [Blue: v1]  (flip back, seconds, no redeploy needed)
```

Because the new version is fully deployed and can be tested against production-like conditions (smoke tests, synthetic traffic) *before* it receives a single real user request, and because rollback is just flipping the router back rather than redeploying old code, blue-green gives close to the fastest possible detection-to-rollback cycle of any strategy. The cost is direct: you're paying for two complete production-sized environments, at least during the overlap window (and sometimes continuously, if green is kept warm as blue's permanent standby). It also gives you an all-or-nothing blast radius — the instant you switch, 100% of traffic hits the new version, so a bug that only manifests under real production load/data patterns is discovered by all users at once, not a controlled subset.

Database state is the recurring complication: if blue and green share one database, schema changes must follow the same expand/contract discipline as any rolling deployment (see `zero-downtime-deployment.md`) since both environments' code must tolerate the same schema simultaneously during the overlap window.

## Canary: gradual traffic shift with metric-based rollback

Canary deployment (named after the coal-mine canary — a small, early, disposable signal of danger) exposes the new version to a small percentage of real traffic first, and increases that percentage only if health metrics stay good.

```
Stage 1:   99% → v1        1%  → v2 (canary)
              │                 │
              ▼                 ▼
        watch v2's error rate, p99 latency, business metrics
        for a soak period (minutes to hours)
              │
       ┌──────┴──────┐
       ▼             ▼
   metrics OK    metrics BAD
       │             │
       ▼             ▼
Stage 2:          automatic rollback:
5%  → v2          100% → v1, 0% → v2
       │           (canary killed before
       ▼            most users ever saw it)
Stage 3: 25% → v2
       │
       ▼
Stage 4: 100% → v2  (canary is now the only version — rollout complete)
```

The critical piece is that the "watch metrics, decide whether to proceed" step is usually automated, not a human staring at a dashboard: tools like Argo Rollouts, Flagger, or a managed platform's built-in canary analysis compare the canary's error rate/latency/custom business metric against the stable version's baseline over the soak window, and auto-promote or auto-rollback based on a defined threshold (e.g., "roll back if canary error rate exceeds baseline by more than 1 percentage point for 5 consecutive minutes"). This closes the loop fast, without waiting for a human to notice a dashboard or a page — critical because the whole point of canary is limiting exposure *time*, not just exposure *percentage*.

```
# Simplified Argo Rollouts-style canary spec
strategy:
  canary:
    steps:
      - setWeight: 1
      - pause: {duration: 10m}
      - analysis:
          templates: [error-rate-check]
          # auto-abort rollout if canary error rate > baseline + 1%
      - setWeight: 5
      - pause: {duration: 15m}
      - setWeight: 25
      - pause: {duration: 30m}
      - setWeight: 100
```

Compared to blue-green, canary's blast radius is bounded by design (1% of users see a broken version, not 100%), but the detection-to-rollback path is inherently slower — you're waiting out soak periods at each stage rather than flipping a single switch — and the infrastructure is more complex, since you need fine-grained traffic-splitting (weighted routing, not just an all-or-nothing switch) plus automated analysis wired into your metrics pipeline (see `observability-logs-metrics-traces.md`).

## Feature flags: an orthogonal, complementary technique

Feature flags decouple *deployment* (code is running in production) from *release* (a specific user sees a specific behavior), and they operate at a different layer than blue-green/canary:

```
Blue-green / canary axis:  which INFRASTRUCTURE/BINARY receives the request
Feature flag axis:         which CODE PATH executes once the request arrives

You can canary-deploy a new binary to 5% of instances (infra-level),
AND separately flag a new feature on for 5% of users regardless of
which instance they hit (code-level) — these compose.
```

The key advantage: a feature flag can be flipped off instantly, in milliseconds, without any redeploy or infrastructure change at all — useful for killing a broken feature the moment it's noticed, even faster than a canary rollback (which still requires the traffic-shifting/rollout controller to act). Flags also enable capabilities canary/blue-green alone can't: releasing to a *specific* cohort (internal employees, a beta user list, a particular region) rather than a *random* percentage, and decoupling "when code ships" from "when a product manager wants it visible" (dark launches — the code is live in production, silently, for weeks before the flag is flipped for anyone).

The trade-off is code complexity and technical debt: every flag is a conditional branch that has to be maintained, tested in both states, and eventually cleaned up once the rollout is complete — a codebase with hundreds of stale flags nobody's removed is a well-known failure mode (LaunchDarkly, Split, and Unleash all build tooling specifically around flag lifecycle/cleanup for this reason).

## Comparison

| | Blue-Green | Canary | Feature Flags |
|---|---|---|---|
| Rollback speed | Seconds (flip router back) | Minutes (traffic reduction) to slower if manual | Milliseconds (flip flag) |
| Blast radius if bad | 100% instantly | Bounded (1% → 5% → ...) by design | Configurable per-cohort, independent of infra |
| Infra cost | High (2x full environments, at least during overlap) | Low-moderate (weighted routing, not full duplicate) | Low (flag evaluation service/SDK only) |
| Complexity | Moderate (environment duplication, DB compatibility) | Higher (traffic splitting + automated metric analysis) | Moderate (flag lifecycle management, code branching) |
| Detects real-traffic-pattern bugs before most users see them | No (100% exposed at switch) | Yes (small % exposed first) | Depends on rollout percentage configured |
| Typical automation | Manual or scripted switch | Automated promote/rollback via metrics | Manual or gradual percentage rollout via flag service |

## Common interview follow-ups

**Q: When would you choose blue-green over canary?**
When you need the fastest possible, cleanest rollback path and can afford the 2x infrastructure cost — e.g., a major version bump with a risky migration where you want an instant, total revert option rather than a gradual traffic shift, or when your traffic-splitting infrastructure doesn't support fine-grained weighted routing and building it isn't worth the investment for this deploy.

**Q: What's the biggest operational risk specific to blue-green that canary doesn't have?**
The all-or-nothing exposure: bugs that only manifest under real production load, real data distributions, or rare edge-case inputs get discovered by 100% of your traffic simultaneously the instant you switch, rather than being caught in a 1% sample first. Canary's gradual exposure is specifically designed to catch exactly this class of bug cheaply.

**Q: How do you decide the canary soak duration and percentage steps?**
Base it on how long it takes your key metrics to reliably reflect a problem — if a memory leak only shows up after 20 minutes under load, a 5-minute soak won't catch it regardless of how careful the percentage ramp is. Percentage steps should be small enough at the start that a bad canary affects a tolerable number of real users (1% of a million-user service is still 10,000 people), then grow geometrically once confidence increases.

**Q: Are blue-green and canary mutually exclusive?**
No — you can canary within one side of a blue-green pair (route a small percentage of "blue" traffic to "green" before the full cutover), combining bounded blast radius with the instant-rollback safety net of keeping the old environment fully intact. Many managed platforms (e.g., AWS CodeDeploy, Kubernetes with Argo Rollouts) support exactly this hybrid.

**Q: If feature flags can roll back instantly, why bother with canary deployment at all?**
Feature flags only control code paths that were explicitly wrapped in a flag — they don't protect you from bugs in code that wasn't flagged (a memory leak in a shared library, a change to how a request is parsed before it ever reaches flagged logic). Canary/blue-green operate at the deployment level and catch *any* regression in the new binary, flagged or not, which is why teams use both layers together rather than treating flags as a full substitute.

**Q: What's a concrete failure mode of relying only on feature flags without a deployment strategy?**
If the new binary itself has a startup crash, a memory leak, or a dependency incompatibility unrelated to the flagged feature, no flag can save you — the instances are broken regardless of flag state, and you need canary/blue-green's infrastructure-level rollback (revert to the old binary) rather than a flag flip, because there's no "old behavior" to fall back to within the same broken process.

## Related topics
- [Zero-Downtime Deployment](zero-downtime-deployment.md)
- [High Availability](high-availability.md)
- [Fault Tolerance](fault-tolerance.md)
- [Observability: Logs, Metrics & Traces](observability-logs-metrics-traces.md)
- [Database Migration at Scale](../02-data-storage/database-migration-at-scale.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
