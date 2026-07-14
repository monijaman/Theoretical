# Design a Distributed Job Scheduler
[← Back to index](../readme.md)

## 1. Requirements

**Functional**
- Users define jobs on a schedule (cron expression, e.g. `0 */6 * * *`) or as one-off future-dated tasks.
- Support job dependencies — a DAG where job B only runs after job A succeeds.
- Distribute job execution across a pool of workers, retrying on failure per a configurable policy.
- Recover missed schedules after scheduler downtime (catch-up or skip, configurable per job).
- Provide visibility: job run history, current status, logs/output.

**Non-functional**
- Exactly-once *triggering* per scheduled occurrence — a job must not fire twice for the same scheduled time due to scheduler failover, nor silently never fire.
- High availability of the scheduler itself (it's a single logical component conceptually, but must not be a single point of failure operationally).
- Horizontal scalability of the worker pool independent of the scheduler's own scale.
- Execution semantics must be clearly documented and honest: true exactly-once *execution* (the job's side effect happening precisely once) is generally impossible to guarantee for arbitrary jobs — the system guarantees exactly-once *triggering* and at-least-once *delivery* to a worker, and relies on job idempotency for the rest (see 6.3).

**Assumptions**
- 500,000 scheduled job definitions, average job fires every ~4 hours → roughly 500,000 × 6/day ≈ 3M job executions/day.
- Jobs range from sub-second tasks to multi-hour batch pipelines; a meaningful fraction (~5%) are part of a DAG with dependencies.

## 2. Capacity Estimation

**Trigger rate**
- 3,000,000 executions/day ≈ 3,000,000 / 86,400 ≈ **~35 triggers/sec average**; scheduling is inherently bursty at round clock boundaries (a huge fraction of cron jobs are scheduled `0 * * * *` or `0 0 * * *` — on the hour/day) → peak trigger bursts can be 50-100x average for a few seconds at the top of each hour, e.g. ~2,000-3,500 simultaneous triggers.
- This "thundering herd at :00" pattern is a first-class design concern, not an edge case — see 6.1.

**Scheduler state**
- 500,000 job definitions × ~500 bytes (cron expr, next-run time, dependency refs, retry policy) ≈ 250 MB — comfortably fits in memory on a single scheduler node, but must be durably persisted and replicated for failover.
- Job run history: 3M executions/day × ~1KB (status, timestamps, exit code, log pointer) ≈ 3 GB/day, ~1.1 TB/year — a straightforward time-partitioned, archivable dataset.

**Worker pool sizing**
- Assume average job runtime 2 minutes, 35 triggers/sec average → concurrent in-flight jobs ≈ 35 × 120 ≈ ~4,200 concurrent executions at steady state; provision worker pool capacity for peak burst (~3,500 simultaneous triggers × assume most are short) with headroom, i.e. several thousand worker slots, auto-scaled.

**Queue throughput**
- The task queue between scheduler and workers must absorb the burst multiplier (50-100x momentary spikes) without the scheduler blocking — a durable queue (Kafka/SQS-style) sized for burst absorption, not just average throughput, exactly analogous to the logging system's Kafka buffer role.

## 3. High-Level Architecture

```
┌───────────────────┐
│  Job Definitions DB │  (cron expr, DAG deps, retry policy — durable source of truth)
└─────────┬──────────┘
          │
┌─────────▼──────────┐        ┌────────────────────┐
│  Scheduler Leader     │◀──────▶│  Leader Election      │  (ZooKeeper/etcd — only one active scheduler)
│  (evaluates cron,     │        │  (see leader-election)│
│   emits due triggers) │        └────────────────────┘
└─────────┬──────────┘
          ▼
┌───────────────────┐
│  Task Queue (Kafka) │  (durable, absorbs trigger bursts)
└─────────┬──────────┘
          ▼
┌───────────────────┐      ┌────────────────────┐
│  Worker Pool          │──────▶│  Job Execution Sandbox│ (container/process per job run)
│  (auto-scaled)         │      └────────────────────┘
└─────────┬──────────┘
          ▼
┌───────────────────┐
│  Run History Store    │──▶ Dashboards / alerting on failures
└───────────────────┘
          ▲
┌─────────┴──────────┐
│  DAG Coordinator      │  (tracks dependency completion, triggers downstream jobs)
└───────────────────┘
```

**Walkthrough**
1. **Definition**: a user registers a job with a cron expression (or dependency spec) and retry policy, persisted durably in the Job Definitions DB.
2. **Leader evaluates schedule**: a single active Scheduler Leader (elected via a consensus-backed leader-election mechanism — see 6.2) continuously evaluates which jobs are due, computing next-run times from cron expressions.
3. **Trigger emission**: when a job is due, the leader emits a trigger message to a durable Task Queue rather than executing the job itself — this decouples "deciding a job should run" from "actually running it," and is what makes exactly-once triggering tractable independent of worker availability.
4. **Worker execution**: workers pull from the queue, execute the job (in an isolated sandbox/container), report success/failure, and the queue's consumer-offset/ack mechanism ensures a crashed worker's in-flight job gets redelivered to another worker (at-least-once delivery to a worker).
5. **DAG coordination**: for dependent jobs, a coordinator tracks completion of upstream jobs and only enqueues a downstream job's trigger once all its dependencies have succeeded for the corresponding run.
6. **History & recovery**: every trigger and execution outcome is durably recorded; on scheduler restart/failover, the new leader consults this history plus persisted next-run times to determine what was missed and apply the configured catch-up policy (6.4).

## 4. API Design

```
POST /api/v1/jobs
Request:
{
  "name": "nightly-billing-rollup",
  "schedule": "0 2 * * *",
  "command": "run://billing-rollup:v3",
  "depends_on": ["nightly-usage-aggregation"],
  "retry_policy": { "max_attempts": 3, "backoff": "exponential", "base_delay_seconds": 60 },
  "missed_schedule_policy": "run_once"      // or "skip" | "run_all_missed"
}
Response: 201 { "job_id": "job_88213", "next_run_at": "2026-07-15T02:00:00Z" }

GET /api/v1/jobs/{job_id}/runs?limit=20
Response: 200
{ "runs": [ { "run_id": "run_9f2a", "status": "succeeded", "started_at": "...", "duration_ms": 41200 } ] }

POST /api/v1/jobs/{job_id}/trigger     // manual/ad-hoc run, bypasses schedule
Response: 202 { "run_id": "run_7B31", "status": "queued" }

PATCH /api/v1/jobs/{job_id}  { "schedule": "0 */4 * * *" }   // reschedule
```

## 5. Data Model & Storage Choice

```
job_definitions
  job_id PK, name, cron_expr, next_run_at (indexed), depends_on[], retry_policy(JSON),
  missed_schedule_policy, is_paused

job_runs (append-mostly, time-partitioned)
  run_id PK, job_id (indexed), scheduled_for, started_at, finished_at, status, attempt_number, worker_id

dag_edges
  upstream_job_id, downstream_job_id
```

Job definitions need transactional consistency (updating a schedule or pausing a job must be immediately, reliably visible to the single active scheduler leader) but at modest volume (500K definitions) — a relational database (Postgres) is the natural fit, with `next_run_at` indexed for the leader's "what's due" polling/range query. Job runs are high-volume, append-mostly, and naturally time-partitioned — still relational for consistency with job definitions (foreign key to job_id, easy joins for "show me recent failures for job X"), but partitioned/archived aggressively by time, following the same time-partitioning pattern as the logging and metrics systems' hot/cold tiering. Per [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md), this is a moderate-scale, consistency-sensitive workload that doesn't need NoSQL's horizontal write scale — the interesting distributed-systems problems here are in coordination (leader election, exactly-once triggering), not storage scale.

## 6. Deep Dive

### 6.1 The thundering-herd-at-:00 problem

Because most cron schedules land on round boundaries (`0 * * * *`, `*/5 * * * *`), naive trigger evaluation causes enormous synchronized bursts at every hour/minute boundary — 2,000+ jobs all becoming "due" within the same second. Mitigations: **jittering** trigger emission (spread triggers for jobs due at the same instant across a short window, e.g., a few seconds, unless a job explicitly requires exact-time execution), sizing the task queue and worker auto-scaler for burst absorption rather than average load (per the capacity estimate), and prioritizing triggers so time-sensitive jobs aren't starved behind a flood of less time-sensitive ones sharing the same nominal trigger time.

### 6.2 Leader election to avoid duplicate triggering

If more than one scheduler instance independently evaluated cron expressions and emitted triggers, every due job would fire multiple times — a direct violation of exactly-once triggering. The standard fix is to run multiple scheduler instances for availability but ensure only one is ever *active* at a time via [leader election](../03-consistency-distributed/leader-election.md) backed by a consensus system (ZooKeeper, etcd, or Consul) — the active leader holds a renewable lease; if it crashes or is partitioned, the lease expires and another instance is elected, resuming trigger evaluation from durably persisted state (next-run times, last-evaluated timestamp). The brief gap during failover (the lease timeout period, typically seconds) is an accepted small window where no new triggers fire — recovered via the missed-schedule catch-up logic (6.4) rather than trying to eliminate the gap entirely, which would require a much more complex active-active design for marginal benefit.

### 6.3 Exactly-once execution is a myth — what we actually guarantee

It's important to be precise about what "exactly-once" means here, because true exactly-once *execution* of an arbitrary job (its real-world side effect happening precisely once) is not something a scheduler can generally guarantee — a worker could execute a job fully, then crash before reporting success, leaving the scheduler unable to distinguish "job never ran" from "job ran but ack was lost," and any retry in that ambiguous case risks a double-execution. What the system *can* honestly guarantee: **exactly-once triggering** (a scheduled occurrence generates exactly one trigger message, thanks to single-leader evaluation), and **at-least-once delivery** to a worker (the task queue redelivers on ack timeout/crash). The gap between "at least once delivered" and "exactly once executed" is closed the same way the payment system closes it (see [payment-system.md](payment-system.md) 6.1) — by requiring jobs to be **idempotent** (safe to run twice with the same input producing the same end state), which is a contract the job author must uphold (e.g., an "upsert the day's rollup" job is naturally idempotent; a "append a row" job is not unless it also checks for an existing row first).

### 6.4 Handling missed schedules after downtime

If the scheduler (or its leader) is down across one or more scheduled occurrences, each job's `missed_schedule_policy` determines recovery behavior on restart: `skip` (don't run missed occurrences at all — appropriate for jobs where only the *latest* state matters, e.g., "refresh this cache"), `run_once` (run a single catch-up execution representing all missed occurrences collapsed together — appropriate for most rollup/aggregation jobs), or `run_all_missed` (execute once per missed occurrence, in order — appropriate when each occurrence has distinct, necessary side effects, e.g., per-hour billing snapshots that must each individually exist). The new leader, on election, compares each job's `next_run_at` against the current time and its cron schedule to compute exactly which occurrences were missed, then applies the configured policy — this is why persisting `next_run_at` durably (not just computing it lazily in memory) is essential for correct recovery.

### 6.5 DAG dependency ordering

For jobs with `depends_on`, the DAG Coordinator only enqueues a downstream job's trigger once every upstream dependency has reported success *for the corresponding scheduled run* (matching by logical schedule time, not wall-clock proximity, since an upstream job might be delayed). This requires tracking per-run completion state per node in the DAG, and handling partial-failure semantics (does a downstream job run at all if one upstream branch fails? — typically no, propagating the failure downward and alerting, rather than silently proceeding with incomplete inputs). Cyclic dependency detection is enforced at job-definition time (reject a DAG edge that would create a cycle) rather than discovered at runtime.

## 7. Bottlenecks & Scaling

- **10x job definitions (5M jobs)**: scheduler leader's "what's due" evaluation must scale — shard job definitions across multiple scheduler-leader partitions (each partition independently leader-elected, each responsible for a hash-partitioned subset of job IDs) rather than one leader evaluating all 5M jobs serially.
- **Worker pool under trigger bursts**: auto-scale workers based on queue depth/lag rather than a fixed pool size, and apply the jittering from 6.1 to smooth bursts before they even hit the queue.
- **DAG coordinator as a bottleneck for highly interconnected DAGs**: partition DAG state by root-job/pipeline, since dependency chains rarely span unrelated pipelines — avoids one coordinator instance needing global visibility over every DAG in the system.
- **Run history growth (3M/day, 1TB+/year)**: time-partition and archive old run history to cold storage, mirroring the hot/warm/cold tiering used in [logging-system.md](logging-system.md).
- **Global/multi-region job execution**: keep scheduling logic single-leader per region for jobs scoped to that region's data, but be deliberate about cross-region dependencies — a downstream job depending on an upstream job in another region introduces cross-region latency and partition-tolerance considerations (see [multi-region architecture](../09-large-scale-data-systems/multi-region-architecture.md)).

## 8. Trade-offs & Alternatives

- **Single active leader vs. active-active scheduling**: single-leader (with fast failover) avoids the complexity and duplicate-trigger risk of coordinating multiple simultaneously-active schedulers, at the cost of a brief no-new-triggers window during failover — an acceptable trade given the catch-up mechanism (6.4) handles that window gracefully.
- **At-least-once delivery + idempotency requirement vs. attempting true exactly-once**: places a real burden on job authors (idempotency isn't free to design), but is the honest, achievable guarantee — systems that claim true exactly-once execution for arbitrary side-effecting jobs are usually hiding this same requirement rather than eliminating it.
- **Jittering trigger times vs. exact-time firing**: improves burst absorption dramatically for the common case, but isn't appropriate for jobs with hard real-time requirements — solved by an explicit opt-out flag for time-critical jobs, accepting that those jobs get no burst-smoothing benefit.
- **DAG-aware coordinator vs. treating every job as independent**: the coordinator adds real complexity (tracking per-run dependency state, cycle detection) but is necessary for correctness in pipeline-style workloads — a simpler "every job is independent" model would be inadequate for the ~5% of jobs with real dependencies.

## Related topics
- [Leader Election](../03-consistency-distributed/leader-election.md)
- [Consensus Algorithms](../03-consistency-distributed/consensus-algorithms.md)
- [Quorum](../03-consistency-distributed/quorum.md)
- [Message Queues](../05-messaging-event-driven/message-queues.md)
- [Retry & Exponential Backoff](../01-scaling-traffic/retry-exponential-backoff.md)
- [SQL vs NoSQL](../02-data-storage/sql-vs-nosql.md)
- [Distributed Locks](../03-consistency-distributed/distributed-locks.md)
- [Multi-Region Architecture](../09-large-scale-data-systems/multi-region-architecture.md)
