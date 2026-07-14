# Disaster Recovery
[← Back to index](../readme.md)

## What it is and why it's asked

Disaster recovery (DR) is the plan for what happens when high availability *fails to save you* — the whole region goes down, a bad deploy corrupts data, ransomware encrypts your primary database, or someone runs `DROP TABLE` in production. HA handles component failures automatically and in seconds; DR handles the failures that are big enough, rare enough, or destructive enough that automation alone can't be trusted, and answers "how do we get back to serving correct data at all."

Interviewers ask about DR to check two things: whether you can quantify how much data loss and downtime are actually acceptable (most candidates say "zero" without meaning it), and whether you understand DR is a spectrum of cost vs. recovery speed, not a binary "we have backups" checkbox.

## RTO and RPO: the two numbers that define your DR strategy

- **RTO (Recovery Time Objective)** — how long you're allowed to be down before service is restored. Measured from the moment of disaster to the moment the system is serving again.
- **RPO (Recovery Point Objective)** — how much data you're allowed to lose, measured in time. It's the gap between your last durable backup/replica and the moment of disaster.

```
        Last backup           Disaster            Service restored
             │                    │                       │
─────────────┼────────────────────┼───────────────────────┼──────────▶ time
             │◄──── RPO ─────────►│◄──────── RTO ─────────►│
        (data in this          (system down          (system back up,
         window is lost)        during this)          data as of RPO point)
```

**Worked example — e-commerce order database:**
- Nightly backup at 2 AM, disaster strikes at 1 PM.
- If restore is only from that nightly backup: RPO = 11 hours (every order placed since 2 AM is gone).
- If there's also continuous WAL/binlog shipping to a replica that survives the disaster: RPO can be seconds (only in-flight, unreplicated transactions are lost).
- RTO is separate: even with a perfect RPO=0 replica, if promoting it, updating DNS, and warming caches takes 20 minutes, your RTO is 20 minutes.

**Worked example — internal analytics dashboard:**
- RPO of 24 hours is fine (losing a day of aggregated reporting data is a shrug).
- RTO of "next business day" is fine too — nobody's revenue depends on it being up at 2 AM.

The business, not the engineering team, should set these numbers — but the engineering team must translate them honestly into cost, because RPO near zero and RTO near zero together (see the spectrum below) is the most expensive point on the chart.

## Backup strategies: full, incremental, differential

- **Full backup** — a complete copy of all data. Simple to restore (one file/set), but slow to create and expensive to store repeatedly.
- **Incremental backup** — only what changed since the *last backup of any kind* (full or incremental). Fast and cheap to create, but restoring means replaying the full backup plus every incremental since, in order — a broken link in the chain breaks the whole restore.
- **Differential backup** — only what changed since the *last full backup*. Restoring needs just the full backup plus the latest differential (no chain), at the cost of each differential growing larger the longer it's been since the last full.

```
Full ──── Incr ──── Incr ──── Incr ──── Incr        (incremental chain)
 Mon        Tue       Wed       Thu       Fri
 Restore Thursday's state: Full + Tue + Wed + Thu

Full ──── Diff ──── Diff ──── Diff ──── Diff         (differential, each vs Full)
 Mon        Tue       Wed       Thu       Fri
 Restore Thursday's state: Full + Thu (only)
```

Real systems combine these: a weekly full + daily incrementals is standard for cost; databases add continuous transaction-log shipping (Postgres WAL archiving, MySQL binlog replication, MongoDB oplog tailing) on top so RPO isn't bounded by "since last incremental" at all. AWS RDS automated backups work this way — daily snapshot plus continuous transaction logs, enabling point-in-time restore to any second within the retention window, not just to a backup boundary.

## The DR strategy spectrum

DR strategies trade cost for recovery speed. AWS's well-known framing (from its Well-Architected DR whitepaper) names four points on this spectrum:

**1. Backup & restore** — data is backed up (often to cheap object storage, e.g. S3/Glacier) with no standby infrastructure running at all. On disaster, you provision infrastructure from scratch and restore data into it.

**2. Pilot light** — a minimal, always-on skeleton of critical infrastructure exists in the DR site (e.g., a database replica staying in sync, but no running application servers). On disaster, you scale up the app tier around the already-warm data core.

**3. Warm standby** — a scaled-down but fully functional replica of the production environment runs continuously in the DR site (all tiers present, just smaller capacity). On disaster, you scale it up to full capacity and cut traffic over.

**4. Multi-site active-active** — full-capacity environments run simultaneously in two or more sites, both serving live production traffic. "Disaster recovery" for one site is just "the other site(s) absorb the load," the same failover pattern as active-active HA but applied at the region/site level.

```
Backup & Restore        Pilot Light         Warm Standby        Multi-Site Active-Active
   $                       $$                   $$$                    $$$$
   RTO: hours-days         RTO: 10s of min      RTO: minutes           RTO: near-zero
   RPO: hours              RPO: minutes         RPO: seconds-minutes   RPO: near-zero
   Nothing running          DB replica only      Full stack, scaled    Full stack, full
   in DR site               running              down, running        capacity, both live
```

| Strategy | Relative cost | Typical RTO | Typical RPO | What's running in DR site beforehand |
|---|---|---|---|---|
| Backup & restore | $ | Hours–days | Hours | Nothing (backups in object storage) |
| Pilot light | $$ | Tens of minutes | Minutes | Core data store replicated, app tier off |
| Warm standby | $$$ | Minutes | Seconds–minutes | Full stack at reduced scale |
| Multi-site active-active | $$$$ | Near-zero | Near-zero | Full stack at full scale, serving traffic |

Choosing a point on this spectrum is exactly the RTO/RPO conversation made concrete: a startup's internal tool is happily backup-and-restore; a bank's payment ledger needs something close to multi-site active-active, and will pay for it.

## DR testing and game days

A DR plan that has never been executed is a hypothesis, not a plan — restore scripts rot, IAM permissions drift, runbooks reference services that no longer exist, and nobody remembers which Slack channel to page. DR testing closes that gap:

- **Tabletop exercises** — walk through the failure scenario on paper/in a meeting, no systems touched. Cheap, catches obvious gaps in the runbook, doesn't catch technical rot.
- **Game days** — actually trigger the failure (or a close simulation) in a controlled window and watch the team execute the real recovery, timing it against the RTO/RPO targets. Netflix's **Chaos Monkey** (part of the Simian Army, later generalized into the open-source Chaos Toolkit / Gremlin-style commercial tools) is the direct ancestor of this practice: it randomly terminates production instances *during business hours*, forcing engineers to build systems that survive it by default rather than finding out during an actual 3 AM incident that failover doesn't work.
- **Full failover drills** — periodically actually fail over to the DR site/region for real traffic (not just a test slice), because "the replica has data" and "the replica can actually serve production load and DNS cutover works end-to-end" are different claims. AWS's own guidance and many large shops (Netflix's region-eviction exercises, Google's DiRT — Disaster Recovery Testing — program) run these on a schedule specifically because untested failover paths reliably fail when finally needed for real.

```
Chaos Monkey lineage:
Chaos Monkey       → kills random instances (compute-level fault injection)
Chaos Kong         → evicts an entire AWS region (region-level DR drill)
Latency Monkey     → injects artificial latency (degradation testing)
Simian Army (retired) → generalized into Netflix's internal chaos platform / ChAP
```

The core lesson generalizes beyond Netflix: **the only backup you can trust is one you have restored, and the only failover you can trust is one you have executed.**

## Trade-offs summary

| Dimension | Cheap end of spectrum | Expensive end of spectrum |
|---|---|---|
| Standing infrastructure cost | None (backups only) | Full duplicate active capacity |
| RTO | Hours to days | Seconds |
| RPO | Hours | Near-zero |
| Operational complexity | Low (just backups + a runbook) | High (active data sync, traffic routing, split-brain risk) |
| Failure mode if untested | Runbook/restore fails silently until needed | Same risk, but blast radius of a live-traffic site is bigger |

## Common interview follow-ups

**Q: A stakeholder says "we need zero data loss and zero downtime." How do you respond?**
Translate it literally: RPO=0 and RTO=0 means multi-site active-active with synchronous cross-site replication, which has real latency and cost implications (see `../03-consistency-distributed/cap-theorem.md` — synchronous replication across sites is a CP choice with a latency tax). Push back by asking what specific data/flows truly need that guarantee versus what's said reflexively; usually only a subset (payments ledger) needs it while the rest can tolerate a warm-standby RPO of seconds.

**Q: What's the difference between DR and HA?**
HA handles component-level failures automatically, continuously, usually within the same region/AZ topology, and requires no manual invocation. DR handles catastrophic, often region-scale or data-integrity-scale events, may be manually triggered, and is measured against explicit RTO/RPO targets agreed on in advance rather than "just stay up."

**Q: Why not just run multi-site active-active for everything — doesn't it solve DR too?**
Cost scales with it directly (running 2x+ full capacity everywhere), and it doesn't fix every disaster class — a bad deploy or data corruption bug will happily replicate itself to every active site in milliseconds. Backups/point-in-time-restore are still required even in an active-active topology, for the "the code corrupted the data" failure mode that redundancy alone can't fix.

**Q: How do you handle a disaster caused by bad data (not infrastructure failure) — e.g., a bug that silently corrupted records for six hours?**
This is exactly why point-in-time restore (not just "restore the latest backup") matters — you need to roll back to a specific timestamp before the corruption started, which requires continuous transaction-log shipping, not just periodic full backups. It's also why some critical systems keep an immutable/append-only audit log independent of the mutable store, so you can reconstruct correct state even if the primary store was corrupted in place.

**Q: How often should DR be tested, and who should be involved?**
At minimum whenever the architecture changes materially (new dependency, new region, new data store), plus on a fixed cadence (quarterly game days are common) regardless of changes, because infrastructure drifts even when nobody intended it to. It should involve the actual on-call engineers who'd execute the real recovery, not just the architects who designed it on a whiteboard — tacit knowledge gaps are exactly what game days surface.

**Q: What's a pilot light, concretely, in AWS terms?**
An RDS read replica (or cross-region replicated snapshot) kept current in the DR region, with the application AMIs/container images and infra-as-code (CloudFormation/Terraform) ready to deploy but not currently running any EC2/ECS capacity. On disaster, you run the IaC to stand up the app tier around the already-current database, which is far faster than restoring from a cold snapshot from scratch.

## Related topics
- [High Availability](high-availability.md)
- [Fault Tolerance](fault-tolerance.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
- [Database Migration at Scale](../02-data-storage/database-migration-at-scale.md)
- [CAP Theorem](../03-consistency-distributed/cap-theorem.md)
- [Zero-Downtime Deployment](zero-downtime-deployment.md)
