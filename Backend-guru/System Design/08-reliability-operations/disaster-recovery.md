# Disaster Recovery
[← Back to index](../readme.md)

## What it is and why it's asked

Disaster Recovery (DR) is the plan for recovering from catastrophic failures that High Availability (HA) cannot automatically handle. Examples include an entire cloud region going offline, accidental production data deletion, ransomware encrypting databases, corrupted deployments, or natural disasters.

High Availability focuses on surviving **component failures** (servers, disks, AZ failures) with little or no downtime. Disaster Recovery focuses on surviving **large-scale failures** while restoring both the application and the data correctly.

Interviewers ask this topic to evaluate whether you understand:

- The difference between HA and DR.
- Recovery Time Objective (RTO) and Recovery Point Objective (RPO).
- The trade-off between infrastructure cost and recovery speed.
- Why backups alone are not a DR strategy unless they can actually be restored.

---

## Recovery Time Objective (RTO) and Recovery Point Objective (RPO)

These two numbers define every disaster recovery strategy.

### Recovery Time Objective (RTO)

RTO is the maximum acceptable downtime.

It measures:

> **How long can the application remain unavailable after a disaster?**

Example:

If the business requires service restoration within 30 minutes:

```
RTO = 30 minutes
```

---

### Recovery Point Objective (RPO)

RPO measures acceptable data loss.

It answers:

> **How much recent data can be lost after recovery?**

Example:

If backups occur every hour:

```
Disaster occurs at 10:45

Last backup:
10:00

Lost data:
45 minutes

RPO = 45 minutes
```

---

### Timeline

```
Last Backup        Disaster          Service Restored
     |                 |                    |
-----+-----------------+--------------------+---------> Time
     |<---- RPO ----->|<------ RTO ------->|
```

- **RPO** = lost data
- **RTO** = downtime

They are independent.

You can have:

- Excellent RPO but poor RTO.
- Excellent RTO but poor RPO.
- Excellent values for both (very expensive).

---

## Example

Suppose an e-commerce database:

- Daily backup at 2:00 AM
- Disaster at 1:00 PM

Using only backups:

```
Lost orders:
11 hours

RPO = 11 hours
```

If continuous WAL/binlog replication exists:

```
Lost orders:
Only transactions not yet replicated

RPO ≈ seconds
```

Now suppose restoring infrastructure takes:

```
20 minutes

RTO = 20 minutes
```

Notice:

- RPO concerns **data**.
- RTO concerns **availability**.

---

## Backup Types

### Full Backup

Copies every piece of data.

```
Database
   |
Complete Copy
```

Advantages

- Simplest restoration
- Independent backup

Disadvantages

- Slow
- Large storage usage

---

### Incremental Backup

Stores only changes since the previous backup.

```
Monday      Full

Tuesday     Incremental

Wednesday   Incremental

Thursday    Incremental
```

Restore Thursday:

```
Full
+
Tuesday
+
Wednesday
+
Thursday
```

Advantages

- Fast backups
- Small storage

Disadvantages

- Slow restoration
- Broken backup chain prevents recovery

---

### Differential Backup

Stores changes since the last full backup.

```
Monday      Full

Tuesday     Differential

Wednesday   Differential

Thursday    Differential
```

Restore Thursday:

```
Full
+
Thursday Differential
```

Advantages

- Faster restoration
- Simpler than incremental

Disadvantages

- Differential grows larger each day

---

## Point-in-Time Recovery (PITR)

Modern databases continuously archive transaction logs.

Examples:

- PostgreSQL WAL
- MySQL Binlog
- MongoDB Oplog

Instead of restoring only to the latest backup, PITR restores to **any moment**.

Example:

```
Backup:
2:00 AM

Bug corrupts data:
2:43 PM

Restore to:
2:42:59 PM
```

This minimizes data loss.

Cloud databases such as Amazon RDS use:

- Daily snapshots
- Continuous transaction logs

to provide point-in-time recovery.

---

## Disaster Recovery Strategies

Recovery strategies exist on a spectrum.

Higher availability always means higher cost.

---

### 1. Backup and Restore

Nothing runs in the disaster recovery region.

```
Production

    |
 Backups
    |
 Object Storage
```

During disaster:

1. Provision infrastructure.
2. Restore backup.
3. Start application.

Characteristics

- Lowest cost
- Slowest recovery
- Highest downtime

Typical values

- RTO: Hours to days
- RPO: Hours

Good for:

- Internal tools
- Small applications
- Non-critical systems

---

### 2. Pilot Light

Critical data remains running continuously.

Application servers do not.

```
Primary Region

Application
Database

        ||

DR Region

Database Replica
```

During disaster:

- Promote replica.
- Deploy application servers.
- Redirect traffic.

Characteristics

- Faster than backup & restore
- Low infrastructure cost

Typical values

- RTO: Tens of minutes
- RPO: Minutes

---

### 3. Warm Standby

A complete but reduced-capacity environment always runs.

```
Primary

100%

DR

20%
```

During disaster:

- Scale DR environment.
- Redirect traffic.

Characteristics

- Fast recovery
- Moderate infrastructure cost

Typical values

- RTO: Minutes
- RPO: Seconds to minutes

---

### 4. Multi-Site Active-Active

Multiple regions simultaneously serve production traffic.

```
Users

      |
+-----+------+
|            |
Region A   Region B
```

If one region fails:

Traffic automatically shifts to the remaining regions.

Characteristics

- Highest availability
- Highest cost
- Highest operational complexity

Typical values

- RTO: Near zero
- RPO: Near zero

---

## Disaster Recovery Strategy Comparison

| Strategy | Relative Cost | Typical RTO | Typical RPO | DR Site Before Disaster |
|-----------|--------------:|------------:|------------:|-------------------------|
| Backup & Restore | $ | Hours–Days | Hours | Nothing |
| Pilot Light | $$ | Tens of Minutes | Minutes | Database replica only |
| Warm Standby | $$$ | Minutes | Seconds–Minutes | Reduced-capacity full stack |
| Active-Active | $$$$ | Near Zero | Near Zero | Full production environment |

---

## Disaster Recovery Testing

A backup that has never been restored is only a theory.

Recovery procedures must be tested regularly.

---

### Tabletop Exercise

The team walks through disaster scenarios.

Example:

- Region failure
- Database corruption
- DNS outage

No systems are modified.

Useful for validating documentation and runbooks.

---

### Game Day

A controlled disaster is intentionally triggered.

Examples

- Shut down production servers.
- Disable a database.
- Simulate network failures.

The team performs the real recovery process.

Benefits

- Measures actual RTO.
- Verifies automation.
- Finds operational gaps.

---

### Full Failover Drill

Actually move production traffic to the disaster recovery site.

Example:

```
Region A

↓

Traffic

↓

Region B
```

This validates:

- DNS updates
- Load balancers
- Replication
- Monitoring
- Capacity

Many large companies regularly perform failover drills because untested recovery plans often fail during real disasters.

---

## High Availability vs Disaster Recovery

| High Availability | Disaster Recovery |
|-------------------|-------------------|
| Handles component failures | Handles catastrophic failures |
| Automatic failover | Often manual or semi-automated |
| Seconds of downtime | Minutes to days depending on strategy |
| Same region or AZ | Cross-region or cross-site |
| Keeps services running | Restores services after major failure |

Examples

HA:

- Server crashes
- VM failure
- Availability Zone failure

DR:

- Region outage
- Database corruption
- Ransomware
- Human error
- Natural disasters

---

## Trade-offs

| Dimension | Backup & Restore | Active-Active |
|-----------|------------------|---------------|
| Infrastructure Cost | Very Low | Very High |
| Downtime | Long | Near Zero |
| Data Loss | Higher | Minimal |
| Operational Complexity | Low | High |

Lower downtime always requires higher infrastructure investment.

---

## Best Practices

- Define RTO and RPO with business stakeholders.
- Store backups in a separate region.
- Use immutable backups against ransomware.
- Continuously archive database transaction logs.
- Automate infrastructure with Infrastructure as Code (Terraform, CloudFormation).
- Test recovery regularly through game days and failover drills.
- Monitor replication lag.
- Document recovery procedures.
- Verify backups by performing actual restores.

---

## When to Choose Each Strategy

### Backup & Restore

Choose when:

- Budget is limited.
- Downtime of hours is acceptable.
- Some data loss is acceptable.

Examples:

- Internal tools
- Small business applications

---

### Pilot Light

Choose when:

- Moderate recovery speed is required.
- Infrastructure cost should remain low.

Examples:

- Mid-sized SaaS products

---

### Warm Standby

Choose when:

- Business cannot tolerate long outages.
- Moderate infrastructure cost is acceptable.

Examples:

- E-commerce
- Customer portals

---

### Active-Active

Choose when:

- Downtime is unacceptable.
- Data loss must be nearly zero.
- Business justifies the cost.

Examples:

- Banking
- Payment systems
- Healthcare
- Global SaaS platforms

---

## Rule of Thumb

Ask two questions:

> How much downtime is acceptable?

This determines **RTO**.

> How much data can be lost?

This determines **RPO**.

The answers determine the disaster recovery strategy.

---

## Common Interview Questions

### Q: What's the difference between HA and DR?

HA automatically survives infrastructure failures with minimal interruption.

DR restores the system after catastrophic failures such as region outages or data corruption and is measured by RTO and RPO.

---

### Q: Why isn't Active-Active enough?

Active-Active protects against infrastructure failures.

It does **not** protect against corrupted data or bad deployments because those problems replicate across every active region.

Backups and point-in-time recovery are still required.

---

### Q: Why is Point-in-Time Recovery important?

If data corruption begins at 2:43 PM, restoring the latest backup may still contain the corrupted data.

PITR restores the database to a precise moment before corruption occurred.

---

### Q: How often should disaster recovery be tested?

At least:

- Quarterly
- After major architecture changes
- Before compliance audits

Recovery plans become outdated if they are never executed.

---

### Q: What is a pilot light?

A minimal disaster recovery environment where only the critical data layer stays continuously synchronized.

During a disaster, application servers are deployed around the already-current database, allowing much faster recovery than restoring everything from backups.

---

### Q: A stakeholder asks for zero downtime and zero data loss. What does that imply?

It implies:

- **RTO = 0**
- **RPO = 0**

Achieving both requires multi-site active-active architecture with synchronous replication, significantly increasing infrastructure cost, operational complexity, and write latency. In practice, businesses usually reserve these guarantees only for their most critical workloads.
## Related topics
- [High Availability](high-availability.md)
- [Fault Tolerance](fault-tolerance.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
- [Database Migration at Scale](../02-data-storage/database-migration-at-scale.md)
- [CAP Theorem](../03-consistency-distributed/cap-theorem.md)
- [Zero-Downtime Deployment](zero-downtime-deployment.md)
