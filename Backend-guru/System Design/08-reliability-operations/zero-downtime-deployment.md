# Zero-Downtime Deployment
[← Back to index](../readme.md)

## What it is and why it's asked

Zero-downtime deployment is shipping a new version of a service without any user-facing interruption or dropped request — no maintenance window, no 502s during the switch, no in-flight request silently killed mid-response. It's asked because it's one of the fastest ways to tell whether a candidate has actually operated a service in production versus only designed one on a whiteboard: the failure modes here (dropped connections during restart, a migration that breaks the old code still running alongside the new) are exactly the ones that don't show up until you've been paged for them.

The core insight interviewers want to hear: zero-downtime deployment isn't one trick, it's the conjunction of several — rolling out instances gradually, correctly gating traffic with health checks, draining connections instead of severing them, shutting down processes gracefully, and making sure the database schema works with *both* the old and new code simultaneously, because during a rollout both versions are running at once whether you planned for it or not.

## Rolling deployment mechanics

A rolling deployment replaces old-version instances with new-version instances a few at a time, never taking capacity to zero.

```
Start:   [v1][v1][v1][v1]                      100% v1, serving

Step 1:  [v1][v1][v1][v2 starting]             new instance boots,
                                                not yet receiving traffic

Step 2:  [v1][v1][v1][v2 ready]                v2 passes readiness check,
                                                LB adds it to rotation

Step 3:  [v1 draining][v1][v1][v2]             LB removes one v1,
                                                lets its in-flight requests finish

Step 4:  [v1][v1][v2][v2]  → repeat until →     [v2][v2][v2][v2]
```

Kubernetes' `RollingUpdate` deployment strategy automates exactly this: `maxUnavailable` caps how many old pods can be down at once, `maxSurge` caps how many extra new pods can exist temporarily above the desired replica count, and the rollout only proceeds pod-by-pod as each new pod passes its readiness probe. If a batch of new pods starts crash-looping, the rollout can be configured to pause or auto-rollback rather than replacing 100% of capacity with a broken version.

## Readiness vs liveness probes gating traffic cutover

The two checks are often confused but do different jobs, and mixing them up is a classic zero-downtime-deployment bug:

- **Liveness probe** — "is this process still alive, or should it be killed and restarted?" A failing liveness probe causes a restart. It answers nothing about whether the instance should currently receive traffic.
- **Readiness probe** — "is this process currently able to serve a real request correctly?" A failing readiness probe removes the instance from the load balancer's rotation *without* killing it — useful for "I'm alive but still warming my cache" or "I'm alive but my DB connection just hiccuped."

```
New pod starts
  │
  ├─ liveness probe: process responds → pod stays up (not restarted)
  │
  ├─ readiness probe: fails (still connecting to DB pool, warming cache)
  │     → pod excluded from Service endpoints, receives ZERO traffic
  │
  ├─ readiness probe: passes (DB pool ready, cache warm)
  │     → pod added to Service endpoints, starts receiving traffic
  │
  └─ this is the exact moment traffic cutover happens — gated entirely
     by readiness, never by "the process exists"
```

The zero-downtime guarantee depends on readiness being a *meaningful* check — pinging `/health` that always returns 200 regardless of actual DB connectivity means new instances start receiving real traffic before they can serve it, causing a burst of errors right at the moment you thought you were deploying safely.

## Connection draining

When an old instance is being removed from rotation, severing its connections immediately kills any in-flight request it's mid-way through handling. Connection draining instead:

```
1. LB/orchestrator marks instance "going away" — stops sending NEW connections/requests to it
2. Instance keeps serving requests already in flight / already accepted
3. LB waits up to a configured drain timeout (e.g., 30s) for those to finish naturally
4. After the timeout (whichever comes first: all requests done, or timeout expires),
   the instance is fully removed and can be terminated
```

AWS ALB/NLB calls this "deregistration delay," Kubernetes achieves the same effect via the pod's `terminationGracePeriodSeconds` combined with removing the pod from Service endpoints before sending SIGTERM (endpoint removal and process shutdown are deliberately not simultaneous — there's a brief window where the pod is out of rotation but still able to finish existing work). Getting the timeout right matters: too short and long-running requests get cut off anyway; too long and rollouts take unnecessarily long and tie up resources on instances that are supposed to be going away.

## Graceful shutdown: SIGTERM handling

Orchestrators signal "please shut down" with `SIGTERM` before eventually force-killing with `SIGKILL` if the process hasn't exited. A process that ignores this distinction breaks zero-downtime deployment even with perfect connection draining upstream, because the *process itself* needs to cooperate:

```
Orchestrator sends SIGTERM
      │
      ▼
Application's SIGTERM handler:
  1. Stop accepting new connections/requests immediately
  2. Let in-flight requests finish (respecting the same drain window as the LB)
  3. Close DB connections, flush any buffered logs/metrics, close message
     consumers cleanly (commit offsets, don't leave a message half-processed)
  4. Exit(0) once step 2-3 are done, or when grace period is about to expire

      │  (if process hasn't exited by terminationGracePeriodSeconds)
      ▼
Orchestrator sends SIGKILL — immediate, unconditional termination,
no cleanup possible, any request still in flight is simply dropped
```

A process with no SIGTERM handler (or one that doesn't wait for in-flight work) gets forcibly killed after the grace period regardless — meaning every deploy silently drops whatever requests happened to be mid-flight at that exact moment, which is the single most common cause of "deploys cause a tiny blip of 502s" in services that otherwise look zero-downtime on paper. Kubernetes' default `terminationGracePeriodSeconds` is 30 seconds; long-running requests (large file uploads, long-poll connections) need this tuned higher, or need explicit connection-draining logic that doesn't just wait passively.

## Database migrations: expand/contract for backward compatibility

During a rolling deployment, old code and new code run **simultaneously** against the same database for the whole rollout window — there is no atomic instant where every instance switches at once. If the new code's migration changes the schema in a way the old code can't handle (or vice versa), the deployment isn't zero-downtime, it's a guaranteed window of errors on whichever version can't cope.

The standard pattern is **expand/contract** (also called parallel change), splitting one "risky" schema change into several safe ones:

```
Goal: rename column `email` to `email_address`

BAD (single migration):
  ALTER TABLE users RENAME COLUMN email TO email_address;
  → old code (still running, references `email`) breaks IMMEDIATELY

GOOD (expand/contract, 3+ separate deploys):

  Phase 1 — EXPAND: add the new column, don't remove the old one
    ALTER TABLE users ADD COLUMN email_address VARCHAR;
    Backfill: copy email → email_address for existing rows
    Deploy new app code that WRITES to both columns, READS from old column
    (old code still running elsewhere is completely unaffected — email
     column still exists and still has correct data)

  Phase 2 — MIGRATE READS: deploy app code that reads from the NEW column
    (both columns still exist and are both kept in sync from phase 1)

  Phase 3 — CONTRACT: once 100% of instances are on code that no longer
    references the old column, drop it
    ALTER TABLE users DROP COLUMN email;
```

This is exactly the discipline described in `../02-data-storage/database-migration-at-scale.md` — the general principle: **never ship a migration and the code that depends on it in the same atomic step** if there's any window (and in a rolling deploy, there always is) where old code must still function correctly.

## Trade-offs summary

| Mechanism | What it prevents | Cost if skipped |
|---|---|---|
| Rolling deployment (vs. big-bang restart) | Total capacity drop to zero during deploy | Full outage during every deploy |
| Readiness probes gating traffic | New instance receiving traffic before it can serve it | Error burst right at rollout start |
| Connection draining | In-flight requests severed mid-response | Random dropped requests on every deploy |
| Graceful SIGTERM handling | Forced kill of a process mid-request | Same as above, at the process level |
| Expand/contract migrations | Old code breaking against new schema mid-rollout | Errors for the entire rollout window, not just an instant |

## Common interview follow-ups

**Q: Your deploy looks zero-downtime but users still report occasional errors during releases. What would you check first?**
Whether the readiness probe is meaningful (checks real dependencies, not just "process responds") and whether the app actually handles SIGTERM to drain in-flight work rather than being hard-killed — these two are the most common gaps that make an otherwise correct rolling-deployment setup still drop requests at the edges of the rollout window.

**Q: How long should a rollout take — is faster always better?**
Not necessarily: a faster rollout reduces the window where two versions coexist (less risk of new/old code incompatibility surfacing), but it also means less time to detect a bad version before it reaches 100% of traffic. Canary/gradual-percentage rollouts (see `blue-green-canary-deployment.md`) exist specifically to slow this down deliberately for risk detection, trading rollout speed for blast-radius control.

**Q: What happens if the new version's migration is backward-incompatible and you can't do expand/contract for some reason?**
You lose zero-downtime for that deploy — you'd need an actual maintenance window, or you accept a small error window while old instances are draining, or you deploy the whole fleet as an all-at-once cutover instead of a rolling one (with all downtime risk that implies). This is precisely why expand/contract is treated as close to a hard rule for schema changes in any system with a rolling deploy process, not just a nice-to-have.

**Q: Does zero-downtime deployment guarantee zero-downtime for stateful long-lived connections (WebSockets, gRPC streams)?**
No — those need explicit handling: the server can signal the client to reconnect (a "going away" message) before shutting down, and the client library needs reconnect logic that's transparent to the end user, rather than relying on ordinary HTTP-style connection draining which assumes short-lived requests.

**Q: How is this different from blue-green deployment?**
Rolling deployment gradually replaces old instances with new ones within the same environment/fleet — there's a period where both versions run side by side handling live traffic, and rollback means rolling forward again with the old image. Blue-green keeps two entirely separate full environments and switches all traffic at once — see `blue-green-canary-deployment.md` for the full comparison.

**Q: Why does Kubernetes separate removing a pod from the Service endpoints from sending it SIGTERM, instead of doing both instantly?**
Because load balancer/kube-proxy endpoint updates propagate across the cluster asynchronously — there's a brief window where some nodes' iptables/IPVS rules still point at the pod's IP even after it's been marked for removal. Sending SIGTERM immediately (or worse, SIGKILL) without that buffer would drop requests that are still being routed to the pod during that propagation lag; the pod needs to keep serving briefly even after being marked "going away."

## Related topics
- [Blue-Green & Canary Deployment](blue-green-canary-deployment.md)
- [High Availability](high-availability.md)
- [Fault Tolerance](fault-tolerance.md)
- [Database Migration at Scale](../02-data-storage/database-migration-at-scale.md)
- [Circuit Breaker Pattern](../01-scaling-traffic/circuit-breaker-pattern.md)
