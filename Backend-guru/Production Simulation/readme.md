# Production Simulation & Chaos Engineering — Mastery Plan

## Purpose

Simulate real-world failure scenarios, practice incident response, and validate system resilience under stress—becoming the engineer who can confidently operate production systems at scale.

## Learning Objectives

- Design and execute controlled chaos experiments
- Identify and validate critical failure paths
- Practice incident response: diagnosis, mitigation, recovery
- Measure and improve system resilience (MTTR, blast radius, cascading failures)
- Scale systems under realistic load and validate scaling behavior
- Implement observability-driven troubleshooting
- Build confidence in production operations at scale

## Scope

- Run chaos experiments against the microservices system
- Simulate infrastructure, service, and data layer failures
- Practice on-call incident response with time constraints
- Validate monitoring, alerting, and runbook effectiveness
- Load test at 10x, 100x normal traffic; measure failures and recovery
- Execute disaster recovery scenarios (database recovery, replication failover)
- Document lessons learned and improve systems

## Success Criteria (examples)

- MTTR for common failures < 15 minutes (detected + fixed via observability)
- System recovers from single service failure with no manual intervention (within SLO)
- Database replication failover completes within 5 minutes
- Message backlog clears within SLA after service restart
- Scaling decisions made data-driven (metrics, not guesswork)
- All incidents have post-mortems with identified improvements
- Team confidence high: "We know how to debug production issues"

## Implementation Plan (phases)

1. Chaos Engineering Foundation (1 day)
   - **Chaos Hypotheses**: Form testable hypotheses about failures
     - "If payment service becomes unavailable, order service will fail too"
     - "If RabbitMQ queue grows faster than consumers can process, messages will eventually be lost"
   - **Blast Radius**: Define scope (which services impacted? users affected?)
   - **Observability Readiness**: Ensure logging, metrics, tracing in place before chaos testing
   - **Safety Guardrails**:
     - Run in staging first, never production without safeguards
     - Kill switches (stop the experiment if impact exceeds threshold)
     - Gradual rollout (1% traffic, then 10%, then 100%)
   - Deliverable: Chaos hypothesis document, safety checklist

2. Traffic Spikes & Load Testing (1–2 days)
   - **Load Profiles**:
     - Baseline: Normal production traffic (100 req/s)
     - Spike: 10x traffic (1000 req/s) for 10 minutes
     - Sustained: 100x traffic (10,000 req/s) for 30 minutes
     - Ramp: Gradually increase from baseline to 100x
   - **Tools**: k6, locust, wrk2, or cloud load testing services (AWS, Azure)
   - **Metrics to Track**:
     - Latency: p50, p95, p99 (where does it spike?)
     - Errors: Error rate, timeout rate, rate limit threshold
     - Resources: CPU, memory, database connections, queue depth
     - Scaling: When does HPA trigger? How many replicas added?
   - **Validation**:
     - Do latency SLOs hold under spike? (e.g., p99 < 500ms)
     - Do autoscale rules work correctly? (replicas added/removed as expected)
     - Is there a breaking point? At what RPS does system break?
   - Deliverable: Load test report with profiles, graphs, identified bottlenecks
   - Example: "At 8500 RPS, database connection pool exhausted → p99 latency spiked to 5s"

3. Service Failures (1–2 days)
   - **Scenarios**:
     - **Graceful Shutdown**: Kill pod mid-request (SIGKILL, not SIGTERM)
       - Expect: Zero dropped requests, load balanced to other pods
       - Measure: MTTR, request loss count
     - **Slow Service**: Inject latency (e.g., 5s delay) to payment service
       - Expect: Timeouts, circuit breaker kicks in, order service recovers
       - Measure: Cascading failures, how quickly other services recognize failure
     - **Partial Service Failure**: 10% of payment service requests fail (random errors)
       - Expect: Retry logic kicks in, monitored in metrics, alerts fire
       - Measure: Retry overhead, eventual success rate
     - **Cascading Failures**: Payment service slow → order service times out → email service backs up
       - Root cause: Payment service latency
       - Expect: Identify root cause via tracing, not just surface symptoms
   - **Tools**:
     - Kubernetes: `kubectl delete pod`, network policies (block traffic)
     - Chaos monkey: Inject latency/errors (use LitmusChaos, Chaos Mesh)
     - Client-side: Fault injection in SDK (timeout, rate limiting)
   - Deliverable: Service failure scenarios documented, recovery validated

4. Database Crashes & Recovery (1–2 days)
   - **Scenarios**:
     - **Database Down**: PostgreSQL container dies
       - Expect: Readiness probe fails, Kubernetes restarts pod, health restored
       - Measure: Time to detect (health check interval), time to restart (~30s)
       - Validate: No data loss, connections restored
     - **Replication Lag**: Primary-replica replication delays (network jitter)
       - Risk: Read replicas return stale data, users see inconsistency
       - Measure: Replication lag (via metrics), application impact
       - Mitigate: Read from primary during high-consistency operations, retry on stale read
     - **Failover**: Primary database dies, replica promoted
       - Risk: Brief unavailability (failover time), data loss if replica wasn't synced
       - Measure: Failover time (30s–2m typical)
       - Validate: Applications automatically reconnect, no manual intervention
     - **Backup & Restore**: Simulate data loss, restore from backup
       - Measure: RTO (Recovery Time Objective) = time to restore service
       - Measure: RPO (Recovery Point Objective) = data loss (e.g., last 1 hour)
   - **Tools**: `pg_ctl stop`, network partition, `pg_dump` for backups
   - Deliverable: Database failure procedures documented, RTO/RPO measured

5. Message Queue Backlogs & Processing (1–2 days)
   - **Scenarios**:
     - **Producer Faster Than Consumer**: Email service consumer is slow, queue grows
       - Risk: Memory exhaustion, messages expire, stuck orders
       - Expect: Backpressure applied, producers slow down or fail
       - Measure: Queue depth (metrics), consumer lag, message age
     - **Consumer Crash**: Email service dies with messages in flight
       - Expect: Messages redelivered to another consumer (rebalancing)
       - Measure: Message loss (should be zero with persistent queues)
       - Validate: No duplicate emails (idempotency key deduplication)
     - **Poison Pill**: One message crashes every consumer (infinite retry)
       - Risk: Queue stuck, no messages processed
       - Expect: Dead letter queue kicks in after max retries
       - Validate: Message in DLQ, other messages process normally
   - **Tools**: Monitor RabbitMQ queue depth, kill consumers, stop producers
   - Deliverable: Queue failure scenarios documented, DLQ validation report

6. Node/Infrastructure Failures (1 day)
   - **Scenarios**:
     - **Node Crash**: Worker node dies (VM failure, kernel panic)
       - Expect: Kubernetes reschedules pods to other nodes
       - Measure: Pod eviction grace period, reschedule time
       - Risk: If pod has high resource requests, no node has space → pod stays Pending
       - Mitigate: Right-size resource requests, maintain cluster headroom
     - **Network Partition**: Node isolated from cluster (network cable unplugged)
       - Expect: Kube-controller marks node as NotReady, evicts pods
       - Measure: Detection time (30s–5m), eviction time
       - Validate: Traffic rerouted, no split-brain (avoid pod running on both sides)
     - **Resource Exhaustion**: Disk full, memory full on node
       - Expect: Kubelet evicts pods, container restarts
       - Measure: Detection time, restart cascade
       - Validate: Alerting fires before exhaustion (proactive mitigation)
   - **Tools**: Kill VM, block network interface, fill disk artificially
   - Deliverable: Infrastructure failure scenarios and recovery procedures

7. Observability Under Stress (1–2 days)
   - **Challenges**:
     - Under load, logging overhead can make things worse
     - Metrics scraping might be too slow
     - Tracing sampling might miss slow requests
   - **Validation**:
     - Can you identify the slow service under 10x load? (via traces/metrics)
     - Can you find the error pattern in logs? (structured logging searchability)
     - Are alerts firing (or silenced by alert fatigue)?
   - **Stress Test Observability**:
     - High-cardinality metrics: Does Prometheus handle 1000s of unique label combinations?
     - Log volume: Can centralized logging ingest 100K logs/sec?
     - Trace sampling: Are sampled traces representative? (did you miss the slow query?)
   - **Improvements**:
     - Add observability-focused alerts (e.g., "high log volume, may indicate incident")
     - Right-size cardinality (drop low-value dimensions)
     - Tune sampling to catch anomalies without overwhelming storage
   - Deliverable: Observability stress test report, tuning recommendations

8. Scaling Decisions & Strategy (1–2 days)
   - **Horizontal Scaling** (add pods):
     - When: Request volume grows, single pod can't handle load
     - How: HPA watches CPU/memory, scales up/down
     - Risk: Cascading startup (many pods starting = high resource usage)
     - Mitigate: Set pod anti-affinity, stagger startup if needed
   - **Vertical Scaling** (bigger machines):
     - When: Pod needs more CPU/memory for a single large workload
     - Risk: Single pod has more impact if it dies
     - Mitigate: Still run multiple pods
   - **Database Scaling**:
     - Read replicas: Scale reads, not writes
     - Sharding: Split data by key (user ID, region), write to shard
     - Risk: Sharding adds complexity, re-sharding difficult
   - **Cache Scaling**:
     - Add more Redis replicas or use cluster mode
     - Measure: Hit rate, latency impact
   - **Load Testing**: Which component hits limit first? (DB connections? RabbitMQ throughput? pod CPU?)
   - Deliverable: Scaling strategy document, bottleneck analysis

9. Incident Simulation & War Games (1–2 days)
   - **Scenario**: "We get DDoS'ed, API traffic spikes 50x, payment service starts failing"
   - **Procedure**:
     1. On-call engineer gets paged (alert fire)
     2. Check dashboards: error rate spike on payment service
     3. Use tracing: identify slow database queries
     4. Check database metrics: connection pool exhausted
     5. Increase connection pool size, deploy fix (or revert bad deployment)
     6. Monitor recovery, verify SLO restored
     7. Write post-mortem: How did connection pool get exhausted? (load increased, code regression?)
   - **Metrics**:
     - Time to detect (alert latency)
     - Time to diagnose (MTTR)
     - Time to fix (deploy latency)
   - **Observations**:
     - Did metrics guide diagnosis or were they unhelpful?
     - Were runbooks accurate or outdated?
     - Did team communication work well?
   - Deliverable: War game report with timings, identified gaps

10. Disaster Recovery & Failover Practice (1 day)
    - **Scenarios**:
      - **Database Region Failover**: Primary region down, fail over to standby region
        - RTO goal: < 5 minutes
        - RPO goal: < 5 minutes of data loss
        - DNS switchover, replication lag, application reconnection
      - **Full System Restore**: Simulated total data loss (meteor strike scenario)
        - Restore from backups, validate consistency
        - RTO: How long to restore? (typically 1–12 hours depending on data size)
      - **Canary Deployment**: Bad code deployed, rollback within SLO
        - Canary: Deploy to 5% traffic, watch metrics
        - If error rate spikes, roll back immediately
        - Measure: Blast radius (how many users impacted before rollback?)
    - **Tools**: Terraform to spin up infrastructure, database restore tools
    - Deliverable: DR runbook, tested failover procedures

11. Post-Incident Analysis & Continuous Improvement (1 day)
    - **Blameless Post-Mortems**:
      - What was the sequence of events?
      - What monitoring/alerting was missing?
      - What runbook was inaccurate?
      - What process/system change prevents recurrence?
    - **Examples**:
      - "Alert for high queue depth would have caught issue 20% faster"
      - "Runbook didn't mention checking replication lag; updated"
      - "Add healthcheck for database connection pool"
    - **Tracking**: Database of past incidents and improvements
    - Deliverable: Post-mortem template, incident database

## Chaos Testing Checklist

Before running each chaos test:

- [ ] Hypothesis documented (what do we expect to happen?)
- [ ] Logging/metrics/tracing in place (how will we observe?)
- [ ] Staging environment ready (not production)
- [ ] Kill switch defined (when do we stop the experiment?)
- [ ] Blast radius estimated (which users/services affected?)
- [ ] Alert thresholds set (should alert fire during this?)
- [ ] Team briefed (everyone knows it's a test)
- [ ] Incident commander designated (decision-maker if things go wrong)

## Key Metrics to Track

| Metric             | Target                 | Example                                         |
| ------------------ | ---------------------- | ----------------------------------------------- |
| **MTTR**           | < 15 min               | Detect + diagnose + fix + deploy                |
| **MTBF**           | > 720 hours (1 month)  | Fewer critical incidents                        |
| **Error Budget**   | 99% of time within SLO | 43 min/month allowed downtime                   |
| **Blast Radius**   | As small as possible   | Single service failure doesn't take down others |
| **Failover Time**  | < 5 min                | RTO for database region failover                |
| **Recovery Point** | < 5 min                | RPO (data loss) in failure                      |

## Tools & Technologies

- **Chaos Engineering**: LitmusChaos, Chaos Mesh, Gremlin, Locust
- **Load Testing**: k6, wrk2, Apache JMeter, AWS Load Testing service
- **Failure Injection**: Chaos monkey, toxiproxy, network simulation (tc, iptables)
- **Observation**: Same observability stack (Prometheus, Grafana, ELK, Jaeger)
- **Infrastructure as Code**: Terraform to spin up test environments
- **Incident Management**: PagerDuty, incident tracking (GitHub issues, Jira)

## Deliverables

- **Chaos Test Report**: Hypothesis, findings, improvements for 5+ scenarios
- **Load Test Report**: Profiles, bottlenecks, scaling recommendations
- **Incident Simulation Report**: War game scenario, timings, gap analysis
- **Scaling Strategy**: Document for scaling services, DB, cache
- **Disaster Recovery Runbook**: Steps for region failover, database restore
- **Post-Mortem Templates**: Blameless incident analysis process
- **Observability Validation**: Logging/metrics/traces work under stress
- **On-Call Confidence**: Team can debug and fix production issues independently

---

If you want, I can break phases into task TODOs, provide chaos test templates, or create sample load test configurations.
