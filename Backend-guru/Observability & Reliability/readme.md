# Observability & Reliability

Learn how to understand a running service, recognize problems, and recover when something fails. The examples follow an online store with order, payment, and notification services.

**Observability** means using evidence from a system to understand its behavior. **Reliability** means the system consistently does what users expect. Observability helps you investigate failures; reliability work helps reduce their frequency and impact.

## Start Here

This guide is for backend developers familiar with HTTP APIs and basic JavaScript. Kubernetes examples are easier to follow if you already know what a Pod and Service are.

- **First time learning this topic?** Read Part 1, then Part 2. Focus on what each signal or health check tells you.
- **Adding telemetry to an application?** Read Parts 1 and 3 together.
- **Preparing for on-call work?** Read Parts 4 and 5, then practice with the checklist at the end.

Code examples illustrate individual concepts. They are not a complete application. Application helpers, package installation, backend services, and credentials require your own setup. Numerical thresholds and incident stories are examples, not universal targets.

## Contents

1. [Logs, metrics, and traces](#part-1-the-three-pillars-of-observability)
2. [Health checks and graceful degradation](#part-2-health-checks--graceful-degradation)
3. [Adding instrumentation](#part-3-comprehensive-instrumentation)
4. [Alerting and reliability targets](#part-4-alerting--slos)
5. [Responding to incidents](#part-5-production-incident-response)
6. [Understanding business impact](#part-6-real-business-impact)
7. [Interview questions](#interview-questions-for-staff-level-sre)
8. [Career progression](#career-progression)
9. [Practice checklist](#practice-checklist)

## A Simple Example: A Slow Checkout

A customer says checkout took ten seconds. A useful investigation connects three pieces of evidence:

| Signal | What you learn | Example |
| --- | --- | --- |
| Metrics | How widespread the problem is | Payment latency increased across many requests. |
| Traces | Where a request spent its time | Most of the delay was in a payment gateway call. |
| Logs | Details about particular events | The gateway timed out, then a retry succeeded. |

Together, these signals help you decide what to investigate next. They do not automatically prove a root cause or prevent an outage.

## Quick Glossary

| Term | Meaning |
| --- | --- |
| Telemetry | Data emitted by an application, such as logs, metrics, and traces. |
| Instrumentation | Code or libraries that produce telemetry. |
| Span | One timed operation within a trace, such as a database query. |
| Trace context | Identifiers passed between services to connect related spans. |
| Scrape | A metrics collector fetching measurements from an endpoint. |
| SLI | Service level indicator: a measurement of service behavior. |
| SLO | Service level objective: a target for an SLI over a defined period. |
| SLA | Service level agreement: an agreement that may specify consequences for missed targets. |
| Error budget | The amount of unreliability allowed by an SLO. |
| Runbook | Steps for investigating and responding to a known problem. |
| SRE | Site reliability engineering: applying engineering practices to service reliability. |
| MTTR | Mean time to recovery; define the start and end of recovery consistently when measuring it. |

## Part 1: The Three Pillars of Observability

### Pillar 1: Logs (The Detailed Story)

A log records an event at a particular time. Use logs when you need details about a failed payment, a retry, or a specific request. Consistent field names make those events easier to search across services.

**Problem:** Too much data, yet unable to find root cause

```text
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
  "action": "user.created",
  "environment": "production",
  "region": "us-west-2",
  "duration_ms": 45,
  "status": "success"
}
```

The `service` field identifies the application, `action` describes the event, and `duration_ms` records elapsed milliseconds. A shared `traceId` connects events from one distributed operation; `userId` may match many separate requests. Avoid recording passwords, tokens, or unnecessary personal data.

**Query in Elasticsearch: Find all events for user123**

This example assumes `userId` is mapped as a keyword field and `@timestamp` as a date. Query a trace ID instead when you want to isolate one request.

```text
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

**Implementation (Node.js + Elasticsearch):**

Winston creates log records, and its Elasticsearch transport sends them to a searchable store. ELK refers to Elasticsearch, Logstash, and Kibana; this example sends directly to Elasticsearch without Logstash.

The usage snippet belongs inside a request handler where `req` and `startTime` exist. Configure the transport's timestamp and index mapping to match your queries.

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
        node: process.env.ELASTICSEARCH_URL,
        auth: {
          username: process.env.ELASTICSEARCH_USERNAME,
          password: process.env.ELASTICSEARCH_PASSWORD
        }
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

**Choosing a log level:**

| Level | Use it for | Example |
| --- | --- | --- |
| DEBUG | Detailed diagnostics, enabled selectively | Cache lookup details during an investigation. |
| INFO | Meaningful normal events | An order was accepted. |
| WARN | An unexpected condition the application handled | A dependency call needed a retry. |
| ERROR | An operation that failed | A payment could not be completed. |

Some logging systems also define a fatal level for unrecoverable failures; Winston's default levels do not include it. A log level alone should not determine who gets paged. Alert on actionable service impact so repeated errors do not overwhelm the on-call engineer.

**Common pitfall: Over-Logging (Performance Killer):**

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

**Example: Selective Logging:**

```javascript
// Example threshold: record items taking more than 100 ms
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

Metrics summarize measurements over time. They help answer questions such as “Are more requests failing?” or “Did memory usage rise after the release?”

**Metrics vs. logs:** A log can explain why order `123` failed. A metric counts failures across many orders. Many requests update the same metric series, so metric storage is not simply one stored record per request.

### Understanding Metric Types

| Type | Behavior | Example |
| --- | --- | --- |
| Counter | Accumulates events; may reset when a process restarts | Total HTTP requests. |
| Gauge | Goes up or down | Current memory usage or queue depth. |
| Histogram | Groups observations into buckets | Request durations used to estimate percentiles. |

For a counter, `rate(metric[5m])` estimates the average increase per second over the last five minutes. See [Prometheus metric types](https://prometheus.io/docs/concepts/metric_types/).

### What to Measure

| Measurement | Question it answers | Example |
| --- | --- | --- |
| Latency | How long do requests take? | p95 checkout duration. |
| Throughput | How much work is happening? | Requests per second. |
| Error rate | What fraction of work fails? | Percentage of requests returning HTTP 5xx. |
| Resource usage | Are we approaching capacity? | Memory usage relative to its limit. |
| Business outcomes | Can users complete important tasks? | Successful payments per minute. |

**Understanding percentiles:** If p99 latency is five seconds, roughly 99% of measured requests completed within five seconds, while the slowest 1% took longer. p50 is the median; p95 highlights slower requests. Whether a duration is acceptable depends on the user journey and its target.

**Requests per second:**

```promql
sum(rate(http_requests_total{service="payment-service"}[5m]))
```

**Percentage of requests returning server errors:**

```promql
100 *
sum(rate(http_requests_total{service="payment-service", status=~"5.."}[5m]))
/
sum(rate(http_requests_total{service="payment-service"}[5m]))
```

The numerator counts server errors and the denominator counts all requests for the same service. The `sum` combines instances and status codes before division. Decide separately how to handle missing series, periods with no traffic, timeouts, and business failures that do not return 5xx.

**p99 request duration in seconds, using a classic histogram:**

```promql
histogram_quantile(
  0.99,
  sum by (le) (
    rate(http_request_duration_seconds_bucket{service="payment-service"}[5m])
  )
)
```

The `le` label identifies each bucket's upper boundary. Keep it while combining buckets so Prometheus can estimate the percentile. This query assumes the application exports a classic histogram with the shown name and labels. See [Prometheus histograms and summaries](https://prometheus.io/docs/practices/histograms/).

**Keep labels manageable:** Use bounded labels such as service name, method, and route template (`/orders/:id`). Putting each user or order ID in metric labels creates many distinct time series, increasing storage and query work. Put those identifiers in logs or traces when needed.

**Prometheus Setup: Fetching Metrics**

Your application must expose a `/metrics` endpoint. Prometheus periodically fetches it; Grafana queries the stored metrics to draw dashboards. Declaring a container port alone does not create the endpoint.

This small `prometheus.yml` example assumes `payment-service:9090` is reachable from Prometheus:

```yaml
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: payment-service
    static_configs:
      - targets: ["payment-service:9090"]
        labels:
          service: payment-service
```

For a Kubernetes deployment, configure discovery and access for your environment. Pod annotations only affect scraping when the Prometheus configuration is set up to interpret them.

**Grafana Dashboard:**

```text
Dashboard: Payment Service Health
├─ Latency (p95, p99) [graph with alerts]
├─ Throughput (requests/sec) [gauge]
├─ Error Rate (%) [alert threshold highlighted]
├─ Success Rate (%) [green when > 99.9%]
├─ Revenue ($) [total, trending]
└─ Alerts (showing which thresholds firing)
```

### Pillar 3: Traces (The Causal Path)

A trace connects timed operations across services. Each operation is a **span**, with a start time, duration, and relationship to other spans. Follow the longest or failing spans to narrow your investigation, then use logs and other evidence to test the explanation.

**Example: locating the delay in checkout**

```text
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

```text
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

**Trace Context: Keeping Services Connected**

A caller passes trace context in an HTTP header. The receiving service uses that context to create a related span, so both services appear in the same trace.

```text
traceparent: 00-550e8400e29b41d4a716446655440000-f7ad6b7b90a4eea1-01
             version | trace ID | parent span ID | trace flags
```

Here, the trace ID has 32 hexadecimal characters and the parent span ID has 16. The receiver creates its own span ID and records the incoming span ID as its parent. Instrumentation libraries handle this propagation; see the [W3C Trace Context specification](https://www.w3.org/TR/trace-context/).

**Sampling: Choosing Which Traces to Keep**

Keeping every trace can be expensive. Sampling retains a subset, trading detail for lower processing and storage needs.

| Approach | When the decision happens | What it can use |
| --- | --- | --- |
| Head sampling | At the start of a trace | Information already available, such as a sampling ratio or parent decision. |
| Tail sampling | After collecting spans | Observed errors, duration, and other trace attributes. |

A decision made before a request runs cannot know its final status or latency. To preferentially retain slow or failed traces, a tail sampling pipeline must receive the relevant spans first; it cannot recover spans already discarded by head sampling. See [OpenTelemetry sampling](https://opentelemetry.io/docs/concepts/sampling/).

**Checkpoint:** For a slow checkout, explain what you would look for in metrics, traces, and logs—and how you would connect the evidence.

[Back to contents](#contents)

## Part 2: Health Checks & Graceful Degradation

### Liveness, Readiness, Startup Probes

A health probe asks a specific question about a container. Choosing the right probe matters because a failed check can affect traffic routing or trigger a restart.

| Probe | Question | Effect after its failure threshold is reached |
| --- | --- | --- |
| Startup | Has initialization finished? | Triggers a container restart; other probes wait for startup to succeed. |
| Liveness | Is the application stuck in a state a restart could fix? | Triggers a container restart. |
| Readiness | Can this instance currently serve traffic? | Marks it unready for normal Service traffic; does not itself restart it. |

Probes only check the behavior you implement. They do not automatically detect memory leaks. See [Kubernetes probe behavior](https://kubernetes.io/docs/concepts/workloads/pods/probes/).

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
      # Repeats until it succeeds or reaches its failure threshold
      startupProbe:
        httpGet:
          path: /health/startup
          port: 8080
        failureThreshold: 30  # Try 30 × 10sec = 300sec = 5 min
        periodSeconds: 10

      # Liveness Probe: Is process alive or deadlocked?
      # Repeated failures trigger a container restart
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

The Express example below illustrates separate endpoints. `db`, `redis`, `getDiskUsage`, and initialization helpers are application-specific. Only include dependencies that are essential for serving the traffic this instance receives; an optional cache failure may allow degraded service instead.

Bound dependency checks so the whole handler completes within the readiness probe's timeout. The illustrative database timeout below is not enough by itself: Redis and disk checks also need deadlines, and `Promise.race` does not cancel the underlying database query.

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

### Graceful Degradation

Graceful degradation means preserving useful behavior when part of the system fails. If product recommendations are unavailable, checkout can continue without them. If payments are unavailable, explain that payment could not be completed instead of reporting a successful purchase.

A **circuit breaker** temporarily stops calls to a failing dependency after repeated failures. It can reduce overload while recovery is attempted. Any retry or fallback must preserve the operation's correctness—for payments, that includes preventing duplicate charges.

### Graceful Shutdown

Graceful shutdown gives an instance time to finish work before exiting. Kubernetes sends a termination signal, and the application must handle that signal and close its resources within the configured grace period.

**Common pitfall: Abrupt Shutdown (1 Second):**

```text
Kubernetes sends SIGTERM
Pod dies immediately
→ In-flight requests get connection reset
→ Users see error
→ Loss of data (partially processed transaction)
```

**Example: Graceful Shutdown (30 Seconds):**

```text
Kubernetes sends SIGTERM (30 sec grace period)
1. Stop accepting new connections (tell load balancer)
2. Wait for existing requests (max 25 sec)
3. Close cleanly (flush caches, close DB)
4. Exit
Result: Fewer interrupted requests; unfinished work still needs explicit handling
```

**Implementation sketch:**

Register the request-tracking middleware before application routes, use the server that actually listens for traffic, and supply the `app`, `cache`, and `messageQueue` objects. This is a separate sketch, not a second server to paste into the earlier health-check example.

The example limits request draining to 25 seconds. A complete shutdown also needs an overall deadline for resource cleanup, readiness changes, and handling repeated signals. Test it with requests in flight; a grace period alone does not guarantee completion.

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

OpenTelemetry libraries can create spans for supported HTTP and database libraries. Initialize the SDK before loading the application libraries you want to instrument.

This CommonJS learning example prints spans locally. It assumes the three imported packages are installed; production export requires a separately configured exporter and destination.

```javascript
// instrumentation.cjs
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

const sdk = new NodeSDK({
  traceExporter: new ConsoleSpanExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

For a CommonJS application, preload this file:

```bash
node --require ./instrumentation.cjs app.js
```

An exporter sends recorded spans to a destination; the console exporter makes them visible while learning. Supported libraries, module loading, and setup affect what is captured. See the [OpenTelemetry Node.js guide](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/).

**Manual Instrumentation (For Business Logic):**

Add your own span when a business operation, such as processing an order, deserves a named entry in a trace. Attributes describe the operation, events mark checkpoints, and the status records its outcome. The SDK above must already be initialized; the order and payment functions below are placeholders for your application logic.

```javascript
const { trace, SpanStatusCode } = require('@opentelemetry/api');
const tracer = trace.getTracer('order-service');

async function processOrder(orderId) {
  // Create span for business logic
  return tracer.startActiveSpan('processOrder', async (span) => {

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
  });
}
```

## Part 4: Alerting & SLOs

An alert asks someone to act. A useful alert describes the user impact, identifies the affected service, and links to a runbook. Use a page for urgent action and a lower-priority channel for problems that can wait.

### Alert Rules (Examples)

This is a Prometheus rule-file example. It assumes the request counter and `service` and `status` labels from Part 1. Notification routing is configured separately in Alertmanager.

```yaml
groups:
  - name: payment-service
    rules:
      - alert: HighPaymentErrorRate
        expr: |
          sum(rate(http_requests_total{service="payment-service", status=~"5.."}[5m]))
          /
          sum(rate(http_requests_total{service="payment-service"}[5m])) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Payment server errors exceed 1%"
          description: "Check traffic volume, recent releases, and dependency failures."
```

The expression uses a fraction, so `0.01` means 1%. `for: 5m` means the condition must remain true for five minutes before the alert fires. This threshold is illustrative; adapt it to your service target and traffic volume, and define no-traffic and missing-data behavior.

Other useful alerts include sustained latency above the service target and repeated container restarts. Each needs the metric that measures the stated condition—a metric showing when a container was last seen does not count its restarts.

### SLOs: Service Level Objectives

An SLO defines the level of service you aim to provide over a stated window. First choose the user journey, then define which events count as good and which events belong in the total. See [Google SRE: service level objectives](https://sre.google/sre-book/service-level-objectives/).

### Worked Example: Payment Success

Suppose your SLO is **99.95% successful eligible payment requests over 30 days**. Define how expected card declines, retries, and provider failures are counted before calculating the result.

```text
SLI = successful eligible requests / all eligible requests
Error budget fraction = 1 - 0.9995 = 0.0005 = 0.05%

For 100,000,000 eligible requests:
Allowed failures = 100,000,000 × 0.0005 = 50,000
Observed failures = 20,000
Budget used = 20,000 / 50,000 = 40%
Budget remaining = 60%
Observed success rate = 99.98%
```

This is a request-based budget. It does not translate directly into a fixed number of downtime minutes because traffic varies over time.

### Latency Targets

A separate latency objective might require 99% of eligible requests to finish within 500 ms over the same window. This makes “good” measurable: count requests that meet the threshold and divide by eligible requests. Use percentile charts to investigate changes in the distribution.

### Using the Budget

An error budget helps product and engineering teams discuss release risk. When failures consume it quickly, prioritize recovery and prevention. Agree on release policies ahead of time instead of treating a single remaining-budget percentage as an automatic decision.

A useful dashboard shows the objective, measurement window, observed success rate, latency performance, and budget used. Keep the numbers tied to the same scope and time window.

**Checkpoint:** Explain the difference between an SLI, an SLO, and an error budget using the payment example.

[Back to contents](#contents)

## Part 5: Production Incident Response

### Incident Workflow

The immediate goal is to reduce user impact while preserving evidence for investigation. A mitigation restores useful service; a permanent fix addresses the underlying problem.

| Step | What to do | Example |
| --- | --- | --- |
| 1. Acknowledge | Confirm ownership and open an incident channel. | The on-call engineer starts investigating payment failures. |
| 2. Assess impact | Identify affected users, operations, and the start time. | Checkout is failing in one region. |
| 3. Check changes | Inspect recent deployments, configuration, and infrastructure events. | Compare the incident start with the latest rollout. |
| 4. Gather evidence | Connect metrics, traces, and logs. | Slow traces show gateway timeouts. |
| 5. Mitigate | Choose an established recovery action and assess its risks. | Roll back a bad release or use a tested fallback. |
| 6. Verify | Confirm user operations succeed over a meaningful observation period. | Payment success and latency return to their normal ranges. |
| 7. Communicate | Update stakeholders throughout and explain recovery status. | Update the status page with confirmed information. |
| 8. Learn | Document contributing factors and assign follow-up work. | Add a failure test and improve the runbook. |

Waiting for a provider may be unavoidable, but it is still necessary to manage user impact and communicate. A circuit breaker reduces repeated failing calls; it does not make the provider healthy.

Measure detection and recovery times from explicit timestamps. Treat response-time targets as team goals, not promises that every incident fits a fixed schedule.

### Post-Mortem Template

A post-mortem records what happened, what contributed, and what will change. The fictional example below illustrates a blameless review. Use confirmed facts and distinguish affected order value from verified revenue loss.

```markdown
# Post-Mortem: Payment Service Timeout (March 8, 2026)

## Summary
Payment processing was degraded for 20 minutes, affecting 1500 orders. Revenue impact is still being assessed.
External payment gateway became unresponsive.

## Timeline
- 14:30: External provider begins having issues (before our detection)
- 14:32: Alert fires on error rate spike
- 14:33: On-call acknowledges
- 14:42: Root cause identified (payment gateway down)
- 14:47: Circuit breaker engaged to limit repeated failing calls
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
1. Alert fired two minutes after the first observed provider issue
2. On-call found root cause quickly via distributed traces
3. Circuit breaker prevented retry storms
4. Graceful degradation minimized revenue impact

## What Went Poorly
1. 20 minutes from initial provider issues to verified recovery
2. 1500 affected orders = poor customer experience
3. No customer notification until 10 minutes in

## Action Items (Prevent Recurrence)
1. [IMMEDIATE] Evaluate a health check to payment gateway provider (every 10 seconds)
   Owner: Payments team, Due: March 9

2. [URGENT] Negotiate backup payment provider contract
   Owner: Finance + Payments team, Due: March 20

3. [HIGH] Test a shorter payment timeout against provider latency and retry behavior
   Owner: Payments team, Due: March 10

4. [MEDIUM] Add payment gateway status page dashboard
   Owner: Platform team, Due: March 30

5. [LOW] Document payment gateway failover runbook
   Owner: Payments team, Due: March 15

## Blameless Culture Note
Review the information available to responders at the time.
Focus follow-up work on system behavior, tooling, and response procedures.
```

## Part 6: Real Business Impact

Reliability work supports users completing their tasks. Evaluate it using your own measurements rather than assuming another company's savings will apply.

| Outcome | What to compare |
| --- | --- |
| More successful user journeys | Completed checkouts and failure rates. |
| Faster recovery | Time to detect, mitigate, and verify recovery. |
| More useful alerts | Actionable pages compared with noise and duplicates. |
| Sustainable telemetry cost | Ingestion volume, retention, sampling, and query usage. |
| Safer releases | Releases causing incidents and time needed to roll back. |

**Illustrative impact calculation:** If 2,000 checkout attempts fail and 1,200 later succeed, 800 remain unsuccessful. That count helps assess impact, but estimating lost revenue also requires evidence about purchase intent, order value, and later recovery.

Keep enough telemetry to answer operational questions. Review retention, unnecessary logs, and high-cardinality metrics as traffic grows.

## Interview Questions for Staff-Level SRE

**Junior Level:**

1. What's the difference between logs and metrics?
2. What does a readiness probe do? Why is it important?
3. Explain SLO vs SLI vs SLA in simple terms

**Senior Level:**

4. Design an alerting strategy for 50 microservices. How do you prevent alert fatigue?
5. Walk me through how you'd add distributed tracing to an existing system
6. A service has p99 latency of five seconds. How would you identify the bottleneck?
7. How would you explain error budgets to a product manager who wants new features?

**Staff Level:**

8. Design the observability infrastructure for 10x growth (100M users today → 1B in 2 years)
9. Incident: Payment service error rate 50% for 30 seconds, now recovered. What do you investigate?
10. How would you build an error budget system that informs product prioritization?
11. Design a comprehensive health check strategy that catches issues proactively

## Career Progression

Responsibilities vary by organization. Use these examples to identify skills to practice; SRE roles include both software engineering and operational work.

**Junior SRE**

- Implement logging/metrics in assigned service
- Respond to simple on-call pages
- Follow runbooks to handle standard incidents
- Learn monitoring tools (Prometheus, Grafana)
- Skill focus: Operational excellence, incident response practice

**Senior SRE**

- Design observability for multiple services
- Build runbooks and playbooks for on-call team
- Respond to complex incidents, lead root cause analysis
- Propose reliability improvements (error budgets, SLOs)
- Mentor juniors on incident response
- Skill focus: System design, business impact analysis

**Staff SRE / Principal**

- Design company-wide reliability strategy
- Build SRE platform (automated incident response, autohealing)
- Lead high-impact transformations (reduce MTTR from 2h → 15min)
- Influence product roadmap using error budgets
- Make infrastructure architecture decisions
- Skill focus: Strategic thinking, business leadership

## Practice Checklist

Use a practice environment and one small service:

- [ ] Write a structured log for a failed operation and find related events by trace ID.
- [ ] Graph request rate, error percentage, and a latency percentile; explain the units.
- [ ] Follow a trace across two services and identify the longest operation.
- [ ] Explain what happens when each Kubernetes probe fails.
- [ ] Test shutdown with a request in flight and observe whether it completes.
- [ ] Define an SLO with an explicit window and calculate its error budget.
- [ ] Write an alert with a clear response action and a short runbook.
- [ ] Walk through a simulated incident and record follow-up improvements.

[Back to contents](#contents)

[Backend learning guide](../readme.md)
