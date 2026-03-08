# Observability & Reliability — Complete Mastery

## Real-World Analogy: From Hospital Patient Monitoring to Intensive Care

**Emergency Room Triage (Bad Observability):**
- Vitals checked once per hour
- Patient in cardiac distress? Doctor doesn't find out until next check-in
- Result: Patient dies preventably

**ICU Monitoring (Good Observability):**
- Continuous heartbeat, blood pressure, oxygen, glucose monitoring
- Nurse alerted instantly if any metric deviates
- Doctor can see entire 24-hour graph of vitals
- When patient crashes, full data enables instant diagnosis
- Result: 92% survival rate vs 40% without monitoring

**Production Systems:**
- Bad observability: Check server status manually → find out about errors from customers
- Good observability: Alerts fire before impact, full trace shows root cause in minutes

## Part 1: The Three Pillars of Observability

### Pillar 1: Logs (The Detailed Story)

**Problem:** Too much data, yet unable to find root cause

```
Traditional logs (unstructured):
2026-03-08 14:32:10 INFO User created
2026-03-08 14:32:11 ERROR Payment failed
2026-03-08 14:32:12 INFO Order processed

Questions:
- Which user?
- Which payment failed?
- Did the order actually process?
- Are these events related?

Answer: No idea! Can't correlate.
```

**Solution: Structured Logs with Trace Context**

```json
{
  "@timestamp": "2026-03-08T14:32:10.123Z",
  "level": "INFO",
  "service": "user-service",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "spanId": "f7ad6b7b90a4eea1",
  "userId": "user123",
  "email": "alice@example.com",
  "action": "user.created",
  "environment": "production",
  "region": "us-west-2",
  "duration_ms": 45,
  "status": "success"
}
```

**Query in Elasticsearch: Find all events for user123**
```
GET logs/_search
{
  "query": {
    "term": {
      "userId": "user123"
    }
  },
  "sort": [
    { "@timestamp": { "order": "asc" } }
  ]
}

Results (in order):
1. user-service: user.created (14:32:10)
2. order-service: order.created (14:32:11)
3. payment-service: payment.attempted (14:32:12)
4. payment-service: payment.succeeded (14:32:15)
5. notification-service: email.sent (14:32:16)

Complete customer journey in 6 seconds!
```

**Implementation (Node.js + ELK Stack):**

```javascript
const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: { 
        node: 'http://elasticsearch:9200',
        auth: { username: 'user', password: 'pass' }
      },
      index: 'logs'
    }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Usage
logger.info('Payment processed', {
  traceId: req.headers['x-trace-id'],
  userId: req.user.id,
  orderId: req.body.orderId,
  amount: req.body.amount,
  status: 'success',
  duration_ms: Date.now() - startTime
});
```

**Log Levels (Use Appropriately):**

```
DEBUG: Low-level details (every DB query, cache hit/miss)
  ❌ Don't enable in production (too noisy, kills performance)
  ✅ Use only when diagnosing specific issues

INFO: Important events (user created, payment attempted, deployment started)
  ✅ Enable in production, should be <100 per user-action

WARN: Potentially problematic (slow query >1s, retry attempt, unusual pattern)
  ✅ Enable always, should trigger investigation

ERROR: Something failed (payment failed, DB unavailable, uncaught exception)
  ✅ Enable always, should page on-call immediately

FATAL: System unusable (cannot connect to database, out of memory)
  ✅ Enable always, should page all hands on deck
```

**❌ Over-Logging (Performance Killer):**
```javascript
// LOG EVERY ITERATION
for (const item of items) {
  logger.debug(`Processing item ${item.id}`);  // 100,000 log lines!
  logger.debug(`Item status: ${item.status}`);
  logger.debug(`Calculating price...`);
  logger.debug(`Price calculated: ${price}`);
}
// Result: 400K log lines per request, Elasticsearch overwhelmed, latency spikes
```

**✅ Selective Logging:**
```javascript
// Log only when unusual (> 1% of requests)
let slowProcessedCount = 0;
for (const item of items) {
  const start = Date.now();
  processItem(item);
  const duration = Date.now() - start;
  
  if (duration > 100) {  // Only log slow items
    logger.warn('Slow item processing', {
      itemId: item.id,
      duration_ms: duration
    });
    slowProcessedCount++;
  }
}

if (slowProcessedCount > 0) {
  logger.info('Batch processing summary', {
    total_items: items.length,
    slow_items: slowProcessedCount,
    slow_percentage: (slowProcessedCount / items.length * 100).toFixed(2)
  });
}
```

### Pillar 2: Metrics (The Numbers Over Time)

**Metrics vs Logs:**
```
Log: "Payment failed for order 123: insufficient funds" (specific event, contextual)
Metric: payment_failures_total{reason="insufficient_funds"} = 47 (aggregated count)

Log: One log entry = ~1KB space, searchable, detailed
Metric: One metric point = ~50 bytes, optimal for graphing, trend analysis

As scale grows:
- 1000 requests/sec × 1KB logs = 1GB/sec (unsustainable)
- 1000 requests/sec × 50 byte metrics = 50MB/sec (sustainable)

Solution: Logs for errors and outliers, metrics for trends
```

**Key Metrics to Track:**

```
1. LATENCY (How fast?)
   - p50: Median response time (50% of users experience this or better)
   - p95: 95th percentile (95% of users experience this or better)
   - p99: 99th percentile (99th percentile, where pain happens)
   
   Example: API latency
   - p50: 100ms (good user experience)
   - p95: 500ms (ok for some users)
   - p99: 5000ms (0.01% of users wait 5 seconds) ← UNACCEPTABLE
   
   Implementation:
   ```
   histogram_observe(payment_latency_seconds, 
     (end_time - start_time) / 1000)
   ```

2. THROUGHPUT (How much?)
   - Requests per second
   - Transactions per second
   - Events processed per second
   
   Example:
   ```
   counter_increment(http_requests_total, 
     labels={method: 'POST', path: '/orders'})
   # Grafana: rate(http_requests_total[5m])
   # Shows: 1000 req/s normally, 5000 req/sec during spike
   ```

3. ERROR RATE (How many fail?)
   - % of requests returning 5xx errors
   - % of requests timing out
   - % of requests returning validation errors
   
   Example:
   ```
   counter_increment(http_requests_total,
     labels={status: '500'})
   
   # Query error rate:
   rate(http_requests_total{status=~"5.."}[5m]) 
   / rate(http_requests_total[5m]) * 100
   
   Normal: <0.1%, Alert: >1%, Critical: >5%
   ```

4. RESOURCE USAGE (Capacity?)
   - CPU percentage
   - Memory usage
   - Disk I/O
   - Network bandwidth
   
   Example:
   ```
   gauges_set(container_memory_bytes, process.memoryUsage().heapUsed)
   
   Alert: If memory > 80% of limit, will OOM kill soon
   ```

5. BUSINESS METRICS (Why do we exist?)
   - Orders created per hour
   - Revenue per day
   - User signups per week
   - Payment success rate
   - Fill rate (% of orders that ship)
   
   Example:
   ```
   meter_increment(revenue_usd_total, payment.amount)
   
   Dashboard shows:
   Today: $487K, 7 day avg: $450K, 30 day avg: $455K
   Alerts if today < $400K (15% drop = investigate demand shift)
   ```
```

**Prometheus Setup (Scrape-Based Metrics):**

```yaml
# Deployment exports metrics on :9090/metrics
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: payment-service
          image: payment-service:1.0
          ports:
            - name: metrics
              containerPort: 9090

---
# Prometheus config to scrape metrics
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
      - job_name: 'payment-service'
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
```

**Grafana Dashboard:**
```
Dashboard: Payment Service Health
├─ Latency (p95, p99) [graph with alerts]
├─ Throughput (requests/sec) [gauge]
├─ Error Rate (%) [alert threshold highlighted]
├─ Success Rate (%) [green when > 99.9%]
├─ Revenue ($) [total, trending]
└─ Alerts (showing which thresholds firing)
```

### Pillar 3: Traces (The Causal Path)

**Problem: Log tells WHAT happened, trace tells WHY**

```
Scenario: Order takes 10 seconds (SLO: 1 second)

Logs show:
- order-service: received order
- payment-service: processed payment
- notification-service: sent email

From logs alone:
- Which step is slow? All three? Concurrency issue?
- Was there a retry? How many failures?
- What was the actual code path?

From trace:
- order-service to payment-service: 7 seconds [TOO SLOW!]
  - payment-service calls payment-gateway: 5 seconds [external timeout]
  - payment-service retries: 2 seconds [success]
- notification-service called in parallel: 1 second
- Root cause: Payment gateway slow, retry succeeded eventually
```

**Distributed Trace Structure:**

```
Trace ID: 550e8400-e29b-41d4-a716-446655440000
└─ Span (user-service)
   └─ GET /orders?userId=123
   │  ├─ DB Query: SELECT * FROM orders [30ms]
   │  ├─ Cache Lookup: Redis [5ms, MISS]
   │  └─ Cache Set: Redis [10ms]
   │
   └─ Call order-service [7000ms] ← Slow!
      └─ Span (order-service)
         │  GET /orders [7000ms]
         │  ├─ DB Query [100ms]
         │  └─ Call payment-gateway [6800ms] ← Root cause
         │
         └─ Span (payment-gateway)
            [5000ms timeout]
            ├─ Retry 1: [1000ms] ✅ Success
            └─ Span Events: [connection_pool_exhausted, retry_attempt_1]
```

**W3C Trace Context (Standard Header Propagation):**

```
Request enters system:
GET /orders
Headers: (no trace context)

Service 1 generates trace:
traceparent: 00-[version][traceId]-[spanId]-[sampled]
traceparent: 00-550e8400e29b41d4a716446655440000-f7ad6b7b90a4eea1-01
             └─ traceId: 550e8400e29b41d4a716446655440000
             └─ spanId: f7ad6b7b90a4eea1 (service 1)
             └─ sampled: 01 (1 = sample this trace)

Service 1 calls Service 2:
GET /orders
Headers:
  traceparent: 00-550e8400e29b41d4a716446655440000-8a5ck9d9c1b2f3g4-01
               └─ Same traceId
               └─ New spanId (service 2)

Service 2 creates child span:
- traceId: 550e8400e29b41d4a716446655440000 (inherited)
- spanId: 8a5ck9d9c1b2f3g4 (local)
- parentSpanId: f7ad6b7b90a4eea1 (caller)

Result: Full causality chain visible in Jaeger/Zipkin
```

**Trace Sampling Strategy:**

```
Challenge: Every request is a trace
At 1000 RPS (per second):
- 1 RPS × 1000 services = 1000 traces/sec
- Each trace 50 spans average = 50,000 spans/sec
- At 500 bytes per span = 25MB/sec
- Cost: ~$2000/month just for tracing infrastructure

Solution: Sample intelligently
```

```javascript
// Head-based sampling (decide before processing)
const shouldSample = (request) => {
  // Always sample errors, 1% of successes
  if (request.status >= 400) return true;
  if (request.latency_ms > 5000) return true;  // Slow requests
  return Math.random() < 0.01;
};

// Result: Sample 10-20x fewer normal requests, capture issues
```

## Part 2: Health Checks & Graceful Degradation

### Liveness, Readiness, Startup Probes

**Problem: How does Kubernetes know if Pod is healthy?**

```
Without probes:
- Pod allocated → Kubernetes thinks it's ready
- Pod has memory leak, consuming 5GB (not fatal yet)
- Kubernetes still sends traffic
- Eventually OOM kill, abrupt request loss

With proper probes:
- Memory leak detected → readiness probe returns 503
- Kubernetes stops sending requests → drains gracefully
- Pod restarts → memory freed → ready again
```

**The Three Probes:**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: app
spec:
  containers:
    - name: app
      image: myapp:1.0
      
      # Startup Probe: Finished initialization?
      # For slow-starting apps (JVM warmup, cache preload)
      # Runs once during startup
      startupProbe:
        exec:
          command:
            - /bin/sh
            - -c
            - test -f /ready  # Custom file created when ready
        failureThreshold: 30  # Try 30 × 10sec = 300sec = 5 min
        periodSeconds: 10
      
      # Liveness Probe: Is process alive or deadlocked?
      # Runs continuously, kubelet kills pod if fails
      # Only for detecting actual process hangs/deadlock
      livenessProbe:
        httpGet:
          path: /health/live
          port: 8080
        initialDelaySeconds: 30  # Give app time to start
        periodSeconds: 10
        timeoutSeconds: 5
        failureThreshold: 3  # 3 consecutive failures = restart
      
      # Readiness Probe: Can accept traffic?
      # Most important! Kubernetes load balancer waits for this
      readinessProbe:
        httpGet:
          path: /health/ready
          port: 8080
        initialDelaySeconds: 5
        periodSeconds: 5
        timeoutSeconds: 2
        failureThreshold: 2  # After 2 failures, remove from service
```

**Health Check Implementation:**

```javascript
const express = require('express');
const app = express();
const db = require('./db');
const redis = require('./redis');

// Liveness: Process alive?
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness: Can accept traffic?
app.get('/health/ready', async (req, res) => {
  try {
    // Check all critical dependencies
    const checks = {
      database: { status: 'unknown' },
      redis: { status: 'unknown' },
      diskSpace: { status: 'unknown' }
    };

    // Database check (timeout 2 seconds)
    try {
      await Promise.race([
        db.query('SELECT 1'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), 2000)
        )
      ]);
      checks.database.status = 'ready';
    } catch (e) {
      checks.database.status = 'not_ready';
      checks.database.error = e.message;
    }

    // Redis check
    try {
      await redis.ping();
      checks.redis.status = 'ready';
    } catch (e) {
      checks.redis.status = 'not_ready';
      checks.redis.error = e.message;
    }

    // Disk space (not ready if < 10% free)
    const diskUsage = await getDiskUsage();
    if (diskUsage.freePercent < 10) {
      checks.diskSpace.status = 'not_ready';
      checks.diskSpace.reason = `Only ${diskUsage.freePercent}% free`;
    } else {
      checks.diskSpace.status = 'ready';
    }

    // Return 200 only if ALL checks pass
    const allReady = Object.values(checks)
      .every(check => check.status === 'ready');

    res.status(allReady ? 200 : 503).json({
      ready: allReady,
      checks,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error.message
    });
  }
});

// Startup: Finished initializing?
let initialized = false;
app.get('/health/startup', (req, res) => {
  res.status(initialized ? 200 : 503).json({
    initialized,
    startTime: process.env.START_TIME
  });
});

// Initialization logic
async function initialize() {
  console.log('Starting initialization...');
  
  // Load cache
  await redis.load();
  
  // Precompute commonly-used data
  await precomputeReports();
  
  // Warmup database connections
  await db.pool.warmup();
  
  initialized = true;
  console.log('Initialization complete');
}

const server = app.listen(8080, async () => {
  console.log('Server started, beginning initialization...');
  await initialize();
});

module.exports = app;
```

### Graceful Shutdown

**❌ Abrupt Shutdown (1 Second):**
```
Kubernetes sends SIGTERM
Pod dies immediately
→ In-flight requests get connection reset
→ Users see error
→ Loss of data (partially processed transaction)
```

**✅ Graceful Shutdown (30 Seconds):**
```
Kubernetes sends SIGTERM (30 sec grace period)
1. Stop accepting new connections (tell load balancer)
2. Wait for existing requests (max 25 sec)
3. Close cleanly (flush caches, close DB)
4. Exit
Result: Zero request loss, data consistent
```

**Implementation:**

```javascript
const http = require('http');
const db = require('./db');
const { logger } = require('./logger');

const server = http.createServer(app);
const activeRequests = new Set();

// Track active requests
app.use((req, res, next) => {
  activeRequests.add(req);
  
  res.on('finish', () => activeRequests.delete(req));
  res.on('close', () => activeRequests.delete(req));
  
  next();
});

// Handle graceful shutdown signals
const gracefulShutdown = async (signal) => {
  logger.info('Received ' + signal + ', starting graceful shutdown');
  
  // Step 1: Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed, no new requests accepted');
  });
  
  // Step 2: Drain existing requests (max 25 seconds, K8s allows 30)
  const shutdownTimeout = 25000;
  const shutdownStart = Date.now();
  
  while (activeRequests.size > 0 && Date.now() - shutdownStart < shutdownTimeout) {
    const elapsed = Math.ceil((Date.now() - shutdownStart) / 1000);
    logger.info(`Draining requests... (${activeRequests.size} active, ${elapsed}s elapsed)`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (activeRequests.size > 0) {
    logger.warn(`Force closing ${activeRequests.size} requests after timeout`);
  }
  
  // Step 3: Close resources
  try {
    await db.pool.end();
    await cache.disconnect();
    await messageQueue.close();
    logger.info('Resources closed successfully');
  } catch (error) {
    logger.error('Error closing resources', { error: error.message });
  }
  
  process.exit(activeRequests.size > 0 ? 1 : 0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Also configure Kubernetes pod to give us time
// In Kubernetes deployment:
// terminationGracePeriodSeconds: 30

module.exports = server;
```

## Part 3: Comprehensive Instrumentation

### OpenTelemetry: Automatic + Manual Instrumentation

**Automatic Instrumentation (Library-Provided):**
```javascript
// Automatic instrumentations do the work for you
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');

const jaegerExporter = new JaegerExporter({
  host: 'jaeger-collector',
  port: 6831,
});

const sdk = new NodeSDK({
  traceExporter: jaegerExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// Now every HTTP request, database query, etc. is automatically traced!
// No code changes needed.
```

**Manual Instrumentation (For Business Logic):**
```javascript
const { trace } = require('@opentelemetry/api');
const tracer = trace.getTracer('order-service');

async function processOrder(orderId) {
  // Create span for business logic
  const span = tracer.startSpan('processOrder');
  
  try {
    span.setAttribute('orderId', orderId);
    span.setAttribute('service', 'order-service');
    
    // Span event: checkpoint in execution
    span.addEvent('validation_started');
    
    const order = await validateOrder(orderId);
    span.addEvent('validation_completed', {
      'order.status': order.status,
      'order.total': order.total
    });
    
    span.addEvent('payment_processing_started');
    
    const payment = await processPayment(order.userId, order.total);
    
    span.addEvent('payment_completed', {
      'transaction.id': payment.transactionId,
      'payment.status': payment.status
    });
    
    span.setStatus({ code: SpanStatusCode.OK });
    
    return { success: true, orderId, transactionId: payment.transactionId };
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    span.end();
  }
}
```

## Part 4: Alerting & SLOs

### Alert Rules (Examples)

```
name: HighErrorRate
condition: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01
duration: 5m  # Trigger if true for 5 minutes
severity: critical
notification: page-on-call  # Immediate phone call

Description: Error rate >1% for 5 minutes
Runbook: https://wiki/runbooks/high-error-rate.md
```

```
name: SlowLatency
condition: histogram_quantile(0.99, http_request_duration_seconds) > 2
duration: 10m
severity: warning
notification: slack-alerts

Description: p99 latency >2 seconds for 10 minutes
Runbook: https://wiki/runbooks/slow-latency.md
```

```
name: PodCrashLoop
condition: rate(container_last_seen{pod=~".*"}[5m]) == 0
duration: 2m
severity: critical
notification: page-on-call

Description: Pod restarted 3+ times in 5 minutes
Runbook: https://wiki/runbooks/pod-crash.md
```

### SLOs: Service Level Objectives

**SLO = Target reliability for a service**

```
Example: Payment Service

Availability SLO: 99.95% (maximum 22 minutes downtime/month)
- SLI (Service Level Indicator): uptime
- Measured: (requests succeeded) / (total requests)
- Current: 99.97% (beating SLO) ✅

Latency SLO: p99 < 500ms
- SLI: latency percentile
- Measured: p99 latency
- Current: 450ms p99 (beating SLO) ✅

Error Budget: 99.95% = 0.05% errors allowed
- If month has 100M requests, can accept 50,000 errors
- Currently using 20,000 errors (60% budget remaining)
- Decision: Ship new feature or stabilize?
  - If 40% budget: Ship with caution
  - If 10% budget: Delay new features, focus on stability
```

**SLO Dashboard:**
```
Payment Service (March 2026 YTD)
┌────────────────────────────────────────┐
│ Availability SLO: 99.95%               │
│ Current: 99.962% ████████░ (beat)      │
│ Error budget used: 38% ████░░░░░       │
│                                         │
│ Latency SLO (p99): 500ms                │
│ Current: 423ms ██████░░░░ (beat)      │
│                                         │
│ End of month projection:                │
│ - Availability: 99.98% (beat)          │
│ - Error budget: 40% remaining          │
│ ✅ Healthy, ship new features          │
└────────────────────────────────────────┘
```

## Part 5: Production Incident Response

### Incident Workflow

```
1. ALERT (30 seconds from anomaly)
   Prometheus rule fires: error_rate > 5%
   PagerDuty pages on-call engineer
   Slack channel: #incidents
   
2. ACKNOWLEDGE (30 seconds)
   Engineer: "I'm on it"
   Status page updated: "Investigating payment issues"
   Timer starts: MTTR required < 15 min
   
3. ASSESS (2 minutes)
   Check: Did something change?
   - Any recent deployment? git log --oneline -5
   - Any config change? kubectl rollout history
   - Any infrastructure event? AWS events
   
4. GATHER OBSERVABILITY (3 minutes)
   Logs: Find errors in past 10 minutes
   Metrics: What changed (throughput, latency, errors)?
   Traces: Are there patterns?
   
   Result: Identify affected service (payment-service)
   
5. DIAGNOSE (5 minutes)
   Root cause analysis:
   - Database slow? Check PG query performance
   - External service down? Check health endpoints
   - Code bug? Check recent deployment
   
   Result: Payment gateway timeout (external)
   
6. MITIGATE (5 minutes)
   Option A: Wait for external service recovery (no action needed)
   Option B: Circuit break payments temporarily
   Option C: Route to backup provider
   
   Decision: Circuit break for 5 minutes, retry successfully after
   
7. VERIFY (2 minutes)
   Error rate drops back to baseline
   Page users: System recovered
   Metrics confirm: All green
   
TOTAL MTTR: 15 minutes

8. POST-MORTEM (Next day)
   - Alert triggered slower than necessary (30 sec delay)
   - No fallback payment provider configured
   - Action: Add redundant payment gateway, trigger alert at 100ms timeout
```

### Post-Mortem Template

```markdown
# Post-Mortem: Payment Service Timeout (March 8, 2026)

## Summary
Payment processing failed for 12 minutes, affecting 1500 orders (~$75K revenue impact).
External payment gateway became unresponsive.

## Timeline
- 14:30: External provider begins having issues (before our detection)
- 14:32: Alert fires on error rate spike
- 14:33: On-call acknowledges
- 14:42: Root cause identified (payment gateway down)
- 14:47: Circuit breaker engaged, fallback activated
- 14:48: Payment gateway recovered
- 14:50: Error rate normalized, recovery complete

## Root Cause
Payment gateway (external service) became unresponsive to HTTPS requests.
Requests timed out after 5 seconds, causing cascading failures in our payment service.

## Contributing Factors (Why wasn't this caught earlier?)
1. No redundant payment gateway configured
2. No proactive health check of payment gateway (only reacted after requests failed)
3. Timeout on requests was 5 seconds (long time to detect failure)

## What Went Well
1. Alert fired promptly (within 30s of anomaly)
2. On-call found root cause quickly via distributed traces
3. Circuit breaker prevented retry storms
4. Graceful degradation minimized revenue impact

## What Went Poorly
1. 12 minutes to full recovery (target: 5 minutes)
2. 1500 affected orders = poor customer experience
3. No customer notification until 10 minutes in

## Action Items (Prevent Recurrence)
1. [IMMEDIATE] Set up heath check to payment gateway provider (every 10 seconds)
   Owner: Payments team, Due: March 9
   
2. [URGENT] Negotiate backup payment provider contract
   Owner: Finance + Payments team, Due: March 20
   
3. [HIGH] Reduce timeout on payment requests from 5s to 2s
   Owner: Payments team, Due: March 10
   
4. [MEDIUM] Add payment gateway status page dashboard
   Owner: Platform team, Due: March 30
   
5. [LOW] Document payment gateway failover runbook
   Owner: Payments team, Due: March 15

## Blameless Culture Note
@john_engineer did an excellent job diagnosing and recovering.
Issue was preventable with infrastructure redundancy, not individual mistakes.
No blame assigned, focus on system improvements.
```

## Part 6: Real Business Impact

**Google's SRE Philosophy: Error Budget**
```
Service Availability SLO: 99.9% uptime
Error budget: 0.1% (45 minutes/month)

Month 1: 99.95% (half error budget spent)
Remaining: 22 minutes downtime allowed
Decision: Ship new features (if they don't impact reliability)

Month 2: 99.98% (10% error budget spent)
Remaining: 40 minutes downtime allowed
Decision: Ship aggressive optimization

Month 3: 99.89% (error budget exceeded!)
All engineering effort → stability/monitoring
Deploy freeze until we recover
Lesson learned: Should have been more careful in earlier months
```

**Financial Impact of Downtime**
```
Stripe (payment processor):
- $K revenue per second = $3.6B annually / (365 × 86400)
- Any downtime = direct revenue loss
- 1 minute downtime = $60K loss minimum + customer churn

Airbnb:
- 100M listings, $100+ per transaction
- Every millisecond of latency = conversion loss
- 0.1% conversion loss from 500ms → 100ms latency improvement
- = $50M revenue annually

Netflix:
- 200M subscribers, high bandwidth requirements
- Every 1% of infrastructure cost saved = $100M annually
- Kubernetes auto-scaling saved Netflix $2B+ over 5 years
```

## Interview Questions for Staff-Level SRE

**Junior Level:**
1. What's the difference between logs and metrics?
2. What does a readiness probe do? Why is it important?
3. Explain SLO vs SLI vs SLA in simple terms

**Senior Level:**
4. Design an alerting strategy for 50 microservices. How do you prevent alert fatigue?
5. Walk me through how you'd add distributed tracing to an existing system
6. A service has 99% latency at p99. How would you identify the bottleneck?
7. How would you explain error budgets to a product manager who wants new features?

**Staff Level:**
8. Design the observability infrastructure for 10x growth (100M users today → 1B in 2 years)
9. Incident: Payment service error rate 50% for 30 seconds, now recovered. What do you investigate?
10. How would you build an error budget system that informs product prioritization?
11. Design a comprehensive health check strategy that catches issues proactively

## Career Progression

**Junior SRE ($90K–$110K)**
- Implement logging/metrics in assigned service
- Respond to simple on-call pages
- Follow runbooks to handle standard incidents
- Learn monitoring tools (Prometheus, Grafana)
- Skill focus: Operational excellence, incident response practice

**Senior SRE ($140K–$180K)**
- Design observability for multiple services
- Build runbooks and playbooks for on-call team
- Respond to complex incidents, lead root cause analysis
- Propose reliability improvements (error budgets, SLOs)
- Mentor juniors on incident response
- Skill focus: System design, business impact analysis

**Staff SRE / Principal ($210K–$300K)**
- Design company-wide reliability strategy
- Build SRE platform (automated incident response, autohealing)
- Lead high-impact transformations (reduce MTTR from 2h → 15min)
- Influence product roadmap using error budgets
- Make infrastructure architecture decisions
- Skill focus: Strategic thinking, business leadership

---

**Key Takeaway:** Good observability transforms your organization from reactive ("crashes happen, we fix them") to proactive ("we predict issues and prevent them before users notice").

Master the three pillars (logs, metrics, traces), and you can debug any system at any scale.
