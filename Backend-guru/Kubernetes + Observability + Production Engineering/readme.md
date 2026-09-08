# Kubernetes, Observability & Production Engineering

Learn how to deploy backend services, understand what happens while they run, and respond when something goes wrong. This guide uses a small set of example services—users, orders, and payments—to connect the concepts.

## Start Here

**Who this is for:** Backend developers who understand a basic web API and want to learn how services run in Kubernetes.

**Before you begin:** Be comfortable with terminal commands, basic YAML, HTTP requests, and Docker images and containers. For hands-on practice, you will need `kubectl` and access to a practice Kubernetes cluster.

**How to read the examples:** Code blocks illustrate individual concepts. Some are partial snippets, and they do not form a complete application or a ready-to-deploy production setup. Replace sample image names, domains, secrets, and namespaces with your own values. Tools such as Prometheus, Jaeger, cert-manager, and Argo CD require separate setup.

Choose a learning path:

- **New to Kubernetes?** Read Parts 1 and 2 first. Focus on Pods, Deployments, Services, and resource settings before moving on.
- **Want to understand service failures?** Read Parts 3 and 4, then follow the troubleshooting runbook in Part 7.
- **Preparing to operate services?** Work through Parts 5 and 6, then use the checkpoints to identify topics to practice.
- **Preparing for interviews?** Use the interview questions after studying the relevant sections.

## Contents

1. [Kubernetes fundamentals and architecture](#part-1-kubernetes-fundamentals--architecture)
2. [Auto-scaling and resource management](#part-2-auto-scaling--resource-management)
3. [Observability: logs, metrics, and traces](#part-3-observability-logging-metrics-traces)
4. [Graceful shutdown and health checks](#part-4-graceful-shutdown--health-checks)
5. [Security: access, network policies, and secrets](#part-5-security-rbac-network-policies-secrets)
6. [GitOps and automated deployments](#part-6-gitops--automated-deployments)
7. [Production troubleshooting runbook](#part-7-production-troubleshooting-runbook)
8. [Interview questions](#interview-questions-for-staff-level-kubernetes-engineers)
9. [Career progression](#career-progression)
10. [Evaluating business impact](#evaluating-business-impact)

## Terms You Will See

| Term | Plain-language meaning |
| --- | --- |
| Cluster | A group of machines managed by Kubernetes. |
| Node | One machine in a cluster. |
| Pod | A unit that runs one or more containers together. |
| Deployment | A way to manage copies of an application and roll out updates. |
| Service | A stable network endpoint for a group of Pods. |
| Namespace | A named scope for resources within a cluster. |
| Replica | Another copy of a Pod managed by a workload controller. |
| HPA | Horizontal Pod Autoscaler: adjusts the number of Pod replicas. |
| PVC | PersistentVolumeClaim: a request for persistent storage. |
| RBAC | Role-based access control: defines who can perform which API actions. |
| p99 latency | The response time that 99% of measured requests fall at or below. |
| GitOps | Managing desired infrastructure configuration in Git and reconciling it with the running system. |
| MTTR | Mean time to recovery: the average time it takes to restore service. |

## Real-World Analogy: From Small Restaurant to Global Chain

**Early Days (Monolith):** You run a single restaurant kitchen. One manager (you) oversees all operations: cooking, plating, delivery. Everything works locally on your machine—you're the bottleneck and single point of failure.

**Growing Business (Docker):** You package your recipes into containers (each recipe contains ingredients + cooking instructions). You can now run the same recipe anywhere, consistently.

**Multiple Locations (Kubernetes):** You have 50 restaurants globally. Each needs the same menu (services), but they're independent. You hire a **manager (Kubernetes)** who:

- Ensures each location has the right staff (Pods, Deployments)
- Hires more staff when a location gets busy (HPA scaling)
- Routes customer orders to nearby locations (Service Discovery)
- Handles staff illness/location closure gracefully (Fault tolerance)
- Tracks which locations are understaffed (Observability)

If one kitchen catches fire, customers automatically route to nearby locations. Staff don't lose orders mid-shift. Management knows instantly. That's Kubernetes + Observability + Production Engineering.

## Part 1: Kubernetes Fundamentals & Architecture

Learn where applications run and how Kubernetes keeps track of them. Start with the cluster diagram, then compare Pods, Services, and Deployments.

### Why Kubernetes: The Business Case

Kubernetes helps manage services across multiple machines. It is useful when you need repeatable deployments, multiple application replicas, and a consistent way to manage workloads.

Consider an online store: traffic is quiet overnight and rises during a sale. The team needs to add capacity, replace failed application instances, and release updates. The following sections explain the Kubernetes building blocks used for these tasks.

### Kubernetes Architecture: The Cluster

```text
┌─────────────────────────────────────────────────────────────┐
│                      KUBERNETES CLUSTER                      │
├─────────────────────────────────────────────────────────────┤
│                      CONTROL PLANE                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ API server   │  │ etcd (DB)    │  │ scheduler    │       │
│  │ (API)        │  │ (state)      │  │ (place pods) │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
├─────────────────────────────────────────────────────────────┤
│ WORKER NODES (where containers actually run)                │
│                                                              │
│ Node-1                     Node-2          Node-3           │
│ ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐   │
│ │ Pod A (nginx)    │  │ Pod C (db)   │  │ Pod E (cache)│   │
│ │ Pod B (app)      │  │ Pod D (app)  │  │ Pod F (job)  │   │
│ └──────────────────┘  └──────────────┘  └──────────────┘   │
│ kubelet (agent)        kubelet (agent)     kubelet (agent)  │
└─────────────────────────────────────────────────────────────┘
```

**Reading the diagram:** The control plane manages the cluster; worker nodes run your applications. The API server receives requests, etcd stores cluster state, and the scheduler selects nodes for new Pods.

**Common pitfall: placing every replica on one node**

```yaml
# Deploy everything to one node
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 10  # All on the selected node
  template:
    spec:
      nodeSelector:
        kubernetes.io/hostname: node-1  # Match the node label
```
**Problem:** Node-1 dies → all 10 replicas down → 100% of users affected

**Example: Prefer distributing replicas across nodes**

```yaml
# Distribute across nodes, let scheduler decide
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 10
  template:
    metadata:
      labels:
        app: user-service
    spec:
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
            - weight: 100
              podAffinityTerm:
                labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - user-service
                topologyKey: kubernetes.io/hostname  # Different nodes
      containers:
        - name: user-service
          image: myregistry/user-service:1.0.0
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
```

### Core Kubernetes Primitives

**Pod (Smallest deployable unit):**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-server
spec:
  containers:
    - name: nginx
      image: nginx:1.19
      ports:
        - containerPort: 80
  initContainers:  # Run before main container
    - name: init-config
      image: busybox:1.28
      command: ['sh', '-c', 'echo "Initializing..." && sleep 5']
```

**Service (Stable network endpoint):**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  type: ClusterIP  # Internal only
  selector:
    app: user-service  # Route to pods with this label
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP
```

Service DNS: `user-service.default.svc.cluster.local` identifies this Service in the default namespace and cluster domain. The Service routes to eligible endpoints selected by its labels; readiness helps determine eligibility.

**Deployment (Replicas, rolling updates, rollbacks):**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1         # 1 extra pod during update
      maxUnavailable: 0   # Always have 3 ready
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
        - name: user-service
          image: myregistry/user-service:1.1.0
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: url
```

**ConfigMap (Non-sensitive config):**

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  log_level: "INFO"
  cache_ttl: "3600"
  database_pool_size: "20"
  features.json: |
    {
      "beta_features": false,
      "rate_limit": 1000
    }
```

### Stateful Services: PostgreSQL, Redis, RabbitMQ

**Common pitfall: running a database without persistent storage**

```yaml
# WRONG: This violates data durability
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: postgres
          image: postgres:13
          # No persistent storage! Data lost on pod restart!
```

**Example: a StatefulSet with persistent storage**

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: production
spec:
  replicas: 1  # Primary only initially
  selector:
    matchLabels:
      app: postgres
  serviceName: postgres-headless  # Important: required for StatefulSet
  template:
    metadata:
      labels:
        app: postgres
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: postgres
          image: postgres:13
          ports:
            - containerPort: 5432
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: password
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 2000m
              memory: 2Gi
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
              subPath: pgdata  # Avoid permission issues
          livenessProbe:
            exec:
              command:
                - /bin/sh
                - -c
                - pg_isready -U postgres
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - /bin/sh
                - -c
                - pg_isready -U postgres -q
            initialDelaySeconds: 5
            periodSeconds: 5
  volumeClaimTemplates:
    - metadata:
        name: postgres-storage
      spec:
        accessModes: [ "ReadWriteOnce" ]
        storageClassName: fast-ssd  # Use fast storage for production
        resources:
          requests:
            storage: 100Gi
```

**Key Differences:**

- **Deployment:** Manages interchangeable replicas; persistent storage is possible, but stable replica identities are not provided.
- **StatefulSet:** Manages stable identities and storage associations. Database replication, backups, and failover still require separate configuration.

### Ingress: External Access & TLS

**Common pitfall: Exposing Services Without Ingress:**

```yaml
# Okay for dev, bad for production
apiVersion: v1
kind: Service
metadata:
  name: user-service
spec:
  type: NodePort
  ports:
    - port: 8080
      nodePort: 30000  # Access via http://node-ip:30000
  selector:
    app: user-service
```

Problems:

- NodePort random, hard to remember
- No HTTPS
- No request routing (hostname-based, path-based)
- No rate limiting

**Example: Ingress routing and TLS:**

An Ingress needs a compatible controller. The annotations below are controller-specific, and cert-manager requires an issuer configuration. `Prefix` paths match URL path elements, not regular expressions; see [Kubernetes Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/).

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/limit-rps: "100"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls-cert  # Auto-renewed by cert-manager
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /users
            pathType: Prefix
            backend:
              service:
                name: user-service
                port:
                  number: 80
          - path: /orders
            pathType: Prefix
            backend:
              service:
                name: order-service
                port:
                  number: 8080
          - path: /payments
            pathType: Prefix
            backend:
              service:
                name: payment-service
                port:
                  number: 8080
```

**Checkpoint:** Explain how a Pod, Deployment, and Service work together. Identify where persistent data lives in the database example.

[Back to contents](#contents)

## Part 2: Auto-Scaling & Resource Management

Learn how replica counts and resource settings work together. Focus on the difference between adding application copies and providing enough machine capacity to run them.

### Horizontal Pod Autoscaler (HPA): Scale Replicas

**Real Business Scenario:**

```text
E-commerce platform:
- Off-peak: 1000 users, 10 pods (1 second latency)
- Peak (9 PM): 100K users, need ? pods

Calculate:
- 10 pods handle 1000 users = 100 users per pod
- 100K users → 100K / 100 = 1000 pods needed

Challenge: Add 1000 pods instantly?
- Provisioning takes 30 seconds per node (AWS)
- Need to add 500 nodes (2 pods per node)
- Time: 500 nodes × 30s = 250 minutes
- Result: Major latency spike, customer loss

Solution: Predict demand, scale gradually before peak
```

**Common pitfall: Manual Scaling:**

```sh
# Admin manually resizes every evening
kubectl scale deployment/user-service --replicas=1000
# Next morning, manually scale down
kubectl scale deployment/user-service --replicas=10
# If admin forgets → black Friday disaster
```

**Example: Automatic Scaling:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: user-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: user-service
  minReplicas: 5
  maxReplicas: 1000
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70  # Scale up when pods exceed 70% CPU
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80  # Scale up when pods exceed 80% memory
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 min before scaling down
      policies:
        - type: Percent
          value: 50  # Remove max 50% of replicas
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0  # Scale up immediately
      policies:
        - type: Percent
          value: 100  # Add 100% of replicas
          periodSeconds: 30
        - type: Pods
          value: 50
          periodSeconds: 30
      selectPolicy: Max  # Use policy that increases replicas most
```

**Custom Metrics (Business-Driven):**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-service
  minReplicas: 3
  maxReplicas: 500
  metrics:
    - type: Pods
      pods:
        metric:
          name: queue_depth  # Custom metric from Prometheus
          selector:
            matchLabels:
              queue: "order-processing"
        target:
          type: AverageValue
          averageValue: "100"  # One pod per 100 messages in queue
```

**Monitoring Scaling:**

```sh
# Watch HPA in action
kubectl get hpa user-service-hpa --watch
NAME              REFERENCE                  TARGETS            MINPODS MAXPODS REPLICAS AGE
user-service-hpa  Deployment/user-service    78%/70%, 45%/80%   5       1000    120      5m
user-service-hpa  Deployment/user-service    92%/70%, 55%/80%   5       1000    250      6m
user-service-hpa  Deployment/user-service    68%/70%, 42%/80%   5       1000    250      10m
user-service-hpa  Deployment/user-service    42%/70%, 30%/80%   5       1000    150      15m
```

### Resource Requests & Limits

**Business Impact of Wrong Sizing:**

```text
E-commerce: Payment processing
- Per order: $50-500 revenue
- Poorly sized payment pods → OOM kill → restart → slow processing
- 10 second delay × 1000 concurrent orders = $12,500 lost in one spike

Correct sizing: $50K infrastructure, prevent $1M revenue loss
```

**Common pitfall: No Resource Limits:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: memory-hog
spec:
  template:
    spec:
      containers:
        - name: app
          image: myapp:1.0
          # No limits! Pod can use 100% node memory
```

Problem: Pod leaks memory → uses 50GB → evicts other pods → cascade failure

**Example: Proper Resource Management:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  template:
    spec:
      containers:
        - name: user-service
          image: myapp:1.0
          resources:
            requests:  # Minimum needed to run well
              cpu: 100m  # 100 millicores = 0.1 CPU
              memory: 256Mi
            limits:  # Absolutely cannot exceed
              cpu: 500m
              memory: 512Mi
```

**Capacity Planning:**

```text
Node: 4 CPU, 16GB memory

Pod specs:
- user-service: 100m CPU, 256Mi memory
- order-service: 100m CPU, 256Mi memory
- payment-service: 200m CPU, 512Mi memory

Pods per node:
- CPU: 4000m / 100m = 40 pods (user-service only)
- Memory: 16384 / 256 = 64 pods (user-service only)
- Realistic mix: user (10) + order (10) + payment (5) = 25 pods, uses:
  - CPU: 10×100 + 10×100 + 5×200 = 2200m (55% = healthy)
  - Memory: 10×256 + 10×256 + 5×512 = 7168Mi (44% = healthy)
```

**Checkpoint:** Explain when you would add replicas and when you would change resource requests or limits.

[Back to contents](#contents)

## Part 3: Observability: Logging, Metrics, Traces

Use three types of evidence to understand your application: **logs** describe individual events, **metrics** show numerical trends, and **traces** follow a request across services.

### Structured Logging with Correlation IDs

**Common pitfall: Unstructured Logs (Hard to Troubleshoot):**

```log
2026-03-08 14:32:10 INFO User created
2026-03-08 14:32:11 ERROR Database connection failed
2026-03-08 14:32:12 INFO Order processed
2026-03-08 14:32:13 ERROR Payment timeout
# Which user? Which order? Related events?
```

**Example: Structured Logs with Trace Context:**

```json
{
  "timestamp": "2026-03-08T14:32:10Z",
  "level": "INFO",
  "service": "user-service",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "spanId": "f7ad6b7b90a4eea1",
  "userId": "user123",
  "action": "user.created",
  "email": "alice@example.com",
  "duration_ms": 45,
  "status": "success"
}
{
  "timestamp": "2026-03-08T14:32:11Z",
  "level": "INFO",
  "service": "order-service",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "spanId": "8a5ca9d9c1b2f3a4",
  "parentSpanId": "f7ad6b7b90a4eea1",
  "userId": "user123",
  "orderId": "order456",
  "action": "order.created",
  "items": 3,
  "total": 199.99,
  "duration_ms": 120,
  "status": "success"
}
{
  "timestamp": "2026-03-08T14:32:12Z",
  "level": "ERROR",
  "service": "payment-service",
  "traceId": "550e8400-e29b-41d4-a716-446655440000",
  "spanId": "a8a902b3c4d5e6f7",
  "parentSpanId": "8a5ca9d9c1b2f3a4",
  "orderId": "order456",
  "action": "payment.charge",
  "amount": 199.99,
  "error": "gateway_timeout",
  "retry_count": 1,
  "duration_ms": 5000,
  "status": "failed"
}
```

**Query: Find all events for order456:**

```text
traceId: 550e8400-e29b-41d4-a716-446655440000
Results:
1. user-service: user created (45ms)
2. order-service: order created (120ms)
3. payment-service: payment attempt 1 failed (5000ms timeout)
4. payment-service: payment attempt 2 succeeded (2000ms)
5. notification-service: confirmation email sent (300ms)
Total journey: 7.46 seconds
```

**Implementation (Node.js + Winston):**

```javascript
// logger.js
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const cls = require('cls-hooked');

const namespace = cls.createNamespace('app-context');

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.printf(info => {
      const traceId = namespace.get('traceId') || 'no-trace';
      const spanId = namespace.get('spanId') || 'no-span';
      const parentSpanId = namespace.get('parentSpanId') || null;

      return JSON.stringify({
        timestamp: info.timestamp,
        level: info.level,
        service: process.env.SERVICE_NAME || 'unknown',
        traceId,
        spanId,
        parentSpanId,
        userId: namespace.get('userId'),
        message: info.message,
        ...info.metadata,
        stack: info.stack
      });
    })
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console()
  ]
});

// Express middleware for trace context
const traceMiddleware = (req, res, next) => {
  const traceId = req.headers['x-trace-id'] || uuidv4();
  const spanId = uuidv4();

  namespace.run(() => {
    namespace.set('traceId', traceId);
    namespace.set('spanId', spanId);
    namespace.set('userId', req.user?.id);

    res.setHeader('X-Trace-ID', traceId);

    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('request.completed', {
        metadata: {
          method: req.method,
          path: req.path,
          statusCode: res.statusCode,
          duration_ms: duration
        }
      });
    });

    next();
  });
};

module.exports = { logger, traceMiddleware, namespace };
```

### Metrics: Prometheus & Grafana

**What the dashboard measures:** Request counters track completed requests, duration histograms describe latency, and resource gauges describe current usage. Metric names and labels depend on the instrumentation you install.

Use a rate to turn a request counter into requests per second:

```promql
sum(rate(http_requests_total{service="user-service"}[5m]))
```

For the percentage of requests returning server errors, divide the error rate by the total request rate for the same service:

```promql
100 * sum(rate(http_requests_total{service="user-service", status=~"5.."}[5m]))
/ sum(rate(http_requests_total{service="user-service"}[5m]))
```

See the [observability guide](../Observability%20%26%20Reliability/readme.md#what-to-measure) for histogram percentiles, units, missing-data considerations, and query explanations.

### Distributed Tracing: Jaeger

**Trace Propagation:** Each service passes trace context to the next service so related operations appear together. The receiver creates its own span with the incoming span as its parent. See the [trace context walkthrough](../Observability%20%26%20Reliability/readme.md#pillar-3-traces-the-causal-path) before interpreting the diagram below.

**Jaeger Visualization:**

```text
Trace: 550e8400... (total: 500ms)
├─ user-service GET /users/123 [30ms] ✅
│  ├─ db query [15ms] ✅
│  └─ cache lookup [5ms] ✅
├─ order-service GET /orders [450ms] ⚠️ (slow)
│  ├─ db query [400ms] ⚠️ (bottleneck)
│  │  └─ index scan [350ms] (N+1 query detected)
│  └─ cache miss [50ms]
└─ notification-service POST /send [20ms] ✅
   └─ email queue [10ms] ✅
```

**Checkpoint:** Choose which signal you would inspect first for a failed request, rising error rate, or slow call between services.

[Back to contents](#contents)

## Part 4: Graceful Shutdown & Health Checks

Learn how an application signals that it is ready for traffic and how it finishes work when asked to stop. Read the application examples alongside the Kubernetes settings.

**Common pitfall: Abrupt Shutdown (Data Loss):**

```javascript
// No graceful handling
const server = app.listen(3000);
// User sends request...
// SIGTERM arrives → server dies immediately
// In-flight request lost without response
```

**Example: waiting for active requests during shutdown**

```javascript
const server = app.listen(3000);
const activeRequests = new Set();

app.use((req, res, next) => {
  activeRequests.add(req);
  res.on('finish', () => activeRequests.delete(req));
  res.on('close', () => activeRequests.delete(req));
  next();
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, starting graceful shutdown...');

  // 1. Stop accepting new requests
  server.close(() => {
    console.log('HTTP server closed');
  });

  // 2. Wait for in-flight requests to complete (max 25s, Kubernetes gives 30s)
  let waitTime = 0;
  while (activeRequests.size > 0 && waitTime < 25000) {
    console.log(`Waiting for ${activeRequests.size} requests to complete...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    waitTime += 1000;
  }

  // 3. Close resources
  await Promise.all([
    dbPool.end(),
    redisClient.quit(),
    amqpConnection.close()
  ]);

  console.log('Graceful shutdown complete');
  process.exit(0);
});
```

**Kubernetes Integration:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 30  # Gives pod 30s to shut down
      containers:
        - name: user-service
          image: user-service:1.0
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 5"]  # Wait for LB to remove endpoint
          ports:
            - containerPort: 8080
```

**Health Checks:**

Keep liveness focused on the process and readiness focused on whether this instance can serve requests. The sketch assumes the database and cache are essential. Configure dependency timeouts shorter than the probe deadline and include shutdown state in a complete readiness check.

```javascript
// Health endpoint
app.get('/health/live', (req, res) => {
  // Liveness: Is the app running?
  res.json({ status: 'alive' });
});

// Sketch: application helpers must enforce their own timeouts.
app.get('/health/ready', async (req, res) => {
  try {
    await Promise.all([
      dbPool.query('SELECT 1'),
      redisClient.ping(),
    ]);
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false });
  }
});

app.get('/health/startup', (req, res) => {
  // Startup probe: Finished initialization?
  if (appInitialized) {
    res.json({ initialized: true });
  } else {
    res.status(503).json({ initialized: false });
  }
});
```

**Checkpoint:** Explain the difference between liveness, readiness, and startup checks, then describe the shutdown sequence.

[Back to contents](#contents)

## Part 5: Security (RBAC, Network Policies, Secrets)

Work through three questions: who can use the Kubernetes API, which Pods can communicate, and how sensitive configuration is handled.

### Role-Based Access Control (RBAC)

**What RBAC controls:** A service account receives Kubernetes API permissions through role bindings. Do not assume every Pod can read secrets or delete workloads. The example grants access to named resources; it is relevant only if the application needs to read them through the API. Network traffic is controlled separately.

**Example: Least Privilege RBAC:**

```yaml
# ServiceAccount for order-service
apiVersion: v1
kind: ServiceAccount
metadata:
  name: order-service
  namespace: production

---
# Role: Only what order-service needs
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: order-service-role
  namespace: production
rules:
  # Read its own secrets
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["order-service-secret"]
    verbs: ["get"]
  # Read its own config
  - apiGroups: [""]
    resources: ["configmaps"]
    resourceNames: ["order-service-config"]
    verbs: ["get"]
  # Cannot delete anything, cannot access other services' secrets

---
# RoleBinding: Attach role to service account
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: order-service-rolebinding
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: order-service-role
subjects:
  - kind: ServiceAccount
    name: order-service
    namespace: production

---
# Pod uses service account
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: production
spec:
  template:
    spec:
      serviceAccountName: order-service  # Uses RBAC role above
      containers:
        - name: order-service
          image: order-service:1.0
```

### Network Policies: Firewall for Pods

**Common pitfall: No Network Policies (Everything Can Talk to Everything):**

```text
order-service can reach: ✗ payment-service ✗ user-service ✗ admin-service ✗ (unwanted)
malicious-pod can reach: ✗ database ✗ redis ✗ payment-gateway ✗ (catastrophic!)
```

**Example: Restrict Traffic:**

```yaml
# Deny all traffic by default
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: production
spec:
  podSelector: {}  # All pods
  policyTypes:
    - Ingress

---
# Allow order-service to receive from ingress controller
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-order-ingress
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: order-service
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8080

---
# Allow order-service to call payment-service only
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-order-to-payment
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: payment-service
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: order-service
      ports:
        - protocol: TCP
          port: 8080
```

### Secrets Management

**Common pitfall: Secrets in Plain Text:**

```yaml
# NEVER DO THIS
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
stringData:
  password: "SuperSecret123!"  # Visible in `kubectl get secret -o yaml`
```

**Example: Encrypted Secrets with Sealed Secrets:**

```bash
# Generate sealed secret (encrypted)
echo -n 'SuperSecret123!' | kubectl create secret generic db-secret \
  --dry-run=client \
  --from-file=password=/dev/stdin \
  -o yaml | kubeseal -f - > sealed-secret.yaml

# sealed-secret.yaml contains encrypted blob
# Only cluster can decrypt (has private key)
```

**Checkpoint:** Explain the separate purposes of RBAC, network policies, and secret management.

[Back to contents](#contents)

## Part 6: GitOps & Automated Deployments

Follow the path from a reviewed configuration change in Git to an update in the cluster. The example uses Argo CD to reconcile the two.

**Traditional Deployment (Manual):**

```bash
# Admin builds and pushes manually
docker build -t myapp:2.0 .
docker push myregistry/myapp:2.0
kubectl set image deployment/myapp myapp=myregistry/myapp:2.0
# Admin could accidentally set wrong version, forget to deploy to production, etc.
```

**Example: GitOps (Declarative, Automatic):**

```text
Git Repository: infra/ folder
├─ user-service.yaml
├─ order-service.yaml
└─ database.yaml

ArgoCD watches repository continuously:
1. Git updated: user-service.yaml version: 2.0.1
2. ArgoCD detects mismatch (cluster has 2.0.0)
3. ArgoCD automatically deploys new version
4. Kubernetes rolling update (old pods → new pods)

Benefits:
✓ All changes recorded in Git (audit trail)
✓ Automatic sync (no manual kubectl commands)
✓ Easy rollback (git revert)
✓ Multiple environments (dev/staging/prod in same repo)
✓ Pull request = approval gate before deployment
```

**ArgoCD Application:**

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: user-service-production
  namespace: argocd
spec:
  project: production
  source:
    repoURL: https://github.com/mycompany/infra
    targetRevision: main
    path: kubernetes/production/user-service
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true      # Delete resources removed from Git
      selfHeal: true   # Re-deploy if cluster drifts from Git
    syncOptions:
      - CreateNamespace=true
```

**Checkpoint:** Describe how a Git change reaches the cluster and how you would verify the resulting rollout.

[Back to contents](#contents)

## Part 7: Production Troubleshooting Runbook

Use this as a worked incident walkthrough. The timings and observations are illustrative; investigate the evidence from your own system before choosing a fix.

**Scenario: Users Report Slow Order Processing**

```text
1. DETECT (30 seconds)
   Grafana dashboard alert: order-service p99 latency > 2000ms

2. ASSESS (2 minutes)
   kubectl get pods -n production | grep order-service
   # See if pods are crashing/restarting

   kubectl get events -n production --sort-by='.lastTimestamp'
   # Check for pod evictions, node pressure, etc

   kubectl top pods -n production -l app=order-service
   # CPU/memory usage on high? Memory leak?

3. GATHER DATA (5 minutes)
   # Logs with trace IDs
   kubectl logs -n production -l app=order-service --tail=100 | grep ERROR

   # Jaeger: Find slow traces
   # Query: latency > 2s, service=order-service
   # Result: Traces show db queries taking 1500ms

   # Prometheus: Check database
   rate(pg_query_duration_seconds_sum{job="postgres"}[5m]) /
     rate(pg_query_duration_seconds_count[5m])
   # Database p99 latency also high → root cause!

4. DIAGNOSE (5 minutes)
   # Connect to postgres pod
   kubectl exec -it postgres-0 -- psql -U postgres -d orders

   # Check for slow queries
   SELECT query, calls, mean_time, max_time FROM pg_stat_statements
   ORDER BY mean_time DESC LIMIT 5;

   # Result: SELECT * FROM orders (no WHERE clause!) doing full table scan
   # 10 million rows × full table scan × 100 concurrent queries = 1500ms each

5. FIX (5 minutes)
   # Option A: Add index (long-term)
   CREATE INDEX idx_orders_user_id ON orders(user_id);

   # Option B: Immediate: Query optimization
   # Change: SELECT * FROM orders
   # To: SELECT id, user_id, status FROM orders WHERE user_id = $1

   # Deploy fix via git
   git commit -am "fix: optimize order query with index"
   git push
   # ArgoCD detects change, rolls out new version automatically

6. VERIFY (2 minutes)
   kubectl rollout status deployment/order-service -n production
   # Wait for new pods to be ready

   # Metrics should improve within 30s
   kubectl top pods -n production -l app=order-service
   # CPU drops, latency normalizes

7. POST-MORTEM (Next day)
   - Why didn't monitoring catch this earlier?
     → Add proactive alert: "Slow query detected" (> 1000ms)
   - Why wasn't this caught in staging?
     → Run production-scale load tests before release
   - Why no index in first place?
     → Add "index missing" alert for frequently-filtered columns
```

**Checkpoint:** Walk through detection, investigation, mitigation, and verification for a slow order request.

[Back to contents](#contents)

## Interview Questions for Staff-Level Kubernetes Engineers

**Junior Level:**

1. What's a Kubernetes Pod? How is it different from a container?
2. Explain Services and why they're needed
3. What's a Deployment and what problem does it solve?
4. How does Kubernetes handle rolling updates?

**Senior Level:**

5. Design a highly available PostgreSQL deployment on Kubernetes. How do you handle replication, backup, failover?
6. A service is slow. Walk through your troubleshooting process using observability
7. How would you implement canary deployments with automatic rollback? What metrics trigger rollback?
8. Explain how HPA scales based on custom metrics. How do you prevent cascading failures during scale-up?

**Staff Level:**

9. Design a multi-region Kubernetes architecture for a $100M SaaS company (high availability, disaster recovery, latency requirements)
10. Walk through a complete incident: payment service degraded 50% (high latency). Use logs, metrics, traces to diagnose. You have 15 minutes.
11. How would you implement a cluster autoscaler that predicts load spikes and provisions capacity proactively?
12. Design the observability stack for a company growing 10x in users over 12 months. How do you keep cost flat as signal grows?

## Career Progression

Use these responsibilities to plan your learning. Role titles and scope vary between organizations.

**Junior Kubernetes Engineer**

- Deploy existing services to Kubernetes
- Fix simple pod crashing issues
- Update deployments, apply manifests from senior engineers
- Follow runbooks for common issues
- Skill focus: Learn Kubernetes basics, practice kubectl commands

**Senior Kubernetes Engineer**

- Design stateful deployments (databases, message queues)
- Implement health checks, auto-scaling
- Troubleshoot complex cross-service issues
- Write playbooks/runbooks for on-call
- Mentor juniors on Kubernetes best practices

**Staff Kubernetes / Platform Engineer**

- Design company-wide Kubernetes strategy (multi-cluster, multi-region)
- Build internal developer platform (IDP): CI/CD, secret management, observability
- Make architecture decisions: GitOps vs traditional, managed vs self-hosted
- Optimize costs ($10M infrastructure → $7M through right-sizing, auto-scaling)
- Lead on-call culture shift: monitoring/alerting/runbooks reduce MTTR from 2h → 15min

## Evaluating Business Impact

When assessing this work, compare measured results before and after a change:

- **Infrastructure cost:** Are resource usage and spending appropriate for the workload?
- **Reliability:** How often do users experience failures, and how long does recovery take?
- **Deployment quality:** How often do releases cause incidents or require rollback?
- **Debugging effort:** Can the team connect an alert to useful logs and traces quickly?

Practice one topic at a time. Start by explaining how a request reaches a Pod, then work toward understanding how you would observe, update, and troubleshoot that service.

[Back to contents](#contents)

[Backend learning guide](../readme.md)
