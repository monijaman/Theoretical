# Production Simulation & Chaos Engineering

Practice responding to failures in a controlled environment. Start with a clear hypothesis, introduce one change, and compare the observed behavior with your recovery expectations.

## Start Here

**Before you begin:** A deployed practice service, basic observability, and a recovery procedure you can test.

Read the explanation before each code example, then follow the data through the normal path and one failure case. The snippets teach individual concepts; application helpers, package setup, credentials, and deployment configuration are not all included.

**Practice environment:** Use disposable data and an isolated test environment. The failure and recovery commands below change or delete resources. Confirm the target context, define stop conditions, and prepare cleanup before running an experiment.

## Contents

- [Real-World Analogy: From Fire Drills to Firefighting Academy](#real-world-analogy-from-fire-drills-to-firefighting-academy)
- [Part 1: Chaos Engineering Framework](#part-1-chaos-engineering-framework)
- [Part 2: Load Testing & Capacity Planning](#part-2-load-testing--capacity-planning)
- [Part 3: Service Failure Scenarios](#part-3-service-failure-scenarios)
- [Part 4: Observability Under Chaos](#part-4-observability-under-chaos)
- [Part 5: Disaster Recovery](#part-5-disaster-recovery)
- [Part 6: Learning & Action Items](#part-6-learning--action-items)
- [Interview Questions for Staff-Level Chaos Engineers](#interview-questions-for-staff-level-chaos-engineers)
- [Real Business Impact](#real-business-impact)
- [Practice Check](#practice-check)

## Key Terms

| Term | Meaning |
| --- | --- |
| Chaos experiment | a controlled failure used to test an expectation. |
| Blast radius | the resources and users an experiment can affect. |
| Load test | traffic generated to measure behavior under demand. |
| RTO | recovery time objective; the target time to restore service. |
| RPO | recovery point objective; the acceptable age of recovered data. |


## Real-World Analogy: From Fire Drills to Firefighting Academy

**Regular Fire Drill (Bad):**

- "There's a fire!" alarm sounds
- Everyone stands up, shuffles to parking lot
- Takes 20 minutes (chaos, confusion)
- Real fire: half the building burns
- Lesson: We're unprepared

**Firefighting Academy (Good):**

- Controlled burn in safe building
- Firefighters practice rescue, water pressure, coordination
- Multiple scenarios: basement fire, roof fire, explosion
- Debrief after each scenario
- Result: Real emergency occurs, everyone knows their role, 15 minutes to full evacuation

**Production Systems:**

- Bad: Find bugs in customer's session (reactive, expensive)
- Good: Simulate failures in staging, prepare team, build confidence before production incident

## Part 1: Chaos Engineering Framework

Write an expectation that can be observed, such as “one failed replica does not stop checkout.” Define the target, duration, stop condition, recovery steps, and measurements before injecting the failure.

### Why Chaos Engineering?

**Example:** An application has three replicas, but a failed database connection can still stop every replica. A controlled experiment can reveal whether timeouts, retries, and connection limits isolate the failure as expected.

### The Chaos Hypothesis

**Hypothesis-Driven Testing:**

```text
Hypothesis: "If order-service becomes unavailable,
payment-service will fail and requests will queue"

Blast Radius:
- Service impacted: payment-service
- Users affected: 10% of transactions
- Business impact: $50K-100K revenue loss/hour

Test Plan:
1. Kill order-service pod in staging
2. Verify: payment-service detects failure (circuit breaker)
3. Verify: Requests queue, don't get lost
4. Verify: Once order-service recovers, processing resumes
5. Measure: MTTR (mean time to recovery)

Success Criteria:
- MTTR < 5 minutes
- Zero message loss
- No cascading failures to other services
```

**Root Cause Analysis Template:**

```text
1. What was hypothesized?
   Order-service failure → payment-service timeout

2. Was the hypothesis validated?
   ❌ Unexpected: Entire system cascaded
   - payment-service timed out ✓
   - notification-service overwhelmed ✗
   - database connection pool exhausted ✗
   - UI became unresponsive ✗

3. Why did it fail differently than expected?
   - No circuit breaker on notification-service calls
   - Notification-service consumed all DB connections
   - Other services starved for connection pool
   - Cascade: payment → notification → database → global outage

4. What did we learn?
   - Circuit breaker pattern needed in more services
   - DB connection pool too small (or shared improperly)
   - Need resource isolation (separate connection pools per service)

5. Action items:
   - Add circuit breaker to notification-service calls
   - Implement connection pool isolation
   - Add alerting on connection pool utilization
```

## Part 2: Load Testing & Capacity Planning

Choose traffic that represents real user journeys and data variation. Virtual users measure concurrency; requests per second measure throughput. They are related through request duration and pacing, not interchangeable.

### Load Profiles

**E-commerce Platform Example:**

```text
Baseline (Normal Day): 1000 requests/second
- 80% reads (browsing products)
- 20% writes (checkout, reviews)
- P99 latency: 300ms
- Error rate: 0.1%

Morning Spike (7-9am): 3000 requests/second
- Similar ratio
- Expected, manageable with auto-scaling

Flash Sale (Unexpected): 50,000 requests/second
- 60% reads (checking if item available)
- 40% writes (adding to cart, checkout)
- P99 latency should stay < 500ms
- Error rate should stay < 1%

Cyber Monday (Predicted Peak): 100,000 requests/second
- Need to scale 100x
- Some services less parallelizable than checkout
- Need gradual scaling, not panic scaling
```

### Load Testing Tools & Profiles

**Common pitfall: Artificial Load (Unrealistic):**

```javascript
// Hammering single endpoint
for (i = 0; i < 100000; i++) {
  GET /api/products (1000 identical requests)
}
// Result: Caching works perfectly, unrealistic
```

**Example: Realistic Load Profile:**

```javascript
// k6 load testing script
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 1000,  // 1000 concurrent users
  stages: [
    { duration: '30s', target: 100 },    // Ramp up
    { duration: '5m', target: 1000 },    // Sustain
    { duration: '1m', target: 0 }        // Ramp down
  ]
};

export default function() {
  // 30% product browsing
  if (Math.random() < 0.3) {
    let res = http.get(`https://api.example.com/products/${Math.random() * 10000}`);
    check(res, { 'status is 200': (r) => r.status === 200 });
  }

  // 5% adding to cart
  if (Math.random() < 0.05) {
    let res = http.post('https://api.example.com/cart', JSON.stringify({
      productId: Math.random() * 10000,
      quantity: 1
    }));
    check(res, { 'status is 200': (r) => r.status === 200 });
  }

  // 1% checkout
  if (Math.random() < 0.01) {
    let res = http.post('https://api.example.com/checkout', JSON.stringify({
      cartId: 'cart_' + Math.random(),
      paymentMethod: 'card'
    }));
    check(res, { 'status is 200': (r) => r.status === 200 });
  }

  sleep(Math.random() * 3);  // Realistic user think-time
}
```

**Results Analysis:**

```text
Load Test Report: E-commerce API (March 8)

Configuration:
- Users: 1000 concurrent
- Duration: 6 minutes
- Total requests: 1.2M
- Realistic behavior mix: browse/cart/checkout

Results:
┌─────────────────────────────────────────┐
│ LATENCY                                 │
│ P50: 250ms ███░░░░░░░░ (good)           │
│ P95: 750ms ████████░░░ (acceptable)     │
│ P99: 5200ms ████████████ (PROBLEM!)     │
└─────────────────────────────────────────┘

Analysis:
- P50/P95 healthy
- P99 spike to 5.2 seconds (1% of users waiting 5+ seconds)
- Root cause: Checkout service doesn't scale linearly

┌─────────────────────────────────────────┐
│ ERROR RATE                              │
│ 0.3% errors (target: < 1%) ✅           │
│ Breakdown:                              │
│ - 0.1% 500 errors (server errors)       │
│ - 0.2% 503 errors (capacity)            │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ RESOURCE USAGE                          │
│ CPU: 60% average, 92% peak ✅           │
│ Memory: 45% average, 78% peak ✅        │
│ Database connections: 240/300 peak ⚠️   │
│ - Only 20% headroom!                    │
│ - Spike could exhaust pool              │
└─────────────────────────────────────────┘

Recommendations:
1. [HIGH] Increase DB connection pool from 300 to 500
2. [HIGH] Optimize checkout endpoint (or add caching)
3. [MEDIUM] Auto-scale checkout service more aggressively
4. [LOW] Monitor P99 latency real-time, alert if > 3s
```

## Part 3: Service Failure Scenarios

Run one scenario at a time against disposable resources. The results shown are hypothetical observations; failover, retries, and restoration only happen when the required mechanisms have been configured.

### Scenario 1: Service Goes Down (Pod Crash)

**Setup:**

```text
Production environment:
- order-service: 3 replicas running normally
- 1000 requests/second flowing through
```

**The Test:**

```bash
# Kill one order-service pod abruptly (SIGKILL, simulating crash)
kubectl delete pod order-service-xyz123 --grace-period=0

# Watch what happens
kubectl get pods -w  # Monitor pod status
kubectl top pods     # Monitor resource usage
```

**Expected Behavior (Good System):**

```text
Timeline:
t=0s:  Pod dies
       Kubernetes detects (within 30 seconds)
       Creates replacement pod

t=10s: New pod initializing
       Load balancer still routing to dead pod (grace period)
       Requests fail (503)

t=30s: New pod ready
       Requests resume successfully

Result:
- Downtime: 30 seconds (customers see errors)
- MTTR: 30 seconds
- Affected requests: ~30,000 (30s × 1000 req/s)
- Business impact: $3K-5K lost orders
```

**Unexpected Behavior (Poorly Designed System):**

```text
t=0s:  Pod dies
t=30s: Pod still dead (initialization taking too long)
       Load balancer routes 33% of traffic to 2 remaining pods
       Latency spikes 300% (not enough capacity)

t=60s: New pod STILL initializing
       Kubernetes gives up, marks pod failed
       Creates another pod

t=120s: Second pod ready
         System now has 3 of 3 pods
         Recovery complete

Result:
- Downtime: 2 minutes
- MTTR: 2 minutes ❌
- Affected requests: ~120,000
- Business impact: $15K-20K lost orders ❌
- Root cause: Slow initialization process

Action item: Reduce initialization time from 2min to 30sec
```

### Scenario 2: Cascading Failure (Service A Slows Down Service B)

**Setup:**

```text
Architecture:
- UI → API Gateway → Order Service → Payment Service → Payment Provider
- Order Service: 5 replicas
- Payment Service: 5 replicas
```

**The Test: Payment Service Becomes Slow:**

```bash
# Inject 5 second latency into payment service
# (simulate external provider slowdown)
kubectl exec -it payment-service-xyz -- \
  curl -X POST http://localhost:8080/chaos/inject_latency?ms=5000

OR use service mesh (Istio):
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: payment-service
spec:
  hosts:
    - payment-service
  http:
    - fault:
        delay:
          percentage: 100
          fixedDelay: 5s
      route:
        - destination:
            host: payment-service
EOF
```

**Cascading Failure Timeline:**

```text
t=0s:   Payment service slow (5s latency instead of 100ms)
        Order service calls payment, waits 5 seconds

t=5s:   50 order-service pods × 1000 req/s / 5 replicas = 200 req/pod
        Per pod: Each request takes 5s (database threads consumed)
        If pool = 10 threads, queue fills up immediately

t=10s:  All database threads on order-service exhausted
        New requests queue
        Timeout after 30 seconds
        Customers see timeout errors

t=15s:  API Gateway now timing out (calls to order-service fail)
        UI experiences timeouts
        Customers abandon checkout

t=20s:  (if fixed now)
        Payment service latency returns to normal
        Order service still has full thread queue (takes 30s to drain)
        UI still broken

TOTAL IMPACT: 20+ seconds of cascading failure
```

**Prevention: Circuit Breaker Pattern**

```javascript
// Checkout circuit breaker
const CircuitBreaker = require('circuit-breaker');

const paymentCircuit = new CircuitBreaker(
  async (chargeRequest) => {
    return await paymentService.charge(chargeRequest);
  },
  {
    timeout: 2000,           // Timeout after 2 seconds (not 30)
    errorThresholdPercentage: 50,  // Open if >50% fail
    resetTimeout: 30000,     // After 30s, try again
  }
);

paymentCircuit.on('open', () => {
  console.log('Payment circuit OPEN, using fallback');
  metrics.increment('payment_circuit_breaker_open');
  alerts.trigger('CRITICAL: Payment system unavailable');
});

// Usage with fallback
async function processOrder(order) {
  try {
    const payment = await paymentCircuit.execute(order);
    return { success: true, payment };
  } catch (error) {
    if (error.message === 'Circuit breaker is open') {
      // Fallback: Queue for later processing
      console.log('Payment failed, queuing for retry');
      await queue.publish('payment.retry', order);
      return { success: false, queued: true };
    }
    throw error;
  }
}
```

### Scenario 3: Database Failure

**Setup:** A disposable PostgreSQL deployment has replication and a tested failover manager. Deleting a Pod alone does not configure database failover; verify the target namespace and restoration procedure first.

```bash
# Kill primary database
kubectl delete pod postgres-0 -n chaos-lab

# Expected: Automatic failover to replica
# Verify: Connections restore, no data loss
```

**Failover Test Results:**

```text
Timeline:
t=0s:   Primary PostgreSQL dies
        Kubernetes detects (health probe fails)
        Cluster replication detects primary missing

t=15s:  Replica promoted to primary
        New primary accepts connections
        Services reconnect

t=30s:  New primary ready
        Query latency higher (warming up)

Result:
- Detection time: 15 seconds (health check interval)
- Failover time: 15 seconds
- Data loss: ZERO (replica was synced)
- Manual intervention: NONE

Success!
```

### Scenario 4: Message Queue Backlog

**Setup:** RabbitMQ queue growing faster than consumers

```bash
# Slow email consumer (to simulate bottleneck)
kubectl exec -it notification-service-abc -- \
  curl -X POST http://localhost:8080/chaos/slow_down?factor=10

# Watch queue depth explode
rabbitmqctl list_queues name messages consumers
```

**Timeline:**

```text
Production metrics:
- Email queue incoming: 100 messages/sec
- Email consumer rate: 10 messages/sec (due to slowdown)
- Net queue growth: 90 messages/sec

After 1 minute:  5,400 messages queued
After 5 minutes: 27,000 messages queued (email IDs buffering)
After 10 minutes: 54,000 messages queued

Without monitoring:
- Customers don't receive emails for hours
- Reorder confirmation never arrives
- Support tickets flood in

Scenario: Messages expire after 24 hours
- Compare the age of the oldest message with its expiry and delivery target.

Action: Restore processing capacity to 190 messages/sec while arrivals remain 100/sec
- Net drain rate: 190 - 100 = 90 messages/sec
- Messages drain: 54,000 / 90 = 600 seconds = 10 minutes
- Total recovery time: 15 minutes (detect + fix + drain)
- Business impact: Low if < 1 hour, Critical if > 4 hours
```

**Monitoring: Dead Letter Queue Behavior**

```javascript
// Monitor queue health
setInterval(async () => {
  const stats = await rabbitmq.getQueue('email');

  metrics.gauge('queue_depth', stats.message_count);
  metrics.gauge('consumer_lag', stats.message_count - stats.ack_count);

  // Alert thresholds
  if (stats.message_count > 10000) {
    alerts.warning('Email queue backlog > 10K');
  }
  if (stats.message_count > 50000) {
    alerts.critical('Email queue critical (> 50K)');
  }

  // Calculate drain time
  const consumerRate = stats.ack_count / (stats.elapsed_seconds);
  const drainTime = stats.message_count / consumerRate;

  if (drainTime > 60) {  // > 1 minute to drain
    alerts.warning(`Email queue will take ${drainTime}min to clear`);
  }
}, 10000);  // Check every 10 seconds
```

## Part 4: Observability Under Chaos

Use the experiment to check whether your telemetry explains the failure. Compare alerts, traces, and logs with the known injection time and record which signals were missing.

### Challenge: Debugging While System Fails

**Scenario: Payment Service Errors Spike to 50% During Load Test**

```text
Tools Used:

1. METRICS (First Response: 30 seconds)
   Prometheus dashboard shows:
   - Error rate: 50% (up from 0.1%)
   - P99 latency: 8000ms (up from 400ms)
   - CPU on payment pods: 95% (capped at limit)
   - Memory: 60% stable (not the bottleneck)

   Conclusion: CPU bound, not memory leak

2. LOGS (Diagnosis: 2 minutes)
   Search: error logs from payment service in last 5 minutes

   Pattern found:
   [ERROR] 10:32:45 Database connection pool exhausted
   [ERROR] 10:32:46 Database connection pool exhausted
   [ERROR] 10:32:47 Database connection pool exhausted
   ... repeated 10,000 times

   Conclusion: DB pool size too small, queries queuing

3. TRACES (Root Cause: 5 minutes)
   Query: Traces with latency > 5000ms

   Trace analysis:
   - payment-service: 7500ms (calling checkout)
   - checkout-service: 7000ms (calling database)
   - database: 6500ms in query (WAITING FOR CONNECTION)

   Root cause confirmed: Database connection pool exhausted

4. SOLUTION (Implementation: 2 minutes)
   - Kill load test (restore system)
   - Increase DB connection pool: 20 → 50
   - Redeploy payment service
   - Restart load test

   Result: Error rate drops to 0.5%, P99 latency normalizes to 600ms
```

### Validation Under Stress

```text
Load Test: Payment Service at 10,000 RPS

Before fixes:
✗ Error rate: 50% (unacceptable)
✗ P99 latency: 8000ms (SLO breach)
✗ System capacity: 5000 RPS (half of needed)

After fixing connection pool:
✓ Error rate: 0.5% (acceptable)
✓ P99 latency: 600ms (SLO met)
✓ System capacity: 12,000 RPS (exceeds needed)

Load test successful: System validated at 10K RPS
```

## Part 5: Disaster Recovery

Recovery requires more than a backup file. Restore into an isolated destination, verify data and application behavior, and measure the time and data gap against your objectives.

### RTO and RPO

```text
RTO (Recovery Time Objective): How long can we afford to be down?
RPO (Recovery Point Objective): How much data loss is acceptable?

Example: Payment Service

RTO = 5 minutes
- Every minute down = $50K revenue loss
- After 5 minutes, customers switch to competitor
- Economic limit: Can't afford > 5 minutes

RPO = 1 hour
- Transactions synced to backup every hour
- If primary lost, worst case: 1 hour of transactions lost
- Acceptable: Rebuild from backup + replay from logs
```

### Database Disaster Recovery Test

**Scenario: Primary Database Corrupted, Need to Restore**

```bash
# Simulate data corruption
kubectl exec -it postgres-0 -- \
  psql -U postgres -d mydb -c "UPDATE orders SET amount = 0 WHERE id < 0 ORDER 10000"

# Oops! Data corrupted. Activate backup plan.

# Step 1: Detect
Running backups detected corruption in primary
Alert: CRITICAL - Database corruption detected

# Step 2: Recover
Restore from point-in-time backup (1 hour ago)
  - All transactions before corruption point replayed
  - Data consistency validated

# Step 3: Verify
kubectl exec -it postgres-0 -- \
  psql -U postgres -d mydb -c "SELECT COUNT(*) FROM orders"

Result: 50,000 orders (matches known state from 1 hour ago)

# Step 4: Calculate impact
Transactions lost: Last 1 hour
Orders affected: ~1000 orders
Revenue impact: ~$50K
```

**Backup Strategy:**

```text
Frequency: Every hour (RPO = 1 hour maximum)
Type: Continuous WAL archiving (write-ahead logs)
- Every database change written to WAL
- WAL files archived to S3
- Can replay to exact point-in-time

Space: 1TB database
- Full backup: 100GB weekly
- Incremental: 10GB daily
- WAL archive: 5GB daily
- Total: 200GB storage / $10/month

RTO: Depends on backup restoratio time
- Local backup restore: 15 minutes
- S3 restore: 25 minutes
- Network transfer: 10 minutes
- Validation: 5 minutes
Total RTO: 45 minutes (meets 5 minute SLA if issues detected early)
```

### Multi-Region Failover

**Business Model:**

```text
Primary: US-East (Virginia)
Secondary: US-West (Oregon)
Async replication lag: typically 50-100ms

Failure modes:
1. Primary datacenter network partitioned from world
   Action: Fail over to secondary (5 minutes)

2. Primary region has power outage
   Action: Fail over to secondary (10 minutes)

3. Both regions down
   Action: Activate tertiary (AWS Tokyo) (30 minutes)

Recovery:
- Once primary restored, sync data from secondary
- Validate consistency checks
- Gradually shift traffic back (canary)
- Full recovery: 2-4 hours
```

**Test Results:**

```text
Failover Test: Primary Region Down

Scenario: US-East completely unavailable
- All services in US-East killed
- Expected: Traffic fails over to US-West

Results:
t=0s:   Primary outs
        Domain DNS queries from us-east → timeout

t=30s:  Clients detect us-east unavailable
        Retry with round-robin
        Traffic flows to us-west

t=45s:  All traffic on us-west
        Latency increases (farther away from east coast users)
        Error rate: 0% (no requests lost)

Conclusion:
✅ Automatic failover works
✅ Zero request loss
✅ Slight latency increase (acceptable)
✅ Estimated revenue retained: 95%
```

## Part 6: Learning & Action Items

Write down what happened, why the outcome differed from the hypothesis, and who owns the next improvement. A successful experiment supports its tested scenario; it does not prove every failure is covered.

### Post-Chaos Analysis Template

```markdown
# Chaos Test Results: Database Failover (March 8, 2026)

Hypothesis: "If primary database dies, replica auto-promotes within 5 minutes"

Test Setup:
- One primary PostgreSQL pod
- One read replica pod
- Monitoring: replication lag, connections
- Load: 1000 queries/second

Test Execution:
- Killed primary pod at 14:00:00
- Monitored failover
- Restarted primary at 14:02:00

Results:
┌─────────────────────────────────┐
│ TIME TO DETECT      : 12 sec    │
│ TIME TO FAILOVER    : 18 sec    │
│ TOTAL RECOVERY TIME : 30 sec    │
│ GOAL: < 5 min       : ✅ PASS   │
└─────────────────────────────────┘

Data Consistency: ✅ VERIFIED
- No data loss detected
- Transaction log complete
- Replication caught up post-failover

Services Affected: ✅ MINIMAL
- Brief latency spike (2 sec)
- No request loss detected
- Automatic reconnection working

Action Items:
1. [LOW] Document failover process for on-call team
2. [MEDIUM] Add alerting for replication lag > 1 second
3. [LOW] Run failover test monthly (preventative validation)

Conclusion: The tested configuration met this experiment’s criteria; document its scope and remaining failure cases.
```

## Interview Questions for Staff-Level Chaos Engineers

**Junior Level:**

1. What's a chaos experiment? Why would you deliberately break things?
2. Explain RTO vs RPO in simple terms
3. What's a circuit breaker and why does it prevent cascading failures?

**Senior Level:**

4. Design a load testing strategy for a bank (mission-critical payments)
5. Walk me through how you'd diagnose a service degradation during production load test
6. How would you implement graceful degradation (serving partial results instead of failing)?
7. Design a multi-region failover test. What could go wrong?

**Staff Level:**

8. Architect chaos engineering program for 500-engineer company (continuous validation)
9. Design RTO/RPO requirements from business requirements ($10B annual revenue company)
10. Walk me through incident: 50% error rate during peak. Diagnosis, mitigation, root cause (you have 30 minutes)
11. How would you prioritize chaos experiments, and which failure modes would remain untested?

## Real Business Impact

Measure whether experiments improve recovery procedures, reveal missing telemetry, and reduce repeated incidents. Track resolved findings and recovery results instead of assigning hypothetical revenue savings to every discovered bug.

A useful report records the workload, injected failure, expected result, observed result, cleanup, and next action. Repeat the relevant experiment after a fix to confirm the improvement.

## Practice Check

Run one bounded failure experiment, restore the practice service, and write down the evidence and follow-up work. Explain one trade-off and one failure mode before moving on.

[Back to contents](#contents) · [Backend learning guide](../readme.md)
