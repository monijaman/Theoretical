# Observability & Reliability — Mastery Plan

## Purpose

Build a comprehensive observability and reliability system that enables rapid incident response, deep system understanding, and continuous improvement—learning to instrument code, troubleshoot production issues, and measure reliability.

## Learning Objectives

- Implement structured logging with context propagation and correlation IDs
- Understand the interaction between logs, metrics, and traces (the three pillars)
- Use OpenTelemetry to instrument applications and collect telemetry data
- Design and implement health checks (liveness, readiness, startup probes)
- Implement graceful shutdown to prevent request loss during deployments
- Set up monitoring, alerting, and dashboards (CloudWatch, Prometheus, Grafana)
- Measure and improve reliability metrics: availability, MTTR, MTBF
- Debug production issues using observability tools

## Scope

- Instrument the microservices system with complete observability
- Add structured logging to all services with correlation IDs
- Implement custom metrics (business metrics, latency, error rates)
- Set up distributed tracing across service boundaries
- Design health checks and graceful shutdown for all services
- Configure monitoring and alerting for common failure scenarios
- Create runbooks and incident response procedures

## Success Criteria (examples)

- All requests have trace IDs flowing through services; viewable in centralized system
- Error logs include request context (user ID, order ID, service, duration)
- Latency percentiles (p50, p95, p99) visible on dashboards
- Alert fires within 30 seconds of anomaly (error rate spike, latency spike, resource exhaustion)
- Graceful shutdown: zero dropped requests during pod termination
- MTTR < 15 minutes for common issues using observability dashboards
- Ability to answer: "How many users were affected?" in < 5 minutes

## Implementation Plan (phases)

1. Structured Logging Foundation (1–2 days)
   - **Log Format**: JSON with standard fields (timestamp, level, service, trace_id, user_id, message, duration)
   - **Log Levels**: DEBUG, INFO, WARN, ERROR, FATAL (use appropriately)
   - **Context Propagation**: Add request ID/trace ID to every log line (use log middleware/interceptors)
   - **Centralized Aggregation**: ELK, Loki, CloudWatch, or Splunk
     - Test: Log a request, search by trace ID, see all logs across services
   - **Log Sampling**: High-volume endpoints → sample logs to control costs
   - Deliverable: Structured logging implementation in one service, verified in centralized store

2. Correlation IDs & Request Tracing (1 day)
   - **Trace ID Generation**: Generate unique trace ID on request entry, propagate to all downstream calls
   - **Propagation**: HTTP headers (X-Trace-ID, X-Request-ID), message headers (RabbitMQ, async jobs)
   - **Context Storage**: Thread-local or async context (varies by language/framework)
   - **Usage**: Log every action with trace ID; trace entire request path across services
   - **Test**: Submit request, retrieve all logs/spans with same trace ID
   - Deliverable: Trace ID propagation working end-to-end; queries by trace ID return full request path

3. Metrics vs Logs vs Traces (1 day)
   - **Logs**: Human-readable events (errors, state transitions, contextual detail)
   - **Metrics**: Time-series numbers (latency, errors, throughput, resource usage)
   - **Traces**: Causal ordering of events across processes (distributed tracing)
   - **When to Use Each**:
     - Log: "Payment failed for order 123: insufficient funds"
     - Metric: `payment_latency{service="payment", status="failed"}` (5 requests in last minute)
     - Trace: Show all spans from order creation → payment → notification
   - **Cardinality**: Avoid unbounded dimensions in metrics (too many unique values = cost/performance hit)
   - Deliverable: Document decision matrix for logging vs metrication

4. OpenTelemetry Implementation (2–3 days)
   - **Installation**: Add OpenTelemetry SDKs (language-specific), exporters (Jaeger, Zipkin, OTLP)
   - **Instrumentation Types**:
     - **Automatic**: Library instrumentation (database drivers, HTTP client/server)
     - **Manual**: Custom spans for business logic (process order, validate payment)
   - **Attributes**: Add contextual data to spans (user_id, order_id, customer_tier)
   - **Sampling**: Trace all in dev, sample (e.g., 1%) in production for cost
   - **Span Events**: Log significant moments within a span (e.g., "queue full", "retry attempt 2")
   - **Testing**: Send traces to Jaeger/Zipkin, visualize request path, verify attributes
   - Deliverable: Full tracing stack deployed, sample traces visible in UI

5. Health Checks (1–2 days)
   - **Readiness Probe**: Is this instance ready to accept traffic? (e.g., DB connected, config loaded)
     - Returns 200 if ready, 503 if not
     - Use case: Kubernetes routes traffic only to ready pods
   - **Liveness Probe**: Is this instance alive or should it be restarted? (e.g., deadlock detection)
     - Returns 200 if alive, 503 if stuck
     - Use case: Kubernetes kills and restarts unhealthy pods
   - **Startup Probe**: Is startup complete? (for slow-starting apps)
     - Return 200 when app fully initialized
   - **Implementation**: HTTP endpoint `/health`, check: DB connection, message queue, cache, disk space
   - **Testing**: Kill database, watch readiness probe fail, verify traffic rerouted
   - Deliverable: Health check endpoints on all services, wired into Kubernetes probes

6. Graceful Shutdown (1 day)
   - **Problem**: Requests in flight when pod terminates = lost requests, unhappy users
   - **Solution**:
     - Receive SIGTERM signal (Kubernetes → 30s grace period default)
     - Stop accepting new requests (return 503 to new clients)
     - Wait for in-flight requests to complete (with timeout)
     - Close DB connections, flush logs
     - Exit cleanly
   - **Implementation**: Signal handlers (Node.js: `process.on('SIGTERM')`, Python: `signal`)
   - **Verify**: Send requests, kill pod mid-request, confirm no request loss
   - Deliverable: Graceful shutdown working in all services; verified via testing

7. Custom Metrics & Business Observability (1–2 days)
   - **Types**:
     - **Latency**: Request duration, database query time, queue processing time
     - **Throughput**: Requests/sec, messages/sec, transactions/sec
     - **Errors**: Error rate, specific error types (validation, timeout, network)
     - **Business**: Orders created, revenue, user signup funnel
     - **Resources**: CPU, memory, disk, network I/O, database connection pool
   - **Implementation**: Prometheus client (or CloudWatch SDK)
     - Counters: `total_requests`, `failed_payments`
     - Gauges: `queue_depth`, `active_connections`
     - Histograms: `request_latency_seconds` (auto-generates p50, p95, p99)
   - **Dashboards**: Grafana/CloudWatch dashboard showing key metrics
   - Deliverable: Metrics emitted from all services; dashboard displaying business and technical metrics

8. Alerting & On-Call Runbooks (1–2 days)
   - **Alert Rules** (examples):
     - Error rate > 5% for 2 minutes → page on-call
     - Latency p99 > 2 seconds for 5 minutes → warn
     - Disk usage > 80% → warn
     - Pod restarts > 3 in 5 minutes → page on-call
     - DLQ depth growing → warn (processing slower than incoming)
   - **Alert Routing**: PagerDuty, Slack, email (severity-based)
   - **Runbooks**: Step-by-step guides for each alert
     - "Error rate spike on payment service": Check logs for pattern, check database metrics, call payment provider
     - "Disk usage high on worker node": Check what's consuming space, trigger cleanup job, escalate if needed
   - **On-Call Training**: Practice responding to synthetic alerts; time to incident resolution
   - Deliverable: Alert rules configured, runbooks documented, on-call process tested

9. Incident Response & Post-Mortems (1 day)
   - **Incident Response Workflow**:
     1. Alert fires → on-call acknowledged
     2. Use observability tools to triage (logs, metrics, traces)
     3. Identify root cause: code, config, external dependency
     4. Implement fix (rollback, deploy patch, manual mitigation)
     5. Verify: traffic normal, error rate back to baseline
   - **Post-Mortem Template**:
     - What happened? (timeline)
     - Why did it happen? (root cause)
     - What made finding/fixing it hard? (process gaps)
     - How do we prevent it? (code, monitoring, automation improvements)
   - **Blameless Culture**: Focus on systems and processes, not individuals
   - Deliverable: Documented incident response procedure, sample post-mortem

10. Reliability Metrics & SLOs (1 day)
    - **Key Metrics**:
      - **Availability**: % uptime (e.g., 99.95%)
      - **MTBF** (Mean Time Between Failures): How often does service fail?
      - **MTTR** (Mean Time To Repair): How long to fix once it breaks?
      - **Error Budget**: How much downtime allowed within SLO? (e.g., 99.9% = 43 min/month)
    - **SLI/SLO definitions**:
      - SLI (Service Level Indicator): "99% of requests complete in < 500ms"
      - SLO (Service Level Objective): "Maintain 99% SLI 99.9% of the time"
      - SLA (Service Level Agreement): Contractual guarantee (if we miss, customer gets credit)
    - **Tracking**: Dashboard showing error budget burn; alerts when burning too fast
    - Deliverable: SLO definitions for each service, dashboard tracking burn rate

## Observability Pillars

| Pillar            | Tool/Pattern                       | Key Metric                  | Typical Question                        |
| ----------------- | ---------------------------------- | --------------------------- | --------------------------------------- |
| **Logs**          | Structured JSON, trace IDs         | Search latency, log volume  | "What happened to this order?"          |
| **Metrics**       | Prometheus, Grafana                | Cardinality, scrape latency | "How many errors in the past hour?"     |
| **Traces**        | Jaeger, Zipkin, OTLP               | Span latency, sampling rate | "Which service is slow?"                |
| **Profiles**      | Continuous profiling (CPU, memory) | Overhead                    | "Why is CPU high?"                      |
| **Logs + Traces** | Correlation IDs                    | Grep time                   | "Show me the request path and all logs" |

## Tools & Technologies

- **Logging**: ELK Stack, Loki, Datadog, Splunk, CloudWatch
- **Metrics**: Prometheus, Grafana, Datadog, CloudWatch
- **Tracing**: Jaeger, Zipkin, Datadog APM, AWS X-Ray, Honeycomb
- **OpenTelemetry**: Language SDKs, auto-instrumentation, exporters
- **Alerting**: PagerDuty, Opsgenie, Slack, custom webhooks
- **APM**: NewRelic, Datadog, Dynatrace, Honeycomb
- **Health Checks**: HTTP endpoints, Kubernetes probes, custom logic

## Deliverables

- **Logging Infrastructure**: Structured logs in centralized store, searchable by trace ID
- **Tracing Setup**: OpenTelemetry deployed, traces collected, Jaeger/Zipkin dashboards working
- **Correlation IDs**: Propagated across services, traceable end-to-end
- **Health Checks**: Liveness, readiness, startup probes on all services
- **Graceful Shutdown**: Verified no request loss during termination
- **Metrics & Dashboards**: Business and technical metrics visible; dashboards created
- **Alerts & Runbooks**: Alert rules configured; runbooks for top incidents
- **SLO Definitions**: Service-level objectives defined and tracked
- **Incident Response**: Process documented, team trained, post-mortem template ready
- **Documentation**: How to add observability to new services, on-call guides

---

If you want, I can break phases into task TODOs, provide code scaffolds for OpenTelemetry setup, or create alert rule templates.
